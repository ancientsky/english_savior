/* ===== Word Boss Tower Module =====
   Tower of Saviors-style orb battle: drag a path through adjacent
   letter orbs on a 6×5 board to spell English words. Longer words and
   combo chains deal bigger damage to the boss; the boss strikes back
   every few turns. 12 boss types scale endlessly by floor; progress
   is saved (localStorage). Valid words = any curriculum word in
   VOCAB_DATA (3+ letters), so kids can attack with every word they
   know — a highlighted "quest word" (with Chinese hint) deals double
   damage and heals.
*/

const TowerGame = (() => {
  const STORAGE_KEY = 'english_savior_tower';
  const COLS = 6;
  const ROWS = 5;
  const PLAYER_MAX_HP = 100;
  const MIN_WORD_LEN = 3;
  const QUEST_HEAL = 15;

  // Boss roster — cycles every 12 floors with growing stats
  const BOSSES = [
    { emoji: '🟢', name: '史萊姆王' },
    { emoji: '🧟', name: '殭屍隊長' },
    { emoji: '💀', name: '骷髏射手' },
    { emoji: '🕷️', name: '蜘蛛女王' },
    { emoji: '🐗', name: '疣豬獸' },
    { emoji: '🧙‍♀️', name: '沼澤女巫' },
    { emoji: '🦑', name: '深海守衛' },
    { emoji: '🔥', name: '烈焰人' },
    { emoji: '👻', name: '幽靈船長' },
    { emoji: '☠️', name: '凋靈' },
    { emoji: '🐉', name: '終界巨龍' },
    { emoji: '👹', name: '塔頂大魔王' },
  ];

  // Elemental realms — cycle in lockstep with BOSSES (same index formula)
  // and theme the battle stage/board via CSS custom properties.
  const REALMS = [
    { name: '翠綠森林', bgA: '#102a18', bgB: '#153a1e', glow: 'rgba(110, 230, 130, 0.22)', accent: '#5aeb78' },
    { name: '烈焰荒地', bgA: '#2a130c', bgB: '#3a1810', glow: 'rgba(255, 110, 50, 0.24)', accent: '#ff7a3c' },
    { name: '冰霜雪原', bgA: '#0d2030', bgB: '#123044', glow: 'rgba(140, 210, 255, 0.22)', accent: '#7fd8ff' },
    { name: '雷電風暴', bgA: '#221a30', bgB: '#2c2140', glow: 'rgba(255, 224, 102, 0.22)', accent: '#ffe066' },
    { name: '劇毒沼澤', bgA: '#182a16', bgB: '#221a30', glow: 'rgba(182, 255, 77, 0.2)', accent: '#b6ff4d' },
    { name: '黃金沙漠', bgA: '#2e2410', bgB: '#3a2c12', glow: 'rgba(255, 206, 84, 0.25)', accent: '#ffce54' },
    { name: '深海遺跡', bgA: '#0a1e30', bgB: '#0f2a40', glow: 'rgba(60, 200, 220, 0.22)', accent: '#22c1d9' },
    { name: '暗影禁地', bgA: '#140b1c', bgB: '#1e1128', glow: 'rgba(178, 92, 255, 0.22)', accent: '#b25cff' },
    { name: '熔岩地獄', bgA: '#240a08', bgB: '#1a0605', glow: 'rgba(255, 77, 46, 0.3)', accent: '#ff5030' },
    { name: '天空之境', bgA: '#0a2432', bgB: '#123646', glow: 'rgba(92, 240, 255, 0.22)', accent: '#5cf0ff' },
    { name: '血月荒野', bgA: '#240808', bgB: '#160404', glow: 'rgba(255, 46, 77, 0.28)', accent: '#ff2e4d' },
    { name: '聖光聖殿', bgA: '#241c0a', bgB: '#2e2410', glow: 'rgba(255, 215, 106, 0.3)', accent: '#ffd76a' },
  ];

  // Letter bag: frequency-weighted so words are easy to find
  const LETTER_BAG =
    'EEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOUUUUU' +
    'NNNNNNRRRRRRTTTTTTLLLLSSSSSDDDDGGGHHHHMMMBBCCPPFFWWYYKKVJXQZ';

  let level = loadProgress();
  let dict = null;          // Set of valid words (uppercase)
  let prefixes = null;      // Set of every prefix of valid words
  let questPools = null;    // { easy: [...], medium: [...], hard: [...] }

  let board = [];           // ROWS×COLS letters
  let charged = [];         // ROWS×COLS booleans — 耀光珠 (charged orbs), stays in sync with board through refill()
  let quest = null;         // { word, zh, hint }
  let boss = null;          // { emoji, name, hp, maxHp, atk, cd, cdLeft }
  let playerHp = 0;
  let combo = 0;
  let lastComboRendered = 0; // combo value the badge last animated for (avoids re-popping on every updateHUD call)
  let lastHit = null;        // { dmg, crit, chargedCount } of the most recent attack — test hook + debugging
  let playing = false;
  let busy = false;         // during attack/refill animation
  let path = [];            // current trace: [{r, c}]
  let tracing = false;
  let currentRealmIdx = 0;  // active elemental realm (index into REALMS)
  const PARTICLE_CAP = 60;   // live .tw-particle nodes ceiling (perf safety)
  let liveParticleCount = 0;

  let els = {};

  function init() {
    els = {
      floor: document.getElementById('tw-floor'),
      stage: document.getElementById('tw-stage'),
      boss: document.getElementById('tw-boss'),
      bossName: document.getElementById('tw-boss-name'),
      bossHpBar: document.getElementById('tw-boss-hp-bar'),
      bossHpText: document.getElementById('tw-boss-hp-text'),
      bossCd: document.getElementById('tw-boss-cd'),
      playerIcon: document.getElementById('tw-player-icon'),
      playerHpBar: document.getElementById('tw-player-hp-bar'),
      playerHpText: document.getElementById('tw-player-hp-text'),
      combo: document.getElementById('tw-combo'),
      quest: document.getElementById('tw-quest'),
      trace: document.getElementById('tw-trace'),
      board: document.getElementById('tw-board'),
      traceSvg: document.getElementById('tw-trace-svg'),
      traceLine: document.getElementById('tw-trace-line'),
      game: document.getElementById('tw-game'),
      startScreen: document.getElementById('tw-start-screen'),
      startBtn: document.getElementById('tw-start-btn'),
      startFloor: document.getElementById('tw-start-floor'),
      winScreen: document.getElementById('tw-win-screen'),
      winInfo: document.getElementById('tw-win-info'),
      winBtn: document.getElementById('tw-win-btn'),
      loseScreen: document.getElementById('tw-lose-screen'),
      loseInfo: document.getElementById('tw-lose-info'),
      loseBtn: document.getElementById('tw-lose-btn'),
    };

    els.startBtn.addEventListener('click', startBattle);
    els.winBtn.addEventListener('click', startBattle);
    els.loseBtn.addEventListener('click', startBattle);

    els.board.addEventListener('pointerdown', onPointerDown);
    els.board.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    els.board.addEventListener('pointercancel', onPointerUp);

    els.startFloor.textContent = `目前塔層：第 ${level} 層`;
    if (els.traceSvg) els.traceSvg.setAttribute('viewBox', `0 0 ${COLS} ${ROWS}`);

    // Test hook: closure state + programmatic word submit
    window.__towerTest = {
      board: () => board.map(row => row.join('')),
      quest: () => (quest ? { ...quest } : null),
      boss: () => (boss ? { ...boss } : null),
      playerHp: () => playerHp,
      combo: () => combo,
      level: () => level,
      submitWord: w => {
        const p = findWordPath(w.toUpperCase());
        if (!p) return false;
        path = p;
        submitPath();
        return true;
      },
      isBusy: () => busy,
      wordPath: w => findWordPath(w.toUpperCase()),
      realm: () => ({ idx: currentRealmIdx, name: REALMS[currentRealmIdx].name }),
      traceActive: () => {
        const pts = els.traceLine && els.traceLine.getAttribute('points');
        if (!pts || !pts.trim()) return 0;
        return pts.trim().split(/\s+/).length;
      },
      charged: () => charged.map(row => row.slice()),
      lastHit: () => (lastHit ? { ...lastHit } : null),
    };
  }

  // ===== Persistence =====
  function loadProgress() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return d && d.level >= 1 ? d.level : 1;
    } catch {
      return 1;
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level }));
  }

  // ===== Dictionary (built lazily from VOCAB_DATA) =====
  function buildDict() {
    if (dict) return;
    dict = new Set();
    prefixes = new Set();
    questPools = { easy: [], medium: [], hard: [] };
    ['easy', 'medium', 'hard'].forEach(tier => {
      VOCAB_DATA[tier].forEach(w => {
        const word = w.word.toUpperCase();
        if (!/^[A-Z]+$/.test(word) || word.length < MIN_WORD_LEN) return;
        if (!dict.has(word) && word.length <= 8) {
          questPools[tier].push({ word, zh: shortZh(w.zh), hint: w.hint });
        }
        dict.add(word);
        for (let i = 1; i <= word.length; i++) prefixes.add(word.slice(0, i));
      });
    });
  }

  function shortZh(zh) {
    const m = zh.match(/\*\*(.+?)\*\*/);
    if (m) return m[1];
    return zh.split('—')[0].split('，')[0].trim();
  }

  function questTier() {
    if (level >= 20) return 'hard';
    if (level >= 10) return 'medium';
    return 'easy';
  }

  // ===== Boss / battle setup =====
  function makeBoss() {
    const idx = (level - 1) % BOSSES.length;
    const gen = Math.floor((level - 1) / BOSSES.length); // 0-based cycle count
    const b = BOSSES[idx];
    return {
      emoji: b.emoji,
      name: gen > 0 ? `${b.name} ${'Ⅱ Ⅲ Ⅳ Ⅴ'.split(' ')[Math.min(gen - 1, 3)]}` : b.name,
      maxHp: 150 + idx * 70 + gen * 900,
      hp: 150 + idx * 70 + gen * 900,
      atk: 12 + idx * 2 + gen * 8,
      cd: Math.max(3, 6 - Math.floor(idx / 4) - gen),
      cdLeft: Math.max(3, 6 - Math.floor(idx / 4) - gen),
    };
  }

  // Theme the stage/board via CSS custom properties on #tw-game so every
  // descendant (stage + board + orbs' .active state) inherits the palette.
  function applyRealm(idx) {
    currentRealmIdx = idx;
    const r = REALMS[idx];
    const el = els.game;
    if (!el) return;
    el.style.setProperty('--tw-bgA', r.bgA);
    el.style.setProperty('--tw-bgB', r.bgB);
    el.style.setProperty('--tw-glow', r.glow);
    el.style.setProperty('--tw-accent', r.accent);
  }

  function startBattle() {
    buildDict();
    els.startScreen.style.display = 'none';
    els.winScreen.style.display = 'none';
    els.loseScreen.style.display = 'none';
    els.game.style.display = 'block';

    boss = makeBoss();
    applyRealm((level - 1) % REALMS.length);
    els.playerIcon.textContent = GameEngine.getEquippedSkin?.()?.icon || '🧑‍🎓';
    playerHp = PLAYER_MAX_HP;
    combo = 0;
    lastComboRendered = 0;
    lastHit = null;
    playing = true;
    busy = false;
    path = [];
    GameEngine.setDeferLevelUp(true);

    generateBoard(null);
    pickQuest();
    renderBoard();
    updateHUD();
    setTrace('');
    els.boss.className = 'tw-boss idle';
  }

  function endBattle(won) {
    playing = false;
    tracing = false;
    busy = false;
    path = [];
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    els.game.style.display = 'none';

    if (won) {
      const tier = questTier();
      let xp = tier === 'hard' ? 60 : tier === 'medium' ? 45 : 30;
      let gems = tier === 'hard' ? 11 : tier === 'medium' ? 8 : 5;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 5;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
      }
      GameEngine.addXP(xp);
      GameEngine.addGems(gems);
      GameEngine.recordTowerBoss();
      SoundManager.playQuestComplete();

      els.winInfo.innerHTML =
        `你用單字的力量打倒了 <b>${boss.emoji} ${boss.name}</b>！<br>` +
        `獲得 <b>+${xp} XP</b> 和 <b>+${gems} 💎</b><br>準備挑戰第 ${level + 1} 層！`;
      level++;
      saveProgress();
      els.winScreen.style.display = 'flex';
      towerConfetti(els.winScreen);
    } else {
      els.loseInfo.innerHTML =
        `${boss.emoji} <b>${boss.name}</b> 太強了……<br>` +
        `別灰心！拼「任務單字」會回血又有雙倍傷害，長單字傷害更高！`;
      els.loseScreen.style.display = 'flex';
    }
    els.startFloor.textContent = `目前塔層：第 ${level} 層`;
  }

  // ===== Board generation =====
  function randomLetter() {
    return LETTER_BAG[Math.floor(Math.random() * LETTER_BAG.length)];
  }

  // Generate a fresh board; if seedWord given, lay it along a random
  // adjacent path first so it is guaranteed traceable.
  function generateBoard(seedWord) {
    for (let tries = 0; tries < 60; tries++) {
      board = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, randomLetter));
      charged = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => Math.random() < 0.12));
      if (!seedWord) return;
      if (seedPath(seedWord)) return;
    }
  }

  function seedPath(word) {
    const start = { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) };
    const p = [start];
    const used = new Set([start.r * COLS + start.c]);
    while (p.length < word.length) {
      const cur = p[p.length - 1];
      const opts = neighbors(cur).filter(n => !used.has(n.r * COLS + n.c));
      if (opts.length === 0) return false;
      const next = opts[Math.floor(Math.random() * opts.length)];
      p.push(next);
      used.add(next.r * COLS + next.c);
    }
    p.forEach((cell, i) => { board[cell.r][cell.c] = word[i]; });
    return true;
  }

  function neighbors(cell) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = cell.r + dr, c = cell.c + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push({ r, c });
      }
    }
    return out;
  }

  // DFS: find a trace path spelling `word`, or null
  function findWordPath(word) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = dfs(word, 0, { r, c }, new Set());
        if (p) return p;
      }
    }
    return null;
  }

  function dfs(word, i, cell, visited) {
    if (board[cell.r][cell.c] !== word[i]) return null;
    const key = cell.r * COLS + cell.c;
    visited.add(key);
    if (i === word.length - 1) {
      visited.delete(key);
      return [cell];
    }
    for (const n of neighbors(cell)) {
      if (visited.has(n.r * COLS + n.c)) continue;
      const rest = dfs(word, i + 1, n, visited);
      if (rest) {
        visited.delete(key);
        return [cell, ...rest];
      }
    }
    visited.delete(key);
    return null;
  }

  // ===== Quest word =====
  function pickQuest() {
    const pool = questPools[questTier()];
    // Prefer a quest already traceable on the current board
    for (let tries = 0; tries < 60; tries++) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      if (cand.word !== (quest && quest.word) && findWordPath(cand.word)) {
        quest = cand;
        renderQuest();
        return;
      }
    }
    // None found — reseed the board around a fresh quest word
    quest = pool[Math.floor(Math.random() * pool.length)];
    generateBoard(quest.word);
    renderBoard();
    GameEngine.showToast('🔄 重新洗珠，任務單字登場！', 'achievement');
    renderQuest();
  }

  function renderQuest() {
    els.quest.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'tw-quest-label';
    label.textContent = '⭐ 任務單字';
    els.quest.appendChild(label);
    const hint = document.createElement('span');
    hint.className = 'tw-quest-hint';
    const tier = questTier();
    // easy: show the word too; medium: first letter; hard: meaning only
    let extra = '';
    if (tier === 'easy') extra = ` = ${quest.word}`;
    else if (tier === 'medium') extra = `（${quest.word[0]}... ${quest.word.length} 個字母）`;
    else extra = `（${quest.word.length} 個字母）`;
    hint.textContent = `${quest.hint} ${quest.zh}${extra}`;
    els.quest.appendChild(hint);
    if (TTSManager.isSupported()) {
      els.quest.appendChild(TTSManager.createButton(quest.word.toLowerCase(), 'en-US'));
    }
    // Hint crystal: reveal the quest path briefly
    if (GameEngine.hasBuff('hint')) {
      const btn = document.createElement('button');
      btn.className = 'tw-hint-btn';
      btn.textContent = '🔮 顯示路徑';
      btn.addEventListener('click', () => {
        if (!GameEngine.hasBuff('hint') || busy) return;
        const p = findWordPath(quest.word);
        if (!p) return;
        GameEngine.consumeBuff('hint');
        GameEngine.showToast('🔮 提示水晶生效！', 'achievement');
        p.forEach((cell, i) => {
          const el = cellEl(cell);
          if (el) setTimeout(() => el.classList.add('hinted'), i * 120);
        });
        setTimeout(() => {
          els.board.querySelectorAll('.hinted').forEach(el => el.classList.remove('hinted'));
        }, p.length * 120 + 1800);
        renderQuest();
      });
      els.quest.appendChild(btn);
    }
  }

  // ===== Rendering =====
  function renderBoard() {
    // Remove only the letter orbs — #tw-trace-svg (the drag-trace glow
    // line) lives in the same container and must survive every re-render.
    els.board.querySelectorAll('.tw-orb').forEach(el => el.remove());
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = document.createElement('div');
        d.className = 'tw-orb ' + orbClass(board[r][c]) + (charged[r][c] ? ' charged' : '');
        d.dataset.r = r;
        d.dataset.c = c;
        d.textContent = board[r][c];
        els.board.appendChild(d);
      }
    }
  }

  function orbClass(letter) {
    if ('AEIOU'.includes(letter)) return 'vowel';
    if ('JQXZ'.includes(letter)) return 'rare';
    return 'consonant';
  }

  function cellEl(cell) {
    return els.board.querySelector(`.tw-orb[data-r="${cell.r}"][data-c="${cell.c}"]`);
  }

  function updateHUD() {
    els.floor.textContent = `🗼 第 ${level} 層 · ${REALMS[currentRealmIdx].name}`;
    els.bossName.textContent = `${boss.name}`;
    els.boss.textContent = boss.emoji;
    const bp = Math.max(0, boss.hp / boss.maxHp);
    els.bossHpBar.style.width = (bp * 100) + '%';
    els.bossHpText.textContent = `${Math.max(0, boss.hp)} / ${boss.maxHp}`;
    els.bossCd.textContent = `⏳ ${boss.cdLeft}`;
    els.bossCd.classList.toggle('urgent', boss.cdLeft <= 1);
    const pp = Math.max(0, playerHp / PLAYER_MAX_HP);
    els.playerHpBar.style.width = (pp * 100) + '%';
    els.playerHpBar.classList.toggle('low', pp <= 0.3);
    els.playerHpText.textContent = `${Math.max(0, playerHp)} / ${PLAYER_MAX_HP}`;
    updateComboBadge();
  }

  // Escalating pop animation at combo 3 / 5 / 8+ (ported from js/empire.js
  // showComboBadge tiers). Re-triggers the pop only when combo actually
  // changed since the last render, so repeated updateHUD() calls for the
  // same combo value (e.g. once after refill, once after the boss-turn
  // check) don't replay the animation twice.
  function updateComboBadge() {
    if (combo === lastComboRendered) {
      els.combo.textContent = combo > 1 ? `🔥 COMBO ×${combo}` : '';
      return;
    }
    lastComboRendered = combo;
    els.combo.classList.remove('pop', 'tier3', 'tier5', 'tier8');
    if (combo <= 1) {
      els.combo.textContent = '';
      return;
    }
    els.combo.textContent = `🔥 COMBO ×${combo}`;
    void els.combo.offsetWidth; // reflow so the pop animation restarts
    const tier = combo >= 8 ? 'tier8' : combo >= 5 ? 'tier5' : combo >= 3 ? 'tier3' : '';
    els.combo.classList.add('pop');
    if (tier) els.combo.classList.add(tier);
  }

  function setTrace(word) {
    els.trace.textContent = word;
    els.trace.className = 'tw-trace';
    if (word.length >= MIN_WORD_LEN && dict.has(word)) {
      els.trace.className = 'tw-trace ' + (word === quest.word ? 'quest' : 'valid');
    }
  }

  function currentWord() {
    return path.map(p => board[p.r][p.c]).join('');
  }

  // ===== Trace input =====
  function cellFromEvent(e) {
    const rect = els.board.getBoundingClientRect();
    const cw = rect.width / COLS, ch = rect.height / ROWS;
    const c = Math.floor((e.clientX - rect.left) / cw);
    const r = Math.floor((e.clientY - rect.top) / ch);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    // require the pointer near the orb centre so diagonal drags don't
    // clip through unintended orbs
    const cx = rect.left + (c + 0.5) * cw, cy = rect.top + (r + 0.5) * ch;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (dist > Math.min(cw, ch) * 0.42) return null;
    return { r, c };
  }

  function onPointerDown(e) {
    if (!playing || busy) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    tracing = true;
    path = [cell];
    paintPath();
    setTrace(currentWord());
  }

  function onPointerMove(e) {
    if (!tracing || busy) return;
    // Fast drags coalesce pointermove events — replay the intermediate
    // positions so no orb along the swipe is skipped
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (evs.length ? evs : [e]).forEach(handleMovePoint);
  }

  function handleMovePoint(e) {
    if (!tracing || busy) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const last = path[path.length - 1];
    if (cell.r === last.r && cell.c === last.c) return;
    // Backtrack: sliding back onto the previous orb pops the last one
    if (path.length >= 2 && cell.r === path[path.length - 2].r && cell.c === path[path.length - 2].c) {
      path.pop();
      paintPath();
      setTrace(currentWord());
      return;
    }
    // Must be adjacent and unused
    const adj = Math.abs(cell.r - last.r) <= 1 && Math.abs(cell.c - last.c) <= 1;
    if (!adj || path.some(p => p.r === cell.r && p.c === cell.c)) return;
    path.push(cell);
    paintPath();
    setTrace(currentWord());
  }

  function onPointerUp() {
    if (!tracing) return;
    tracing = false;
    submitPath();
  }

  function paintPath() {
    els.board.querySelectorAll('.tw-orb').forEach(el => el.classList.remove('active'));
    path.forEach(p => {
      const el = cellEl(p);
      if (el) el.classList.add('active');
    });
    updateTraceLine();
  }

  // Draw the glowing trace polyline through the traced orb centres.
  // viewBox is "0 0 COLS ROWS" (see init), so plotting (c+0.5, r+0.5) needs
  // no pixel measurement and stays correct across resizes/fullscreen.
  function updateTraceLine() {
    if (!els.traceLine) return;
    if (path.length === 0) {
      els.traceLine.setAttribute('points', '');
      els.traceLine.classList.remove('quest', 'invalid', 'grow');
      return;
    }
    els.traceLine.setAttribute('points', path.map(p => `${p.c + 0.5},${p.r + 0.5}`).join(' '));
    const word = currentWord();
    const isQuestWord = !!quest && word === quest.word;
    els.traceLine.classList.toggle('quest', isQuestWord);
    els.traceLine.classList.toggle(
      'invalid',
      !isQuestWord && word.length >= MIN_WORD_LEN && !!dict && !dict.has(word)
    );
    els.traceLine.classList.toggle('grow', path.length >= 5 || combo >= 3);
  }

  // ===== Combat resolution =====
  function submitPath() {
    if (!playing || busy) { path = []; paintPath(); return; }
    const word = currentWord();
    const p = path.slice();
    path = [];
    updateTraceLine(); // path is now empty — clear the glow line immediately

    if (word.length < MIN_WORD_LEN || !dict.has(word)) {
      // Not a word — no turn used, but the combo chain breaks
      if (word.length >= MIN_WORD_LEN) {
        SoundManager.playWrong();
        combo = 0;
        setTrace('');
        els.trace.textContent = `❌ ${word} 不在單字表裡`;
        els.board.classList.add('shake');
        setTimeout(() => els.board.classList.remove('shake'), 400);
        updateHUD();
      } else {
        setTrace('');
      }
      paintPath();
      return;
    }

    busy = true;
    const isQuest = word === quest.word;
    combo++;
    // 耀光珠 (charged orbs) caught in this path add +25% dmg each; combo>=3
    // rolls a crit chance that scales up to 90% at combo 8+.
    const chargedCount = p.filter(cell => charged[cell.r][cell.c]).length;
    const critChance = combo >= 3 ? Math.min(0.9, 0.15 * (combo - 2)) : 0;
    const crit = critChance > 0 && Math.random() < critChance;
    const dmg = computeDamage(word, isQuest, chargedCount, crit);
    lastHit = { dmg, crit, chargedCount };

    SoundManager.playCorrect();
    GameEngine.recordTowerWord();
    if (isQuest) GameEngine.recordWord(word);

    // Orb clear animation + a small particle burst per orb (bigger/gold
    // for charged orbs) — position derived from the orb's live layout box
    // so it lines up regardless of grid gaps/padding/board size.
    p.forEach((cell, i) => {
      const el = cellEl(cell);
      if (el) {
        el.classList.remove('active');
        setTimeout(() => {
          el.classList.add('cleared');
          const pos = elPercent(el, els.board);
          if (!pos) return;
          if (charged[cell.r][cell.c]) {
            burstParticles(els.board, pos.x, pos.y, { count: 14, big: true, colors: ['#fff4c2', '#ffe066', '#ffce54'] });
          } else {
            burstParticles(els.board, pos.x, pos.y, { count: 6, colors: familyColors(board[cell.r][cell.c]) });
          }
        }, i * 60);
      }
    });
    setTrace('');
    els.trace.textContent = isQuest
      ? `⭐ ${word}！任務單字雙倍傷害＋回血！`
      : crit ? `⚡ ${word}（暴擊！）` : `⚔️ ${word}（${word.length} 字母）`;

    setTimeout(() => {
      // Boss takes the hit
      boss.hp -= dmg;
      floatDamage(dmg, isQuest, false, crit);
      spawnHitRing();
      if (crit) stageFlash();
      els.boss.className = 'tw-boss hit' + (crit ? ' crit' : '');
      setTimeout(() => { if (playing) els.boss.className = 'tw-boss idle'; }, 500);

      if (isQuest) {
        playerHp = Math.min(PLAYER_MAX_HP, playerHp + QUEST_HEAL);
        GameEngine.addXP(10);
        GameEngine.addGems(1);
      }

      refill(p);
      updateHUD();

      if (boss.hp <= 0) {
        stageFlash('death');
        burstParticles(els.stage, 50, 42, { count: 30, big: true, colors: ['#fff', '#ffe066', '#ffce54', '#7dffb0'] });
        els.boss.className = 'tw-boss dying';
        setTimeout(() => endBattle(true), 900);
        return;
      }

      if (isQuest) pickQuest();
      else if (!findWordPath(quest.word)) pickQuest(); // refill broke the quest path

      // Boss turn
      boss.cdLeft--;
      if (boss.cdLeft <= 0) {
        boss.cdLeft = boss.cd;
        setTimeout(bossAttack, 350);
      } else {
        busy = false;
        updateHUD();
      }
    }, p.length * 60 + 320);
  }

  function computeDamage(word, isQuest, chargedCount = 0, crit = false) {
    let dmg = 8 * word.length * (word.length - 1); // 3→48, 5→160, 8→448
    dmg *= (1 + 0.15 * Math.min(combo - 1, 10));
    if (isQuest) dmg *= 2;
    if (chargedCount > 0) dmg *= (1 + 0.25 * chargedCount); // 耀光珠：+25% per charged orb in the path
    if (crit) dmg *= 1.8;                                    // 暴擊：×1.8
    return Math.round(dmg);
  }

  function bossAttack() {
    if (!playing) return;
    // Revive feather blocks a killing blow
    if (playerHp - boss.atk <= 0 && GameEngine.hasBuff('revive')) {
      GameEngine.consumeBuff('revive');
      GameEngine.showToast('🪶 復活羽毛擋下了魔王的攻擊！', 'achievement');
      busy = false;
      updateHUD();
      return;
    }
    playerHp -= boss.atk;
    SoundManager.playWrong();
    els.boss.className = 'tw-boss attacking';
    els.stage.classList.add('hurt');
    floatDamage(boss.atk, false, true);
    setTimeout(() => {
      els.stage.classList.remove('hurt');
      if (playing) els.boss.className = 'tw-boss idle';
    }, 500);
    updateHUD();
    if (playerHp <= 0) {
      setTimeout(() => endBattle(false), 700);
    } else {
      busy = false;
    }
  }

  function floatDamage(amount, isQuest, onPlayer, crit) {
    const f = document.createElement('div');
    f.className = 'tw-float' + (isQuest ? ' quest' : '') + (onPlayer ? ' player' : '') + (crit ? ' crit' : '');
    f.textContent = crit ? `⚡ CRITICAL! -${amount}` : `-${amount}`;
    els.stage.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }

  // ===== Particles / celebration FX (all position:absolute overlays —
  // never add block-level height, see game-max budget note in CLAUDE.md) =====

  // Percentage position of `el`'s centre inside `container`'s box — driven
  // by live layout (getBoundingClientRect), so it's correct regardless of
  // the board's grid gaps/padding or any responsive resize/fullscreen.
  function elPercent(el, container) {
    if (!el || !container) return null;
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    if (!cr.width || !cr.height) return null;
    return {
      x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100,
      y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100,
    };
  }

  function familyColors(letter) {
    if ('AEIOU'.includes(letter)) return ['#ffe066', '#ffce54', '#fff2c4'];
    if ('JQXZ'.includes(letter)) return ['#d3a7ff', '#b25cff', '#f5e6ff'];
    return ['#7fd4f0', '#22c1d9', '#eafcff'];
  }

  // Short-lived radial burst of dots at (xPct, yPct) inside `container`.
  // Capped at PARTICLE_CAP live nodes total (across board + stage) so a
  // heavy combo sequence can never runaway the DOM.
  function burstParticles(container, xPct, yPct, opts = {}) {
    if (!container) return;
    const { count = 6, colors = ['#ffe066'], big = false } = opts;
    for (let i = 0; i < count; i++) {
      if (liveParticleCount >= PARTICLE_CAP) break;
      const el = document.createElement('div');
      el.className = 'tw-particle' + (big ? ' big' : '');
      const angle = Math.random() * Math.PI * 2;
      const dist = (big ? 34 : 20) + Math.random() * (big ? 34 : 22);
      el.style.left = xPct + '%';
      el.style.top = yPct + '%';
      el.style.setProperty('--tw-px', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--tw-py', (Math.sin(angle) * dist).toFixed(1) + 'px');
      el.style.background = colors[i % colors.length];
      container.appendChild(el);
      liveParticleCount++;
      setTimeout(() => { el.remove(); liveParticleCount--; }, 650);
    }
  }

  // Realm-accent impact ring at the boss's current position.
  function spawnHitRing() {
    const pos = elPercent(els.boss, els.stage);
    if (!pos) return;
    const ring = document.createElement('div');
    ring.className = 'tw-hit-ring';
    ring.style.left = pos.x + '%';
    ring.style.top = pos.y + '%';
    els.stage.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
  }

  // Brief full-stage colour flash — accent gold for a crit, white for a
  // boss kill. A plain overlay div (not an animated background-color on
  // .tw-stage itself) because the stage's own background is opaque
  // gradient layers that would hide a background-color change entirely.
  function stageFlash(kind) {
    if (!els.stage) return;
    const f = document.createElement('div');
    f.className = 'tw-stage-flash' + (kind ? ' ' + kind : '');
    els.stage.appendChild(f);
    setTimeout(() => f.remove(), 550);
  }

  // Victory confetti — ported from js/empire.js empConfetti(). Rendered
  // over the win screen (not #tw-stage): endBattle() hides #tw-game via
  // display:none in the very same synchronous tick before any repaint, so
  // anything appended to the stage at that point would never actually be
  // seen — the win screen is the surface that's actually visible when the
  // celebration plays.
  function towerConfetti(container, n = 24) {
    if (!container) return;
    const colors = ['#ffd166', '#ff6b81', '#4ade80', '#7fd4ff', '#c77dff', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'tw-confetti';
      c.style.left = 8 + Math.random() * 84 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.animationDuration = 1.3 + Math.random() * 0.9 + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
  }

  // ===== Gravity refill =====
  function refill(clearedPath) {
    const clearedByCol = {};
    clearedPath.forEach(p => {
      (clearedByCol[p.c] = clearedByCol[p.c] || []).push(p.r);
    });
    for (const c in clearedByCol) {
      const col = Number(c);
      const gone = new Set(clearedByCol[c]);
      // Walk bottom→top collecting survivors; keptCharged is pushed in
      // perfect lockstep with kept so index i always refers to the same
      // orb in both arrays — that's what keeps charged[][] glued to its
      // letter as gravity shifts everything down the column.
      const kept = [];
      const keptCharged = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!gone.has(r)) {
          kept.push(board[r][col]);
          keptCharged.push(charged[r][col]);
        }
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        const idx = ROWS - 1 - r;
        if (kept[idx] !== undefined) {
          board[r][col] = kept[idx];
          charged[r][col] = keptCharged[idx];
        } else {
          // Freshly spawned top orb — new letter, new charged roll.
          board[r][col] = randomLetter();
          charged[r][col] = Math.random() < 0.12;
        }
      }
    }
    renderBoard();
    // little drop-in animation on the whole board's new letters
    els.board.querySelectorAll('.tw-orb').forEach(el => el.classList.add('dropped'));
    setTimeout(() => {
      els.board.querySelectorAll('.tw-orb').forEach(el => el.classList.remove('dropped'));
    }, 350);
  }

  return { init };
})();
