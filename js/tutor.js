/* ===== 打字訓練營 (Touch-Typing Camp) =====
   A lesson-based tutorial that teaches correct two-handed touch typing.
   12 sequential lessons (home row -> top row -> bottom row -> mixed ->
   graduation spelling test), each drilling 24 keystrokes (12: 8 words).
   A colored on-screen keyboard + a pair of "hands" show which finger is
   responsible for the current key, teaching real touch-typing finger
   zones. Feeds into 打字防衛戰 (js/typing.js) once graduated.
*/

const TutorGame = (() => {
  const SAVE_KEY = 'english_savior_tutor';
  const TOTAL_LESSONS = 12;
  const DRILL_LEN = 24;
  const WORD_COUNT = 8;

  // ===== Finger zones (standard two-handed touch typing) =====
  const FINGER_LABELS = {
    leftPinky: '左手小指', leftRing: '左手無名指', leftMiddle: '左手中指', leftIndex: '左手食指',
    rightIndex: '右手食指', rightMiddle: '右手中指', rightRing: '右手無名指', rightPinky: '右手小指',
  };
  const FINGER_COLORS = {
    leftPinky: '#ffd3e0', leftRing: '#ffe6b3', leftMiddle: '#d8f5c9', leftIndex: '#c9ecf9',
    rightIndex: '#ddd3f7', rightMiddle: '#fff3ae', rightRing: '#ffd7c2', rightPinky: '#c3f5e8',
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
  };

  const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  ];
  const BUMP_KEYS = ['f', 'j'];

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
  ];
  (function fillLesson11() {
    const set = new Set();
    LESSON_DEFS.forEach(l => { if (l.id <= 10 && l.keys) l.keys.forEach(k => set.add(k)); });
    LESSON_DEFS.find(l => l.id === 11).keys = Array.from(set);
  })();
  const LESSON_BY_ID = {};
  LESSON_DEFS.forEach(l => { LESSON_BY_ID[l.id] = l; });

  // ===== Save state =====
  let save = loadSave();

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return { done: raw.done || {}, allBonus: !!raw.allBonus };
    } catch (e) {
      return { done: {}, allBonus: false };
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
        } : null,
      }),
      startLesson: (id) => startLesson(id),
      press: (ch) => handlePress(ch),
    };
  }

  function bindEvents() {
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.tu-lesson-card');
      if (card && !card.classList.contains('tu-locked')) {
        startLesson(Number(card.dataset.id));
        return;
      }
      const key = e.target.closest('.tu-key');
      if (key && screen === 'lesson') {
        handlePress(key.dataset.key);
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
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1 || !/[a-zA-Z;,.]/.test(e.key)) return;
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
    if (lesson.id === 11) return '<span class="tu-key-badge tu-badge-mix">🔀 全部按鍵</span>';
    return lesson.keys.map(k => {
      const finger = KEY_FINGER[k] || 'leftIndex';
      const label = k === ';' ? '；' : k.toUpperCase();
      return `<span class="tu-key-badge" style="--fc:${FINGER_COLORS[finger]}">${label}</span>`;
    }).join('');
  }

  function renderSelect() {
    screen = 'select';
    current = null;
    const cards = LESSON_DEFS.map(l => {
      const unlocked = isUnlocked(l.id);
      const stars = (save.done && save.done['l' + l.id]) || 0;
      const cls = ['tu-lesson-card'];
      if (!unlocked) cls.push('tu-locked'); else cls.push('tu-unlocked');
      if (stars > 0) cls.push('tu-done');
      return `
        <div class="${cls.join(' ')}" data-id="${l.id}">
          <div class="tu-card-num">第 ${l.id} 課</div>
          <div class="tu-card-name">${l.name}</div>
          <div class="tu-card-keys">${cardKeyBadges(l)}</div>
          <div class="tu-card-stars">${unlocked ? starsHTML(stars) : ''}</div>
          ${unlocked ? '' : '<div class="tu-lock-icon">🔒</div>'}
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="tu-select-screen">
        <div class="tu-intro-card">
          <h3>✋ 基準鍵位小教室</h3>
          <p>雙手輕輕放在鍵盤中間那排：左手放在 <b>A S D F</b>，右手放在 <b>J K L ；</b>。
          摸摸看 <b>F</b> 和 <b>J</b> 鍵上有一個小凸點，那就是讓你不用看鍵盤也能找到「基準鍵」的秘密提示！
          每次打完字，記得把手指放回基準鍵喔。</p>
        </div>
        <div class="tu-lesson-grid">${cards}</div>
        <div class="tu-banner-typing">🎓 畢業後去「⌨️ 打字防衛戰」大顯身手！</div>
      </div>`;
  }

  // ===== Word pool for L12 =====
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

  // ===== Sequence generation =====
  function buildSequence(lesson) {
    if (lesson.type === 'words') return pickWords(WORD_COUNT);
    const keys = lesson.keys;
    const seq = [];
    let last = null;
    for (let i = 0; i < DRILL_LEN; i++) {
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
      wordIdx: 0,    // word-mode pointer into seq
      letterIdx: 0,  // word-mode pointer into current word's letters
      correct: 0,
      errors: 0,
      startTime: performance.now(),
    };
    screen = 'lesson';
    renderLessonScreen();
    return true;
  }

  function targetChar() {
    if (!current) return '';
    if (current.lesson.type === 'words') {
      const w = current.seq[current.wordIdx];
      return w ? w.word[current.letterIdx] : '';
    }
    return current.seq[current.idx] || '';
  }

  function progressCount() {
    if (current.lesson.type === 'words') return current.wordIdx;
    return current.idx;
  }
  function totalCount() {
    return current.lesson.type === 'words' ? WORD_COUNT : DRILL_LEN;
  }

  function renderLessonScreen() {
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
        <div class="tu-keyboard" id="tu-keyboard">${buildKeyboardHTML()}</div>
        <div class="tu-legend">${buildLegendHTML()}</div>
        <div class="tu-hands" id="tu-hands">
          <div class="tu-hand tu-hand-left">${FINGER_ORDER_LEFT.map(fingerDivHTML).join('')}</div>
          <div class="tu-hand-gap">✋🖐️</div>
          <div class="tu-hand tu-hand-right">${FINGER_ORDER_RIGHT.map(fingerDivHTML).join('')}</div>
        </div>
        <div class="tu-hint" id="tu-hint"></div>
      </div>`;
    updateDisplay();
  }

  function fingerDivHTML(f) {
    return `<div class="tu-finger" data-finger="${f}" style="--fc:${FINGER_COLORS[f]}"><div class="tu-finger-dot"></div></div>`;
  }

  function buildKeyboardHTML() {
    return KEYBOARD_ROWS.map((row, ri) => `
      <div class="tu-key-row tu-key-row-${ri}">
        ${row.map(k => {
          const finger = KEY_FINGER[k];
          const label = k === ';' ? '；' : k.toUpperCase();
          const bump = BUMP_KEYS.includes(k) ? '<span class="tu-bump"></span>' : '';
          return `<div class="tu-key" data-key="${k}" style="--fc:${FINGER_COLORS[finger]}">${label}${bump}</div>`;
        }).join('')}
      </div>`).join('');
  }

  function buildLegendHTML() {
    const order = FINGER_ORDER_LEFT.concat(FINGER_ORDER_RIGHT);
    const shortLabel = {
      leftPinky: '左小', leftRing: '左名', leftMiddle: '左中', leftIndex: '左食',
      rightIndex: '右食', rightMiddle: '右中', rightRing: '右名', rightPinky: '右小',
    };
    return order.map(f => `<span class="tu-legend-item" style="--fc:${FINGER_COLORS[f]}">${shortLabel[f]}</span>`).join('');
  }

  function updateDisplay() {
    const els = {
      target: root.querySelector('#tu-target'),
      targetZh: root.querySelector('#tu-target-zh'),
      progress: root.querySelector('#tu-progress'),
      hint: root.querySelector('#tu-hint'),
    };
    if (!els.target) return;

    root.querySelectorAll('.tu-key').forEach(k => k.classList.remove('tu-key-target'));
    root.querySelectorAll('.tu-finger').forEach(f => f.classList.remove('tu-finger-active'));

    if (current.lesson.type === 'words') {
      const w = current.seq[current.wordIdx];
      if (!w) return;
      els.target.innerHTML = `<span class="tu-word-hint">${w.hint}</span> ` +
        w.word.split('').map((ch, i) => `<span class="${i < current.letterIdx ? 'tu-done' : ''}">${ch}</span>`).join('');
      els.targetZh.textContent = w.zh || '';
      if (current.letterIdx === 0 && typeof TTSManager !== 'undefined' && TTSManager.speak) {
        try { TTSManager.speak(w.word); } catch (e) { /* ignore */ }
      }
    } else {
      const ch = current.seq[current.idx];
      els.target.textContent = ch === ';' ? '；' : ch.toUpperCase();
      els.targetZh.textContent = '';
    }

    const tc = targetChar().toLowerCase();
    const finger = KEY_FINGER[tc] || 'leftIndex';
    const keyEl = findKeyEl(tc);
    if (keyEl) keyEl.classList.add('tu-key-target');
    const fingerEl = root.querySelector(`.tu-finger[data-finger="${finger}"]`);
    if (fingerEl) fingerEl.classList.add('tu-finger-active');
    els.hint.textContent = `👉 使用 ${FINGER_LABELS[finger]}`;
    els.hint.classList.remove('tu-hint-wrong');

    const pct = Math.round((progressCount() / totalCount()) * 100);
    els.progress.style.width = pct + '%';
  }

  function findKeyEl(ch) {
    // Avoid CSS attribute-selector escaping headaches for ; , . — just
    // scan the (small, 29-key) on-screen keyboard directly.
    const keys = root.querySelectorAll('.tu-key');
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].dataset.key === ch) return keys[i];
    }
    return null;
  }

  // ===== Input handling =====
  function handlePress(ch) {
    if (screen !== 'lesson' || !current) return;
    const norm = String(ch).toLowerCase();
    const tc = targetChar().toLowerCase();

    if (norm === tc) {
      correctPress();
    } else {
      wrongPress(norm, tc);
    }
  }

  function correctPress() {
    current.correct++;
    playSound('correct');
    flashTarget('tu-pop');

    if (current.lesson.type === 'words') {
      const w = current.seq[current.wordIdx];
      current.letterIdx++;
      if (current.letterIdx >= w.word.length) {
        current.wordIdx++;
        current.letterIdx = 0;
      }
      if (current.wordIdx >= WORD_COUNT) { finishLesson(); return; }
    } else {
      current.idx++;
      if (current.idx >= DRILL_LEN) { finishLesson(); return; }
    }
    updateDisplay();
  }

  function wrongPress(norm, tc) {
    current.errors++;
    playSound('wrong');
    flashTarget('tu-shake');

    const keyEl = findKeyEl(norm);
    if (keyEl) {
      keyEl.classList.add('tu-key-wrong');
      setTimeout(() => keyEl.classList.remove('tu-key-wrong'), 260);
    }
    const finger = KEY_FINGER[tc] || 'leftIndex';
    const hint = root.querySelector('#tu-hint');
    if (hint) {
      hint.textContent = `❌ 打錯囉！要用 ${FINGER_LABELS[finger]} 按這個鍵才對`;
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

  // ===== Lesson end =====
  function finishLesson() {
    const elapsedSec = Math.max((performance.now() - current.startTime) / 1000, 0.5);
    const attempts = current.correct + current.errors;
    const accuracy = attempts > 0 ? Math.round((current.correct / attempts) * 100) : 100;
    const minutes = Math.max(elapsedSec / 60, 0.01);
    const wpm = Math.round((current.correct / 5) / minutes);
    const stars = accuracy >= 95 ? 3 : (accuracy >= 85 ? 2 : 1);

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
      } else {
        GameEngine.addXP(5);
      }
    }

    lastEnd = {
      id: current.id, accuracy, elapsedSec: Math.round(elapsedSec), wpm, stars,
      errors: current.errors, isFirst,
    };
    screen = 'end';
    current = null;
    renderEndScreen();
  }

  function maybeGrantAllBonus() {
    if (save.allBonus) return;
    const doneCount = LESSON_DEFS.filter(l => (save.done['l' + l.id] || 0) > 0).length;
    if (doneCount >= TOTAL_LESSONS) {
      save.allBonus = true;
      persist();
      if (typeof GameEngine !== 'undefined') {
        GameEngine.addGems(20);
        if (typeof GameEngine.showToast === 'function') GameEngine.showToast('🎓 打字訓練營全部畢業！+20 💎', 'gem');
      }
    }
  }

  function renderEndScreen() {
    const r = lastEnd;
    const hasNext = r.id < TOTAL_LESSONS && isUnlocked(r.id + 1);
    root.innerHTML = `
      <div class="tu-end-screen">
        <h3>${r.stars === 3 ? '🌟 完美過關！' : '✅ 課程完成！'}</h3>
        <div class="tu-end-stars">${starsHTML(r.stars)}</div>
        <div class="tu-end-stats">
          <p>🎯 正確率 <b>${r.accuracy}%</b></p>
          <p>⏱️ 花費時間 <b>${r.elapsedSec}</b> 秒</p>
          <p>⌨️ 打字速度 <b>${r.wpm}</b> WPM</p>
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
