/* ===== Candy Word Crush Module =====
   Candy Crush Saga-style match-3 game for English learning.
   - The six candy types are foods with English names; level goals are
     shown as English words (tap a goal chip to hear it via TTS).
   - Matching 4+ candies spawns a ⭐ magic candy; tapping it opens a
     vocabulary question — answer correctly for a 3×3 blast and rewards.
   - Level progress persists in localStorage; word difficulty scales
     with the level (easy → medium → hard).
*/

const CandyGame = (() => {
  const SAVE_KEY = 'english_savior_candy';
  const COLS = 8, ROWS = 8;
  const STAR = 'star'; // special candy type

  const TYPES = [
    { id: 'apple',  emoji: '🍎', word: 'APPLE',  zh: '蘋果' },
    { id: 'banana', emoji: '🍌', word: 'BANANA', zh: '香蕉' },
    { id: 'grape',  emoji: '🍇', word: 'GRAPE',  zh: '葡萄' },
    { id: 'candy',  emoji: '🍬', word: 'CANDY',  zh: '糖果' },
    { id: 'donut',  emoji: '🍩', word: 'DONUT',  zh: '甜甜圈' },
    { id: 'cookie', emoji: '🍪', word: 'COOKIE', zh: '餅乾' },
  ];

  // ===== Persistent progress =====
  let progress = { level: 1, bestLevel: 0, quizCorrect: 0, quizWrong: 0, totalCleared: 0 };

  // ===== Level state =====
  let board = [];          // board[r][c] = { type: index } | { type: STAR } | null
  let goals = [];          // [{ type, need, got }]
  let moves = 0;
  let playing = false;     // a level is in progress
  let busy = false;        // input locked while animating / quiz open
  let selected = null;     // { r, c }
  let pointerStart = null;
  let quizWord = null;
  let quizTries = 0;
  let quizStarPos = null;
  let quizKind = 'wrap';

  // Spawn-juice state: makes new special candies impossible to miss
  let spawnFx = new Set();     // 'r,c' keys currently playing the one-shot spawn burst
  let lastSpawnBatch = [];     // most recent spawn batch, exposed to tests: [{r,c,kind}]
  let spawnFxTimer = null;
  let bannerTimer = null;

  let els = {};

  function init() {
    els = {
      level: document.getElementById('cd-level'),
      moves: document.getElementById('cd-moves'),
      goals: document.getElementById('cd-goals'),
      board: document.getElementById('cd-board'),
      wrap: document.getElementById('cd-board-wrap'),
      feedback: document.getElementById('cd-feedback'),
      startScreen: document.getElementById('cd-start-screen'),
      startStats: document.getElementById('cd-start-stats'),
      startBtn: document.getElementById('cd-start-btn'),
      resetBtn: document.getElementById('cd-reset-btn'),
      clearScreen: document.getElementById('cd-clear-screen'),
      clearInfo: document.getElementById('cd-clear-info'),
      nextBtn: document.getElementById('cd-next-btn'),
      failScreen: document.getElementById('cd-fail-screen'),
      failInfo: document.getElementById('cd-fail-info'),
      retryBtn: document.getElementById('cd-retry-btn'),
      quiz: document.getElementById('cd-quiz'),
      quizWordEl: document.getElementById('cd-quiz-word'),
      quizOptions: document.getElementById('cd-quiz-options'),
      quizFeedback: document.getElementById('cd-quiz-feedback'),
      fxLayer: document.getElementById('cd-fx-layer'),
      spawnBanner: document.getElementById('cd-spawn-banner'),
    };

    loadProgress();
    renderStartStats();
    els.level.textContent = `第 ${progress.level} 關`;
    // Screens are normal-flow panels; the board grid is hidden while one shows
    els.board.style.display = 'none';

    els.startBtn.addEventListener('click', () => startLevel(progress.level));
    els.nextBtn.addEventListener('click', () => startLevel(progress.level));
    els.retryBtn.addEventListener('click', () => startLevel(progress.level));
    els.resetBtn.addEventListener('click', () => {
      if (confirm('確定要從第 1 關重新開始嗎？（最佳紀錄會保留）')) {
        progress.level = 1;
        saveProgress();
        renderStartStats();
      }
    });

    // Pointer input: tap to select, tap neighbor to swap, or swipe
    els.board.addEventListener('pointerdown', onPointerDown);
    els.board.addEventListener('pointerup', onPointerUp);

    // Read/inject hook for automated tests (board state is closure-only)
    window.__candyTest = {
      board: () => board.map(row => row.map(c => (c ? { ...c } : null))),
      setCell: (r, c, cell) => { board[r][c] = cell; renderBoard(); },
      lastSpawn: () => lastSpawnBatch.map(p => ({ ...p })),
    };
  }

  // ===== Persistence =====
  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) progress = { ...progress, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
  }

  function saveProgress() {
    progress.bestLevel = Math.max(progress.bestLevel, progress.level - 1);
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  }

  // Difficulty tier by level: 1-9 easy, 10-19 medium, 20+ hard
  function tier() {
    return progress.level >= 20 ? 2 : progress.level >= 10 ? 1 : 0;
  }
  function tierName() { return ['easy', 'medium', 'hard'][tier()]; }

  function renderStartStats() {
    const total = progress.quizCorrect + progress.quizWrong;
    const acc = total > 0 ? Math.round(progress.quizCorrect / total * 100) : 0;
    els.startStats.innerHTML = `
      <div class="cd-stat"><span>🏁</span><b>第 ${progress.level} 關</b><small>目前進度</small></div>
      <div class="cd-stat"><span>🏆</span><b>${progress.bestLevel}</b><small>已通過關卡</small></div>
      <div class="cd-stat"><span>🍬</span><b>${progress.totalCleared}</b><small>消除糖果</small></div>
      <div class="cd-stat"><span>🎯</span><b>${acc}%</b><small>單字答對率</small></div>
    `;
    els.startBtn.textContent = progress.level > 1 ? `🍬 繼續第 ${progress.level} 關` : '🍬 開始遊戲';
  }

  // ===== Level lifecycle =====
  function startLevel(level) {
    els.startScreen.style.display = 'none';
    els.clearScreen.style.display = 'none';
    els.failScreen.style.display = 'none';
    els.quiz.style.display = 'none';
    els.board.style.display = 'grid';
    els.feedback.textContent = '';
    clearSpawnFx();

    // Goals: 2 candy types (3 from level 6), counts grow with level
    const goalCount = level >= 6 ? 3 : 2;
    const need = 10 + Math.min(12, Math.floor(level / 2) * 2);
    const typePool = shuffle(TYPES.map((_, i) => i)).slice(0, goalCount);
    goals = typePool.map(t => ({ type: t, need, got: 0 }));
    moves = 24;

    fillBoard();
    playing = true;
    busy = false;
    selected = null;

    renderHUD();
    renderGoals();
    renderBoard();
  }

  function levelClear() {
    playing = false;
    clearSpawnFx();
    // Rewards scale with difficulty tier
    let xp = [30, 45, 60][tier()];
    let gems = [5, 8, 11][tier()];
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
    GameEngine.recordCandy();
    SoundManager.playQuestComplete();

    els.clearInfo.innerHTML = `第 <b>${progress.level}</b> 關通過！<br>獲得 <b>${xp} XP</b> 和 <b>${gems} 💎</b>`;
    progress.level++;
    saveProgress();
    renderStartStats();
    els.nextBtn.textContent = `🍬 挑戰第 ${progress.level} 關`;
    els.board.style.display = 'none';
    els.clearScreen.style.display = 'flex';
  }

  function levelFail() {
    playing = false;
    clearSpawnFx();
    const done = goals.filter(g => g.got >= g.need).length;
    els.failInfo.innerHTML = `步數用完了！完成了 ${done} / ${goals.length} 個目標。<br><small>小提醒：一次消 4 顆會出現 ⭐ 魔法糖果，點它答題可以大爆炸！</small>`;
    els.board.style.display = 'none';
    els.failScreen.style.display = 'flex';
  }

  // ===== Board setup =====
  function randType() { return Math.floor(Math.random() * TYPES.length); }

  function fillBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let t;
        do {
          t = randType();
        } while (
          (c >= 2 && row[c - 1]?.type === t && row[c - 2]?.type === t) ||
          (r >= 2 && board[r - 1][c]?.type === t && board[r - 2][c]?.type === t)
        );
        row.push({ type: t });
      }
      board.push(row);
    }
    if (!hasAnyMove()) fillBoard();
  }

  // ===== Rendering =====
  function renderHUD() {
    els.level.textContent = `第 ${progress.level} 關`;
    els.moves.textContent = moves;
    els.moves.parentElement.classList.toggle('low', moves <= 5);
  }

  function renderGoals() {
    els.goals.innerHTML = '';
    goals.forEach(g => {
      const t = TYPES[g.type];
      const done = g.got >= g.need;
      const chip = document.createElement('button');
      chip.className = 'cd-goal' + (done ? ' done' : '');
      chip.innerHTML = `<span class="cd-goal-emoji">${t.emoji}</span>
        <span class="cd-goal-word">${t.word}</span>
        <span class="cd-goal-count">${done ? '✓' : `${Math.min(g.got, g.need)}/${g.need}`}</span>`;
      chip.title = `${t.zh}（點擊聆聽發音）`;
      chip.addEventListener('click', () => TTSManager.speak(t.word.toLowerCase(), 'en-US', 0.85));
      els.goals.appendChild(chip);
    });
  }

  function renderBoard(effects = {}) {
    // effects: { pop: Set('r,c'), fall: Set('r,c') }
    els.board.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        const div = document.createElement('div');
        div.className = 'cd-cell';
        div.dataset.r = r;
        div.dataset.c = c;
        if (cell) {
          if (cell.type === STAR) {
            const info = SPECIAL_INFO[cell.kind] || SPECIAL_INFO.wrap;
            div.classList.add('star', 'sp-' + (cell.kind || 'wrap'));
            if (spawnFx.has(r + ',' + c)) div.classList.add('cd-spawn');
            div.textContent = info.icon;
            div.title = `${info.name}：${info.desc}（點我答題引爆！）`;
          } else {
            div.classList.add('t' + cell.type);
            div.textContent = TYPES[cell.type].emoji;
          }
        }
        if (selected && selected.r === r && selected.c === c) div.classList.add('selected');
        if (effects.pop && effects.pop.has(r + ',' + c)) div.classList.add('pop');
        if (effects.fall && effects.fall.has(r + ',' + c)) div.classList.add('fall');
        els.board.appendChild(div);
      }
    }
  }

  // ===== Input =====
  function cellFromEvent(e) {
    const target = e.target.closest('.cd-cell');
    if (!target) return null;
    return { r: parseInt(target.dataset.r, 10), c: parseInt(target.dataset.c, 10) };
  }

  function onPointerDown(e) {
    if (!playing || busy) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    pointerStart = { ...cell, x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (!playing || busy || !pointerStart) return;
    const start = pointerStart;
    pointerStart = null;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // Swipe: swap in the swipe direction
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? { r: 0, c: dx > 0 ? 1 : -1 }
        : { r: dy > 0 ? 1 : -1, c: 0 };
      const other = { r: start.r + dir.r, c: start.c + dir.c };
      if (inBounds(other)) {
        selected = null;
        attemptSwap(start, other);
      }
      return;
    }

    // Tap
    const cell = cellFromEvent(e);
    if (!cell) return;

    // Tapping a star activates the vocabulary quiz
    if (board[cell.r][cell.c]?.type === STAR) {
      selected = null;
      openQuiz(cell);
      return;
    }

    if (!selected) {
      selected = cell;
      renderBoard();
    } else if (selected.r === cell.r && selected.c === cell.c) {
      selected = null;
      renderBoard();
    } else if (isAdjacent(selected, cell)) {
      const a = selected;
      selected = null;
      attemptSwap(a, cell);
    } else {
      selected = cell;
      renderBoard();
    }
  }

  function inBounds(p) { return p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS; }
  function isAdjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  // ===== Match-3 core =====
  function attemptSwap(a, b) {
    // Swiping a star (or into one) activates it instead of swapping
    const starPos = board[a.r][a.c]?.type === STAR ? a
      : board[b.r][b.c]?.type === STAR ? b : null;
    if (starPos) {
      openQuiz(starPos);
      return;
    }

    busy = true;
    swapCells(a, b);
    const matches = findMatches();

    if (matches.cells.size === 0) {
      // Invalid move — swap back with a shake
      renderBoard();
      const cellA = cellEl(a), cellB = cellEl(b);
      if (cellA) cellA.classList.add('shake');
      if (cellB) cellB.classList.add('shake');
      setTimeout(() => {
        swapCells(a, b);
        renderBoard();
        busy = false;
      }, 280);
      return;
    }

    moves--;
    renderHUD();
    renderBoard();
    setTimeout(() => resolveBoard(b, () => afterMove()), 120);
  }

  function cellEl(p) {
    return els.board.querySelector(`.cd-cell[data-r="${p.r}"][data-c="${p.c}"]`);
  }

  function swapCells(a, b) {
    const tmp = board[a.r][a.c];
    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = tmp;
  }

  // Find all horizontal/vertical runs of 3+; return matched cells and
  // runs annotated with their direction (needed for special spawning)
  function findMatches() {
    const cells = new Set();
    const runs = [];
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      for (let c = 1; c <= COLS; c++) {
        const same = c < COLS && board[r][c] && board[r][runStart] &&
          board[r][c].type !== STAR && board[r][c].type === board[r][runStart].type;
        if (!same) {
          if (c - runStart >= 3 && board[r][runStart] && board[r][runStart].type !== STAR) {
            const run = [];
            for (let i = runStart; i < c; i++) { cells.add(r + ',' + i); run.push({ r, c: i }); }
            runs.push({ cells: run, dir: 'h' });
          }
          runStart = c;
        }
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      let runStart = 0;
      for (let r = 1; r <= ROWS; r++) {
        const same = r < ROWS && board[r] && board[r][c] && board[runStart][c] &&
          board[r][c].type !== STAR && board[r][c].type === board[runStart][c].type;
        if (!same) {
          if (r - runStart >= 3 && board[runStart][c] && board[runStart][c].type !== STAR) {
            const run = [];
            for (let i = runStart; i < r; i++) { cells.add(i + ',' + c); run.push({ r: i, c }); }
            runs.push({ cells: run, dir: 'v' });
          }
          runStart = r;
        }
      }
    }
    return { cells, runs };
  }

  // Candy Crush-style special spawning:
  //   5+ straight line → 🌈 rainbow (clears every candy of a goal type)
  //   L/T intersection  → 🎁 wrapped (5×5 blast)
  //   exactly 4 in line → 🍭 striped (horizontal match clears its column,
  //                        vertical match clears its row — like the original)
  function planSpecials(runs, swapPos) {
    const specials = [];
    const used = new Set();
    const spawnAt = run =>
      swapPos && run.cells.some(p => p.r === swapPos.r && p.c === swapPos.c)
        ? swapPos
        : run.cells[Math.floor(run.cells.length / 2)];

    // Rainbow first (most powerful)
    runs.forEach(run => {
      if (run.cells.length >= 5) {
        specials.push({ pos: spawnAt(run), kind: 'rainbow' });
        used.add(run);
      }
    });
    // Wrapped: an H run crossing a V run of the same type
    runs.filter(r => r.dir === 'h' && !used.has(r)).forEach(h => {
      runs.filter(r => r.dir === 'v' && !used.has(r) && !used.has(h)).forEach(v => {
        const inter = h.cells.find(p => v.cells.some(q => q.r === p.r && q.c === p.c));
        if (inter) {
          specials.push({ pos: inter, kind: 'wrap' });
          used.add(h);
          used.add(v);
        }
      });
    });
    // Striped: remaining 4-in-a-line
    runs.forEach(run => {
      if (!used.has(run) && run.cells.length === 4) {
        specials.push({ pos: spawnAt(run), kind: run.dir === 'h' ? 'stripeCol' : 'stripeRow' });
        used.add(run);
      }
    });
    return specials;
  }

  const SPECIAL_INFO = {
    stripeRow: { icon: '🍭', name: '條紋糖果', desc: '清除一整行', toast: '🍭 條紋糖果出現了！點它答題清除一整行！' },
    stripeCol: { icon: '🍭', name: '條紋糖果', desc: '清除一整列', toast: '🍭 條紋糖果出現了！點它答題清除一整列！' },
    wrap:      { icon: '🎁', name: '包裝糖果', desc: '5×5 大爆炸', toast: '🎁 包裝糖果出現了！點它答題引爆 5×5！' },
    rainbow:   { icon: '🌈', name: '彩虹糖果', desc: '清除所有目標糖果', toast: '🌈 彩虹糖果出現了！點它答題清光目標糖果！' },
  };

  // Remove matches, spawn stars, apply gravity, cascade until stable
  function resolveBoard(swapPos, onDone) {
    const { cells, runs } = findMatches();
    if (cells.size === 0) {
      onDone();
      return;
    }

    // Count collected candies toward goals
    cells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = board[r][c];
      if (!cell || cell.type === STAR) return;
      const goal = goals.find(g => g.type === cell.type);
      if (goal) goal.got++;
      progress.totalCleared++;
    });

    // Candy Crush-style specials from this wave of matches
    const specials = planSpecials(runs, swapPos);

    renderGoals();
    saveProgress();

    // Pop animation, then remove + gravity + refill
    renderBoard({ pop: cells });
    setTimeout(() => {
      cells.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = null;
      });
      // Mark new specials with a transient _new flag so we can find their
      // FINAL resting position after gravity (gravity may slide them down
      // if there were gaps below in the same column).
      specials.forEach(s => {
        board[s.pos.r][s.pos.c] = { type: STAR, kind: s.kind, _new: true };
      });
      const fell = applyGravity();
      const spawned = collectNewSpecials();
      if (spawned.length) registerSpawn(spawned);
      renderBoard({ fall: fell });
      // Cascade
      setTimeout(() => resolveBoard(null, onDone), 220);
    }, 240);
  }

  // Find cells whose _new flag was just set (post-gravity final position),
  // clearing the flag so they aren't picked up again next cascade wave.
  function collectNewSpecials() {
    const found = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell && cell._new) {
          found.push({ r, c, kind: cell.kind });
          delete cell._new;
        }
      }
    }
    return found;
  }

  // ===== Spawn juice: make new specials impossible to miss =====
  function registerSpawn(positions) {
    lastSpawnBatch = positions.map(p => ({ ...p }));
    positions.forEach(p => spawnFx.add(p.r + ',' + p.c));
    clearTimeout(spawnFxTimer);
    spawnFxTimer = setTimeout(() => {
      spawnFx.clear();
      if (playing) renderBoard();
    }, 700);

    showSpawnBubbles(positions);
    showSpawnBanner(positions);
    SoundManager.playAchievement();
  }

  // "Tap me!" bubbles floating above each freshly spawned special
  function showSpawnBubbles(positions) {
    if (!els.fxLayer) return;
    positions.slice(0, 4).forEach(p => {
      const bubble = document.createElement('div');
      bubble.className = 'cd-spawn-bubble';
      bubble.textContent = '👆 點我！';
      bubble.style.left = ((p.c + 0.5) / COLS * 100) + '%';
      bubble.style.top = ((p.r + 0.5) / ROWS * 100) + '%';
      els.fxLayer.appendChild(bubble);
      setTimeout(() => bubble.remove(), 2600);
    });
  }

  // Big colorful banner announcing what kind of special just spawned
  function showSpawnBanner(positions) {
    if (!els.spawnBanner) return;
    const priority = { rainbow: 3, wrap: 2, stripeRow: 1, stripeCol: 1 };
    const top = positions.reduce((a, b) => (priority[b.kind] > priority[a.kind] ? b : a), positions[0]);
    const info = SPECIAL_INFO[top.kind] || SPECIAL_INFO.wrap;
    els.spawnBanner.textContent = positions.length > 1 ? `${info.toast}（×${positions.length}）` : info.toast;

    // Restart the CSS animation even if it's already mid-flight
    els.spawnBanner.classList.remove('show');
    void els.spawnBanner.offsetWidth;
    els.spawnBanner.classList.add('show');

    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => els.spawnBanner.classList.remove('show'), 3000);
  }

  // Clear all transient spawn-juice overlays (called when the board is
  // hidden behind a screen, or a fresh level starts)
  function clearSpawnFx() {
    spawnFx.clear();
    clearTimeout(spawnFxTimer);
    clearTimeout(bannerTimer);
    if (els.fxLayer) els.fxLayer.innerHTML = '';
    if (els.spawnBanner) {
      els.spawnBanner.classList.remove('show');
      els.spawnBanner.textContent = '';
    }
  }

  // Drop candies down and refill from the top; returns Set of moved cells
  function applyGravity() {
    const fell = new Set();
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c]) {
          if (write !== r) {
            board[write][c] = board[r][c];
            board[r][c] = null;
            fell.add(write + ',' + c);
          }
          write--;
        }
      }
      for (let r = write; r >= 0; r--) {
        board[r][c] = { type: randType() };
        fell.add(r + ',' + c);
      }
    }
    return fell;
  }

  function afterMove() {
    // Goals complete?
    if (goals.every(g => g.got >= g.need)) {
      busy = false;
      setTimeout(() => levelClear(), 300);
      return;
    }
    if (moves <= 0) {
      busy = false;
      setTimeout(() => levelFail(), 300);
      return;
    }
    // Guarantee a playable board
    if (!hasAnyMove()) {
      GameEngine.showToast('🔀 沒有可消除的組合，重新洗牌！', 'info');
      shuffleBoard();
      renderBoard();
    }
    busy = false;
  }

  function hasAnyMove() {
    // A star on the board is always a playable move
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]?.type === STAR) return true;
      }
    }
    // Brute-force: any adjacent swap that creates a match
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const b2 = { r: r + dr, c: c + dc };
          if (!inBounds(b2)) continue;
          swapCells({ r, c }, b2);
          const found = findMatches().cells.size > 0;
          swapCells({ r, c }, b2);
          if (found) return true;
        }
      }
    }
    return false;
  }

  function shuffleBoard() {
    const flat = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(board[r][c]);
    let guard = 0;
    do {
      shuffleInPlace(flat);
      let i = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c] = flat[i++];
      guard++;
    } while ((findMatches().cells.size > 0 || !hasAnyMove()) && guard < 50);
  }

  // ===== Vocabulary quiz (magic star) =====
  function openQuiz(starPos) {
    busy = true;
    clearSpawnFx();
    quizStarPos = starPos;
    quizKind = board[starPos.r][starPos.c]?.kind || 'wrap';
    quizTries = 0;

    const info = SPECIAL_INFO[quizKind];
    const titleEl = document.getElementById('cd-quiz-title');
    if (titleEl) titleEl.textContent = `${info.icon} ${info.name}單字題（${info.desc}）`;

    // Quiz only words whose zh field yields a concise meaning (either the
    // "含義 — 說明" format or a **含義** marker inside an example sentence)
    const fullPool = VOCAB_DATA[tierName()];
    const pool = fullPool.filter(w => {
      const m = shortZh(w.zh);
      return m && m.length <= 8 && m !== w.zh;
    });
    const source = pool.length >= 8 ? pool : fullPool;
    quizWord = source[Math.floor(Math.random() * source.length)];

    // Options: correct Chinese meaning + 3 distractors with distinct meanings
    const options = [quizWord];
    let guard = 0;
    while (options.length < 4 && guard < 300) {
      const w = source[Math.floor(Math.random() * source.length)];
      if (!options.some(o => o.word === w.word || shortZh(o.zh) === shortZh(w.zh))) {
        options.push(w);
      }
      guard++;
    }
    const shuffled = shuffle(options);

    els.quizWordEl.innerHTML = '';
    const wordSpan = document.createElement('span');
    wordSpan.textContent = `${quizWord.hint} ${quizWord.word}`;
    els.quizWordEl.appendChild(wordSpan);
    if (TTSManager.isSupported()) {
      els.quizWordEl.appendChild(TTSManager.createButton(quizWord.word, 'en-US'));
      TTSManager.speak(quizWord.word, 'en-US', 0.85);
    }

    els.quizFeedback.textContent = '這個單字是什麼意思？';
    els.quizFeedback.className = 'cd-quiz-feedback';
    els.quizOptions.innerHTML = '';

    let displayOptions = shuffled;
    // Hint crystal: remove two wrong options
    if (GameEngine.hasBuff('hint')) {
      GameEngine.consumeBuff('hint');
      GameEngine.showToast('🔮 提示水晶生效！移除兩個錯誤選項', 'achievement');
      const oneWrong = shuffled.find(o => o.word !== quizWord.word);
      displayOptions = shuffle([quizWord, oneWrong]);
    }

    displayOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cd-quiz-option';
      btn.textContent = shortZh(opt.zh);
      btn.addEventListener('click', () => answerQuiz(opt, btn));
      els.quizOptions.appendChild(btn);
    });

    els.board.style.display = 'none';
    els.quiz.style.display = 'flex';
  }

  function shortZh(zh) {
    // Two zh formats exist in VOCAB_DATA:
    //   "劍 — 用來攻擊怪物的武器"       → meaning is the part before the dash
    //   "**嬰兒**殭屍比一般的殭屍跑得更快。" → meaning is the bolded segment
    const bold = zh.match(/\*\*(.+?)\*\*/);
    if (bold) return bold[1].trim();
    if (zh.includes('—')) return zh.split('—')[0].trim();
    return zh.trim();
  }

  function answerQuiz(opt, btn) {
    if (opt.word === quizWord.word) {
      const firstTry = quizTries === 0;
      SoundManager.playCorrect();
      progress.quizCorrect++;
      saveProgress();
      btn.classList.add('correct');
      els.quizOptions.querySelectorAll('.cd-quiz-option').forEach(b => b.disabled = true);
      els.quizFeedback.textContent = `✅ 正確！${quizWord.word} = ${shortZh(quizWord.zh)}`;
      els.quizFeedback.className = 'cd-quiz-feedback correct';

      GameEngine.recordWord(quizWord.word);
      if (firstTry) {
        let xp = 15, gems = 1;
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
      }

      setTimeout(() => {
        els.quiz.style.display = 'none';
        els.board.style.display = 'grid';
        detonate(quizStarPos);
      }, 900);
    } else {
      SoundManager.playWrong();
      progress.quizWrong++;
      saveProgress();
      quizTries++;
      btn.disabled = true;
      btn.classList.add('wrong');
      if (quizTries >= 2) {
        // Reveal the answer so they learn it, then let them click it
        els.quizOptions.querySelectorAll('.cd-quiz-option').forEach(b => {
          if (b.textContent === shortZh(quizWord.zh)) b.classList.add('reveal');
        });
        els.quizFeedback.textContent = `💡 答案是「${shortZh(quizWord.zh)}」，點它引爆魔法糖果！`;
        els.quizFeedback.className = 'cd-quiz-feedback hint';
      } else {
        els.quizFeedback.textContent = '❌ 再想想看！';
        els.quizFeedback.className = 'cd-quiz-feedback wrong';
      }
    }
  }

  // Which cells a special candy wipes out. Specials caught in the blast
  // chain-detonate too (no extra quiz needed — pure combo joy).
  function collectBlast(pos, kind, popped, visited) {
    visited.add(pos.r + ',' + pos.c);
    popped.add(pos.r + ',' + pos.c);

    const targets = [];
    if (kind === 'wrap') {
      for (let r = pos.r - 2; r <= pos.r + 2; r++) {
        for (let c = pos.c - 2; c <= pos.c + 2; c++) targets.push({ r, c });
      }
    } else if (kind === 'stripeRow') {
      for (let c = 0; c < COLS; c++) targets.push({ r: pos.r, c });
    } else if (kind === 'stripeCol') {
      for (let r = 0; r < ROWS; r++) targets.push({ r, c: pos.c });
    } else if (kind === 'rainbow') {
      // Clears every candy of the first unfinished goal type
      const goal = goals.find(g => g.got < g.need);
      const targetType = goal ? goal.type : mostCommonType();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] && board[r][c].type === targetType) targets.push({ r, c });
        }
      }
    }

    targets.forEach(p => {
      if (!inBounds(p) || !board[p.r][p.c]) return;
      const key = p.r + ',' + p.c;
      const cell = board[p.r][p.c];
      if (cell.type === STAR) {
        if (!visited.has(key)) {
          collectBlast(p, cell.kind || 'wrap', popped, visited); // chain reaction!
        }
      } else {
        popped.add(key);
      }
    });
  }

  function mostCommonType() {
    const counts = new Array(TYPES.length).fill(0);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] && board[r][c].type !== STAR) counts[board[r][c].type]++;
      }
    }
    return counts.indexOf(Math.max(...counts));
  }

  // Detonate the special at pos; collected candies count toward goals
  function detonate(pos) {
    const kind = board[pos.r][pos.c]?.kind || 'wrap';
    const popped = new Set();
    const visited = new Set();
    collectBlast(pos, kind, popped, visited);

    // Chained specials make it extra festive
    if (visited.size > 1) {
      GameEngine.showToast(`💥 連鎖引爆 ×${visited.size}！`, 'achievement');
    }

    popped.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = board[r][c];
      if (cell && cell.type !== STAR) {
        const goal = goals.find(g => g.type === cell.type);
        if (goal) goal.got++;
        progress.totalCleared++;
      }
    });
    renderGoals();
    saveProgress();
    renderBoard({ pop: popped });
    setTimeout(() => {
      popped.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = null;
      });
      const fell = applyGravity();
      renderBoard({ fall: fell });
      setTimeout(() => resolveBoard(null, () => afterMove()), 220);
    }, 260);
  }

  // ===== Utilities =====
  function shuffle(arr) {
    const a = [...arr];
    shuffleInPlace(a);
    return a;
  }
  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  return { init };
})();
