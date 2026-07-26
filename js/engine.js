/* ===== Game Engine =====
   Handles XP, levels, gems, inventory, achievements, save/load.
*/

// ===== Sound Manager =====
const SoundManager = (() => {
  let audioContext = null;
  let enabled = true;

  function getContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  function resumeContext() {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Play a synthesized tone
  function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!enabled) return;
    try {
      resumeContext();
      const ctx = getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Correct answer - cheerful ascending chime
  function playCorrect() {
    if (!enabled) return;
    resumeContext();
    const ctx = getContext();
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 80);
    });
  }

  // Wrong answer - descending buzz
  function playWrong() {
    if (!enabled) return;
    playTone(200, 0.3, 'square', 0.15);
    setTimeout(() => playTone(150, 0.2, 'square', 0.1), 100);
  }

  // Level up - triumphant fanfare
  function playLevelUp() {
    if (!enabled) return;
    const notes = [
      { freq: 392.00, delay: 0 },     // G4
      { freq: 523.25, delay: 100 },   // C5
      { freq: 659.25, delay: 200 },   // E5
      { freq: 783.99, delay: 300 },   // G5
      { freq: 1046.50, delay: 450 },  // C6
    ];
    notes.forEach(note => {
      setTimeout(() => playTone(note.freq, 0.3, 'sine', 0.2), note.delay);
    });
  }

  // Achievement unlock - special sparkle sound
  function playAchievement() {
    if (!enabled) return;
    const notes = [
      { freq: 880, delay: 0 },
      { freq: 1108.73, delay: 80 },
      { freq: 1318.51, delay: 160 },
      { freq: 1760, delay: 240 },
    ];
    notes.forEach(note => {
      setTimeout(() => playTone(note.freq, 0.2, 'sine', 0.15), note.delay);
    });
  }

  // Quest complete - happy completion sound
  function playQuestComplete() {
    if (!enabled) return;
    const notes = [
      { freq: 587.33, delay: 0 },    // D5
      { freq: 739.99, delay: 100 },  // F#5
      { freq: 880.00, delay: 200 },  // A5
      { freq: 1174.66, delay: 350 }, // D6
    ];
    notes.forEach(note => {
      setTimeout(() => playTone(note.freq, 0.25, 'triangle', 0.2), note.delay);
    });
  }

  function setEnabled(value) {
    enabled = value;
    localStorage.setItem('sound_enabled', value ? '1' : '0');
  }

  function isEnabled() {
    return enabled;
  }

  function loadSettings() {
    const saved = localStorage.getItem('sound_enabled');
    if (saved !== null) {
      enabled = saved === '1';
    }
  }

  // Initialize on first user interaction
  function init() {
    loadSettings();
    document.addEventListener('click', resumeContext, { once: true });
    document.addEventListener('touchstart', resumeContext, { once: true });
  }

  return {
    init,
    playCorrect,
    playWrong,
    playLevelUp,
    playAchievement,
    playQuestComplete,
    setEnabled,
    isEnabled,
  };
})();

// Initialize sound manager
SoundManager.init();

// ===== 持有道具圖示列 =====
// Maps a buff's `effect` id (see SHOP_ITEMS.consumables in js/data/game.js)
// to the icon/name shown in the site-wide item bar (#item-bar).
const BUFF_META = {
  double_xp: { icon: '📜', name: '雙倍 XP' },
  hint: { icon: '🔮', name: '提示水晶' },
  revive: { icon: '🪶', name: '復活羽毛' },
  lucky: { icon: '🍀', name: '幸運草' },
  instant_xp: { icon: '⚡', name: '經驗藥水' },
  gem_bonus: { icon: '💰', name: '寶石加成' },
  streak_shield: { icon: '🛡️', name: '連勝護盾' },
  double_gems: { icon: '⚗️', name: '雙倍寶石' },
  glide: { icon: '🪂', name: '滑翔翼' },
  jump_boost: { icon: '🌨️', name: '彈跳雲靴' },
  fire_bomb: { icon: '🔥', name: '火焰彈' },
  wall_repair: { icon: '🧱', name: '城牆工事' },
  freeze_trap: { icon: '❄️', name: '冰凍陷阱' },
  lightning_staff: { icon: '⚡', name: '雷霆法杖' },
  bubble_shield: { icon: '🫧', name: '泡泡護罩' },
  cloud_mount: { icon: '☁️', name: '飛天雲' },
};

