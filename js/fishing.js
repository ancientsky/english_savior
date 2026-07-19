/* ===== 悠閒釣魚塘 (Cozy Fishing Pond) =====
   A listening + collection game across 4 ponds (30 species total):
     1. 陽光池塘 拋竿: click/space to stop an oscillating timing bar —
        stopping near the center biases the catch toward a rarer species.
     2. 收線小遊戲: hold (pointer/space) to raise a marker on a vertical
        gauge, keep it inside the moving target zone to fill a progress
        bar over ~3s (draining while outside) until the fish surfaces.
     3. 聽力題: TTSManager speaks the caught fish's word (🔊 replay).
        Rarity 1-2 -> 4 zh-meaning multiple choice. Rarity 3 -> spell it
        from a shuffled letter bank (word letters + 4 decoys).
        Correct -> catch (rewards + fish card). Wrong -> fish escapes.
     4. 水族箱: full-screen overlay — caught fish swim per pond tab,
        uncaught species show as a ??? dex strip below.
   Save: localStorage `english_savior_fishing` = { caught, pond, pondsCompleted }.
*/

const FishingGame = (() => {
  const SAVE_KEY = 'english_savior_fishing';

  const PONDS = [
    { id: 1, name: '陽光池塘', icon: '☀️', unlockAt: 0 },
    { id: 2, name: '森林小溪', icon: '🌲', unlockAt: 6 },
    { id: 3, name: '珊瑚海灣', icon: '🪸', unlockAt: 14 },
    { id: 4, name: '傳說深海', icon: '🌌', unlockAt: 22 },
  ];

  const RARITY_REWARD = {
    1: { xp: 10, gems: 1 },
    2: { xp: 14, gems: 2 },
    3: { xp: 20, gems: 3 },
  };

  let save = { caught: {}, pond: 1, pondsCompleted: [] };
  let els = {};
  let currentScreen = 'pond'; // pond | cast | reel | quiz | result
  let aquariumOpen = false;
  let aquariumPond = 1;

  let forcedFishId = null;   // set by the test hook forceFish()
  let castState = null;      // { pos, dir, speed, lastTs, raf }
  let reelState = null;      // { fish, markerY, vel, progress, holding, time, targetHalfWidth, targetCenter, lastTs, raf }
  let activeQuiz = null;     // { type: 'options'|'spell', fish, ... }

  function init() {
    const root = document.getElementById('fh-root');
    if (!root) return;
    loadSave();
    buildDom(root);
    renderPondScreen();
    showScreen('pond');

    window.__fhTest = {
      save: () => JSON.parse(JSON.stringify(save)),
      cast: () => { skipToBite(); },
      forceFish: (id) => { forcedFishId = id; },
      reel: () => forceReelSuccess(),
      answer: (correct) => testAnswer(correct),
      pond: (n) => selectPond(n),
      screen: () => (aquariumOpen ? 'aquarium' : currentScreen),
    };
  }

  // ===== Persistence =====
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        save = {
          caught: parsed.caught && typeof parsed.caught === 'object' ? parsed.caught : {},
          pond: Number(parsed.pond) || 1,
          pondsCompleted: Array.isArray(parsed.pondsCompleted) ? parsed.pondsCompleted : [],
        };
      }
    } catch { /* keep defaults */ }
    if (!isPondUnlocked(save.pond)) save.pond = 1;
  }

  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // ===== Helpers =====
  function distinctCaughtCount() { return Object.keys(save.caught).length; }
  function isPondUnlocked(id) {
    const p = PONDS.find(x => x.id === id);
    return !!p && distinctCaughtCount() >= p.unlockAt;
  }
  function isZoneActive() {
    const z = document.getElementById('zone-fishing');
    return !!z && z.classList.contains('active');
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== DOM scaffold =====
  function buildDom(root) {
    root.innerHTML = `
      <div class="fh-screen" id="fh-screen-pond">
        <div class="fh-topbar">
          <div class="fh-dex-counter" id="fh-dex-counter">📖 圖鑑 0/30</div>
          <div class="fh-pond-tabs" id="fh-pond-tabs"></div>
        </div>
        <div class="fh-scene fh-pond-1" id="fh-scene">
          <div class="fh-sky"></div>
          <div class="fh-water">
            <div class="fh-wave fh-wave-1"></div>
            <div class="fh-wave fh-wave-2"></div>
          </div>
          <div class="fh-dock"><div class="fh-boat">🚣</div></div>
        </div>
        <div class="fh-actions">
          <button type="button" class="fh-btn-primary fh-btn-cast" id="fh-btn-cast">🎣 拋竿</button>
          <button type="button" class="fh-btn-secondary fh-btn-aquarium" id="fh-btn-aquarium">🐠 水族箱</button>
        </div>
      </div>

      <div class="fh-screen" id="fh-screen-cast" style="display:none"></div>
      <div class="fh-screen" id="fh-screen-reel" style="display:none"></div>

      <div class="fh-screen" id="fh-screen-quiz" style="display:none">
        <div class="fh-quiz-fish-emoji" id="fh-quiz-emoji">🐟</div>
        <div class="fh-quiz-word-fallback" id="fh-quiz-word-fallback" style="display:none"></div>
        <button type="button" class="fh-quiz-replay-btn" id="fh-quiz-replay">🔊 再聽一次</button>
        <div class="fh-quiz-prompt">聽聲音，這是什麼？</div>
        <div class="fh-quiz-body" id="fh-quiz-body"></div>
        <div class="fh-quiz-feedback" id="fh-quiz-feedback"></div>
      </div>

      <div class="fh-screen" id="fh-screen-result" style="display:none">
        <div id="fh-result-body"></div>
      </div>

      <div class="fh-aquarium-overlay" id="fh-aquarium-overlay">
        <div class="fh-aq-panel">
          <div class="fh-aq-header">
            <div class="fh-aq-title">🐠 水族箱</div>
            <div class="fh-aq-counter" id="fh-aq-counter">0/30</div>
            <button type="button" class="fh-aq-close" id="fh-aq-close">✕</button>
          </div>
          <div class="fh-aq-tabs" id="fh-aq-tabs"></div>
          <div class="fh-aq-tank" id="fh-aq-tank"></div>
          <div class="fh-aq-detail" id="fh-aq-detail" style="display:none"></div>
          <div class="fh-aq-dex-strip" id="fh-aq-dex-strip"></div>
        </div>
      </div>
    `;

    els = {
      screens: {
        pond: document.getElementById('fh-screen-pond'),
        cast: document.getElementById('fh-screen-cast'),
        reel: document.getElementById('fh-screen-reel'),
        quiz: document.getElementById('fh-screen-quiz'),
        result: document.getElementById('fh-screen-result'),
      },
      dexCounter: document.getElementById('fh-dex-counter'),
      pondTabs: document.getElementById('fh-pond-tabs'),
      sceneWrap: document.getElementById('fh-scene'),
      btnCast: document.getElementById('fh-btn-cast'),
      btnAquarium: document.getElementById('fh-btn-aquarium'),
      castScreen: document.getElementById('fh-screen-cast'),
      reelScreen: document.getElementById('fh-screen-reel'),
      quizEmoji: document.getElementById('fh-quiz-emoji'),
      quizWordFallback: document.getElementById('fh-quiz-word-fallback'),
      quizReplayBtn: document.getElementById('fh-quiz-replay'),
      quizBody: document.getElementById('fh-quiz-body'),
      quizFeedback: document.getElementById('fh-quiz-feedback'),
      resultBody: document.getElementById('fh-result-body'),
      aqOverlay: document.getElementById('fh-aquarium-overlay'),
      aqCounter: document.getElementById('fh-aq-counter'),
      aqTabs: document.getElementById('fh-aq-tabs'),
      aqTank: document.getElementById('fh-aq-tank'),
      aqDetail: document.getElementById('fh-aq-detail'),
      aqDexStrip: document.getElementById('fh-aq-dex-strip'),
      aqClose: document.getElementById('fh-aq-close'),
    };

    els.btnCast.addEventListener('click', beginCast);
    els.btnAquarium.addEventListener('click', openAquarium);
    els.aqClose.addEventListener('click', closeAquarium);

    els.quizReplayBtn.addEventListener('click', () => {
      if (activeQuiz && activeQuiz.fish) TTSManager.speak(activeQuiz.fish.word, 'en-US', 0.85);
    });

    // Cast: click anywhere on the cast screen to stop the timing bar
    els.castScreen.addEventListener('click', () => {
      if (currentScreen === 'cast' && castState) stopCast();
    });

    // Reel: hold via pointer on the reel screen
    els.reelScreen.addEventListener('pointerdown', () => { if (reelState) reelState.holding = true; });
    els.reelScreen.addEventListener('pointerup', () => { if (reelState) reelState.holding = false; });
    els.reelScreen.addEventListener('pointerleave', () => { if (reelState) reelState.holding = false; });

    // Space bar: stop cast / hold reel (only while the fishing zone is visible)
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || !isZoneActive()) return;
      if (currentScreen === 'cast' && castState) { e.preventDefault(); stopCast(); }
      else if (currentScreen === 'reel' && reelState) { e.preventDefault(); reelState.holding = true; }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' || !isZoneActive()) return;
      if (currentScreen === 'reel' && reelState) reelState.holding = false;
    });
  }

  function showScreen(name) {
    currentScreen = name;
    Object.entries(els.screens).forEach(([k, el]) => { el.style.display = k === name ? 'block' : 'none'; });
  }

  // ===== Pond scene =====
  function renderPondScreen() {
    els.dexCounter.textContent = `📖 圖鑑 ${distinctCaughtCount()}/${FISH_SPECIES.length}`;
    els.sceneWrap.className = 'fh-scene fh-pond-' + save.pond;
    els.pondTabs.innerHTML = '';
    PONDS.forEach(p => {
      const unlocked = isPondUnlocked(p.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-pond-tab' + (p.id === save.pond ? ' active' : '') + (unlocked ? '' : ' locked');
      btn.innerHTML = unlocked ? `${p.icon} ${p.name}` : `🔒 需收藏 ${p.unlockAt} 種`;
      btn.title = p.name;
      btn.addEventListener('click', () => selectPond(p.id));
      els.pondTabs.appendChild(btn);
    });
  }

  function selectPond(id) {
    const p = PONDS.find(x => x.id === id);
    if (!p) return;
    if (!isPondUnlocked(id)) {
      GameEngine.showToast(`🔒 需先收藏 ${p.unlockAt} 種魚才能解鎖 ${p.name}！`, 'info');
      return;
    }
    save.pond = id;
    persist();
    renderPondScreen();
  }

  // ===== Cast (timing bar) =====
  function beginCast() {
    showScreen('cast');
    renderCastTimingDom();
    castState = { pos: 0, dir: 1, speed: 65, lastTs: null, raf: null };
    castState.raf = requestAnimationFrame(castLoop);
  }

  function renderCastTimingDom() {
    els.castScreen.innerHTML = `
      <div class="fh-cast-title">🎣 抓準時機，讓浮標甩到中間！</div>
      <div class="fh-cast-track" id="fh-cast-track">
        <div class="fh-cast-center-zone"></div>
        <div class="fh-cast-marker" id="fh-cast-marker">🎯</div>
      </div>
      <div class="fh-cast-hint">點擊畫面或按空白鍵停止！</div>
    `;
    els.castMarker = document.getElementById('fh-cast-track').querySelector('#fh-cast-marker');
  }

  function castLoop(ts) {
    if (!castState) return;
    if (castState.lastTs == null) castState.lastTs = ts;
    const dt = Math.min(0.05, (ts - castState.lastTs) / 1000);
    castState.lastTs = ts;
    castState.pos += castState.dir * castState.speed * dt;
    if (castState.pos > 100) { castState.pos = 100; castState.dir = -1; }
    if (castState.pos < 0) { castState.pos = 0; castState.dir = 1; }
    if (els.castMarker) els.castMarker.style.left = castState.pos + '%';
    castState.raf = requestAnimationFrame(castLoop);
  }

  function stopCast() {
    if (!castState) return;
    if (castState.raf) cancelAnimationFrame(castState.raf);
    const score = 1 - Math.abs(castState.pos - 50) / 50; // 0..1, 1 = perfect center
    castState = null;
    renderCastWaitingDom();
    const waitMs = 1500 + Math.random() * 2500;
    setTimeout(() => {
      if (currentScreen !== 'cast') return;
      renderCastBiteDom();
      setTimeout(() => {
        if (currentScreen !== 'cast') return;
        enterReel(pickFishForCast(score));
      }, 550);
    }, waitMs);
  }

  function renderCastWaitingDom() {
    els.castScreen.innerHTML = `
      <div class="fh-cast-title">🌊 拋竿中...</div>
      <div class="fh-bobber-wrap"><div class="fh-bobber">🔴</div></div>
      <div class="fh-cast-hint">耐心等待魚兒上鉤...</div>
    `;
  }

  function renderCastBiteDom() {
    els.castScreen.innerHTML = `<div class="fh-bite-flash">🎣 上鉤了！！</div>`;
  }

  // Test hook: skip the timing bar + wait entirely and go straight to the
  // reel-in minigame (deterministic — no click timing / random wait needed).
  function skipToBite() {
    if (castState) { cancelAnimationFrame(castState.raf); castState = null; }
    showScreen('cast');
    enterReel(pickFishForCast(1));
  }

  function pickFishForCast(score) {
    if (forcedFishId) {
      const wanted = forcedFishId;
      forcedFishId = null;
      const f = FISH_SPECIES.find(x => x.id === wanted);
      if (f) return f;
    }
    const pool = FISH_SPECIES.filter(f => f.pond === save.pond);
    const source = pool.length ? pool : FISH_SPECIES;
    const weights = source.map(f => {
      const base = f.rarity === 1 ? 70 : f.rarity === 2 ? 25 : 10;
      const bonus = f.rarity === 1 ? (1 - score) * 40 : f.rarity === 3 ? score * 60 : score * 20;
      return base + bonus;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < source.length; i++) {
      r -= weights[i];
      if (r <= 0) return source[i];
    }
    return source[source.length - 1];
  }

  // ===== Reel-in minigame =====
  function enterReel(fish) {
    GameEngine.setDeferLevelUp(true);
    showScreen('reel');
    renderReelDom();
    reelState = {
      fish, markerY: 15, vel: 0, progress: 0, holding: false,
      time: 0, targetCenter: 50, targetHalfWidth: 14, lastTs: null, raf: null,
    };
    reelState.raf = requestAnimationFrame(reelLoop);
  }

  function renderReelDom() {
    els.reelScreen.innerHTML = `
      <div class="fh-reel-title">🎣 拉竿中！按住畫面或空白鍵，把魚拉近岸邊！</div>
      <div class="fh-reel-gauge" id="fh-reel-gauge">
        <div class="fh-reel-target" id="fh-reel-target"></div>
        <div class="fh-reel-marker" id="fh-reel-marker">🐟</div>
      </div>
      <div class="fh-reel-progress-wrap"><div class="fh-reel-progress-fill" id="fh-reel-progress-fill"></div></div>
      <div class="fh-reel-hint">讓魚停在色框內集滿進度條！</div>
    `;
    els.reelTarget = document.getElementById('fh-reel-target');
    els.reelMarker = document.getElementById('fh-reel-marker');
    els.reelProgressFill = document.getElementById('fh-reel-progress-fill');
  }

  function reelLoop(ts) {
    if (!reelState) return;
    if (reelState.lastTs == null) reelState.lastTs = ts;
    const dt = Math.min(0.05, (ts - reelState.lastTs) / 1000);
    reelState.lastTs = ts;
    reelState.time += dt;

    reelState.targetCenter = 50 + Math.sin(reelState.time * 1.3) * 30; // oscillates 20..80

    const holdAccel = 150, gravity = 115;
    reelState.vel += (reelState.holding ? -holdAccel : gravity) * dt;
    reelState.vel = Math.max(-95, Math.min(95, reelState.vel));
    reelState.markerY += reelState.vel * dt;
    if (reelState.markerY <= 0) { reelState.markerY = 0; reelState.vel = 0; }
    if (reelState.markerY >= 100) { reelState.markerY = 100; reelState.vel = 0; }

    const inZone = Math.abs(reelState.markerY - reelState.targetCenter) <= reelState.targetHalfWidth;
    reelState.progress += (inZone ? 34 : -20) * dt;
    reelState.progress = Math.max(0, Math.min(100, reelState.progress));

    updateReelDom();

    if (reelState.progress >= 100) { reelSuccess(); return; }
    reelState.raf = requestAnimationFrame(reelLoop);
  }

  function updateReelDom() {
    if (!reelState || !els.reelTarget) return;
    els.reelTarget.style.bottom = (reelState.targetCenter - reelState.targetHalfWidth) + '%';
    els.reelTarget.style.height = (reelState.targetHalfWidth * 2) + '%';
    els.reelMarker.style.bottom = reelState.markerY + '%';
    els.reelProgressFill.style.height = reelState.progress + '%';
  }

  function reelSuccess() {
    if (!reelState) return;
    if (reelState.raf) cancelAnimationFrame(reelState.raf);
    const fish = reelState.fish;
    reelState = null;
    startQuiz(fish);
  }

  // Test hook: instantly complete the reel-in regardless of gauge state.
  function forceReelSuccess() {
    if (!reelState) return false;
    reelState.progress = 100;
    reelSuccess();
    return true;
  }

  // ===== Listening quiz =====
  function startQuiz(fish) {
    showScreen('quiz');
    els.quizEmoji.textContent = fish.emoji;
    els.quizFeedback.textContent = '';
    els.quizFeedback.className = 'fh-quiz-feedback';

    const supported = TTSManager.isSupported();
    if (supported) {
      els.quizWordFallback.style.display = 'none';
      els.quizReplayBtn.style.display = 'inline-flex';
      TTSManager.speak(fish.word, 'en-US', 0.85);
    } else {
      // No-TTS fallback (mirrors js/listening.js's audio-optional design):
      // show the word text so the game stays playable without speech.
      els.quizWordFallback.style.display = 'block';
      els.quizWordFallback.textContent = fish.word;
      els.quizReplayBtn.style.display = 'none';
    }

    if (fish.rarity <= 2) renderZhQuiz(fish); else renderSpellQuiz(fish);
  }

  function renderZhQuiz(fish) {
    const others = shuffle(FISH_SPECIES.filter(f => f.id !== fish.id));
    const options = [fish];
    for (const f of others) {
      if (options.length >= 4) break;
      if (!options.some(o => o.zh === f.zh)) options.push(f);
    }
    const finalOptions = shuffle(options);

    els.quizBody.innerHTML = `<div class="fh-quiz-options" id="fh-quiz-options"></div>`;
    const wrap = document.getElementById('fh-quiz-options');

    activeQuiz = { type: 'options', fish, options: [] };
    finalOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-quiz-option';
      btn.textContent = opt.zh;
      const isCorrect = opt.id === fish.id;
      btn.addEventListener('click', () => {
        if (!activeQuiz) return;
        activeQuiz.options.forEach(o => { o.btn.disabled = true; });
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) activeQuiz.options.forEach(o => { if (o.isCorrect) o.btn.classList.add('reveal'); });
        setTimeout(() => handleQuizAnswer(isCorrect, fish), 550);
      });
      wrap.appendChild(btn);
      activeQuiz.options.push({ btn, isCorrect });
    });
  }

  function renderSpellQuiz(fish) {
    const word = fish.word;
    const letters = word.split('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !letters.includes(c));
    const decoys = shuffle(alphabet).slice(0, 4);
    const tilesData = shuffle([
      ...letters.map(c => ({ char: c })),
      ...decoys.map(c => ({ char: c })),
    ]);

    els.quizBody.innerHTML = `
      <div class="fh-spell-slots" id="fh-spell-slots"></div>
      <div class="fh-spell-bank" id="fh-spell-bank"></div>
      <button type="button" class="fh-btn-secondary fh-spell-backspace" id="fh-spell-backspace">⌫ 刪除</button>
    `;
    const bank = document.getElementById('fh-spell-bank');

    activeQuiz = { type: 'spell', fish, word, tiles: [], typed: [] };
    tilesData.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-spell-tile';
      btn.textContent = t.char;
      btn.addEventListener('click', () => handleSpellTileClick(i));
      bank.appendChild(btn);
      activeQuiz.tiles.push({ char: t.char, btn, used: false });
    });
    document.getElementById('fh-spell-backspace').addEventListener('click', handleSpellBackspace);
    renderSpellSlots();
  }

  function renderSpellSlots() {
    const wrap = document.getElementById('fh-spell-slots');
    if (!wrap || !activeQuiz) return;
    wrap.innerHTML = '';
    for (let i = 0; i < activeQuiz.word.length; i++) {
      const s = document.createElement('span');
      const entry = activeQuiz.typed[i];
      s.className = 'fh-spell-slot' + (entry ? ' filled' : '');
      s.textContent = entry ? entry.char : '';
      wrap.appendChild(s);
    }
  }

  function handleSpellTileClick(i) {
    if (!activeQuiz || activeQuiz.type !== 'spell') return;
    const tile = activeQuiz.tiles[i];
    if (!tile || tile.used) return;
    tile.used = true;
    tile.btn.disabled = true;
    tile.btn.classList.add('used');
    activeQuiz.typed.push({ char: tile.char, tileIndex: i });
    renderSpellSlots();
    if (activeQuiz.typed.length === activeQuiz.word.length) {
      const typedWord = activeQuiz.typed.map(t => t.char).join('');
      const isCorrect = typedWord === activeQuiz.word;
      const fish = activeQuiz.fish;
      activeQuiz.tiles.forEach(t => { t.btn.disabled = true; });
      const bs = document.getElementById('fh-spell-backspace');
      if (bs) bs.disabled = true;
      setTimeout(() => handleQuizAnswer(isCorrect, fish), 400);
    }
  }

  function handleSpellBackspace() {
    if (!activeQuiz || activeQuiz.type !== 'spell') return;
    const last = activeQuiz.typed.pop();
    if (!last) return;
    const tile = activeQuiz.tiles[last.tileIndex];
    tile.used = false;
    tile.btn.disabled = false;
    tile.btn.classList.remove('used');
    renderSpellSlots();
  }

  // Test hook: click zh option / type the letter bank deterministically.
  function testAnswer(correct) {
    if (!activeQuiz) return false;
    if (activeQuiz.type === 'options') {
      const entry = activeQuiz.options.find(o => o.isCorrect === !!correct);
      if (!entry) return false;
      entry.btn.click();
      return true;
    }
    if (activeQuiz.type === 'spell') {
      const word = activeQuiz.word;
      let sequence = word;
      if (!correct) {
        const rev = [...word].reverse().join('');
        sequence = rev !== word ? rev : (word.slice(1) + word[0]);
      }
      for (const ch of sequence.split('')) {
        const tile = activeQuiz.tiles.find(t => !t.used && t.char === ch);
        if (!tile) return false;
        tile.btn.click();
      }
      return true;
    }
    return false;
  }

  // ===== Resolve quiz =====
  function handleQuizAnswer(isCorrect, fish) {
    activeQuiz = null;
    if (isCorrect) { SoundManager.playCorrect(); doCatch(fish); }
    else { SoundManager.playWrong(); doEscape(fish); }
  }

  function doCatch(fish) {
    const isNew = !save.caught[fish.id];
    save.caught[fish.id] = (save.caught[fish.id] || 0) + 1;
    persist();

    GameEngine.recordWord(fish.word);
    GameEngine.recordFishCatch();

    const reward = RARITY_REWARD[fish.rarity] || RARITY_REWARD[1];
    let xp = reward.xp, gems = reward.gems;
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += 2;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
    }
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    checkPondCompletion(fish.pond);
    SoundManager.playQuestComplete();
    TTSManager.speak(fish.word, 'en-US', 0.85);

    showScreen('result');
    els.resultBody.innerHTML = `
      <div class="fh-splash">💦</div>
      <div class="fh-catch-card">
        <div class="fh-catch-emoji">${fish.emoji}</div>
        <div class="fh-catch-word">${fish.word}</div>
        <div class="fh-catch-zh">${fish.zh}</div>
        <div class="fh-catch-rewards">${isNew ? '🆕 新魚種加入圖鑑！' : '再次釣起！'} +${xp} XP・+${gems} 💎</div>
        <div class="fh-catch-count">已收集 ${save.caught[fish.id]} 次</div>
      </div>
      <div class="fh-result-btns">
        <button type="button" class="fh-btn-primary" id="fh-result-cast-again">🎣 再釣一次</button>
        <button type="button" class="fh-btn-secondary" id="fh-result-back">🏠 返回池塘</button>
      </div>`;
    bindResultButtons();
  }

  function doEscape(fish) {
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    showScreen('result');
    els.resultBody.innerHTML = `
      <div class="fh-escape-msg">💨 ${fish.emoji} ${fish.word}（${fish.zh}）溜走了……下次再試試看！</div>
      <div class="fh-result-btns">
        <button type="button" class="fh-btn-primary" id="fh-result-cast-again">🎣 再釣一次</button>
        <button type="button" class="fh-btn-secondary" id="fh-result-back">🏠 返回池塘</button>
      </div>`;
    bindResultButtons();
    setTimeout(() => TTSManager.speak(fish.word, 'en-US', 0.8), 400);
  }

  function bindResultButtons() {
    const again = document.getElementById('fh-result-cast-again');
    const back = document.getElementById('fh-result-back');
    if (again) again.addEventListener('click', () => { renderPondScreen(); showScreen('pond'); beginCast(); });
    if (back) back.addEventListener('click', () => { renderPondScreen(); showScreen('pond'); });
  }

  function checkPondCompletion(pondId) {
    if (save.pondsCompleted.includes(pondId)) return;
    const speciesInPond = FISH_SPECIES.filter(f => f.pond === pondId);
    const allCaught = speciesInPond.length > 0 && speciesInPond.every(f => (save.caught[f.id] || 0) >= 1);
    if (!allCaught) return;
    save.pondsCompleted.push(pondId);
    persist();
    GameEngine.addGems(20);
    const pond = PONDS.find(p => p.id === pondId);
    GameEngine.showToast(`🎉 ${pond ? pond.name : ''} 全部收服！+20💎`, 'achievement');
  }

  // ===== Aquarium overlay =====
  function openAquarium() {
    aquariumOpen = true;
    aquariumPond = save.pond;
    els.aqOverlay.classList.add('active');
    renderAquarium();
  }

  function closeAquarium() {
    aquariumOpen = false;
    els.aqOverlay.classList.remove('active');
  }

  function renderAquarium() {
    els.aqCounter.textContent = `${distinctCaughtCount()}/${FISH_SPECIES.length}`;

    els.aqTabs.innerHTML = '';
    PONDS.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-aq-tab' + (p.id === aquariumPond ? ' active' : '');
      btn.textContent = `${p.icon} ${p.name}`;
      btn.addEventListener('click', () => { aquariumPond = p.id; renderAquarium(); });
      els.aqTabs.appendChild(btn);
    });

    const speciesInPond = FISH_SPECIES.filter(f => f.pond === aquariumPond);

    els.aqTank.innerHTML = '';
    speciesInPond.filter(f => save.caught[f.id]).forEach(f => {
      const el = document.createElement('div');
      el.className = 'fh-swim-fish ' + (Math.random() < 0.5 ? 'fh-swim-ltr' : 'fh-swim-rtl');
      el.textContent = f.emoji;
      el.style.top = (8 + Math.random() * 72) + '%';
      el.style.animationDuration = (6 + Math.random() * 8).toFixed(2) + 's';
      el.style.animationDelay = '-' + (Math.random() * 6).toFixed(2) + 's';
      el.addEventListener('click', () => showAqDetail(f));
      els.aqTank.appendChild(el);
    });

    els.aqDexStrip.innerHTML = '';
    speciesInPond.forEach(f => {
      const count = save.caught[f.id];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'fh-dex-cell' + (count ? '' : ' unknown');
      if (count) {
        cell.innerHTML = `<span class="fh-dex-emoji">${f.emoji}</span><span class="fh-dex-word">${f.word}</span><span class="fh-dex-count">×${count}</span>`;
        cell.addEventListener('click', () => showAqDetail(f));
      } else {
        cell.innerHTML = `<span class="fh-dex-emoji">❓</span><span class="fh-dex-word">???</span>`;
      }
      els.aqDexStrip.appendChild(cell);
    });

    els.aqDetail.style.display = 'none';
  }

  function showAqDetail(f) {
    TTSManager.speak(f.word, 'en-US', 0.85);
    els.aqDetail.style.display = 'flex';
    els.aqDetail.innerHTML = `<span class="fh-dex-emoji">${f.emoji}</span><b>${f.word}</b> — ${f.zh}（已捕獲 ${save.caught[f.id] || 0} 次）`;
  }

  return { init };
})();
