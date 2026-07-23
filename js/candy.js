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

  // Themed-foods expansion: 10 daily food themes × 6 foods. Each level picks
  // a theme (level - 1) % 10, so the board's candies + goal words rotate
  // through a different food vocabulary set every day/level. Every emoji and
  // English word is unique across all 60 foods.
  const FOOD_THEMES = [
    {
      id: 'fruit1', name: '水果日 I', icon: '🍎',
      foods: [
        { id: 'apple',      emoji: '🍎', word: 'APPLE',      zh: '蘋果' },
        { id: 'banana',     emoji: '🍌', word: 'BANANA',     zh: '香蕉' },
        { id: 'grape',      emoji: '🍇', word: 'GRAPE',      zh: '葡萄' },
        { id: 'strawberry', emoji: '🍓', word: 'STRAWBERRY', zh: '草莓' },
        { id: 'orange',     emoji: '🍊', word: 'ORANGE',     zh: '柳橙' },
        { id: 'watermelon', emoji: '🍉', word: 'WATERMELON', zh: '西瓜' },
      ],
    },
    {
      id: 'fruit2', name: '水果日 II', icon: '🍑',
      foods: [
        { id: 'peach',     emoji: '🍑', word: 'PEACH',     zh: '桃子' },
        { id: 'cherry',    emoji: '🍒', word: 'CHERRY',    zh: '櫻桃' },
        { id: 'pineapple', emoji: '🍍', word: 'PINEAPPLE', zh: '鳳梨' },
        { id: 'kiwi',      emoji: '🥝', word: 'KIWI',      zh: '奇異果' },
        { id: 'lemon',     emoji: '🍋', word: 'LEMON',     zh: '檸檬' },
        { id: 'mango',     emoji: '🥭', word: 'MANGO',     zh: '芒果' },
      ],
    },
    {
      id: 'veggie', name: '蔬菜日', icon: '🥕',
      foods: [
        { id: 'carrot',   emoji: '🥕', word: 'CARROT',   zh: '紅蘿蔔' },
        { id: 'corn',     emoji: '🌽', word: 'CORN',     zh: '玉米' },
        { id: 'broccoli', emoji: '🥦', word: 'BROCCOLI', zh: '花椰菜' },
        { id: 'tomato',   emoji: '🍅', word: 'TOMATO',   zh: '番茄' },
        { id: 'potato',   emoji: '🥔', word: 'POTATO',   zh: '馬鈴薯' },
        { id: 'onion',    emoji: '🧅', word: 'ONION',    zh: '洋蔥' },
      ],
    },
    {
      id: 'breakfast', name: '早餐日', icon: '🍳',
      foods: [
        { id: 'bread',   emoji: '🍞', word: 'BREAD',   zh: '麵包' },
        { id: 'egg',     emoji: '🥚', word: 'EGG',     zh: '雞蛋' },
        { id: 'bacon',   emoji: '🥓', word: 'BACON',   zh: '培根' },
        { id: 'waffle',  emoji: '🧇', word: 'WAFFLE',  zh: '鬆餅' },
        { id: 'pancake', emoji: '🥞', word: 'PANCAKE', zh: '薄煎餅' },
        { id: 'milk',    emoji: '🥛', word: 'MILK',    zh: '牛奶' },
      ],
    },
    {
      id: 'dessert', name: '甜點日', icon: '🍰',
      foods: [
        { id: 'candy',     emoji: '🍬', word: 'CANDY',     zh: '糖果' },
        { id: 'donut',     emoji: '🍩', word: 'DONUT',     zh: '甜甜圈' },
        { id: 'cookie',    emoji: '🍪', word: 'COOKIE',    zh: '餅乾' },
        { id: 'cake',      emoji: '🍰', word: 'CAKE',      zh: '蛋糕' },
        { id: 'chocolate', emoji: '🍫', word: 'CHOCOLATE', zh: '巧克力' },
        { id: 'lollipop',  emoji: '🍭', word: 'LOLLIPOP',  zh: '棒棒糖' },
      ],
    },
    {
      id: 'fastfood', name: '速食日', icon: '🍔',
      foods: [
        { id: 'burger',   emoji: '🍔', word: 'BURGER',   zh: '漢堡' },
        { id: 'fries',    emoji: '🍟', word: 'FRIES',    zh: '薯條' },
        { id: 'hot_dog',  emoji: '🌭', word: 'HOT DOG',  zh: '熱狗' },
        { id: 'pizza',    emoji: '🍕', word: 'PIZZA',    zh: '披薩' },
        { id: 'taco',     emoji: '🌮', word: 'TACO',     zh: '塔可' },
        { id: 'sandwich', emoji: '🥪', word: 'SANDWICH', zh: '三明治' },
      ],
    },
    {
      id: 'drinks', name: '飲料日', icon: '🥤',
      foods: [
        { id: 'soda',    emoji: '🥤', word: 'SODA',    zh: '汽水' },
        { id: 'juice',   emoji: '🧃', word: 'JUICE',   zh: '果汁' },
        { id: 'tea',     emoji: '🍵', word: 'TEA',     zh: '茶' },
        { id: 'coffee',  emoji: '☕', word: 'COFFEE',  zh: '咖啡' },
        { id: 'boba',    emoji: '🧋', word: 'BOBA',    zh: '珍珠奶茶' },
        { id: 'coconut', emoji: '🥥', word: 'COCONUT', zh: '椰子' },
      ],
    },
    {
      id: 'seafood', name: '海鮮日', icon: '🦀',
      foods: [
        { id: 'shrimp',  emoji: '🍤', word: 'SHRIMP',  zh: '蝦子' },
        { id: 'crab',    emoji: '🦀', word: 'CRAB',    zh: '螃蟹' },
        { id: 'squid',   emoji: '🦑', word: 'SQUID',   zh: '魷魚' },
        { id: 'sushi',   emoji: '🍣', word: 'SUSHI',   zh: '壽司' },
        { id: 'lobster', emoji: '🦞', word: 'LOBSTER', zh: '龍蝦' },
        { id: 'octopus', emoji: '🐙', word: 'OCTOPUS', zh: '章魚' },
      ],
    },
    {
      id: 'asian', name: '亞洲美食日', icon: '🍜',
      foods: [
        { id: 'noodles',  emoji: '🍜', word: 'NOODLES',  zh: '麵條' },
        { id: 'rice',     emoji: '🍚', word: 'RICE',     zh: '白飯' },
        { id: 'dumpling', emoji: '🥟', word: 'DUMPLING', zh: '餃子' },
        { id: 'bento',    emoji: '🍱', word: 'BENTO',    zh: '便當' },
        { id: 'soup',     emoji: '🍲', word: 'SOUP',     zh: '湯' },
        { id: 'curry',    emoji: '🍛', word: 'CURRY',    zh: '咖哩飯' },
      ],
    },
    {
      id: 'party', name: '派對點心日', icon: '🎉',
      foods: [
        { id: 'popcorn',   emoji: '🍿', word: 'POPCORN',   zh: '爆米花' },
        { id: 'cupcake',   emoji: '🧁', word: 'CUPCAKE',   zh: '杯子蛋糕' },
        { id: 'pudding',   emoji: '🍮', word: 'PUDDING',   zh: '布丁' },
        { id: 'ice_cream', emoji: '🍨', word: 'ICE CREAM', zh: '冰淇淋' },
        { id: 'pretzel',   emoji: '🥨', word: 'PRETZEL',   zh: '蝴蝶餅' },
        { id: 'skewer',    emoji: '🍢', word: 'SKEWER',    zh: '串燒' },
      ],
    },
  ];
  let currentTheme = FOOD_THEMES[0];
  let TYPES = currentTheme.foods;

  // Which theme a given level uses (rotates through all 10 themes)
  function themeForLevel(level) {
    return FOOD_THEMES[(level - 1) % FOOD_THEMES.length];
  }

  // ===== Persistent progress =====
  let progress = { level: 1, bestLevel: 0, quizCorrect: 0, quizWrong: 0, totalCleared: 0, hintsSeen: {} };

  // ===== Level state =====
  let board = [];          // board[r][c] = { type: index } | { type: STAR } | null
  let goals = [];          // [{ type, need, got }]
  let moves = 0;
  let playing = false;     // a level is in progress
  let busy = false;        // input locked while animating / quiz open
  let introOpen = false;   // level-intro/theme-reveal card is showing (blocks input)
  let selected = null;     // { r, c }
  let pointerStart = null;
  let quizWord = null;
  let quizTries = 0;
  let quizStarPos = null;
  let quizKind = 'wrap';
  let quizCombo = null;    // { a, b, key, name } when the open quiz is a special×special combo

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
    currentTheme = themeForLevel(progress.level);
    TYPES = currentTheme.foods;
    renderStartStats();
    els.level.textContent = `第 ${progress.level} 關 · ${currentTheme.name}`;
    // Screens are normal-flow panels; the board grid is hidden while one shows
    els.board.style.display = 'none';

    buildIntroOverlay();

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
      types: () => TYPES.map(t => ({ ...t })),
      theme: () => currentTheme.id,
      themes: () => FOOD_THEMES.map(th => ({ id: th.id, name: th.name, foods: th.foods.map(f => ({ ...f })) })),
      introOpen: () => introOpen,
      startPlay: () => { if (introOpen) hideIntro(); },
      quizWord: () => quizWord ? { ...quizWord } : null,
      // Resolves once the board has finished animating/cascading and input
      // is unlocked again — lets tests await a swap/quiz-answer settling
      // without hardcoding timeout durations.
      stable: () => new Promise(resolve => {
        const check = () => { if (!busy) resolve(); else setTimeout(check, 40); };
        check();
      }),
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
    currentTheme = themeForLevel(level);
    TYPES = currentTheme.foods;

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
    showIntro();
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
    els.level.textContent = `第 ${progress.level} 關 · ${currentTheme.name}`;
    els.moves.textContent = moves;
    els.moves.parentElement.classList.toggle('low', moves <= 5);
  }

  // ===== Level-intro / theme-reveal card =====
  // Built once (DOM injected into cd-board-wrap, since index.html isn't
  // touched by this expansion) and shown at the top of every startLevel().
  // Blocks board input until the player taps 開始 (or a test dismisses it via
  // __candyTest.startPlay()).
  function buildIntroOverlay() {
    const el = document.createElement('div');
    el.className = 'cd-intro';
    el.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'cd-intro-card';

    const title = document.createElement('div');
    title.className = 'cd-intro-title';
    const iconEl = document.createElement('span');
    iconEl.className = 'cd-intro-icon';
    const nameEl = document.createElement('span');
    nameEl.className = 'cd-intro-name';
    title.appendChild(iconEl);
    title.appendChild(nameEl);

    const grid = document.createElement('div');
    grid.className = 'cd-intro-grid';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'cd-intro-play';
    playBtn.textContent = '🎮 開始';
    playBtn.addEventListener('click', () => hideIntro());

    card.appendChild(title);
    card.appendChild(grid);
    card.appendChild(playBtn);
    el.appendChild(card);
    els.wrap.appendChild(el);

    els.intro = el;
    els.introIcon = iconEl;
    els.introName = nameEl;
    els.introGrid = grid;
  }

  function renderIntro() {
    els.introIcon.textContent = currentTheme.icon;
    els.introName.textContent = currentTheme.name;
    els.introGrid.innerHTML = '';
    currentTheme.foods.forEach(f => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'cd-intro-food';
      tile.innerHTML = `<span class="cd-intro-emoji">${f.emoji}</span>
        <span class="cd-intro-word">${f.word}</span>
        <span class="cd-intro-zh">${f.zh}</span>`;
      tile.addEventListener('click', () => {
        tile.classList.add('press');
        setTimeout(() => tile.classList.remove('press'), 220);
        TTSManager.speak(f.word.toLowerCase(), 'en-US', 0.85);
      });
      els.introGrid.appendChild(tile);
    });
  }

  function showIntro() {
    introOpen = true;
    renderIntro();
    els.intro.style.display = 'flex';
  }

  function hideIntro() {
    introOpen = false;
    els.intro.style.display = 'none';
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
    if (!playing || busy || introOpen) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    pointerStart = { ...cell, x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (!playing || busy || introOpen || !pointerStart) return;
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
    const aIsStar = board[a.r][a.c]?.type === STAR;
    const bIsStar = board[b.r][b.c]?.type === STAR;

    // Swapping two specials together triggers a combo detonation instead of
    // a normal swap or single activation — check this FIRST.
    if (aIsStar && bIsStar) {
      openComboQuiz(a, b);
      return;
    }

    // Swiping a star (or into one) activates it instead of swapping
    const starPos = aIsStar ? a : bIsStar ? b : null;
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
    // 2x2 same-color squares (Candy Crush-style) → spawns a 🐟 fish special.
    // Detected in addition to line runs; merging into `cells` means the
    // existing swap-validity gate (attemptSwap checks matches.cells.size)
    // and clearing/gravity logic cover squares for free.
    const squares = [];
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const a = board[r][c], b = board[r][c + 1], d = board[r + 1][c], e = board[r + 1][c + 1];
        if (a && b && d && e &&
            a.type !== STAR && b.type !== STAR && d.type !== STAR && e.type !== STAR &&
            a.type === b.type && a.type === d.type && a.type === e.type) {
          const sqCells = [{ r, c }, { r, c: c + 1 }, { r: r + 1, c }, { r: r + 1, c: c + 1 }];
          sqCells.forEach(p => cells.add(p.r + ',' + p.c));
          squares.push({ cells: sqCells, type: a.type });
        }
      }
    }
    return { cells, runs, squares };
  }

  // Candy Crush-style special spawning:
  //   5+ straight line → 🌈 rainbow (clears every candy of a goal type)
  //   L/T intersection  → 🎁 wrapped (5×5 blast)
  //   exactly 4 in line → 🍭 striped (horizontal match clears its column,
  //                        vertical match clears its row — like the original)
  function planSpecials(runs, swapPos, squares) {
    const specials = [];
    const used = new Set();
    const usedPos = new Set();
    const spawnAt = run =>
      swapPos && run.cells.some(p => p.r === swapPos.r && p.c === swapPos.c)
        ? swapPos
        : run.cells[Math.floor(run.cells.length / 2)];

    // Rainbow first (most powerful)
    runs.forEach(run => {
      if (run.cells.length >= 5) {
        const pos = spawnAt(run);
        specials.push({ pos, kind: 'rainbow' });
        used.add(run);
        usedPos.add(pos.r + ',' + pos.c);
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
          usedPos.add(inter.r + ',' + inter.c);
        }
      });
    });
    // Striped: remaining 4-in-a-line
    runs.forEach(run => {
      if (!used.has(run) && run.cells.length === 4) {
        const pos = spawnAt(run);
        specials.push({ pos, kind: run.dir === 'h' ? 'stripeCol' : 'stripeRow' });
        used.add(run);
        usedPos.add(pos.r + ',' + pos.c);
      }
    });
    // Fish: a 2x2 same-color square (Candy Crush-style)
    (squares || []).forEach(sq => {
      const pos = swapPos && sq.cells.some(p => p.r === swapPos.r && p.c === swapPos.c)
        ? swapPos
        : sq.cells[0];
      if (usedPos.has(pos.r + ',' + pos.c)) return; // don't double-spawn on one cell
      specials.push({ pos, kind: 'fish' });
      usedPos.add(pos.r + ',' + pos.c);
    });
    return specials;
  }

  const SPECIAL_INFO = {
    stripeRow: { icon: '🍭', name: '條紋糖果', desc: '清除一整行', toast: '🍭 條紋糖果出現了！點它答題清除一整行！' },
    stripeCol: { icon: '🍭', name: '條紋糖果', desc: '清除一整列', toast: '🍭 條紋糖果出現了！點它答題清除一整列！' },
    wrap:      { icon: '🎁', name: '包裝糖果', desc: '5×5 大爆炸', toast: '🎁 包裝糖果出現了！點它答題引爆 5×5！' },
    rainbow:   { icon: '🌈', name: '彩虹糖果', desc: '清除所有目標糖果', toast: '🌈 彩虹糖果出現了！點它答題清光目標糖果！' },
    fish:      { icon: '🐟', name: '糖果魚', desc: '游走清除目標糖果', toast: '🐟 糖果魚出現了！點它答題，讓魚兒游去吃掉目標糖果！' },
    super:     { icon: '🌟', name: '超級星星', desc: '清除整個盤面', toast: '🌟 三顆特殊糖果合體！超級星星誕生，點它答題清除整個盤面！' },
  };

  // ===== Special × special swap combos =====
  // Two normalized special "families" (stripeRow/stripeCol both count as
  // 'stripe') combine into a stronger, named blast when swapped together.
  // Any combo involving a 'super' star always clears the whole board.
  function normKind(kind) {
    return (kind === 'stripeRow' || kind === 'stripeCol') ? 'stripe' : kind;
  }
  function comboKey(kindA, kindB) {
    const nA = normKind(kindA), nB = normKind(kindB);
    if (nA === 'super' || nB === 'super') return 'super';
    return [nA, nB].sort().join('+');
  }
  const COMBO_NAMES = {
    'stripe+stripe':   '十字爆裂',
    'stripe+wrap':     '巨型十字',
    'wrap+wrap':       '超級大爆炸',
    'fish+fish':        '魚群風暴',
    'fish+stripe':      '條紋魚',
    'fish+wrap':        '爆炸魚',
    'rainbow+stripe':   '彩虹風暴',
    'rainbow+wrap':     '彩虹核彈',
    'fish+rainbow':     '彩虹魚群',
    'rainbow+rainbow':  '雙彩虹奇蹟',
    super:              '超新星',
  };

  // Scan the board for 3+ CONTIGUOUS special (STAR) cells in a straight
  // horizontal or vertical line — any mix of kinds — and merge each run
  // into a single 🌟 super star at the run's middle cell. This is a purely
  // passive board effect (no quiz, no player action): it fires whenever
  // gravity happens to settle three specials into a line. Returns true if
  // at least one merge happened, so the caller knows to re-apply gravity
  // (removing cells opens gaps) and can re-check for further merges.
  function checkSpecialMerges() {
    const runs = [];
    // Horizontal runs of 3+ contiguous STAR cells
    for (let r = 0; r < ROWS; r++) {
      let start = 0;
      for (let c = 1; c <= COLS; c++) {
        const same = c < COLS && board[r][c]?.type === STAR && board[r][start]?.type === STAR;
        if (!same) {
          if (c - start >= 3) {
            const run = [];
            for (let i = start; i < c; i++) run.push({ r, c: i });
            runs.push(run);
          }
          start = c;
        }
      }
    }
    // Vertical runs of 3+ contiguous STAR cells
    for (let c = 0; c < COLS; c++) {
      let start = 0;
      for (let r = 1; r <= ROWS; r++) {
        const same = r < ROWS && board[r][c]?.type === STAR && board[start][c]?.type === STAR;
        if (!same) {
          if (r - start >= 3) {
            const run = [];
            for (let i = start; i < r; i++) run.push({ r: i, c });
            runs.push(run);
          }
          start = r;
        }
      }
    }
    if (!runs.length) return false;

    // Runs were all found from the same board snapshot, so a cell can be
    // consumed by at most the first run that claims it (an L/T/cross of
    // specials would otherwise try to clear the same cell twice).
    const consumed = new Set();
    let merged = false;
    runs.forEach(run => {
      if (run.some(p => consumed.has(p.r + ',' + p.c))) return;
      run.forEach(p => {
        consumed.add(p.r + ',' + p.c);
        board[p.r][p.c] = null;
      });
      const mid = run[Math.floor(run.length / 2)];
      board[mid.r][mid.c] = { type: STAR, kind: 'super', _new: true };
      merged = true;
    });
    return merged;
  }

  // Repeatedly merges lined-up specials (see checkSpecialMerges) and
  // re-settles gravity after each merge, since clearing 3 cells down to 1
  // opens gaps that can shift other specials into a new line. `fellInto`
  // (optional) accumulates every moved cell so callers can fold it into
  // their own `fall` render effect. Returns true if anything merged.
  function settleSpecialMerges(fellInto) {
    let any = false;
    while (checkSpecialMerges()) {
      any = true;
      const fell = applyGravity();
      if (fellInto) fell.forEach(k => fellInto.add(k));
    }
    return any;
  }

  // Remove matches, spawn stars, apply gravity, cascade until stable
  function resolveBoard(swapPos, onDone) {
    // Catch specials that lined up from a PREVIOUS gravity settle (e.g. the
    // gravity that follows a detonation) even when this call has no candy
    // matches of its own — this is the entry point right after detonate().
    if (settleSpecialMerges()) {
      const spawned = collectNewSpecials();
      if (spawned.length) registerSpawn(spawned);
      renderBoard();
    }

    const { cells, runs, squares } = findMatches();
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
    const specials = planSpecials(runs, swapPos, squares);

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
      settleSpecialMerges(fell);
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

    // The "tap me!" bubble + callout banner are a one-time teaching moment
    // per special KIND — after a kid has seen it once, repeating it is just
    // noise. The on-candy burst/ring (spawnFx above) and the achievement
    // chime always play, every spawn, because those are satisfying rather
    // than instructional.
    const unseen = positions.filter(p => !progress.hintsSeen[p.kind]);
    if (unseen.length > 0) {
      showSpawnBubbles(unseen);
      showSpawnBanner(unseen);
      unseen.forEach(p => { progress.hintsSeen[p.kind] = true; });
      saveProgress();
    }
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
    const priority = { super: 4, rainbow: 3, wrap: 2, fish: 2, stripeRow: 1, stripeCol: 1 };
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
    quizCombo = null;
    quizKind = board[starPos.r][starPos.c]?.kind || 'wrap';
    quizTries = 0;

    const info = SPECIAL_INFO[quizKind];
    setQuizTitle(`${info.icon} ${info.name}單字題（${info.desc}）`);
    prepareQuizContent();

    els.board.style.display = 'none';
    els.quiz.style.display = 'flex';
  }

  // Swapping two adjacent specials together opens the same vocabulary quiz,
  // but a correct answer triggers a named combo blast (comboDetonate)
  // instead of a single special's own effect.
  function openComboQuiz(a, b) {
    busy = true;
    clearSpawnFx();
    const key = comboKey(board[a.r][a.c]?.kind, board[b.r][b.c]?.kind);
    const name = COMBO_NAMES[key] || '組合大爆炸';
    quizStarPos = null;
    quizCombo = { a: { ...a }, b: { ...b }, key, name };
    quizTries = 0;

    setQuizTitle(`💥 ${name}單字題（特殊組合技，答對觸發大爆炸！）`);
    prepareQuizContent();

    els.board.style.display = 'none';
    els.quiz.style.display = 'flex';
  }

  function setQuizTitle(text) {
    const titleEl = document.getElementById('cd-quiz-title');
    if (titleEl) titleEl.textContent = text;
  }

  // Shared body of openQuiz/openComboQuiz: pick a quiz word + build/render
  // its answer options. Both callers set up quizStarPos/quizCombo, the
  // title, and busy/clearSpawnFx themselves beforehand.
  function prepareQuizContent() {
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
        if (quizCombo) {
          const { a, b } = quizCombo;
          quizCombo = null;
          comboDetonate(a, b);
        } else {
          detonate(quizStarPos);
        }
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

    let targets = [];
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
      targets = goalTypeCells();
    } else if (kind === 'fish') {
      // 3 fish swim to 3 goal-color candies, each clearing itself + its
      // 4 orthogonal neighbors. Prefers the current unfinished goal type.
      targets = fishBlastTargets(3);
    } else if (kind === 'super') {
      // Super star: clear the entire board
      targets = fullBoardTargets();
    }

    sweepTargets(targets, popped, visited);
  }

  // Walks a list of target cells: normal candies are added to `popped`;
  // any special (STAR) caught in the blast chain-detonates via
  // collectBlast (shared by single-special blasts and combo blasts).
  function sweepTargets(targets, popped, visited) {
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

  // All board cells of the first unfinished goal type (or the most common
  // type if every goal is done) — the "target type" rainbow/fish combos aim at.
  function goalTypeCells() {
    const goal = goals.find(g => g.got < g.need);
    const targetType = goal ? goal.type : mostCommonType();
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] && board[r][c].type === targetType) cells.push({ r, c });
      }
    }
    return cells;
  }

  // Up to `n` random goal-type candy positions for a fish-style blast.
  function fishCandidates(n) {
    const candidates = goalTypeCells();
    shuffleInPlace(candidates);
    return candidates.slice(0, n);
  }

  // `n` fish, each clearing its landing candy + its 4 orthogonal neighbors.
  function fishBlastTargets(n) {
    const targets = [];
    fishCandidates(n).forEach(p => {
      targets.push(p);
      targets.push({ r: p.r - 1, c: p.c });
      targets.push({ r: p.r + 1, c: p.c });
      targets.push({ r: p.r, c: p.c - 1 });
      targets.push({ r: p.r, c: p.c + 1 });
    });
    return targets;
  }

  function fullBoardTargets() {
    const targets = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) targets.push({ r, c });
    return targets;
  }

  // Target cells for a special×special combo (see comboKey/COMBO_NAMES).
  // `a`/`b` are the two swapped special positions; row/col/blast effects
  // are centered on `b` by convention.
  function comboTargets(key, a, b) {
    switch (key) {
      case 'stripe+stripe': {
        const t = [];
        for (let c = 0; c < COLS; c++) t.push({ r: b.r, c });
        for (let r = 0; r < ROWS; r++) t.push({ r, c: b.c });
        return t;
      }
      case 'stripe+wrap': {
        const t = [];
        for (let dr = -1; dr <= 1; dr++) for (let c = 0; c < COLS; c++) t.push({ r: b.r + dr, c });
        for (let dc = -1; dc <= 1; dc++) for (let r = 0; r < ROWS; r++) t.push({ r, c: b.c + dc });
        return t;
      }
      case 'wrap+wrap': {
        const t = [];
        for (let r = b.r - 3; r <= b.r + 3; r++) for (let c = b.c - 3; c <= b.c + 3; c++) t.push({ r, c });
        return t;
      }
      case 'fish+fish':
        return fishBlastTargets(6);
      case 'fish+stripe': {
        const t = [];
        fishCandidates(3).forEach(p => { for (let c = 0; c < COLS; c++) t.push({ r: p.r, c }); });
        return t;
      }
      case 'fish+wrap': {
        const t = [];
        fishCandidates(3).forEach(p => {
          for (let r = p.r - 1; r <= p.r + 1; r++) for (let c = p.c - 1; c <= p.c + 1; c++) t.push({ r, c });
        });
        return t;
      }
      case 'rainbow+stripe': {
        const t = goalTypeCells();
        for (let c = 0; c < COLS; c++) t.push({ r: b.r, c });
        for (let r = 0; r < ROWS; r++) t.push({ r, c: b.c });
        return t;
      }
      case 'rainbow+wrap': {
        const t = goalTypeCells();
        for (let r = b.r - 2; r <= b.r + 2; r++) for (let c = b.c - 2; c <= b.c + 2; c++) t.push({ r, c });
        return t;
      }
      case 'fish+rainbow':
        // 6 fish, all targeting the goal type (same mechanic as fish+fish)
        return fishBlastTargets(6);
      case 'rainbow+rainbow':
        return fullBoardTargets();
      case 'super':
        return fullBoardTargets();
      default:
        return [];
    }
  }

  // Detonate a special×special combo formed by swapping two adjacent
  // specials together (see attemptSwap/openComboQuiz). Both stars are
  // always consumed; the blast shape depends on the combo key.
  function comboDetonate(a, b) {
    const key = comboKey(board[a.r][a.c]?.kind, board[b.r][b.c]?.kind);
    const name = COMBO_NAMES[key] || '組合大爆炸';
    const popped = new Set();
    const visited = new Set();
    [a, b].forEach(p => { popped.add(p.r + ',' + p.c); visited.add(p.r + ',' + p.c); });

    sweepTargets(comboTargets(key, a, b), popped, visited);

    GameEngine.showToast(`💥 ${name}！`, 'achievement');
    SoundManager.playQuestComplete();
    if (els.wrap) {
      els.wrap.classList.add('cd-combo-flash');
      setTimeout(() => els.wrap.classList.remove('cd-combo-flash'), 400);
    }

    popped.forEach(k => {
      const [r, c] = k.split(',').map(Number);
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
      popped.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        board[r][c] = null;
      });
      const fell = applyGravity();
      renderBoard({ fall: fell });
      setTimeout(() => resolveBoard(null, () => afterMove()), 220);
    }, 260);
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
