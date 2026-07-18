/* ===== Typing Defense Module (打字防衛戰) =====
   Typing-of-the-Dead-style DOM battlefield: word-monsters march in from
   the right across 3 lanes toward a castle on the left; the player types
   their labels to zap them before they arrive. No canvas — monsters are
   plain divs positioned with a JS-driven rAF loop (style.left as a % of
   field width), which keeps this cheap and lets word labels stay crisp
   HTML text (easier to read for young players than canvas-rendered text).
*/

const TypingGame = (() => {
  const LANES = 3;
  const MONSTER_EMOJI = ['👾', '🧟', '👹', '🐗', '🦇', '💀', '🧌', '👻', '🕷️', '🐺'];
  const BOSS_EMOJI = ['🐉', '👑👹', '🦖', '☠️'];

  const DIFF_CONFIG = {
    easy:   { xp: 8,  crossMs: [22000, 30000], label: '簡單' },
    medium: { xp: 12, crossMs: [17000, 24000], label: '中等' },
    hard:   { xp: 16, crossMs: [13000, 19000], label: '困難' },
  };
  const WAVE_GEM_BONUS = { easy: 5, medium: 8, hard: 12 };
  const SPAWN_MS_START = 2200;
  const SPAWN_MS_MIN = 1100;
  const SPEED_GROWTH_PER_WAVE = 1.08; // +8%/wave
  const SPEED_GROWTH_CAP = 3.2;       // vs wave-1 speed
  const WRONG_SOUND_THROTTLE = 150;

  let difficulty = 'easy';
  let running = false;
  let rafId = null;
  let lastTime = 0;

  // Field/DOM
  let els = {};
  let fieldEl = null;

  // Round state
  let wave = 0;
  let kills = 0;
  let combo = 0;
  let hearts = 5;
  let monsters = [];      // { id, word, matched, lane, x, speed(pct/sec), el, wordEl, boss, dead }
  let nextMonsterId = 1;
  let targetId = null;
  let spawnTimer = 0;
  let spawnInterval = SPAWN_MS_START;
  let waveTotal = 0;      // monsters to spawn this wave
  let waveSpawned = 0;    // monsters spawned so far this wave
  let waveBannerT = 0;    // countdown while wave banner shows (pauses spawns/marching)
  let lastWrongSound = 0;

  // Stats for the defeat screen
  let roundStartTime = 0;
  let charsTyped = 0;     // correct chars typed (for WPM: 5 chars = 1 "word")
  let keyPresses = 0;
  let correctPresses = 0;
  let bestWPM = Number(localStorage.getItem('english_savior_typing_best') || 0);

  // ===== Setup =====
  function init() {
    const root = document.getElementById('tp-root');
    if (!root) return;
    root.innerHTML = buildHTML();
    cacheEls(root);
    bindStartScreen();

    document.addEventListener('keydown', onKeyDown);
    if ('ontouchstart' in window) buildMiniKeyboard();

    // No onShow() hook is wired up for this zone (unlike sling/spelling/sky),
    // so the loop runs continuously from init() onward and simply no-ops
    // while the zone is hidden or no round is running — this is what keeps
    // the game correctly paused/resumed across zone switches.
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);

    window.__typingTest = {
      monsters: () => monsters.filter(m => !m.dead).map(m => ({ word: m.word, x: m.x, lane: m.lane, done: m.matched })),
      typeWord: (w) => { for (const ch of String(w)) handleChar(ch); },
      hp: () => hearts,
      wave: () => wave,
      running: () => running,
      start: (diff) => startGame(diff || 'easy'),
      spawnNow: (word, xOverride) => spawnMonster(word, xOverride),
      kills: () => kills,
    };
  }

  function buildHTML() {
    return `
      <div class="tp-start-screen" id="tp-start-screen">
        <h3>⌨️ 打字防衛戰</h3>
        <p class="tp-instructions">怪物會從右邊往你的城堡前進！打出怪物身上的英文單字消滅它們，別讓怪物碰到城堡！</p>
        <div class="tp-diff-row">
          <button class="tp-diff-btn active" data-diff="easy">🟢 簡單</button>
          <button class="tp-diff-btn" data-diff="medium">🟡 中等</button>
          <button class="tp-diff-btn" data-diff="hard">🔴 困難</button>
        </div>
        <button class="tp-start-btn" id="tp-start-btn">🛡️ 開始防衛！</button>
        <p class="tp-best">🏆 最佳 WPM：<span id="tp-best-wpm">${bestWPM}</span></p>
      </div>

      <div class="tp-hud" id="tp-hud" style="display:none;">
        <span class="tp-hud-item">🌊 波數 <b id="tp-wave">1</b></span>
        <span class="tp-hud-item">💀 擊殺 <b id="tp-kills">0</b></span>
        <span class="tp-hud-item">🔥 連擊 <b id="tp-combo">×0</b></span>
        <span class="tp-hud-item">⌨️ WPM <b id="tp-wpm">0</b></span>
        <span class="tp-hud-item tp-hearts" id="tp-hearts">❤️❤️❤️❤️❤️</span>
      </div>

      <div class="tp-field" id="tp-field" style="display:none;">
        <div class="tp-sky"></div>
        <div class="tp-moon">🌙</div>
        <div class="tp-lane-lines">
          <div class="tp-lane-line"></div>
          <div class="tp-lane-line"></div>
        </div>
        <div class="tp-castle" id="tp-castle">🏰</div>
        <div class="tp-monster-layer" id="tp-monster-layer"></div>
        <div class="tp-laser-layer" id="tp-laser-layer"></div>
        <div class="tp-banner" id="tp-banner" style="display:none;"></div>
      </div>

      <div class="tp-keyboard" id="tp-keyboard" style="display:none;"></div>

      <div class="tp-over-screen" id="tp-over-screen" style="display:none;">
        <h3 id="tp-over-title">💥 城堡淪陷！</h3>
        <div class="tp-over-stats" id="tp-over-stats"></div>
        <button class="tp-start-btn" id="tp-over-btn">🔁 再來一場</button>
      </div>
    `;
  }

  function cacheEls(root) {
    els = {
      startScreen: root.querySelector('#tp-start-screen'),
      startBtn: root.querySelector('#tp-start-btn'),
      bestWpm: root.querySelector('#tp-best-wpm'),
      hud: root.querySelector('#tp-hud'),
      wave: root.querySelector('#tp-wave'),
      kills: root.querySelector('#tp-kills'),
      combo: root.querySelector('#tp-combo'),
      wpm: root.querySelector('#tp-wpm'),
      heartsEl: root.querySelector('#tp-hearts'),
      field: root.querySelector('#tp-field'),
      castle: root.querySelector('#tp-castle'),
      monsterLayer: root.querySelector('#tp-monster-layer'),
      laserLayer: root.querySelector('#tp-laser-layer'),
      banner: root.querySelector('#tp-banner'),
      keyboard: root.querySelector('#tp-keyboard'),
      overScreen: root.querySelector('#tp-over-screen'),
      overTitle: root.querySelector('#tp-over-title'),
      overStats: root.querySelector('#tp-over-stats'),
      overBtn: root.querySelector('#tp-over-btn'),
    };
    fieldEl = els.field;
  }

  function bindStartScreen() {
    document.querySelectorAll('.tp-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tp-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });
    els.startBtn.addEventListener('click', () => startGame(difficulty));
    els.overBtn.addEventListener('click', () => startGame(difficulty));
  }

  function buildMiniKeyboard() {
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    els.keyboard.innerHTML = rows.map(row => `
      <div class="tp-key-row">
        ${row.split('').map(ch => `<button class="tp-key" data-key="${ch.toLowerCase()}">${ch}</button>`).join('')}
      </div>
    `).join('');
    els.keyboard.addEventListener('click', (e) => {
      const btn = e.target.closest('.tp-key');
      if (!btn || !running) return;
      handleChar(btn.dataset.key);
    });
  }

  // ===== Round lifecycle =====
  function startGame(diff) {
    difficulty = diff;
    wave = 0;
    kills = 0;
    combo = 0;
    hearts = 5;
    monsters.forEach(m => m.el && m.el.remove());
    monsters = [];
    targetId = null;
    charsTyped = 0;
    keyPresses = 0;
    correctPresses = 0;
    roundStartTime = performance.now();
    spawnInterval = SPAWN_MS_START;

    els.startScreen.style.display = 'none';
    els.overScreen.style.display = 'none';
    els.hud.style.display = 'flex';
    els.field.style.display = 'block';
    if ('ontouchstart' in window) els.keyboard.style.display = 'block';

    GameEngine.setDeferLevelUp(true);
    running = true;
    startWave();
    updateHUD();
  }

  function startWave() {
    wave++;
    waveTotal = 6 + wave;
    waveSpawned = 0;
    spawnTimer = 0;
    showBanner(`🌊 第 ${wave} 波來襲！`, 1400);
    updateHUD();
  }

  function showBanner(text, ms) {
    els.banner.textContent = text;
    els.banner.style.display = 'flex';
    waveBannerT = ms / 1000;
  }

  function endGame() {
    running = false;
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    const elapsedMin = Math.max((performance.now() - roundStartTime) / 60000, 0.05);
    const wpm = Math.round((charsTyped / 5) / elapsedMin);
    const accuracy = keyPresses > 0 ? Math.round((correctPresses / keyPresses) * 100) : 100;
    if (wpm > bestWPM) {
      bestWPM = wpm;
      localStorage.setItem('english_savior_typing_best', String(bestWPM));
    }

    const bonusGems = Math.min((wave - 1) * 3, 30);
    if (bonusGems > 0) GameEngine.addGems(bonusGems);

    els.overTitle.textContent = '💥 城堡淪陷！';
    els.overStats.innerHTML = `
      <p>🌊 撐過 <b>${wave - 1}</b> 波，擊殺 <b>${kills}</b> 隻怪物</p>
      <p>⌨️ 打字速度 <b>${wpm}</b> WPM ／ 正確率 <b>${accuracy}%</b></p>
      <p>🏆 最佳 WPM：<b>${bestWPM}</b></p>
      <p>🎁 通關獎勵 <b>+${bonusGems} 💎</b></p>
    `;
    els.overScreen.style.display = 'flex';
    els.field.style.display = 'none';
    els.hud.style.display = 'none';
    els.keyboard.style.display = 'none';
  }

  // ===== Word pool =====
  function wordPool(diff) {
    return (VOCAB_DATA[diff] || []).filter(w => /^[A-Z]{3,8}$/.test(w.word.toUpperCase()));
  }

  function pickWord(excludeFirstLetters, excludeWords) {
    const pool = wordPool(difficulty);
    if (!pool.length) return null;
    let guard = 0;
    while (guard < 60) {
      guard++;
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const upper = entry.word.toUpperCase();
      if (excludeWords.has(upper)) continue;
      if (excludeFirstLetters.has(upper[0])) continue;
      return upper;
    }
    return null;
  }

  function pickBossWord(excludeFirstLetters, excludeWords) {
    const pool = wordPool('medium').concat(wordPool('hard'))
      .filter(w => /^[A-Z]{8,11}$/.test(w.word.toUpperCase()));
    let guard = 0;
    while (guard < 40) {
      guard++;
      let upper;
      if (pool.length) {
        upper = pool[Math.floor(Math.random() * pool.length)].word.toUpperCase();
      } else {
        // Fall back to joining two shorter words into one long boss word
        const a = pickWord(new Set(), new Set());
        const b = pickWord(new Set(), new Set());
        if (!a || !b) return null;
        upper = (a + b).slice(0, 11);
      }
      if (excludeWords.has(upper)) continue;
      if (excludeFirstLetters.has(upper[0])) continue;
      return upper;
    }
    return null;
  }

  // ===== Spawning =====
  function aliveMonsters() {
    return monsters.filter(m => !m.dead);
  }

  function laneIsClear(lane) {
    const inLane = aliveMonsters().filter(m => m.lane === lane);
    if (!inLane.length) return true;
    // Enough room near the spawn edge for a new monster
    return Math.min(...inLane.map(m => m.x)) < 82;
  }

  function currentSpeedPctPerSec(diff) {
    const [minMs, maxMs] = DIFF_CONFIG[diff].crossMs;
    const baseCrossMs = minMs + Math.random() * (maxMs - minMs);
    const growth = Math.min(Math.pow(SPEED_GROWTH_PER_WAVE, wave - 1), SPEED_GROWTH_CAP);
    const crossMs = baseCrossMs / growth;
    return 100 / (crossMs / 1000); // % of field per second
  }

  function spawnMonster(forceWord, xOverride) {
    const excludeFirstLetters = new Set(aliveMonsters().map(m => m.word[0]));
    const excludeWords = new Set(aliveMonsters().map(m => m.word));

    const isBossSlot = !forceWord && wave % 3 === 0 && waveSpawned === waveTotal - 1;
    let word = forceWord ? String(forceWord).toUpperCase() : null;
    if (!word) {
      word = isBossSlot
        ? pickBossWord(excludeFirstLetters, excludeWords)
        : pickWord(excludeFirstLetters, excludeWords);
    }
    if (!word) return null; // no safe word available right now — skip this spawn

    const openLanes = [];
    for (let l = 0; l < LANES; l++) if (laneIsClear(l)) openLanes.push(l);
    const lane = openLanes.length ? openLanes[Math.floor(Math.random() * openLanes.length)] : Math.floor(Math.random() * LANES);

    const boss = isBossSlot && !forceWord;
    const id = nextMonsterId++;
    const emoji = boss
      ? BOSS_EMOJI[Math.floor(Math.random() * BOSS_EMOJI.length)]
      : MONSTER_EMOJI[Math.floor(Math.random() * MONSTER_EMOJI.length)];

    const el = document.createElement('div');
    el.className = 'tp-mon' + (boss ? ' tp-mon-boss' : '');
    el.innerHTML = `<div class="tp-mon-emoji">${emoji}</div><div class="tp-mon-word"></div>`;
    els.monsterLayer.appendChild(el);

    const monster = {
      id, word, matched: 0, lane,
      x: xOverride != null ? xOverride : 100,
      speed: (boss ? 0.55 : 1) * currentSpeedPctPerSec(difficulty),
      el,
      wordEl: el.querySelector('.tp-mon-word'),
      boss, dead: false,
    };
    monsters.push(monster);
    if (!forceWord) waveSpawned++;
    positionMonster(monster);
    renderWord(monster);
    return monster;
  }

  function positionMonster(m) {
    m.el.style.left = `${m.x}%`;
    m.el.style.top = `${12 + m.lane * 28}%`;
  }

  function renderWord(m) {
    let html = '';
    for (let i = 0; i < m.word.length; i++) {
      html += `<span class="${i < m.matched ? 'done' : ''}">${m.word[i]}</span>`;
    }
    m.wordEl.innerHTML = html;
  }

  // ===== Typing input =====
  function onKeyDown(e) {
    if (!running) return;
    if (!document.getElementById('zone-typing').classList.contains('active')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1 || !/[a-zA-Z]/.test(e.key)) return;
    handleChar(e.key);
    e.preventDefault();
  }

  function handleChar(ch) {
    const letter = ch.toUpperCase();
    keyPresses++;

    let target = monsters.find(m => m.id === targetId && !m.dead);
    if (!target) {
      target = aliveMonsters().find(m => m.word[0] === letter && m.matched === 0);
      if (target) targetId = target.id;
    }

    if (target && target.word[target.matched] === letter) {
      correctPresses++;
      charsTyped++;
      target.matched++;
      renderWord(target);
      if (target.matched >= target.word.length) {
        killMonster(target);
      }
      return;
    }

    // Wrong key: buzz + combo reset, but keep the target's progress
    const now = performance.now();
    if (now - lastWrongSound > WRONG_SOUND_THROTTLE) {
      SoundManager.playWrong();
      lastWrongSound = now;
    }
    combo = 0;
    updateHUD();
    flashField();
  }

  function flashField() {
    fieldEl.classList.add('tp-flash');
    setTimeout(() => fieldEl.classList.remove('tp-flash'), 150);
  }

  // ===== Kill / castle-hit resolution =====
  function killMonster(m) {
    m.dead = true;
    if (targetId === m.id) targetId = null;
    kills++;
    combo++;

    SoundManager.playCorrect();
    fireLaser(m);
    m.el.classList.add('tp-mon-pop');

    let xp = DIFF_CONFIG[difficulty].xp;
    if (combo >= 10) xp = Math.round(xp * 1.5);
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    GameEngine.addXP(xp);
    GameEngine.recordWord(m.word);
    GameEngine.recordTypingWord();
    spawnFloater(m, `+${xp} XP`);

    if (kills % 5 === 0) {
      GameEngine.addGems(1);
      GameEngine.showToast('+1 💎', 'gem');
    }

    updateHUD();
    setTimeout(() => {
      m.el.remove();
      monsters = monsters.filter(mm => mm !== m);
    }, 260);
  }

  function monsterHitsCastle(m) {
    m.dead = true;
    if (targetId === m.id) targetId = null;
    combo = 0;
    hearts -= m.boss ? 2 : 1;
    hearts = Math.max(hearts, 0);
    m.el.remove();
    monsters = monsters.filter(mm => mm !== m);
    shakeField();
    updateHUD();
    if (hearts <= 0) {
      endGame();
    }
  }

  function shakeField() {
    fieldEl.classList.add('tp-shake');
    setTimeout(() => fieldEl.classList.remove('tp-shake'), 300);
  }

  function fireLaser(m) {
    const beam = document.createElement('div');
    beam.className = 'tp-laser';
    const topPct = 12 + m.lane * 28 + 6;
    beam.style.top = `${topPct}%`;
    beam.style.left = '4%';
    beam.style.width = `${Math.max(m.x - 4, 0)}%`;
    els.laserLayer.appendChild(beam);
    setTimeout(() => beam.remove(), 220);
  }

  function spawnFloater(m, text) {
    const f = document.createElement('div');
    f.className = 'tp-floater';
    f.textContent = text;
    f.style.left = `${m.x}%`;
    f.style.top = `${12 + m.lane * 28}%`;
    els.monsterLayer.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  // ===== HUD =====
  function updateHUD() {
    els.wave.textContent = String(wave);
    els.kills.textContent = String(kills);
    els.combo.textContent = `×${combo}`;
    els.combo.parentElement.classList.toggle('tp-combo-hot', combo >= 10);
    els.heartsEl.textContent = '❤️'.repeat(Math.max(hearts, 0)) + '🖤'.repeat(Math.max(5 - hearts, 0));

    const elapsedMin = Math.max((performance.now() - roundStartTime) / 60000, 0.01);
    const wpm = Math.round((charsTyped / 5) / elapsedMin);
    els.wpm.textContent = String(wpm);
  }

  // ===== Main loop =====
  // Runs continuously (started once from init()); pause/resume across zone
  // switches is handled here rather than via onShow() (app.js does not call
  // one for this module) by simply skipping update() while the zone is
  // hidden or no round is active.
  function loop(now) {
    rafId = requestAnimationFrame(loop);

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const zoneActive = document.getElementById('zone-typing').classList.contains('active');
    if (running && zoneActive) update(dt);
  }

  function update(dt) {
    if (waveBannerT > 0) {
      waveBannerT -= dt;
      if (waveBannerT <= 0) els.banner.style.display = 'none';
      return; // pause marching/spawning during the banner
    }

    // Spawning
    if (waveSpawned < waveTotal) {
      spawnTimer -= dt * 1000;
      if (spawnTimer <= 0) {
        spawnTimer = spawnInterval;
        spawnInterval = Math.max(SPAWN_MS_MIN, spawnInterval * 0.98);
        spawnMonster();
      }
    }

    // Marching
    for (const m of aliveMonsters()) {
      m.x -= m.speed * dt;
      if (m.x <= 2) {
        monsterHitsCastle(m);
        continue;
      }
      positionMonster(m);
    }

    updateHUD();

    // Wave clear check
    if (running && waveSpawned >= waveTotal && aliveMonsters().length === 0 && waveBannerT <= 0) {
      let gems = WAVE_GEM_BONUS[difficulty];
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 5;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
      }
      GameEngine.addGems(gems);
      GameEngine.showToast(`🌊 第 ${wave} 波清除！+${gems} 💎`, 'gem');
      SoundManager.playQuestComplete();
      startWave();
    }
  }

  return { init };
})();
