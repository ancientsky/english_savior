/* ===== Sentence Builder Module =====
   Duolingo-style word-order game with a Minecraft twist: tap shuffled
   word blocks to assemble the sentence shown in Chinese; every correct
   sentence adds a layer to your house — 8 sentences build a full home.
   Reuses GRAMMAR_DATA and VOCAB_DATA sentences (no new data needed).
*/

const BuilderGame = (() => {
  const SENTENCES_PER_HOUSE = 8;
  const DIFF_CONFIG = {
    easy:   { min: 4, max: 6, xp: 15, bonus: 10 },
    medium: { min: 6, max: 8, xp: 20, bonus: 15 },
    hard:   { min: 8, max: 11, xp: 25, bonus: 20 },
  };
  // House layers, bottom to top, one per completed sentence
  const HOUSE_LAYERS = ['🟫🟫🟫🟫', '🧱🧱🧱🧱', '🧱🪟🪟🧱', '🧱🚪🪟🧱', '🟧🟧🟧🟧', '🟧🟧🟧🟧', '🔺🔺🔺🔺', '🚩'];

  let difficulty = 'easy';
  let pool = [];            // prepared sentences for current difficulty
  let current = null;       // { tokens: [...], zh, display }
  let placed = [];          // indices into tiles
  let tiles = [];           // shuffled tokens [{ text, id }]
  let sentenceNum = 0;      // 0-based within the house
  let housesBuilt = 0;      // this session
  let wrongTries = 0;
  let checking = false;

  let els = {};

  function init() {
    els = {
      zh: document.getElementById('bd-zh'),
      slots: document.getElementById('bd-slots'),
      tiles: document.getElementById('bd-tiles'),
      feedback: document.getElementById('bd-feedback'),
      house: document.getElementById('bd-house'),
      progress: document.getElementById('bd-progress'),
      houses: document.getElementById('bd-houses'),
      startScreen: document.getElementById('bd-start-screen'),
      startBtn: document.getElementById('bd-start-btn'),
      doneScreen: document.getElementById('bd-done-screen'),
      doneInfo: document.getElementById('bd-done-info'),
      doneBtn: document.getElementById('bd-done-btn'),
      gameArea: document.getElementById('bd-game'),
    };

    document.querySelectorAll('.bd-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bd-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    els.startBtn.addEventListener('click', startHouse);
    els.doneBtn.addEventListener('click', startHouse);

    // Read-only hook for automated tests (token order is closure state)
    window.__builderTest = { current: () => (current ? { ...current } : null) };
  }

  // ===== Sentence pool =====
  function cleanZh(zh) {
    return zh.replace(/\*\*/g, '');
  }

  function tokenize(sentence) {
    // Strip trailing punctuation, keep contractions/hyphens inside words
    return sentence.replace(/[.!?]+\s*$/, '').trim().split(/\s+/);
  }

  function buildPool() {
    const cfg = DIFF_CONFIG[difficulty];
    pool = [];
    // Grammar sentences (have proper translations)
    GRAMMAR_DATA.forEach(q => {
      const full = q.sentence.replace(/_____/g, q.blank);
      if (full.includes('_')) return;
      const tokens = tokenize(full);
      if (tokens.length >= cfg.min && tokens.length <= cfg.max && q.translation) {
        pool.push({ tokens, zh: q.translation, display: full });
      }
    });
    // Vocab example sentences
    const tier = difficulty;
    VOCAB_DATA[tier].forEach(w => {
      const full = w.sentence.replace(/_____/g, w.word.toLowerCase());
      if (full.includes('_')) return;
      const tokens = tokenize(full);
      if (tokens.length >= cfg.min && tokens.length <= cfg.max) {
        pool.push({ tokens, zh: cleanZh(w.zh), display: full });
      }
    });
    shuffleInPlace(pool);
  }

  // ===== Round lifecycle =====
  function startHouse() {
    els.startScreen.style.display = 'none';
    els.doneScreen.style.display = 'none';
    els.gameArea.style.display = 'block';
    buildPool();
    sentenceNum = 0;
    GameEngine.setDeferLevelUp(true);
    renderHouse();
    nextSentence();
  }

  function houseComplete() {
    housesBuilt++;
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    GameEngine.setDeferLevelUp(true);

    let bonus = DIFF_CONFIG[difficulty].bonus;
    if (GameEngine.hasBuff('gem_bonus')) {
      bonus += 5;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
    }
    GameEngine.addGems(bonus);
    SoundManager.playQuestComplete();

    els.gameArea.style.display = 'none';
    els.doneInfo.innerHTML =
      `你用 ${SENTENCES_PER_HOUSE} 個正確句子蓋好了一棟房子！<br>完工獎勵 <b>+${bonus} 💎</b>（本次已蓋 ${housesBuilt} 棟）`;
    els.doneScreen.style.display = 'flex';
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
  }

  function nextSentence() {
    if (sentenceNum >= SENTENCES_PER_HOUSE) {
      houseComplete();
      return;
    }
    if (pool.length === 0) buildPool();
    current = pool.pop();
    placed = [];
    wrongTries = 0;
    checking = false;

    els.zh.innerHTML = '';
    const zhText = document.createElement('span');
    zhText.textContent = current.zh;
    els.zh.appendChild(zhText);
    if (TTSManager.isSupported()) {
      els.zh.appendChild(TTSManager.createButton(current.display, 'en-US'));
    }

    tiles = current.tokens.map((text, id) => ({ text, id }));
    shuffleInPlace(tiles);
    // Guard: a shuffle can accidentally be the correct order — reshuffle once
    if (tiles.every((t, i) => t.id === i) && tiles.length > 1) shuffleInPlace(tiles);

    els.feedback.textContent = '';
    els.feedback.className = 'bd-feedback';
    els.progress.textContent = `第 ${sentenceNum + 1} / ${SENTENCES_PER_HOUSE} 句`;
    render();
  }

  // ===== Interaction =====
  function placeTile(tileIdx) {
    if (checking || placed.includes(tileIdx)) return;
    placed.push(tileIdx);
    render();
    if (placed.length === tiles.length) checkAnswer();
  }

  function removePlaced(pos) {
    if (checking) return;
    placed.splice(pos, 1);
    render();
  }

  function useHintBuff() {
    // Hint crystal: auto-place the next correct token
    if (!GameEngine.hasBuff('hint') || checking) return false;
    const want = current.tokens[placed.length];
    const tileIdx = tiles.findIndex((t, i) => !placed.includes(i) && t.text === want);
    if (tileIdx === -1) return false;
    GameEngine.consumeBuff('hint');
    GameEngine.showToast('🔮 提示水晶生效！自動放上一塊', 'achievement');
    placeTile(tileIdx);
    return true;
  }

  function checkAnswer() {
    checking = true;
    const built = placed.map(i => tiles[i].text);
    const correct = built.every((w, i) => w === current.tokens[i]);

    if (correct) {
      SoundManager.playCorrect();
      els.feedback.innerHTML = `✅ ${current.display}`;
      els.feedback.className = 'bd-feedback correct';
      if (TTSManager.isSupported()) {
        TTSManager.speak(current.display, 'en-US', 0.9);
      }

      // Rewards
      let xp = DIFF_CONFIG[difficulty].xp;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      let gems = 1;
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }
      GameEngine.addXP(xp);
      GameEngine.addGems(gems);
      GameEngine.recordGrammar();
      GameEngine.recordBuilder();

      sentenceNum++;
      renderHouse(true);
      setTimeout(() => nextSentence(), 1600);
    } else {
      SoundManager.playWrong();
      wrongTries++;
      // Find the first wrong position and bounce those tiles back
      let firstWrong = built.findIndex((w, i) => w !== current.tokens[i]);
      if (firstWrong === -1) firstWrong = 0;

      // Revive feather: one extra chance without counting the miss
      if (wrongTries >= 3 && GameEngine.hasBuff('revive')) {
        GameEngine.consumeBuff('revive');
        GameEngine.showToast('🪶 復活羽毛生效！再試一次！', 'achievement');
        wrongTries--;
      }

      if (wrongTries >= 3) {
        // Show the correct sentence, then move on (no reward — but learning!)
        els.feedback.innerHTML = `💡 正確順序是：<b>${current.display}</b>`;
        els.feedback.className = 'bd-feedback hint';
        placed = current.tokens.map((_, i) => tiles.findIndex((t, j) => t.id === i));
        render();
        if (TTSManager.isSupported()) TTSManager.speak(current.display, 'en-US', 0.9);
        sentenceNum++; // layer still builds so the house always finishes
        renderHouse(true);
        setTimeout(() => nextSentence(), 2600);
      } else {
        els.feedback.textContent = `❌ 第 ${firstWrong + 1} 塊放錯了，退回重排！（第 ${wrongTries} / 2 次）`;
        els.feedback.className = 'bd-feedback wrong';
        // Return tiles from the first wrong position onward
        setTimeout(() => {
          placed = placed.slice(0, firstWrong);
          checking = false;
          render();
        }, 900);
      }
    }
  }

  // ===== Rendering =====
  function render() {
    // Build slots (placed words)
    els.slots.innerHTML = '';
    placed.forEach((tileIdx, pos) => {
      const b = document.createElement('button');
      b.className = 'bd-block placed';
      b.textContent = tiles[tileIdx].text;
      b.addEventListener('click', () => removePlaced(pos));
      els.slots.appendChild(b);
    });
    // Empty slot indicator
    for (let i = placed.length; i < tiles.length; i++) {
      const s = document.createElement('span');
      s.className = 'bd-slot-empty';
      els.slots.appendChild(s);
    }

    // Tile tray
    els.tiles.innerHTML = '';
    tiles.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'bd-block' + (placed.includes(i) ? ' used' : '');
      b.textContent = t.text;
      b.disabled = placed.includes(i);
      b.addEventListener('click', () => placeTile(i));
      els.tiles.appendChild(b);
    });

    // Hint buff button
    if (GameEngine.hasBuff('hint') && !checking && placed.length < tiles.length) {
      const hintBtn = document.createElement('button');
      hintBtn.className = 'bd-hint-btn';
      hintBtn.textContent = '🔮 用提示水晶放一塊';
      hintBtn.addEventListener('click', useHintBuff);
      els.tiles.appendChild(hintBtn);
    }
  }

  function renderHouse(justBuilt) {
    els.house.innerHTML = '';
    for (let i = 0; i < sentenceNum && i < HOUSE_LAYERS.length; i++) {
      const layer = document.createElement('div');
      layer.className = 'bd-layer';
      layer.textContent = HOUSE_LAYERS[i];
      if (justBuilt && i === sentenceNum - 1) layer.classList.add('new');
      els.house.appendChild(layer);
    }
    if (sentenceNum === 0) {
      const ground = document.createElement('div');
      ground.className = 'bd-layer ghost';
      ground.textContent = '🏗️ 空地';
      els.house.appendChild(ground);
    }
    els.houses.textContent = `🏘️ ${housesBuilt}`;
  }

  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  return { init };
})();