const GameEngine = (() => {
  const SAVE_KEY = 'english_savior_save';
  const XP_PER_LEVEL = lvl => 80 + lvl * 20; // increases each level

  let state = getDefaultState();

  function getDefaultState() {
    return {
      level: 1,
      xp: 0,
      gems: 0,
      streak: 0,
      lastPlayDate: null,
      wordsLearned: 0,
      grammarPassed: 0,
      videosCompleted: 0,
      perfectGrammarRun: false,
      achievements: [],
      inventory: {},
      // daily tracking
      dailyWords: 0,
      dailyGrammar: 0,
      dailyVideos: 0,
      dailyListening: 0,
      dailyEmpire: 0,
      dailyCandy: 0,
      dailySling: 0,
      dailyPets: 0,
      dailyTyping: 0,
      dailyDetective: 0,
      dailyFishing: 0,
      dailyBuilder: 0,
      dailySpeak: 0,
      dailyTower: 0,
      dailyRpg: 0,
      dailySky: 0,
      dailyDate: null,
      dailyClaimed: [],
      dailyBonusClaimed: false,
      // per-game lifetime counters
      spellingWords: 0,
      listeningCorrect: 0,
      empireKills: 0,
      empireMaxAge: 1,
      candyLevels: 0,
      slingHits: 0,
      petCatches: 0,
      petGyms: 0,
      typingWords: 0,
      tutorLessons: 0,
      detectiveCases: 0,
      fishCatches: 0,
      fishLegendaries: 0,
      fishDistinct: 0,
      builderSentences: 0,
      builderLandmarks: 0,
      speakCasts: 0,
      towerWords: 0,
      towerBosses: 0,
      rpgTalks: 0,
      rpgChapters: 0,
      skyQuests: 0,
      skyGalaxyQuests: 0,
      skyBossDown: false,
      skySecretQuests: 0,
      skySecretFound: 0,
      skySecretBoss: false,
      skySwitches: 0,
      skyUndergroundQuests: 0,
      skyShards: 0,
      skyRaids: 0,
      skyPuzzles: 0,
      skyItemUses: 0,
      // history
      learnedWordsList: [],
      // shop system
      owned: {
        consumables: {},  // { itemId: quantity }
        skins: ['default'],
        titles: ['beginner'],
        themes: ['default']
      },
      equipped: {
        skin: 'default',
        title: 'beginner',
        theme: 'default',
        charm: null       // equipped inventory collectible (CHARM_PERKS)
      },
      activeBuffs: [],  // [{ type: 'double_xp', uses: 1 }, ...]
      // progression rewards
      milestonesClaimed: [],       // LEVEL_MILESTONES levels already granted
      pointRewardsClaimed: [],     // ACH_POINT_REWARDS pts already granted
      collectionRewardClaimed: false,
    };
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        const defaults = getDefaultState();
        state = { ...defaults, ...saved };
        // Deep merge for nested objects (shop system)
        state.owned = {
          consumables: { ...defaults.owned.consumables, ...(saved.owned?.consumables || {}) },
          skins: saved.owned?.skins || defaults.owned.skins,
          titles: saved.owned?.titles || defaults.owned.titles,
          themes: saved.owned?.themes || defaults.owned.themes,
        };
        state.equipped = { ...defaults.equipped, ...(saved.equipped || {}) };
        state.activeBuffs = saved.activeBuffs || [];
      } catch { /* use default */ }
    }
    // Check streak
    const today = new Date().toDateString();
    if (state.lastPlayDate) {
      const last = new Date(state.lastPlayDate);
      const diff = Math.floor((new Date(today) - last) / 86400000);
      if (diff > 1) {
        // Streak shield consumable saves the streak once
        if (hasBuff('streak_shield')) {
          consumeBuff('streak_shield');
          showToast('🛡️ 連勝護盾守住了你的連勝紀錄！', 'achievement');
        } else {
          state.streak = 0; // streak broken
        }
      }
    }
    // Reset daily if new day
    if (state.dailyDate !== today) {
      state.dailyWords = 0;
      state.dailyGrammar = 0;
      state.dailyVideos = 0;
      state.dailyListening = 0;
      state.dailyEmpire = 0;
      state.dailyCandy = 0;
      state.dailySling = 0;
      state.dailyPets = 0;
      state.dailyTyping = 0;
      state.dailyDetective = 0;
      state.dailyFishing = 0;
      state.dailyBuilder = 0;
      state.dailySpeak = 0;
      state.dailyTower = 0;
      state.dailyRpg = 0;
      state.dailySky = 0;
      state.dailyClaimed = [];
      state.dailyBonusClaimed = false;
      state.dailyDate = today;
    }
    // NOTE: lastPlayDate is updated by recordStreak(), not here —
    // stamping it during load would make the streak check always a no-op.
    //
    // Retroactive grants: milestones/point rewards are normally handed out
    // the moment a level-up or achievement happens, so players who reached
    // their level/points BEFORE those systems shipped would otherwise stay
    // stuck (e.g. a Lv.22 save showing "next milestone Lv.5" forever).
    // Granting on load pays out the backlog exactly once; the individual
    // toasts are batched into one summary so the screen isn't flooded.
    toastCollector = [];
    grantLevelMilestones();
    checkPointRewards();
    const backlog = toastCollector;
    toastCollector = null;
    if (backlog.length > 3) {
      showToast(`🎁 系統補發獎勵 ${backlog.length} 項！打開 🏆 成就和 🎒 背包看看吧`, 'achievement');
    } else {
      backlog.forEach(m => showToast(m, 'achievement'));
    }
    save();
    applyTheme(state.equipped.theme);
    updateHUD();
  }

  // ===== 佈景主題 =====
  function applyTheme(themeId) {
    const valid = SHOP_ITEMS.themes.some(t => t.id === themeId);
    document.body.dataset.theme = valid ? themeId : 'default';
  }

  function getState() { return state; }

  function charmPerk() {
    return (state.equipped && state.equipped.charm && CHARM_PERKS[state.equipped.charm]) || null;
  }

  function addXP(amount) {
    const perk = charmPerk();
    if (perk && perk.xp) amount = Math.ceil(amount * (1 + perk.xp));
    state.xp += amount;
    let leveled = false;
    // Re-read the requirement each iteration: it grows with the level,
    // otherwise multi-level gains hand out free levels and negative XP
    while (state.xp >= XP_PER_LEVEL(state.level)) {
      state.xp -= XP_PER_LEVEL(state.level);
      state.level++;
      leveled = true;
      // Level up rewards
      state.gems += 10 + (perk && perk.levelGems ? perk.levelGems : 0);
      grantRandomItem();
    }
    if (leveled) {
      grantLevelMilestones();
      showLevelUp();
    }
    save();
    updateHUD();
    showToast(`+${amount} XP`, 'xp');
    checkAchievements();
    return leveled;
  }

  function addGems(amount) {
    if (amount > 0) {
      const perk = charmPerk();
      if (perk && perk.gem) amount = Math.ceil(amount * (1 + perk.gem));
      if (hasBuff('double_gems')) {
        amount *= 2;
        consumeBuff('double_gems');
      }
    }
    state.gems += amount;
    save();
    updateHUD();
    showToast(`+${amount} 💎`, 'gem');
    checkAchievements();
  }

  // ===== 等級里程碑 =====
  // NOTE: grants mutate state directly (never addGems/addXP) — this can run
  // inside addXP, and re-entrancy would double-count (same pattern as
  // checkAchievements below).
  function grantLevelMilestones() {
    LEVEL_MILESTONES.forEach(m => {
      if (m.level > state.level || state.milestonesClaimed.includes(m.level)) return;
      state.milestonesClaimed.push(m.level);
      const parts = [];
      if (m.gems) { state.gems += m.gems; parts.push(`+${m.gems}💎`); }
      if (m.items) {
        for (let i = 0; i < m.items; i++) grantRandomItem();
        parts.push(`收藏品 ×${m.items}`);
      }
      if (m.skin && !state.owned.skins.includes(m.skin)) {
        state.owned.skins.push(m.skin);
        const it = SHOP_ITEMS.skins.find(x => x.id === m.skin);
        parts.push(`皮膚「${it ? it.name : m.skin}」`);
      }
      if (m.title && !state.owned.titles.includes(m.title)) {
        state.owned.titles.push(m.title);
        const it = SHOP_ITEMS.titles.find(x => x.id === m.title);
        parts.push(`稱號「${it ? it.name : m.title}」`);
      }
      if (m.theme && !state.owned.themes.includes(m.theme)) {
        state.owned.themes.push(m.theme);
        const it = SHOP_ITEMS.themes.find(x => x.id === m.theme);
        parts.push(`主題「${it ? it.name : m.theme}」`);
      }
      showToast(`🏁 里程碑 Lv.${m.level} 達成！${parts.join('、')}`, 'achievement');
      SoundManager.playAchievement();
    });
    save();
    updateHUD();
  }

  function nextMilestone() {
    return LEVEL_MILESTONES.find(m => !state.milestonesClaimed.includes(m.level) && m.level > 0) || null;
  }

  function milestoneRewardText(m) {
    if (!m) return '';
    const parts = [];
    if (m.gems) parts.push(`${m.gems}💎`);
    if (m.items) parts.push(`收藏品×${m.items}`);
    if (m.skin) { const it = SHOP_ITEMS.skins.find(x => x.id === m.skin); parts.push(`皮膚「${it ? it.name : m.skin}」`); }
    if (m.title) { const it = SHOP_ITEMS.titles.find(x => x.id === m.title); parts.push(`稱號「${it ? it.name : m.title}」`); }
    if (m.theme) { const it = SHOP_ITEMS.themes.find(x => x.id === m.theme); parts.push(`主題「${it ? it.name : m.theme}」`); }
    return parts.join('＋');
  }

  function recordWord(word) {
    state.wordsLearned++;
    state.dailyWords++;
    if (!state.learnedWordsList.includes(word)) {
      state.learnedWordsList.push(word);
    }
    save();
    checkAchievements();
    checkDailyQuests();
    updateStats();
  }

  function recordGrammar() {
    state.grammarPassed++;
    state.dailyGrammar++;
    save();
    checkAchievements();
    checkDailyQuests();
    updateStats();
  }

  function recordVideo() {
    state.videosCompleted++;
    state.dailyVideos++;
    save();
    checkAchievements();
    checkDailyQuests();
    updateStats();
  }

  function recordSpelling() {
    state.spellingWords = (state.spellingWords || 0) + 1;
    save();
    checkAchievements();
  }

  function recordListening(count) {
    if (!count || count <= 0) return;
    state.listeningCorrect = (state.listeningCorrect || 0) + count;
    state.dailyListening = (state.dailyListening || 0) + count;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordEmpire() {
    state.empireKills = (state.empireKills || 0) + 1;
    state.dailyEmpire = (state.dailyEmpire || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordBuilder() {
    state.builderSentences = (state.builderSentences || 0) + 1;
    state.dailyBuilder = (state.dailyBuilder || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordBuilderLandmark() {
    state.builderLandmarks = (state.builderLandmarks || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSpeak() {
    state.speakCasts = (state.speakCasts || 0) + 1;
    state.dailySpeak = (state.dailySpeak || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordTowerWord() {
    state.towerWords = (state.towerWords || 0) + 1;
    state.dailyTower = (state.dailyTower || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordTowerBoss() {
    state.towerBosses = (state.towerBosses || 0) + 1;
    save();
    checkAchievements();
  }

  function recordRpgTalk() {
    state.rpgTalks = (state.rpgTalks || 0) + 1;
    state.dailyRpg = (state.dailyRpg || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordRpgChapter() {
    state.rpgChapters = (state.rpgChapters || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyQuest(isGalaxy, isSecret, isUnderground) {
    state.skyQuests = (state.skyQuests || 0) + 1;
    if (isGalaxy) state.skyGalaxyQuests = (state.skyGalaxyQuests || 0) + 1;
    if (isSecret) state.skySecretQuests = (state.skySecretQuests || 0) + 1;
    if (isUnderground) state.skyUndergroundQuests = (state.skyUndergroundQuests || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyAnswer() {
    state.dailySky = (state.dailySky || 0) + 1;
    save();
    checkDailyQuests();
  }

  function recordSkyBoss() {
    state.skyBossDown = true;
    save();
    checkAchievements();
  }

  function recordSkySecretFound() {
    state.skySecretFound = (state.skySecretFound || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkySecretBoss() {
    state.skySecretBoss = true;
    save();
    checkAchievements();
  }

  function recordSkySwitch() {
    state.skySwitches = (state.skySwitches || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyShard() {
    state.skyShards = (state.skyShards || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyRaid() {
    state.skyRaids = (state.skyRaids || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyPuzzle() {
    state.skyPuzzles = (state.skyPuzzles || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSkyItemUse() {
    state.skyItemUses = (state.skyItemUses || 0) + 1;
    save();
    checkAchievements();
  }

  function recordSling() {
    state.slingHits = (state.slingHits || 0) + 1;
    state.dailySling = (state.dailySling || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // ---- Word Wizard (單字魔法師) ----
  // A successful summon: the player spelled the word correctly and the object
  // dropped into the scene.
  function recordWizardCast() {
    state.wizardCasts = (state.wizardCasts || 0) + 1;
    state.dailyWizard = (state.dailyWizard || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // A level cleared for the first time.
  function recordWizardLevel() {
    state.wizardLevels = (state.wizardLevels || 0) + 1;
    save();
    checkAchievements();
  }

  // A *new* way of solving a level (one distinct solution tag on that level).
  function recordWizardSolution() {
    state.wizardSolutions = (state.wizardSolutions || 0) + 1;
    save();
    checkAchievements();
  }

  // ---- Rhythm Star (英語節奏星) ----
  function recordRhythmSong() {
    state.rhythmSongs = (state.rhythmSongs || 0) + 1;
    state.dailyRhythm = (state.dailyRhythm || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // A song finished without a single MISS.
  function recordRhythmFC() {
    state.rhythmFC = (state.rhythmFC || 0) + 1;
    save();
    checkAchievements();
  }

  // A song cleared with the momentum gauge still at 100.
  function recordRhythmPerfectGauge() {
    state.rhythmMaxGauge = (state.rhythmMaxGauge || 0) + 1;
    save();
    checkAchievements();
  }

  // A wizard level cleared without a single wasted summon and magic to spare.
  function recordWizardFlawless() {
    state.wizardFlawless = (state.wizardFlawless || 0) + 1;
    save();
    checkAchievements();
  }

  // ---- Word Alchemy (單字鍊金術) ----
  function recordAlchemyWord() {
    state.alchemyWords = (state.alchemyWords || 0) + 1;
    state.dailyAlchemy = (state.dailyAlchemy || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // ---- Order Up! (英語餐廳大亂鬥) ----
  function recordOrderServed() {
    state.orderServed = (state.orderServed || 0) + 1;
    state.dailyOrder = (state.dailyOrder || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // Volume counters are shared across both worlds of the zone — after the rename
  // the zone genuinely contains both, counting both is honest, and it only ever
  // makes the existing 出餐 achievements easier, never harder.
  function recordLifeServed() {
    state.lifeServed = (state.lifeServed || 0) + 1;
    save();
    checkAchievements();
  }

  // 生活服務 keeps its OWN scene counter. It must not feed `orderShops`: that
  // drives 「開遍 5 個區域全部 25 家店」, and unlocking it by working the post
  // office would make the badge say something it does not mean.
  function recordLifeScene(n) {
    if (n > (state.lifeScenes || 0)) {
      state.lifeScenes = n;
      save();
      checkAchievements();
    }
  }

  function recordOrderShop(n) {
    if (n > (state.orderShops || 0)) {
      state.orderShops = n;
      save();
      checkAchievements();
    }
  }

  function recordPetCatch() {
    state.petCatches = (state.petCatches || 0) + 1;
    state.dailyPets = (state.dailyPets || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordPetGym() {
    state.petGyms = (state.petGyms || 0) + 1;
    save();
    checkAchievements();
  }

  function recordTypingWord() {
    state.typingWords = (state.typingWords || 0) + 1;
    state.dailyTyping = (state.dailyTyping || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordTutorLesson() {
    state.tutorLessons = (state.tutorLessons || 0) + 1;
    save();
    checkAchievements();
  }

  function recordDetectiveCase() {
    state.detectiveCases = (state.detectiveCases || 0) + 1;
    state.dailyDetective = (state.dailyDetective || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordFishCatch() {
    state.fishCatches = (state.fishCatches || 0) + 1;
    state.dailyFishing = (state.dailyFishing || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  // fishing.js calls these only on the FIRST catch of a species, so the
  // counters equal distinct species / distinct legendaries collected.
  function recordFishLegendary() {
    state.fishLegendaries = (state.fishLegendaries || 0) + 1;
    save();
    checkAchievements();
  }

  function recordFishDistinct() {
    state.fishDistinct = (state.fishDistinct || 0) + 1;
    save();
    checkAchievements();
  }

  function recordCandy() {
    state.candyLevels = (state.candyLevels || 0) + 1;
    state.dailyCandy = (state.dailyCandy || 0) + 1;
    save();
    checkAchievements();
    checkDailyQuests();
  }

  function recordEmpireAge(age) {
    if (age > (state.empireMaxAge || 1)) {
      state.empireMaxAge = age;
      save();
      checkAchievements();
    }
  }

  function recordPerfectGrammar() {
    state.perfectGrammarRun = true;
    save();
    checkAchievements();
  }

  function recordStreak() {
    const today = new Date().toDateString();
    if (state.lastPlayDate !== today) {
      state.streak++;
      state.lastPlayDate = today;
    }
    save();
    updateHUD();
    checkAchievements();
  }

  function grantRandomItem() {
    // Rarity weights: common=50%, uncommon=25%, rare=15%, epic=7%, legendary=3%
    // With lucky buff: common=20%, uncommon=30%, rare=25%, epic=15%, legendary=10%
    const hasLucky = hasBuff('lucky');
    const weights = hasLucky
      ? { common: 20, uncommon: 30, rare: 25, epic: 15, legendary: 10 }
      : { common: 50, uncommon: 25, rare: 15, epic: 7, legendary: 3 };

    // Group items by rarity
    const byRarity = {};
    INVENTORY_ITEMS.forEach(item => {
      const rarity = item.rarity || 'common';
      if (!byRarity[rarity]) byRarity[rarity] = [];
      byRarity[rarity].push(item);
    });

    // Roll for rarity
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll < cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    // Pick random item from that rarity (fallback to common if empty)
    const pool = byRarity[selectedRarity] || byRarity['common'] || INVENTORY_ITEMS;
    const item = pool[Math.floor(Math.random() * pool.length)];

    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;

    // Show rarity in toast for rare+ items
    const rarityLabels = { rare: '💙 稀有', epic: '💜 史詩', legendary: '🧡 傳說' };
    const rarityLabel = rarityLabels[item.rarity] || '';
    const toastMsg = rarityLabel
      ? `獲得 ${rarityLabel} ${item.icon} ${item.name}！`
      : `獲得 ${item.icon} ${item.name}！`;

    if (hasLucky) {
      consumeBuff('lucky');
      showToast('🥠 幸運餅乾生效！', 'achievement');
    }

    showToast(toastMsg, 'achievement');
    checkCollectionReward();
    save();
  }

  // Owning all 8 collectibles once grants a one-time big reward
  function checkCollectionReward() {
    if (state.collectionRewardClaimed) return;
    if (!INVENTORY_ITEMS.every(i => (state.inventory[i.id] || 0) > 0)) return;
    state.collectionRewardClaimed = true;
    state.gems += 300; // direct mutation — may run inside addXP's level loop
    if (!state.owned.titles.includes('collection_king')) {
      state.owned.titles.push('collection_king');
    }
    showToast('🎖️ 收藏品全圖鑑達成！+300💎＋稱號「收藏之王」', 'achievement');
    SoundManager.playAchievement();
  }

  // ===== 成就點數 =====
  function getAchievementPoints() {
    return ACHIEVEMENTS
      .filter(a => state.achievements.includes(a.id))
      .reduce((sum, a) => sum + (a.pts || 10), 0);
  }

  function checkAchievements() {
    let unlocked = false;
    ACHIEVEMENTS.forEach(ach => {
      if (!state.achievements.includes(ach.id) && ach.condition(state)) {
        state.achievements.push(ach.id);
        showToast(`🏆 成就解鎖：${ach.name} +15💎 +${ach.pts || 10}⭐`, 'achievement');
        SoundManager.playAchievement();
        // Grant gems directly (not via addGems) to avoid re-entering this check
        state.gems += 15;
        unlocked = true;
      }
    });
    if (unlocked) checkPointRewards();
    save();
    if (unlocked) updateHUD();
  }

  // Achievement-point thresholds unlock exclusive rewards (direct mutation —
  // runs inside checkAchievements, so no addGems/addXP here)
  function checkPointRewards() {
    const pts = getAchievementPoints();
    ACH_POINT_REWARDS.forEach(r => {
      if (r.pts > pts || state.pointRewardsClaimed.includes(r.pts)) return;
      state.pointRewardsClaimed.push(r.pts);
      const parts = [];
      if (r.gems) { state.gems += r.gems; parts.push(`+${r.gems}💎`); }
      if (r.skin && !state.owned.skins.includes(r.skin)) {
        state.owned.skins.push(r.skin);
        const it = SHOP_ITEMS.skins.find(x => x.id === r.skin);
        parts.push(`皮膚「${it ? it.name : r.skin}」`);
      }
      if (r.title && !state.owned.titles.includes(r.title)) {
        state.owned.titles.push(r.title);
        const it = SHOP_ITEMS.titles.find(x => x.id === r.title);
        parts.push(`稱號「${it ? it.name : r.title}」`);
      }
      if (r.theme && !state.owned.themes.includes(r.theme)) {
        state.owned.themes.push(r.theme);
        const it = SHOP_ITEMS.themes.find(x => x.id === r.theme);
        parts.push(`主題「${it ? it.name : r.theme}」`);
      }
      showToast(`⭐ 成就點數 ${r.pts} 達成！${parts.join('、')}`, 'achievement');
      SoundManager.playAchievement();
    });
  }

  // Grant daily quest rewards the moment a quest crosses its target
  function checkDailyQuests() {
    if (typeof DAILY_QUESTS === 'undefined') return;
    if (!Array.isArray(state.dailyClaimed)) state.dailyClaimed = [];
    DAILY_QUESTS.forEach(quest => {
      const progress = state[quest.key] || 0;
      if (progress >= quest.target && !state.dailyClaimed.includes(quest.id)) {
        state.dailyClaimed.push(quest.id);
        save();
        showToast(`📋 任務完成：${quest.name}`, 'achievement');
        SoundManager.playQuestComplete();
        addXP(10);
      }
    });
    // All quests done today → one-time bonus: 50 gems + mystery chest
    if (!state.dailyBonusClaimed &&
        DAILY_QUESTS.every(q => state.dailyClaimed.includes(q.id))) {
      state.dailyBonusClaimed = true;
      save();
      showToast('🎁 每日任務全部完成！神秘寶箱開啟！', 'achievement');
      addGems(50);
      grantRandomItem();
    }
  }

  // ===== UI Updates =====
  function updateHUD() {
    const needed = XP_PER_LEVEL(state.level);
    const pct = Math.min((state.xp / needed) * 100, 100);
    document.getElementById('hud-level').textContent = state.level;
    document.getElementById('xp-bar').style.width = pct + '%';
    document.getElementById('xp-text').textContent = `${state.xp} / ${needed} XP`;
    document.getElementById('hud-gems').textContent = state.gems;
    document.getElementById('hud-streak').textContent = state.streak;

    // Update equipped skin and title
    const skin = SHOP_ITEMS?.skins?.find(s => s.id === (state.equipped?.skin || 'default'));
    const title = SHOP_ITEMS?.titles?.find(t => t.id === (state.equipped?.title || 'beginner'));
    if (skin) {
      document.getElementById('hud-avatar').textContent = skin.icon;
    }
    if (title) {
      document.getElementById('hud-name').textContent = title.display || '冒險者';
    }
    renderItemBar();
  }

  // Renders the site-wide floating bar (#item-bar) showing every active
  // buff/consumable with its remaining uses, so players can always see
  // what's currently in effect no matter which game zone they're in.
  function renderItemBar() {
    const bar = document.getElementById('item-bar');
    if (!bar) return;
    const buffs = state.activeBuffs || [];
    if (buffs.length === 0) {
      bar.innerHTML = '';
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    bar.innerHTML = buffs.map(buff => {
      const meta = BUFF_META[buff.type] || { icon: '✨', name: buff.type };
      const title = `${meta.name}（剩 ${buff.uses} 次）`;
      return `<span class="item-chip" title="${title}">${meta.icon}<span class="item-uses">${buff.uses}</span></span>`;
    }).join('');
  }

  function updateStats() {
    document.getElementById('stat-words').textContent = state.wordsLearned;
    document.getElementById('stat-grammar').textContent = state.grammarPassed;
    document.getElementById('stat-videos').textContent = state.videosCompleted;
    document.getElementById('stat-streak').textContent = state.streak;
  }

  function showLevelUp() {
    if (deferLevelUpModal) {
      pendingLevelUps.push(state.level);
      showToast(`🎉 升級了！Lv.${state.level} +10💎`, 'achievement');
      SoundManager.playLevelUp();
      return;
    }
    document.getElementById('levelup-level').textContent = `Lv.${state.level}`;
    document.getElementById('levelup-rewards').textContent = `獎勵：+10 💎 + 隨機道具${nextMilestoneText()}`;
    document.getElementById('modal-levelup').classList.add('active');
    SoundManager.playLevelUp();
  }

  function nextMilestoneText() {
    const m = nextMilestone();
    return m ? `\n下個里程碑：Lv.${m.level}（${milestoneRewardText(m)}）` : '';
  }

  function setDeferLevelUp(value) {
    deferLevelUpModal = value;
  }

  function flushPendingLevelUps() {
    if (pendingLevelUps.length > 0) {
      const lastLevel = pendingLevelUps[pendingLevelUps.length - 1];
      document.getElementById('levelup-level').textContent = `Lv.${lastLevel}`;
      document.getElementById('levelup-rewards').textContent = `獎勵：+10 💎 + 隨機道具${nextMilestoneText()}`;
      document.getElementById('modal-levelup').classList.add('active');
      pendingLevelUps = [];
    }
  }

  function showInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    // Section 1: Shop consumables (purchased items that can be used)
    const ownedConsumables = Object.entries(state.owned.consumables || {}).filter(([id, qty]) => qty > 0);
    if (ownedConsumables.length > 0) {
      const consumablesSection = document.createElement('div');
      consumablesSection.className = 'inv-section';
      consumablesSection.innerHTML = '<h3 class="inv-section-title">🧪 可使用道具</h3>';
      const consumablesGrid = document.createElement('div');
      consumablesGrid.className = 'inv-consumables-grid';

      ownedConsumables.forEach(([itemId, quantity]) => {
        const item = SHOP_ITEMS.consumables.find(i => i.id === itemId);
        if (item) {
          const slot = document.createElement('div');
          slot.className = 'inv-consumable-slot';
          slot.innerHTML = `
            <div class="inv-consumable-icon">${item.icon}</div>
            <div class="inv-consumable-info">
              <span class="inv-consumable-name">${item.name}</span>
              <span class="inv-consumable-qty">x${quantity}</span>
            </div>
            <button class="inv-use-btn" onclick="GameEngine.useConsumable('${itemId}'); GameEngine.showInventory();">使用</button>
          `;
          slot.title = item.desc;
          consumablesGrid.appendChild(slot);
        }
      });

      consumablesSection.appendChild(consumablesGrid);
      grid.appendChild(consumablesSection);
    }

    // Section 2: Active buffs
    if (state.activeBuffs && state.activeBuffs.length > 0) {
      const buffsSection = document.createElement('div');
      buffsSection.className = 'inv-section';
      buffsSection.innerHTML = '<h3 class="inv-section-title">✨ 啟用中效果</h3>';
      const buffsGrid = document.createElement('div');
      buffsGrid.className = 'inv-buffs-grid';

      state.activeBuffs.forEach(buff => {
        const item = SHOP_ITEMS.consumables.find(i => i.effect === buff.type);
        if (item) {
          const slot = document.createElement('div');
          slot.className = 'inv-buff-slot';
          slot.innerHTML = `
            <span class="inv-buff-icon">${item.icon}</span>
            <span class="inv-buff-name">${item.name}</span>
            <span class="inv-buff-uses">剩餘 ${buff.uses} 次</span>
          `;
          buffsGrid.appendChild(slot);
        }
      });

      buffsSection.appendChild(buffsGrid);
      grid.appendChild(buffsSection);
    }

    // Section 3: Lucky charm (equip a collectible for a passive perk)
    const charmSection = document.createElement('div');
    charmSection.className = 'inv-section inv-charm-section';
    const charm = state.equipped.charm && CHARM_PERKS[state.equipped.charm]
      ? INVENTORY_ITEMS.find(i => i.id === state.equipped.charm) : null;
    charmSection.innerHTML = charm
      ? `<h3 class="inv-section-title">🧿 幸運護符</h3>
         <div class="inv-charm-current">${charm.icon} <b>${charm.name}</b> — ${CHARM_PERKS[charm.id].desc}
         <span class="inv-charm-tip">（點下面收藏品可以換護符）</span></div>`
      : `<h3 class="inv-section-title">🧿 幸運護符</h3>
         <div class="inv-charm-current">尚未裝備 — 把收藏品裝備成護符，可以獲得被動加成！</div>`;
    grid.appendChild(charmSection);

    // Section 4: Collection album (sell duplicates, equip charms, set reward)
    const ownedCount = INVENTORY_ITEMS.filter(i => (state.inventory[i.id] || 0) > 0).length;
    const collectionSection = document.createElement('div');
    collectionSection.className = 'inv-section';
    collectionSection.innerHTML =
      `<h3 class="inv-section-title">🎒 收藏品圖鑑（${ownedCount} / ${INVENTORY_ITEMS.length}）` +
      (state.collectionRewardClaimed
        ? ' <span class="inv-album-done">✅ 全圖鑑獎勵已領取</span>'
        : ' <span class="inv-album-hint">集滿 8 種可獲得 300💎＋稱號「收藏之王」</span>') +
      '</h3>';
    const collectionGrid = document.createElement('div');
    collectionGrid.className = 'inv-collection-grid';

    INVENTORY_ITEMS.forEach(item => {
      const count = state.inventory[item.id] || 0;
      const isCharm = state.equipped.charm === item.id;
      const slot = document.createElement('div');
      slot.className = 'inv-slot rich' + (count > 0 ? '' : ' empty') + (isCharm ? ' charm-equipped' : '');
      if (count > 0) {
        const sellPrice = SELL_PRICES[item.rarity] || 5;
        slot.innerHTML = `
          <div class="inv-slot-icon">${item.icon}<span class="inv-count">x${count}</span></div>
          <div class="inv-slot-name">${item.name}</div>
          <div class="inv-slot-perk">🧿 ${CHARM_PERKS[item.id] ? CHARM_PERKS[item.id].desc : ''}</div>
          <button class="inv-charm-btn" onclick="GameEngine.equipCharm('${item.id}')">${isCharm ? '裝備中⭐' : '裝備'}</button>
          ${count > 1 ? `<button class="inv-sell-btn" onclick="GameEngine.sellItem('${item.id}')">賣出 +${sellPrice}💎</button>` : ''}
        `;
        slot.title = `${item.name}: ${item.desc}`;
      } else {
        slot.innerHTML = `<div class="inv-slot-icon">❓</div><div class="inv-slot-name">???</div>`;
        slot.title = '還沒獲得（升級或每日任務全完成有機會掉落）';
      }
      collectionGrid.appendChild(slot);
    });

    collectionSection.appendChild(collectionGrid);
    grid.appendChild(collectionSection);

    document.getElementById('modal-inventory').classList.add('active');
  }

  // ===== 收藏品：賣出重複 / 裝備護符 =====
  function sellItem(itemId) {
    const item = INVENTORY_ITEMS.find(i => i.id === itemId);
    const count = state.inventory[itemId] || 0;
    if (!item || count < 1) return false;
    if (count === 1) {
      showToast('最後一個不能賣，要留著收藏！', 'error');
      return false;
    }
    state.inventory[itemId] = count - 1;
    save();
    // user-initiated action → addGems is fine (double_gems/charm apply)
    addGems(SELL_PRICES[item.rarity] || 5);
    showInventory();
    return true;
  }

  function equipCharm(itemId) {
    if ((state.inventory[itemId] || 0) < 1 || !CHARM_PERKS[itemId]) return false;
    if (state.equipped.charm === itemId) {
      state.equipped.charm = null;
      showToast('🧿 已卸下幸運護符', 'info');
    } else {
      state.equipped.charm = itemId;
      const item = INVENTORY_ITEMS.find(i => i.id === itemId);
      showToast(`🧿 裝備護符：${item.icon} ${item.name}（${CHARM_PERKS[itemId].desc}）`, 'achievement');
    }
    save();
    showInventory();
    return true;
  }

  function showAchievements() {
    // Header: achievement points + threshold rewards + next level milestone
    const header = document.getElementById('ach-points-header');
    if (header) {
      const pts = getAchievementPoints();
      const total = ACHIEVEMENTS.reduce((s, a) => s + (a.pts || 10), 0);
      const next = ACH_POINT_REWARDS.find(r => !state.pointRewardsClaimed.includes(r.pts));
      const pct = next ? Math.min(100, Math.round(pts / next.pts * 100)) : 100;
      const rewardLabel = r => {
        if (r.gems) return `${r.gems}💎`;
        if (r.skin) { const it = SHOP_ITEMS.skins.find(x => x.id === r.skin); return `皮膚「${it ? it.name : r.skin}」`; }
        if (r.title) { const it = SHOP_ITEMS.titles.find(x => x.id === r.title); return `稱號「${it ? it.name : r.title}」`; }
        if (r.theme) { const it = SHOP_ITEMS.themes.find(x => x.id === r.theme); return `主題「${it ? it.name : r.theme}」`; }
        return '';
      };
      const m = nextMilestone();
      header.innerHTML = `
        <div class="ach-points-title">⭐ 成就點數：<b>${pts}</b> / ${total}</div>
        <div class="ach-points-bar"><div class="ach-points-fill" style="width:${pct}%"></div></div>
        <div class="ach-reward-row">${ACH_POINT_REWARDS.map(r =>
          `<span class="ach-reward${state.pointRewardsClaimed.includes(r.pts) ? ' claimed' : ''}">` +
          `${state.pointRewardsClaimed.includes(r.pts) ? '✅' : '🔒'} ${r.pts}⭐ ${rewardLabel(r)}</span>`).join('')}
        </div>
        <div class="ach-milestone-line">🏁 下一個等級里程碑：${m ? `Lv.${m.level}（${milestoneRewardText(m)}）` : '已全部達成！'}</div>
      `;
    }

    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = state.achievements.includes(ach.id);
      const maskHidden = ach.hidden && !unlocked;
      const icon = maskHidden ? '❓' : (unlocked ? ach.icon : '🔒');
      const name = maskHidden ? '？？？' : ach.name;
      const desc = maskHidden ? '神秘成就……解鎖後揭曉' : ach.desc;
      const el = document.createElement('div');
      el.className = 'ach-item' + (unlocked ? ' unlocked' : '');
      el.innerHTML = `
        <span class="ach-icon">${icon}</span>
        <div class="ach-info">
          <h4>${name} <span class="ach-pts-badge">+${ach.pts || 10}⭐</span></h4>
          <p>${desc}</p>
        </div>
        <span class="ach-status">${unlocked ? '已解鎖' : '未解鎖'}</span>
      `;
      list.appendChild(el);
    });
    document.getElementById('modal-achievements').classList.add('active');
  }

  // When set (load-time backlog grants), toasts are collected instead of
  // shown so a returning player isn't flooded by a dozen popups at once
  let toastCollector = null;

  function showToast(msg, type = 'info') {
    if (toastCollector) {
      toastCollector.push(msg);
      return;
    }
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ===== Shop System =====
  let deferLevelUpModal = false;
  let pendingLevelUps = [];

  let currentShopTab = 'consumables';

  function showShop() {
    renderShopItems(currentShopTab);
    document.getElementById('shop-gems').textContent = state.gems;
    document.getElementById('modal-shop').classList.add('active');
  }

  function switchShopTab(tab) {
    currentShopTab = tab;
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.shop-tab[data-tab="${tab}"]`).classList.add('active');
    renderShopItems(tab);
  }

  function renderShopItems(category) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const items = SHOP_ITEMS[category];

    items.forEach(item => {
      const owned = isItemOwned(category, item.id);
      const equipped = isItemEquipped(category, item.id);
      const canAfford = state.gems >= item.price;
      const quantity = category === 'consumables' ? (state.owned.consumables[item.id] || 0) : 0;

      const card = document.createElement('div');
      card.className = 'shop-card' + (owned && category !== 'consumables' ? ' owned' : '') + (equipped ? ' equipped' : '');

      let buttonHtml = '';
      if (item.unlock && !owned) {
        // Unlock-gated item: never purchasable, granted by its system
        buttonHtml = `<span class="shop-unlock-badge">🔒 ${item.unlockDesc || '特殊解鎖'}</span>`;
      } else if (item.minLevel && state.level < item.minLevel && !owned) {
        buttonHtml = `<button class="shop-buy-btn disabled" disabled>Lv.${item.minLevel} 解鎖</button>`;
      } else if (category === 'consumables') {
        // Buy button
        buttonHtml = `<button class="shop-buy-btn${!canAfford ? ' disabled' : ''}"
          onclick="GameEngine.buyItem('${category}', '${item.id}')"
          ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? '購買' : '寶石不足'}
        </button>`;
        // If owned, show quantity and use button
        if (quantity > 0) {
          buttonHtml += `<div class="shop-owned-info">
            <span class="shop-owned-qty">已擁有: ${quantity}</span>
            <button class="shop-use-btn" onclick="GameEngine.useConsumable('${item.id}')">使用</button>
          </div>`;
        }
      } else if (owned) {
        if (equipped) {
          buttonHtml = `<button class="shop-equipped-btn" disabled>裝備中</button>`;
        } else {
          buttonHtml = `<button class="shop-equip-btn" onclick="GameEngine.equipItem('${category}', '${item.id}')">裝備</button>`;
        }
      } else if (item.price === 0) {
        buttonHtml = `<button class="shop-buy-btn" onclick="GameEngine.buyItem('${category}', '${item.id}')">免費領取</button>`;
      } else {
        buttonHtml = `<button class="shop-buy-btn${!canAfford ? ' disabled' : ''}"
          onclick="GameEngine.buyItem('${category}', '${item.id}')"
          ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? '購買' : '寶石不足'}
        </button>`;
      }

      const iconHtml = item.icon || '';
      const priceHtml = item.unlock
        ? `<span class="shop-price unlock">✨ 解鎖獎勵</span>`
        : item.price > 0 ? `<span class="shop-price">💎 ${item.price}</span>` : `<span class="shop-price free">免費</span>`;
      const specialClass = item.special ? ' special' : '';

      card.innerHTML = `
        <div class="shop-card-icon${specialClass}">${iconHtml}</div>
        <div class="shop-card-info">
          <h4 class="shop-card-name${specialClass}">${item.name}</h4>
          <p class="shop-card-desc">${item.desc}</p>
          ${priceHtml}
        </div>
        <div class="shop-card-action">
          ${buttonHtml}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function isItemOwned(category, itemId) {
    if (category === 'consumables') {
      return (state.owned.consumables[itemId] || 0) > 0;
    }
    return state.owned[category]?.includes(itemId);
  }

  const EQUIP_KEYS = { skins: 'skin', titles: 'title', themes: 'theme' };

  function isItemEquipped(category, itemId) {
    if (category === 'consumables') return false;
    return state.equipped[EQUIP_KEYS[category]] === itemId;
  }

  function buyItem(category, itemId) {
    const item = SHOP_ITEMS[category].find(i => i.id === itemId);
    if (!item) {
      showToast('商品不存在', 'error');
      return false;
    }

    if (item.unlock) {
      showToast(`這個要靠解鎖獲得：${item.unlockDesc || '特殊解鎖'}`, 'error');
      return false;
    }

    if (item.minLevel && state.level < item.minLevel) {
      showToast(`要達到 Lv.${item.minLevel} 才能購買！`, 'error');
      return false;
    }

    if (state.gems < item.price) {
      showToast('寶石不足！', 'error');
      return false;
    }

    // Check if already owned (for skins/titles)
    if (category !== 'consumables' && state.owned[category]?.includes(itemId)) {
      showToast('已擁有此商品', 'error');
      return false;
    }

    // Deduct gems
    state.gems -= item.price;

    // Add to owned
    if (category === 'consumables') {
      state.owned.consumables[itemId] = (state.owned.consumables[itemId] || 0) + 1;
      showToast(`購買成功！獲得 ${item.icon} ${item.name}`, 'achievement');
    } else {
      if (!state.owned[category]) state.owned[category] = [];
      state.owned[category].push(itemId);
      showToast(`購買成功！獲得 ${item.icon || ''} ${item.name}`, 'achievement');
    }

    save();
    updateHUD();
    renderShopItems(currentShopTab);
    document.getElementById('shop-gems').textContent = state.gems;
    return true;
  }

  function equipItem(category, itemId) {
    if (!state.owned[category]?.includes(itemId)) {
      showToast('尚未擁有此商品', 'error');
      return false;
    }

    state.equipped[EQUIP_KEYS[category]] = itemId;
    if (category === 'themes') applyTheme(itemId);

    const item = SHOP_ITEMS[category].find(i => i.id === itemId);
    showToast(`已裝備 ${item?.icon || ''} ${item?.name || itemId}`, 'info');

    save();
    updateHUD();
    renderShopItems(currentShopTab);
    return true;
  }

  function useConsumable(itemId) {
    if (!state.owned.consumables[itemId] || state.owned.consumables[itemId] <= 0) {
      showToast('沒有此道具', 'error');
      return false;
    }

    const item = SHOP_ITEMS.consumables.find(i => i.id === itemId);
    if (!item) return false;

    // Apply effect
    if (item.effect === 'instant_xp' || item.effect === 'instant_xp_big') {
      // Instant effect: add XP directly
      const xp = item.effect === 'instant_xp_big' ? 150 : 50;
      state.owned.consumables[itemId]--;
      save();
      addXP(xp);
      showToast(`使用 ${item.icon} ${item.name}，獲得 ${xp} XP！`, 'xp');
    } else if (item.effect === 'mystery_item') {
      // Instant effect: random collectible drop
      state.owned.consumables[itemId]--;
      save();
      grantRandomItem();
      updateHUD();
    } else {
      // Buff effect: add to active buffs
      state.owned.consumables[itemId]--;
      const uses = item.uses || (item.effect === 'gem_bonus' ? 5 : 1);
      state.activeBuffs.push({ type: item.effect, uses: uses });
      save();
      renderItemBar();
      showToast(`啟用 ${item.icon} ${item.name}！`, 'achievement');
    }

    renderShopItems(currentShopTab);
    return true;
  }

  function hasBuff(buffType) {
    return state.activeBuffs.some(b => b.type === buffType && b.uses > 0);
  }

  function consumeBuff(buffType) {
    const buff = state.activeBuffs.find(b => b.type === buffType && b.uses > 0);
    if (buff) {
      buff.uses--;
      if (buff.uses <= 0) {
        state.activeBuffs = state.activeBuffs.filter(b => b !== buff);
      }
      save();
      renderItemBar();
      return true;
    }
    return false;
  }

  function getEquippedSkin() {
    const skinId = state.equipped?.skin || 'default';
    return SHOP_ITEMS.skins.find(s => s.id === skinId) || SHOP_ITEMS.skins[0];
  }

  function getEquippedTitle() {
    const titleId = state.equipped?.title || 'beginner';
    return SHOP_ITEMS.titles.find(t => t.id === titleId) || SHOP_ITEMS.titles[0];
  }

  return {
    load, save, getState,
    addXP, addGems,
    recordWord, recordGrammar, recordVideo,
    recordSpelling, recordListening,
    recordEmpire, recordEmpireAge, recordCandy, recordSling,
    recordPetCatch, recordPetGym, recordTypingWord, recordTutorLesson, recordDetectiveCase, recordFishCatch,
    recordFishLegendary, recordFishDistinct,
    recordWizardCast, recordWizardLevel, recordWizardSolution,
    recordRhythmSong, recordRhythmFC, recordRhythmPerfectGauge, recordWizardFlawless, recordAlchemyWord, recordOrderServed, recordOrderShop, recordLifeScene, recordLifeServed,
    recordBuilder, recordBuilderLandmark, recordSpeak,
    recordTowerWord, recordTowerBoss,
    recordRpgTalk, recordRpgChapter,
    recordSkyQuest, recordSkyAnswer, recordSkyBoss,
    recordSkySecretFound, recordSkySecretBoss, recordSkySwitch,
    recordSkyShard, recordSkyRaid, recordSkyPuzzle, recordSkyItemUse,
    recordPerfectGrammar, recordStreak,
    updateHUD, updateStats, renderItemBar,
    showInventory, showAchievements, showToast,
    checkAchievements, checkDailyQuests,
    // Shop functions
    showShop, switchShopTab, buyItem, equipItem,
    useConsumable, hasBuff, consumeBuff,
    getEquippedSkin, getEquippedTitle,
    setDeferLevelUp, flushPendingLevelUps,
    // Meta-progression
    applyTheme, sellItem, equipCharm, getAchievementPoints,
  };
})();
