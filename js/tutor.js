/* ===== 打字訓練營 (Touch-Typing Camp) =====
   A lesson-based tutorial that teaches correct two-handed touch typing.
   Basic camp: 12 sequential lessons (home row -> top row -> bottom row ->
   mixed -> graduation spelling test), each drilling 24 keystrokes (12: 8
   words). Advanced camp: lessons 13-20 add space/phrases, Shift capitals,
   the digit row, common symbols, a function-key flash-card tour, and a
   mixed graduation exam. A colored on-screen keyboard + a pair of "hands"
   (plus a thumb badge for advanced lessons) show which finger is
   responsible for the current key, teaching real touch-typing finger
   zones. Feeds into 打字防衛戰 (js/typing.js) once graduated.
*/

const TutorGame = (() => {
  const SAVE_KEY = 'english_savior_tutor';
  const TOTAL_LESSONS = 12;       // basic camp size (used by the basic all-clear bonus)
  const TOTAL_ALL_LESSONS = 20;   // basic + advanced
  const ADV_LESSON_COUNT = 8;     // advanced camp size (lessons 13-20)
  const DRILL_LEN = 24;
  const WORD_COUNT = 8;

  // ===== Finger zones (standard two-handed touch typing) =====
  const FINGER_LABELS = {
    leftPinky: '左手小指', leftRing: '左手無名指', leftMiddle: '左手中指', leftIndex: '左手食指',
    rightIndex: '右手食指', rightMiddle: '右手中指', rightRing: '右手無名指', rightPinky: '右手小指',
    thumb: '拇指',
  };
  const FINGER_COLORS = {
    leftPinky: '#ffd3e0', leftRing: '#ffe6b3', leftMiddle: '#d8f5c9', leftIndex: '#c9ecf9',
    rightIndex: '#ddd3f7', rightMiddle: '#fff3ae', rightRing: '#ffd7c2', rightPinky: '#c3f5e8',
    thumb: '#f5deb3',
  };
  const FINGER_ORDER_LEFT = ['leftPinky', 'leftRing', 'leftMiddle', 'leftIndex'];
  const FINGER_ORDER_RIGHT = ['rightIndex', 'rightMiddle', 'rightRing', 'rightPinky'];

  const KEY_FINGER = {
    q: 'leftPinky', a: 'leftPinky', z: 'leftPinky',
    w: 'leftRing', s: 'leftRing', x: 'leftRing',
    e: 'leftMiddle', d: 'leftMiddle', c: 'leftMiddle',
    r: 'leftIndex', f: 'leftIndex', v: 'leftIndex', t: 'leftIndex', g: 'leftIndex', b: 'leftIndex',
    y: 'rightIndex', h: 'rightIndex', n: 'rightIndex', u: 'rightIndex', j: 'rightIndex', m: 'rightIndex',
    i: 'rightMiddle', k: 'rightMiddle', ',': 'rightMiddle',
    o: 'rightRing', l: 'rightRing', '.': 'rightRing',
    p: 'rightPinky', ';': 'rightPinky',
    // ===== Advanced camp additions =====
    '1': 'leftPinky', '2': 'leftRing', '3': 'leftMiddle', '4': 'leftIndex', '5': 'leftIndex',
    '6': 'rightIndex', '7': 'rightIndex', '8': 'rightMiddle', '9': 'rightRing', '0': 'rightPinky',
    "'": 'rightPinky', '/': 'rightPinky',
    ' ': 'thumb',
  };

  const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  ];
  const BUMP_KEYS = ['f', 'j'];

  // ===== Extended keyboard rows (lessons 13+) =====
  const EXT_ROW_NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const EXT_ROW_TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const EXT_ROW_HOME = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];
  const EXT_ROW_BOTTOM = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];

  const SPECIAL_LABELS = {
    Tab: 'Tab', CapsLock: 'Caps', Backspace: '⌫', Delete: 'Del', Enter: '⏎',
    ShiftLeft: 'Shift', ShiftRight: 'Shift',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', Meta: 'Win',
  };

  // Symbols that require Shift + a base key. Anything not listed here
  // (plain '.', ',', "'" ) is typed directly with no Shift.
  const SYMBOL_BASE = {
    '!': '1', '?': '/', '@': '2', '#': '3', '$': '4', '%': '5',
    '&': '7', '*': '8', '(': '9', ')': '0', '"': "'", ':': ';',
  };
  const SYMBOL_SHIFT = new Set(Object.keys(SYMBOL_BASE));
  const BASE_TO_SHIFTED = {};
  Object.keys(SYMBOL_BASE).forEach(sym => { BASE_TO_SHIFTED[SYMBOL_BASE[sym]] = sym; });

  // ===== Lesson definitions =====
  const LESSON_DEFS = [
    { id: 1, name: '基準鍵 F・J', keys: ['f', 'j'] },
    { id: 2, name: 'D・K', keys: ['d', 'k'] },
    { id: 3, name: 'S・L', keys: ['s', 'l'] },
    { id: 4, name: 'A・；', keys: ['a', ';'] },
    { id: 5, name: '中列總複習', keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] },
    { id: 6, name: 'E・I', keys: ['e', 'i'] },
    { id: 7, name: 'R・U・T・Y', keys: ['r', 'u', 't', 'y'] },
    { id: 8, name: 'W・O・Q・P', keys: ['w', 'o', 'q', 'p'] },
    { id: 9, name: 'V・M・B・N', keys: ['v', 'm', 'b', 'n'] },
    { id: 10, name: 'C・X・Z・，。', keys: ['c', 'x', 'z', ',', '.'] },
    { id: 11, name: '全鍵盤混合', keys: null }, // filled below: union of lessons 1-10
    { id: 12, name: '畢業考：拼單字', type: 'words' },
    // ===== 進階班 (13-20) =====
    { id: 13, name: '空白鍵與小短句', type: 'phrases', itemCount: 8 },
    { id: 14, name: 'Shift 大寫魔法', type: 'caps', itemCount: 8 },
    { id: 15, name: '數字列 1-5', keys: ['1', '2', '3', '4', '5'] },
    { id: 16, name: '數字列 6-0', keys: ['6', '7', '8', '9', '0'] },
    { id: 17, name: '常用符號 I', type: 'symbols', keys: ['!', '?', '.', ',', "'"], drillLen: 20 },
    { id: 18, name: '常用符號 II', type: 'symbols', keys: ['@', '#', '$', '%', '&', '*', '(', ')', '"', ':'], drillLen: 20 },
    { id: 19, name: '功能鍵大冒險', type: 'funkeys' },
    { id: 20, name: '進階畢業考', type: 'sentence', itemCount: 5 },
  ];
  (function fillLesson11() {
    const set = new Set();
    LESSON_DEFS.forEach(l => { if (l.id <= 10 && l.keys) l.keys.forEach(k => set.add(k)); });
    LESSON_DEFS.find(l => l.id === 11).keys = Array.from(set);
  })();
  const LESSON_BY_ID = {};
  LESSON_DEFS.forEach(l => { LESSON_BY_ID[l.id] = l; });

  // ===== Function-key flash cards (lesson 19) =====
  const FUNKEY_CARDS = [
    {
      key: 'Tab', label: 'Tab', icon: '⇥', pressable: true,
      desc: '按 Tab 鍵可以跳到下一個輸入格，像換教室一樣快！',
      matchTapKeys: ['Tab'],
      matchKey: (e) => e.key === 'Tab' || e.code === 'Tab',
    },
    {
      key: 'CapsLock', label: 'Caps Lock', icon: '🔒', pressable: true,
      desc: '按下 Caps Lock，之後打的字母都會自動變成大寫，再按一次就會關掉喔！',
      matchTapKeys: ['CapsLock'],
      matchKey: (e) => e.code === 'CapsLock' || e.key === 'CapsLock',
    },
    {
      key: 'Backspace', label: 'Backspace', icon: '⌫', pressable: true,
      desc: '打錯字了嗎？按 Backspace 可以刪掉「前面」那一個字！',
      matchTapKeys: ['Backspace'],
      matchKey: (e) => e.key === 'Backspace',
    },
    {
      key: 'Delete', label: 'Delete', icon: '🗑️', pressable: true,
      desc: 'Delete 鍵可以刪掉游標「後面」那一個字！',
      matchTapKeys: ['Delete'],
      matchKey: (e) => e.key === 'Delete',
    },
    {
      key: 'Enter', label: 'Enter', icon: '⏎', pressable: true,
      desc: '打完一行想換下一行，或是要送出答案，就按 Enter！',
      matchTapKeys: ['Enter'],
      matchKey: (e) => e.key === 'Enter',
    },
    {
      key: 'Ctrl', label: 'Ctrl', icon: '🎛️', pressable: false,
      desc: 'Ctrl 要和別的鍵一起組隊，像 Ctrl+C 可以複製文字！這一課不用真的按下去，點點看鍵盤上的 Ctrl 鍵就好。',
      matchTapKeys: ['ControlLeft', 'ControlRight'],
    },
    {
      key: 'Alt', label: 'Alt', icon: '🅰️', pressable: false,
      desc: 'Alt 也是組合技的鍵盤夥伴，常常跟 Ctrl 一起出現！點點看鍵盤上的 Alt 鍵。',
      matchTapKeys: ['AltLeft', 'AltRight'],
    },
    {
      key: 'Win', label: 'Windows 鍵', icon: '🪟', pressable: false,
      desc: '按一下 Windows 鍵，就能打開電腦的「開始」選單！點點看鍵盤上的 Windows 鍵。',
      matchTapKeys: ['Meta'],
    },
  ];
  const FUNKEY_PRESSABLE_KEYS = ['Tab', 'CapsLock', 'Backspace', 'Delete', 'Enter'];

  const FUNKEY_QUIZ_POOL = [
    { q: '打錯字想刪掉剛剛打好的字母，要按哪個鍵？', answer: 'Backspace', wrongs: ['Enter', 'Tab'] },
    { q: '想跳到下一個輸入格，要按哪個鍵？', answer: 'Tab', wrongs: ['Delete', 'Caps Lock'] },
    { q: '打完一行文字，想換到下一行，要按哪個鍵？', answer: 'Enter', wrongs: ['Alt', 'Ctrl'] },
    { q: '想刪掉游標「後面」那個字，要按哪個鍵？', answer: 'Delete', wrongs: ['Backspace', 'Tab'] },
    { q: '想要連續打出很多大寫字母，要打開哪個鍵？', answer: 'Caps Lock', wrongs: ['Shift', 'Enter'] },
    { q: '想要用 Ctrl+C 複製文字，要先按住哪個鍵？', answer: 'Ctrl', wrongs: ['Alt', 'Win'] },
    { q: '和 Ctrl 一樣常常跟別的鍵組合技的是哪個鍵？', answer: 'Alt', wrongs: ['Enter', 'Tab'] },
    { q: '想要打開電腦的「開始」選單，要按哪個鍵？', answer: 'Windows 鍵', wrongs: ['Ctrl', 'Delete'] },
  ];

  // ===== Save state =====
  let save = loadSave();

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return { done: raw.done || {}, allBonus: !!raw.allBonus, advBonus: !!raw.advBonus };
    } catch (e) {
      return { done: {}, allBonus: false, advBonus: false };
    }
  }
  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // ===== Runtime =====
  let root = null;
  let screen = 'select'; // 'select' | 'lesson' | 'end'
  let current = null;    // active lesson runtime
  let lastEnd = null;    // stats to render on the end screen
  let hintTimer = null;

  function init() {
    root = document.getElementById('tu-root');
    if (!root) return;
    renderSelect();
    bindEvents();
    window.addEventListener('keydown', onKeyDown);

    window.__tuTest = {
      state: () => ({
        screen,
        save: JSON.parse(JSON.stringify(save)),
        current: current ? {
          id: current.id, idx: current.idx, wordIdx: current.wordIdx,
          letterIdx: current.letterIdx, errors: current.errors, correct: current.correct,
          shiftSticky: current.shiftSticky, stage: current.stage,
          cardIdx: current.cardIdx, quizIdx: current.quizIdx, quizCorrect: current.quizCorrect,
        } : null,
      }),
      startLesson: (id) => startLesson(id),
      press: (ch) => handlePress(ch),
      tapKey: (dk) => { const el = findKeyEl(dk); if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true })); },
      answerQuiz: (idx) => handleQuizAnswer(idx),
    };
  }

  function bindEvents() {
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.tu-lesson-card');
      if (card && !card.classList.contains('tu-locked')) {
        startLesson(Number(card.dataset.id));
        return;
      }
      const opt = e.target.closest('.tu-quiz-opt');
      if (opt && screen === 'lesson' && current && current.lesson.type === 'funkeys' && current.stage === 'quiz') {
        handleQuizAnswer(Number(opt.dataset.optIdx));
        return;
      }
      const key = e.target.closest('.tu-key');
      if (key && screen === 'lesson' && current) {
        const dk = key.dataset.key;
        if (current.lesson.type === 'funkeys') { handleFunkeyTap(dk); return; }
        if (dk === 'ShiftLeft' || dk === 'ShiftRight') { toggleShiftSticky(); return; }
        if (current.shiftSticky) {
          const shifted = shiftedCharFor(dk);
          clearShiftSticky();
          if (shifted !== null) { handlePress(shifted); return; }
        }
        handlePress(dk);
        return;
      }
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        if (action === 'quit') renderSelect();
        else if (action === 'replay') startLesson(current ? current.id : (lastEnd && lastEnd.id));
        else if (action === 'next') startLesson((lastEnd ? lastEnd.id : 0) + 1);
        else if (action === 'menu') renderSelect();
      }
    });
  }

  function onKeyDown(e) {
    if (screen !== 'lesson' || !current) return;
    const zone = document.getElementById('zone-tutor');
    if (!zone || !zone.classList.contains('active')) return;

    if (current.lesson.type === 'funkeys') { handleFunkeyKeydown(e); return; }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (current.id < 13) {
      if (e.key.length !== 1 || !/[a-zA-Z;,.]/.test(e.key)) return;
      handlePress(e.key);
      e.preventDefault();
      return;
    }

    // Advanced lessons: widen the accepted charset to digits/symbols/space/caps.
    if (e.key === ' ') { e.preventDefault(); handlePress(' '); return; }
    if (e.key.length !== 1) return;
    if (!/[a-zA-Z0-9;,.'"!?@#$%&*():]/.test(e.key)) return;
    handlePress(e.key);
    e.preventDefault();
  }

  // ===== Lesson select screen =====
  function isUnlocked(id) {
    if (id === 1) return true;
    return !!(save.done && save.done['l' + (id - 1)]);
  }

  function starsHTML(n) {
    let out = '';
    for (let i = 0; i < 3; i++) out += i < n ? '⭐' : '☆';
    return out;
  }

  function cardKeyBadges(lesson) {
    if (lesson.type === 'words') return '<span class="tu-key-badge tu-badge-words">🔤 單字</span>';
    if (lesson.type === 'phrases') return '<span class="tu-key-badge tu-badge-words">📏 短句</span>';
    if (lesson.type === 'caps') return '<span class="tu-key-badge tu-badge-words">🔠 大寫</span>';
    if (lesson.type === 'symbols') return '<span class="tu-key-badge tu-badge-words">✳️ 符號</span>';
    if (lesson.type === 'funkeys') return '<span class="tu-key-badge tu-badge-words">🛠️ 功能鍵</span>';
    if (lesson.type === 'sentence') return '<span class="tu-key-badge tu-badge-words">✍️ 造句</span>';
    if (lesson.id === 11) return '<span class="tu-key-badge tu-badge-mix">🔀 全部按鍵</span>';
    return lesson.keys.map(k => {
      const finger = KEY_FINGER[k] || 'leftIndex';
      const label = k === ';' ? '；' : k.toUpperCase();
      return `<span class="tu-key-badge" style="--fc:${FINGER_COLORS[finger]}">${label}</span>`;
    }).join('');
  }

  function lessonCardHTML(l) {
    const unlocked = isUnlocked(l.id);
    const stars = (save.done && save.done['l' + l.id]) || 0;
    const isAdv = l.id >= 13;
    const cls = ['tu-lesson-card'];
    if (isAdv) cls.push('tu-adv-card');
    if (!unlocked) cls.push('tu-locked'); else cls.push('tu-unlocked');
    if (stars > 0) cls.push('tu-done');
    return `
      <div class="${cls.join(' ')}" data-id="${l.id}">
        ${isAdv ? '<div class="tu-ribbon">🎖️</div>' : ''}
        <div class="tu-card-num">第 ${l.id} 課</div>
        <div class="tu-card-name">${l.name}</div>
        <div class="tu-card-keys">${cardKeyBadges(l)}</div>
        <div class="tu-card-stars">${unlocked ? starsHTML(stars) : ''}</div>
        ${unlocked ? '' : '<div class="tu-lock-icon">🔒</div>'}
      </div>`;
  }

  function renderSelect() {
    screen = 'select';
    current = null;
    const basicCards = LESSON_DEFS.filter(l => l.id <= 12).map(lessonCardHTML).join('');
    const advCards = LESSON_DEFS.filter(l => l.id >= 13).map(lessonCardHTML).join('');

    root.innerHTML = `
      <div class="tu-select-screen">
        <div class="tu-intro-card">
          <h3>✋ 基準鍵位小教室</h3>
          <p>雙手輕輕放在鍵盤中間那排：左手放在 <b>A S D F</b>，右手放在 <b>J K L ；</b>。
          摸摸看 <b>F</b> 和 <b>J</b> 鍵上有一個小凸點，那就是讓你不用看鍵盤也能找到「基準鍵」的秘密提示！
          每次打完字，記得把手指放回基準鍵喔。</p>
        </div>
        <div class="tu-section-header">🏕️ 基礎班</div>
        <div class="tu-lesson-grid">${basicCards}</div>
        <div class="tu-section-header tu-section-header-adv">🎖️ 進階班</div>
        <div class="tu-section-sub">完成畢業考後開放</div>
        <div class="tu-lesson-grid tu-lesson-grid-adv">${advCards}</div>
        <div class="tu-banner-typing">🎓 畢業後去「⌨️ 打字防衛戰」大顯身手！</div>
      </div>`;
  }

  // ===== Word / phrase / sentence pools =====
  function pickWords(n) {
    let pool = [];
    if (typeof VOCAB_DATA !== 'undefined' && VOCAB_DATA.easy) {
      pool = VOCAB_DATA.easy.filter(w => /^[A-Za-z]{3,5}$/.test(w.word));
    }
    if (!pool.length) {
      // Safety fallback so the lesson never breaks if vocab data is unavailable
      pool = [
        { word: 'CAT', hint: '🐱', zh: '貓' }, { word: 'DOG', hint: '🐶', zh: '狗' },
        { word: 'SUN', hint: '☀️', zh: '太陽' }, { word: 'BOOK', hint: '📖', zh: '書' },
      ];
    }
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const picked = [];
    const seen = new Set();
    for (const w of shuffled) {
      const upper = w.word.toUpperCase();
      if (seen.has(upper)) continue;
      seen.add(upper);
      picked.push({ word: upper, hint: w.hint || '📝', zh: w.zh || '' });
      if (picked.length >= n) break;
    }
    return picked;
  }

  const CAPS_WORD_POOL = ['Amy', 'Ben', 'May', 'Sam', 'Kim', 'Tom', 'Ann', 'Leo', 'Mia', 'Max'];
  function pickCapsWords(n) {
    const shuffled = CAPS_WORD_POOL.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(w => ({ word: w, hint: '🙂', zh: '大寫名字' }));
  }

  const PHRASE_POOL = ['a cat', 'the sun', 'my dog', 'red hat', 'big pig', 'a bag', 'the map', 'my cup', 'a pen', 'the box', 'my bed', 'a fan'];
  function pickPhrases(n) {
    const shuffled = PHRASE_POOL.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(p => ({ word: p, hint: '📝', zh: '' }));
  }

  const SENTENCE_POOL = [
    'I am 8 years old!',
    'We won 1st place!',
    'My dog is No. 1!',
    'Wow! A big cat!',
    'I got 100 points!',
    "It's a fun day!",
    'The sun is hot!',
    'Ben has 5 pens.',
  ];
  function pickSentences(n) {
    const shuffled = SENTENCE_POOL.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(s => ({ word: s, hint: '💬', zh: '' }));
  }

  function pickFunkeyQuiz(n) {
    return FUNKEY_QUIZ_POOL.slice().sort(() => Math.random() - 0.5).slice(0, n);
  }

  // ===== Sequence generation =====
  function isListType(lesson) {
    return lesson.type === 'words' || lesson.type === 'caps' || lesson.type === 'phrases' || lesson.type === 'sentence';
  }
  function isCaseSensitive(lesson) {
    return lesson.type === 'caps' || lesson.type === 'sentence';
  }
  function itemCount(lesson) {
    return lesson.itemCount || WORD_COUNT;
  }

  function buildSequence(lesson) {
    if (lesson.type === 'words') return pickWords(itemCount(lesson));
    if (lesson.type === 'caps') return pickCapsWords(itemCount(lesson));
    if (lesson.type === 'phrases') return pickPhrases(itemCount(lesson));
    if (lesson.type === 'sentence') return pickSentences(itemCount(lesson));
    if (lesson.type === 'funkeys') return [];
    const keys = lesson.keys;
    const len = lesson.drillLen || DRILL_LEN;
    const seq = [];
    let last = null;
    for (let i = 0; i < len; i++) {
      const choices = keys.length > 1 ? keys.filter(k => k !== last) : keys;
      const k = choices[Math.floor(Math.random() * choices.length)];
      seq.push(k);
      last = k;
    }
    return seq;
  }

  // ===== Start / run a lesson =====
  function startLesson(id) {
    const lesson = LESSON_BY_ID[id];
    if (!lesson || !isUnlocked(id)) return false;

    current = {
      id,
      lesson,
      seq: buildSequence(lesson),
      idx: 0,        // letter-mode pointer into seq
      wordIdx: 0,    // word/phrase/sentence-mode pointer into seq
      letterIdx: 0,  // word-mode pointer into current item's letters
      correct: 0,
      errors: 0,
      startTime: performance.now(),
      shiftSticky: false,
      stage: lesson.type === 'funkeys' ? 'cards' : null,
      cardIdx: 0,
      quizIdx: 0,
      quizCorrect: 0,
      quizSeq: null,
      quizOptions: null,
    };
    screen = 'lesson';
    renderLessonScreen();
    return true;
  }

  function targetChar() {
    if (!current) return '';
    if (isListType(current.lesson)) {
      const w = current.seq[current.wordIdx];
      return w ? w.word[current.letterIdx] : '';
    }
    return current.seq[current.idx] || '';
  }

  function progressCount() {
    return isListType(current.lesson) ? current.wordIdx : current.idx;
  }
  function totalCount() {
    return isListType(current.lesson) ? itemCount(current.lesson) : (current.lesson.drillLen || DRILL_LEN);
  }

  function renderLessonScreen() {
    const isAdv = current.id >= 13;
    root.innerHTML = `
      <div class="tu-lesson-screen">
        <div class="tu-lesson-header">
          <button class="tu-btn tu-btn-quit" data-action="quit">‹ 返回選單</button>
          <div class="tu-lesson-title">第 ${current.id} 課・${current.lesson.name}</div>
          <div class="tu-progress-wrap"><div class="tu-progress-bar" id="tu-progress"></div></div>
        </div>
        <div class="tu-target-zone">
          <div class="tu-target-display" id="tu-target"></div>
          <div class="tu-target-zh" id="tu-target-zh"></div>
        </div>
        <div class="tu-keyboard${isAdv ? ' tu-keyboard-ext' : ''}" id="tu-keyboard">${buildKeyboardHTML()}</div>
        <div class="tu-legend">${buildLegendHTML(current.id)}</div>
        <div class="tu-hands" id="tu-hands">
          <div class="tu-hand tu-hand-left">${FINGER_ORDER_LEFT.map(fingerDivHTML).join('')}</div>
          <div class="tu-hand-gap">✋🖐️${isAdv ? `<div class="tu-finger tu-thumb-badge" data-finger="thumb" style="--fc:${FINGER_COLORS.thumb}"><div class="tu-finger-dot"></div></div>` : ''}</div>
          <div class="tu-hand tu-hand-right">${FINGER_ORDER_RIGHT.map(fingerDivHTML).join('')}</div>
        </div>
        <div class="tu-hint" id="tu-hint"></div>
      </div>`;
    updateDisplay();
  }

  function fingerDivHTML(f) {
    return `<div class="tu-finger" data-finger="${f}" style="--fc:${FINGER_COLORS[f]}"><div class="tu-finger-dot"></div></div>`;
  }

  function keyDivHTML(k) {
    const finger = KEY_FINGER[k] || 'leftIndex';
    const label = k === ';' ? '；' : (/^[a-z]$/.test(k) ? k.toUpperCase() : k);
    const bump = BUMP_KEYS.includes(k) ? '<span class="tu-bump"></span>' : '';
    return `<div class="tu-key" data-key="${k}" style="--fc:${FINGER_COLORS[finger]}">${label}${bump}</div>`;
  }

  function specialKeyHTML(key, extraClass) {
    const cls = ['tu-key', 'tu-key-special'];
    let style = '';
    if (key === 'ShiftLeft') { cls.push('tu-key-shift'); style = ` style="--fc:${FINGER_COLORS.leftPinky}"`; }
    if (key === 'ShiftRight') { cls.push('tu-key-shift'); style = ` style="--fc:${FINGER_COLORS.rightPinky}"`; }
    if (extraClass) cls.push(extraClass);
    return `<div class="${cls.join(' ')}" data-key="${key}"${style}>${SPECIAL_LABELS[key]}</div>`;
  }

  function buildKeyboardHTML() {
    if (current.id >= 13) return buildExtendedKeyboardHTML();
    return KEYBOARD_ROWS.map((row, ri) => `
      <div class="tu-key-row tu-key-row-${ri}">
        ${row.map(keyDivHTML).join('')}
      </div>`).join('');
  }

  function buildExtendedKeyboardHTML() {
    const numRow = EXT_ROW_NUM.map(keyDivHTML).join('') + specialKeyHTML('Backspace', 'tu-key-wide') + specialKeyHTML('Delete');
    const topRow = specialKeyHTML('Tab') + EXT_ROW_TOP.map(keyDivHTML).join('');
    const homeRow = specialKeyHTML('CapsLock') + EXT_ROW_HOME.map(keyDivHTML).join('') + specialKeyHTML('Enter', 'tu-key-wide');
    const bottomRow = specialKeyHTML('ShiftLeft', 'tu-key-wide') + EXT_ROW_BOTTOM.map(keyDivHTML).join('') + specialKeyHTML('ShiftRight', 'tu-key-wide');
    const spaceRow = specialKeyHTML('ControlLeft') + specialKeyHTML('Meta') + specialKeyHTML('AltLeft') +
      `<div class="tu-key tu-key-special tu-key-space" data-key=" ">空白鍵 👍</div>` +
      specialKeyHTML('AltRight') + specialKeyHTML('ControlRight');
    return `
      <div class="tu-key-row tu-ext-row-num">${numRow}</div>
      <div class="tu-key-row tu-ext-row-top">${topRow}</div>
      <div class="tu-key-row tu-ext-row-home">${homeRow}</div>
      <div class="tu-key-row tu-ext-row-bottom">${bottomRow}</div>
      <div class="tu-key-row tu-ext-row-space">${spaceRow}</div>`;
  }

  function buildLegendHTML(lessonId) {
    const order = FINGER_ORDER_LEFT.concat(FINGER_ORDER_RIGHT);
    const shortLabel = {
      leftPinky: '左小', leftRing: '左名', leftMiddle: '左中', leftIndex: '左食',
      rightIndex: '右食', rightMiddle: '右中', rightRing: '右名', rightPinky: '右小',
    };
    let html = order.map(f => `<span class="tu-legend-item" style="--fc:${FINGER_COLORS[f]}">${shortLabel[f]}</span>`).join('');
    if (lessonId >= 13) {
      html += `<span class="tu-legend-item" style="--fc:${FINGER_COLORS.thumb}">拇指</span>`;
    }
    return html;
  }

  // ===== Shift-target helpers (which base key + which Shift key to highlight) =====
  function computeTargetInfo(tc) {
    let baseKey = tc;
    let shiftNeeded = false;
    if (tc === ' ') {
      baseKey = ' ';
    } else if (/^[A-Z]$/.test(tc)) {
      baseKey = tc.toLowerCase();
      shiftNeeded = true;
    } else if (Object.prototype.hasOwnProperty.call(SYMBOL_BASE, tc)) {
      baseKey = SYMBOL_BASE[tc];
      shiftNeeded = SYMBOL_SHIFT.has(tc);
    }
    const baseFinger = KEY_FINGER[baseKey] || 'leftIndex';
    let shiftSide = null, shiftFinger = null;
    if (shiftNeeded) {
      shiftSide = baseFinger.startsWith('left') ? 'right' : 'left';
      shiftFinger = shiftSide === 'left' ? 'leftPinky' : 'rightPinky';
    }
    return { baseKey, baseFinger, shiftNeeded, shiftSide, shiftFinger };
  }

  function buildHintText(info, rawTc) {
    if (rawTc === ' ') return '👉 使用 拇指 按空白鍵';
    if (info.shiftNeeded) {
      const sideLabel = info.shiftSide === 'left' ? '左手' : '右手';
      return `👉 ${sideLabel}小指按住 Shift ＋ ${FINGER_LABELS[info.baseFinger]}`;
    }
    return `👉 使用 ${FINGER_LABELS[info.baseFinger]}`;
  }

  function shiftedCharFor(baseKey) {
    if (/^[a-z]$/.test(baseKey)) return baseKey.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(BASE_TO_SHIFTED, baseKey)) return BASE_TO_SHIFTED[baseKey];
    return null;
  }

  function toggleShiftSticky() {
    if (!current) return;
    current.shiftSticky = !current.shiftSticky;
    root.querySelectorAll('.tu-key-shift').forEach(k => k.classList.toggle('tu-key-pressed', current.shiftSticky));
  }
  function clearShiftSticky() {
    if (!current) return;
    current.shiftSticky = false;
    root.querySelectorAll('.tu-key-shift').forEach(k => k.classList.remove('tu-key-pressed'));
  }

  function updateDisplay() {
    if (current.lesson.type === 'funkeys') { updateFunkeyDisplay(); return; }

    const els = {
      target: root.querySelector('#tu-target'),
      targetZh: root.querySelector('#tu-target-zh'),
      progress: root.querySelector('#tu-progress'),
      hint: root.querySelector('#tu-hint'),
    };
    if (!els.target) return;

    root.querySelectorAll('.tu-key').forEach(k => k.classList.remove('tu-key-target'));
    root.querySelectorAll('[data-finger]').forEach(f => f.classList.remove('tu-finger-active'));

    if (isListType(current.lesson)) {
      const w = current.seq[current.wordIdx];
      if (!w) return;
      const showHint = current.lesson.type === 'words' || current.lesson.type === 'caps';
      els.target.innerHTML = (showHint ? `<span class="tu-word-hint">${w.hint}</span> ` : '') +
        w.word.split('').map((ch, i) => `<span class="${i < current.letterIdx ? 'tu-done' : ''}">${ch === ' ' ? '␣' : ch}</span>`).join('');
      els.targetZh.textContent = w.zh || '';
      if (current.letterIdx === 0 && typeof TTSManager !== 'undefined' && TTSManager.speak) {
        try { TTSManager.speak(w.word); } catch (e) { /* ignore */ }
      }
    } else {
      const ch = current.seq[current.idx];
      els.target.textContent = ch === ';' ? '；' : (ch === ' ' ? '␣' : ch.toUpperCase());
      els.targetZh.textContent = '';
    }

    const rawTc = targetChar();
    const info = computeTargetInfo(rawTc);
    const keyEl = findKeyEl(info.baseKey);
    if (keyEl) keyEl.classList.add('tu-key-target');
    const fingerEl = root.querySelector(`[data-finger="${info.baseFinger}"]`);
    if (fingerEl) fingerEl.classList.add('tu-finger-active');
    if (info.shiftNeeded) {
      const shiftKeyEl = findKeyEl(info.shiftSide === 'left' ? 'ShiftLeft' : 'ShiftRight');
      if (shiftKeyEl) shiftKeyEl.classList.add('tu-key-target');
      const shiftFingerEl = root.querySelector(`[data-finger="${info.shiftFinger}"]`);
      if (shiftFingerEl) shiftFingerEl.classList.add('tu-finger-active');
    }
    els.hint.textContent = buildHintText(info, rawTc);
    els.hint.classList.remove('tu-hint-wrong');

    const pct = Math.round((progressCount() / totalCount()) * 100);
    els.progress.style.width = pct + '%';
  }

  function findKeyEl(ch) {
    // Avoid CSS attribute-selector escaping headaches for ; , . ' <space> — just
    // scan the on-screen keyboard directly.
    const keys = root.querySelectorAll('.tu-key');
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].dataset.key === ch) return keys[i];
    }
    return null;
  }

  // ===== Input handling =====
  function handlePress(ch) {
    if (screen !== 'lesson' || !current) return;
    if (current.lesson.type === 'funkeys') return; // funkeys uses its own key/tap/quiz handlers
    const cs = isCaseSensitive(current.lesson);
    const rawTc = targetChar();
    const norm = cs ? String(ch) : String(ch).toLowerCase();
    const target = cs ? rawTc : rawTc.toLowerCase();

    if (norm === target) {
      correctPress();
    } else {
      wrongPress(norm, target, rawTc);
    }
  }

  function correctPress() {
    current.correct++;
    playSound('correct');
    flashTarget('tu-pop');

    if (isListType(current.lesson)) {
      const w = current.seq[current.wordIdx];
      current.letterIdx++;
      if (current.letterIdx >= w.word.length) {
        current.wordIdx++;
        current.letterIdx = 0;
      }
      if (current.wordIdx >= itemCount(current.lesson)) { finishLesson(); return; }
    } else {
      current.idx++;
      if (current.idx >= (current.lesson.drillLen || DRILL_LEN)) { finishLesson(); return; }
    }
    updateDisplay();
  }

  function wrongPress(norm, target, rawTc) {
    current.errors++;
    playSound('wrong');
    flashTarget('tu-shake');

    const info = computeTargetInfo(rawTc);
    const keyEl = findKeyEl(info.baseKey);
    if (keyEl) {
      keyEl.classList.add('tu-key-wrong');
      setTimeout(() => keyEl.classList.remove('tu-key-wrong'), 260);
    }
    const hint = root.querySelector('#tu-hint');
    if (hint) {
      let msg;
      if (rawTc === ' ') msg = '❌ 打錯囉！要用拇指按空白鍵才對';
      else if (info.shiftNeeded) msg = `❌ 打錯囉！要${info.shiftSide === 'left' ? '左手' : '右手'}小指按住 Shift ＋ ${FINGER_LABELS[info.baseFinger]}才對`;
      else msg = `❌ 打錯囉！要用 ${FINGER_LABELS[info.baseFinger]} 按這個鍵才對`;
      hint.textContent = msg;
      hint.classList.add('tu-hint-wrong');
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        if (root.querySelector('#tu-hint')) updateDisplay();
      }, 900);
    }
  }

  function flashTarget(cls) {
    const el = root.querySelector('#tu-target');
    if (!el) return;
    el.classList.remove('tu-pop', 'tu-shake');
    void el.offsetWidth; // restart animation
    el.classList.add(cls);
  }

  function playSound(kind) {
    if (typeof SoundManager === 'undefined') return;
    try {
      if (kind === 'correct' && typeof SoundManager.playCorrect === 'function') SoundManager.playCorrect();
      else if (kind === 'wrong' && typeof SoundManager.playWrong === 'function') SoundManager.playWrong();
    } catch (e) { /* ignore */ }
  }

  // ===== Lesson 19: function-key flash cards + quiz =====
  function updateFunkeyDisplay() {
    const els = {
      target: root.querySelector('#tu-target'),
      targetZh: root.querySelector('#tu-target-zh'),
      progress: root.querySelector('#tu-progress'),
      hint: root.querySelector('#tu-hint'),
    };
    if (!els.target) return;

    root.querySelectorAll('.tu-key').forEach(k => k.classList.remove('tu-key-target'));
    root.querySelectorAll('[data-finger]').forEach(f => f.classList.remove('tu-finger-active'));

    if (current.stage === 'cards') {
      const card = FUNKEY_CARDS[current.cardIdx];
      els.target.innerHTML = `<div class="tu-funkey-card"><span class="tu-funkey-icon">${card.icon}</span><span class="tu-funkey-label">${card.label}</span></div>`;
      els.targetZh.textContent = card.desc;
      card.matchTapKeys.forEach(k => { const el = findKeyEl(k); if (el) el.classList.add('tu-key-target'); });
      els.hint.textContent = card.pressable
        ? `👉 請按下真正的 ${card.label} 鍵，或點一下畫面上的按鍵`
        : `👉 點一下畫面上的 ${card.label} 鍵`;
      els.hint.classList.remove('tu-hint-wrong');
      const pct = Math.round((current.cardIdx / (FUNKEY_CARDS.length + 6)) * 100);
      els.progress.style.width = pct + '%';
    } else if (current.stage === 'quiz') {
      const q = current.quizSeq[current.quizIdx];
      els.target.innerHTML = `<div class="tu-quiz-q">${q.q}</div>
        <div class="tu-quiz-opts">${current.quizOptions.map((opt, i) => `<button class="tu-quiz-opt" data-opt-idx="${i}">${opt}</button>`).join('')}</div>`;
      els.targetZh.textContent = '';
      els.hint.textContent = '👉 選出正確答案';
      els.hint.classList.remove('tu-hint-wrong');
      const pct = Math.round(((FUNKEY_CARDS.length + current.quizIdx) / (FUNKEY_CARDS.length + 6)) * 100);
      els.progress.style.width = pct + '%';
    }
  }

  function setupQuizQuestion() {
    const q = current.quizSeq[current.quizIdx];
    current.quizOptions = [q.answer, ...q.wrongs].sort(() => Math.random() - 0.5);
  }

  function advanceFunkeyCard() {
    current.cardIdx++;
    if (current.cardIdx >= FUNKEY_CARDS.length) {
      current.stage = 'quiz';
      current.quizIdx = 0;
      current.quizCorrect = 0;
      current.quizSeq = pickFunkeyQuiz(6);
      setupQuizQuestion();
    }
    updateDisplay();
  }

  function handleFunkeyTap(dk) {
    if (!current || current.stage !== 'cards') return;
    const card = FUNKEY_CARDS[current.cardIdx];
    if (card && card.matchTapKeys.includes(dk)) {
      playSound('correct');
      advanceFunkeyCard();
    }
  }

  function handleFunkeyKeydown(e) {
    if (!current || current.stage !== 'cards') return;
    const isRelevantKey = FUNKEY_PRESSABLE_KEYS.some(k => e.key === k || e.code === k);
    if (!isRelevantKey) return;
    e.preventDefault(); // never let Tab/Backspace/Delete/Enter/CapsLock escape this lesson
    const card = FUNKEY_CARDS[current.cardIdx];
    if (card && card.pressable && card.matchKey(e)) {
      playSound('correct');
      advanceFunkeyCard();
    }
  }

  function handleQuizAnswer(idx) {
    if (!current || current.stage !== 'quiz') return;
    const i = Number(idx);
    const selected = current.quizOptions[i];
    const q = current.quizSeq[current.quizIdx];
    if (selected === q.answer) { current.quizCorrect++; playSound('correct'); }
    else { playSound('wrong'); }
    current.quizIdx++;
    if (current.quizIdx >= 6) { finishLesson(); return; }
    setupQuizQuestion();
    updateDisplay();
  }

  // ===== Lesson end =====
  function finishLesson() {
    const elapsedSec = Math.max((performance.now() - current.startTime) / 1000, 0.5);
    let stars, accuracy, errorsCount;

    if (current.lesson.type === 'funkeys') {
      accuracy = Math.round((current.quizCorrect / 6) * 100);
      errorsCount = 6 - current.quizCorrect;
      stars = current.quizCorrect >= 6 ? 3 : (current.quizCorrect >= 5 ? 2 : 1);
    } else {
      const attempts = current.correct + current.errors;
      accuracy = attempts > 0 ? Math.round((current.correct / attempts) * 100) : 100;
      errorsCount = current.errors;
      stars = accuracy >= 95 ? 3 : (accuracy >= 85 ? 2 : 1);
    }

    const minutes = Math.max(elapsedSec / 60, 0.01);
    const wpm = current.lesson.type === 'funkeys' ? 0 : Math.round((current.correct / 5) / minutes);

    const lid = 'l' + current.id;
    const isFirst = !(save.done && save.done[lid]);
    const prevStars = (save.done && save.done[lid]) || 0;
    save.done[lid] = Math.max(prevStars, stars);
    persist();

    if (typeof GameEngine !== 'undefined') {
      if (isFirst) {
        GameEngine.addXP(15);
        GameEngine.addGems(3);
        if (typeof GameEngine.recordTutorLesson === 'function') GameEngine.recordTutorLesson();
        maybeGrantAllBonus();
        maybeGrantAdvBonus();
      } else {
        GameEngine.addXP(5);
      }
    }

    lastEnd = {
      id: current.id, accuracy, elapsedSec: Math.round(elapsedSec), wpm, stars,
      errors: errorsCount, isFirst,
    };
    screen = 'end';
    current = null;
    renderEndScreen();
  }

  function maybeGrantAllBonus() {
    if (save.allBonus) return;
    const doneCount = LESSON_DEFS.filter(l => l.id <= 12 && (save.done['l' + l.id] || 0) > 0).length;
    if (doneCount >= TOTAL_LESSONS) {
      save.allBonus = true;
      persist();
      if (typeof GameEngine !== 'undefined') {
        GameEngine.addGems(20);
        if (typeof GameEngine.showToast === 'function') GameEngine.showToast('🎓 打字訓練營基礎班全部畢業！+20 💎', 'gem');
      }
    }
  }

  function maybeGrantAdvBonus() {
    if (save.advBonus) return;
    const advDoneCount = LESSON_DEFS.filter(l => l.id >= 13 && (save.done['l' + l.id] || 0) > 0).length;
    if (advDoneCount >= ADV_LESSON_COUNT) {
      save.advBonus = true;
      persist();
      if (typeof GameEngine !== 'undefined') {
        GameEngine.addGems(30);
        if (typeof GameEngine.showToast === 'function') GameEngine.showToast('🎖️ 打字訓練營進階班全部畢業！+30 💎', 'gem');
      }
    }
  }

  function renderEndScreen() {
    const r = lastEnd;
    const hasNext = r.id < TOTAL_ALL_LESSONS && isUnlocked(r.id + 1);
    root.innerHTML = `
      <div class="tu-end-screen">
        <h3>${r.stars === 3 ? '🌟 完美過關！' : '✅ 課程完成！'}</h3>
        <div class="tu-end-stars">${starsHTML(r.stars)}</div>
        <div class="tu-end-stats">
          <p>🎯 正確率 <b>${r.accuracy}%</b></p>
          <p>⏱️ 花費時間 <b>${r.elapsedSec}</b> 秒</p>
          ${r.wpm > 0 ? `<p>⌨️ 打字速度 <b>${r.wpm}</b> WPM</p>` : ''}
          <p>❌ 失誤次數 <b>${r.errors}</b></p>
          ${r.isFirst ? '<p class="tu-reward">🎁 首次完成獎勵 +15 XP、+3 💎</p>' : '<p class="tu-reward">🔁 複習獎勵 +5 XP</p>'}
        </div>
        <div class="tu-end-buttons">
          <button class="tu-btn tu-btn-secondary" data-action="replay">🔁 再玩一次</button>
          ${hasNext ? `<button class="tu-btn tu-btn-primary" data-action="next">▶ 下一課</button>` : ''}
          <button class="tu-btn tu-btn-secondary" data-action="menu">🗂 返回選單</button>
        </div>
        <div class="tu-banner-typing">🎓 畢業後去「⌨️ 打字防衛戰」大顯身手！</div>
      </div>`;
  }

  return { init };
})();
