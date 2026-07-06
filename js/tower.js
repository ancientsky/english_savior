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

  // Letter bag: frequency-weighted so words are easy to find
  const LETTER_BAG =
    'EEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOUUUUU' +
    'NNNNNNRRRRRRTTTTTTLLLLSSSSSDDDDGGGHHHHMMMBBCCPPFFWWYYKKVJXQZ';

  let level = loadProgress();
  let dict = null;          // Set of valid words (uppercase)
  let prefixes = null;      // Set of every prefix of valid words
  let questPools = null;    // { easy: [...], medium: [...], hard: [...] }

  let board = [];           // ROWS×COLS letters
  let quest = null;         // { word, zh, hint }
  let boss = null;          // { emoji, name, hp, maxHp, atk, cd, cdLeft }
  let playerHp = 0;
  let combo = 0;
  let playing = false;
  let busy = false;         // during attack/refill animation
  let path = [];            // current trace: [{r, c}]
  let tracing = false;

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

  function startBattle() {
    buildDict();
    els.startScreen.style.display = 'none';
    els.winScreen.style.display = 'none';
    els.loseScreen.style.display = 'none';
    els.game.style.display = 'block';

    boss = makeBoss();
    els.playerIcon.textContent = GameEngine.getEquippedSkin?.()?.icon || '🧑‍🎓';
    playerHp = PLAYER_MAX_HP;
    combo = 0;
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
    els.board.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = document.createElement('div');
        d.className = 'tw-orb ' + orbClass(board[r][c]);
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
    els.floor.textContent = `🗼 第 ${level} 層`;
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
    els.combo.textContent = combo > 1 ? `🔥 COMBO ×${combo}` : '';
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
  }

  // ===== Combat resolution =====
  function submitPath() {
    if (!playing || busy) { path = []; paintPath(); return; }
    const word = currentWord();
    const p = path.slice();
    path = [];

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
    const dmg = computeDamage(word, isQuest);

    SoundManager.playCorrect();
    GameEngine.recordTowerWord();
    if (isQuest) GameEngine.recordWord(word);

    // Orb clear animation
    p.forEach((cell, i) => {
      const el = cellEl(cell);
      if (el) {
        el.classList.remove('active');
        setTimeout(() => el.classList.add('cleared'), i * 60);
      }
    });
    setTrace('');
    els.trace.textContent = isQuest
      ? `⭐ ${word}！任務單字雙倍傷害＋回血！`
      : `⚔️ ${word}（${word.length} 字母）`;

    setTimeout(() => {
      // Boss takes the hit
      boss.hp -= dmg;
      floatDamage(dmg, isQuest);
      els.boss.className = 'tw-boss hit';
      setTimeout(() => { if (playing) els.boss.className = 'tw-boss idle'; }, 500);

      if (isQuest) {
        playerHp = Math.min(PLAYER_MAX_HP, playerHp + QUEST_HEAL);
        GameEngine.addXP(10);
        GameEngine.addGems(1);
      }

      refill(p);
      updateHUD();

      if (boss.hp <= 0) {
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

  function computeDamage(word, isQuest) {
    let dmg = 8 * word.length * (word.length - 1); // 3→48, 5→160, 8→448
    dmg = Math.round(dmg * (1 + 0.15 * Math.min(combo - 1, 10)));
    if (isQuest) dmg *= 2;
    return dmg;
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

  function floatDamage(amount, isQuest, onPlayer) {
    const f = document.createElement('div');
    f.className = 'tw-float' + (isQuest ? ' quest' : '') + (onPlayer ? ' player' : '');
    f.textContent = onPlayer ? `-${amount}` : `-${amount}`;
    els.stage.appendChild(f);
    setTimeout(() => f.remove(), 1100);
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
      const kept = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!gone.has(r)) kept.push(board[r][col]);
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        board[r][col] = kept[ROWS - 1 - r] !== undefined ? kept[ROWS - 1 - r] : randomLetter();
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
