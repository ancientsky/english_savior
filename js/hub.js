/* =====================================================================
   HubView — fills the 冒險者證 (passport) chips and the per-game progress
   badges on the redesigned hub landing page. Purely additive: it only
   writes text into elements that already exist as static markup in
   index.html (#zone-hub). It never creates the clickable [data-zone]
   cards themselves — app.js binds their click→switchZone handlers once
   at DOMContentLoaded, so the cards must stay static HTML.
   ===================================================================== */

const HubView = (() => {

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setBadge(zone, text) {
    const el = document.querySelector(`.hb-badge[data-badge="${zone}"]`);
    if (!el) return;
    el.textContent = text || '';
  }

  function refreshPassport() {
    const save = readJSON('english_savior_save') || {};
    const lvEl = document.getElementById('hb-lv');
    const gemsEl = document.getElementById('hb-gems');
    const streakEl = document.getElementById('hb-streak');
    if (lvEl) lvEl.textContent = 'Lv.' + (Number(save.level) || 1);
    if (gemsEl) gemsEl.textContent = String(Number(save.gems) || 0);
    if (streakEl) streakEl.textContent = String(Number(save.streak) || 0);
  }

  function refreshDailyBanner() {
    const textEl = document.getElementById('hb-daily-text');
    if (!textEl) return;
    try {
      const save = readJSON('english_savior_save') || {};
      if (typeof DAILY_QUESTS !== 'undefined' && Array.isArray(DAILY_QUESTS) && DAILY_QUESTS.length) {
        const total = DAILY_QUESTS.length;
        const done = DAILY_QUESTS.filter(q => (save[q.key] || 0) >= q.target).length;
        textEl.textContent = `今日完成 ${done} / ${total}`;
        return;
      }
    } catch { /* fall through to static text */ }
    textEl.textContent = '點我看今天的任務！';
  }

  function refreshBadges() {
    // ---- rpg: english_savior_rpg → done chapters ----
    try {
      const rpg = readJSON('english_savior_rpg');
      const n = rpg && rpg.done ? Object.keys(rpg.done).length : 0;
      setBadge('rpg', n > 0 ? `📖 ${n}/36 章` : '');
    } catch { setBadge('rpg', ''); }

    // ---- sky: english_savior_sky → completed quests (excluding hidden) ----
    try {
      const sky = readJSON('english_savior_sky');
      const completed = sky && sky.completed ? sky.completed : {};
      const n = Object.keys(completed).filter(k => !k.startsWith('sqh_')).length;
      setBadge('sky', n > 0 ? `🗺️ ${n} 任務` : '');
    } catch { setBadge('sky', ''); }

    // ---- pets: english_savior_pets → collection size ----
    try {
      const pets = readJSON('english_savior_pets');
      const n = pets && pets.collection ? Object.keys(pets.collection).length : 0;
      const petsTotal = (typeof PET_SPECIES !== 'undefined' && Array.isArray(PET_SPECIES)) ? PET_SPECIES.length : 30;
      setBadge('pets', n > 0 ? `🐾 ${n}/${petsTotal}` : '');
    } catch { setBadge('pets', ''); }

    // ---- empire: english_savior_empire → { wave, kills, correct, wrong, bestWave } ----
    try {
      const empire = readJSON('english_savior_empire');
      const n = empire && Number(empire.bestWave) > 0 ? Number(empire.bestWave) : 0;
      setBadge('empire', n > 0 ? `🏰 第 ${n} 波` : '');
    } catch { setBadge('empire', ''); }

    // ---- listening: english_savior_save.listeningCorrect ----
    // ---- speak: .speakCasts ----
    // ---- minecraft: .wordsLearned ----
    // ---- roblox: .grammarPassed ----
    // ---- spelling: .spellingWords ----
    // ---- typing: .typingWords (+ best WPM) ----
    try {
      const save = readJSON('english_savior_save') || {};
      const listening = Number(save.listeningCorrect) || 0;
      setBadge('listening', listening > 0 ? `🔮 ${listening}` : '');

      const casts = Number(save.speakCasts) || 0;
      setBadge('speak', casts > 0 ? `🎤 ${casts}` : '');

      const words = Number(save.wordsLearned) || 0;
      setBadge('minecraft', words > 0 ? `📚 ${words} 字` : '');

      const grammar = Number(save.grammarPassed) || 0;
      setBadge('roblox', grammar > 0 ? `✏️ ${grammar}` : '');

      const spellingWords = Number(save.spellingWords) || 0;
      setBadge('spelling', spellingWords > 0 ? `🦖 ${spellingWords}` : '');

      const slingHits = Number(save.slingHits) || 0;
      setBadge('sling', slingHits > 0 ? `🎯 ${slingHits}` : '');

      const typingWords = Number(save.typingWords) || 0;
      const bestWPM = Number(localStorage.getItem('english_savior_typing_best')) || 0;
      let typingText = '';
      if (typingWords > 0) typingText = `⚔️ ${typingWords}`;
      if (bestWPM > 0) typingText = typingText ? `${typingText}　WPM ${bestWPM}` : `WPM ${bestWPM}`;
      setBadge('typing', typingText);

      const tutorLessons = Number(save.tutorLessons) || 0;
      setBadge('tutor', tutorLessons > 0 ? `🖐️ ${Math.min(tutorLessons, 20)}/20 課` : '');

      const videos = Number(save.videosCompleted) || 0;
      setBadge('youtube', videos > 0 ? `📺 ${videos}` : '');
    } catch { /* leave defaults (hidden) */ }

    // ---- tower: english_savior_tower → { level: floor } ----
    try {
      const tower = readJSON('english_savior_tower');
      const floor = tower && Number(tower.level) > 0 ? Number(tower.level) : 0;
      setBadge('tower', floor > 0 ? `🗼 第 ${floor} 層` : '');
    } catch { setBadge('tower', ''); }

    // ---- candy: english_savior_candy.level ----
    try {
      const candy = readJSON('english_savior_candy');
      const level = candy && Number(candy.level) > 0 ? Number(candy.level) : 0;
      setBadge('candy', level > 0 ? `🍬 第 ${level} 關` : '');
    } catch { setBadge('candy', ''); }

    // ---- builder: english_savior_builder.collected.length ----
    try {
      const builder = readJSON('english_savior_builder');
      const n = builder && Array.isArray(builder.collected) ? builder.collected.length : 0;
      setBadge('builder', n > 0 ? `🗼 ${n}/33` : '');
    } catch { setBadge('builder', ''); }

    // ---- fishing: english_savior_fishing → distinct caught ----
    try {
      const fishing = readJSON('english_savior_fishing');
      const n = fishing && fishing.caught && typeof fishing.caught === 'object'
        ? Object.keys(fishing.caught).length : 0;
      setBadge('fishing', n > 0 ? `🐠 ${n}/30` : '');
    } catch { setBadge('fishing', ''); }

    // ---- detective: english_savior_detective → done count ----
    try {
      const detective = readJSON('english_savior_detective');
      const n = detective && detective.done ? Object.keys(detective.done).length : 0;
      setBadge('detective', n > 0 ? `🔍 ${n}/8 案` : '');
    } catch { setBadge('detective', ''); }
  }

  function refresh() {
    refreshPassport();
    refreshDailyBanner();
    refreshBadges();
  }

  function init() {
    refresh();
    // Re-fill whenever the player navigates back to the hub zone.
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-zone="hub"]')) {
        setTimeout(refresh, 50);
      }
    });
  }

  return { init, refresh };
})();
