/* ===== English Detective Agency Module (英語偵探社) =====
   Escape-room-style reading-comprehension mystery game. Cases are declared
   in js/data/detective.js (DETECTIVE_CASES) and interpreted here: a case
   select screen (rpg.js chapter-select conventions), a scene intro, four
   "rooms" — one of each puzzle type (read/liar/code/witness) — that build
   fragments onto a cork-board 線索板 (clue board), and a final suspect
   line-up. Adding a case only requires appending to DETECTIVE_CASES.
*/

const DetectiveGame = (() => {
  const STORAGE_KEY = 'english_savior_detective';

  let save = loadSave();          // { done: { caseId: stars } }
  let cs = null;                  // active case data
  let roomIdx = 0;
  let clues = [];                 // clueZh fragments collected this case
  let firstTryCount = 0;          // rooms solved without a wrong attempt
  let wrongAccuseCount = 0;       // wrong culprit guesses this case
  let screen = 'select';          // 'select' | 'scene' | 'room' | 'accuse' | 'clear'
  let roomRT = null;              // per-room runtime state (firstTry/hintUsed/bank/built)
  let els = {};

  function init() {
    const root = document.getElementById('dt-root');
    if (!root) return;
    root.innerHTML = buildHTML();
    cacheEls(root);
    bindStatic();
    renderSelect();
    showScreen('select');

    window.__dtTest = {
      save: () => JSON.parse(JSON.stringify(save)),
      startCase: id => {
        const c = DETECTIVE_CASES.find(x => x.id === id);
        if (c) enterCase(c);
      },
      room: () => (screen === 'room' && cs ? { idx: roomIdx, type: cs.rooms[roomIdx].type } : null),
      answer: correctBool => testAnswer(correctBool),
      accuse: idx => testAccuse(idx),
      screen: () => screen,
    };
  }

  // ===== Persistence =====
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { done: (d && d.done) || {} };
    } catch {
      return { done: {} };
    }
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }
  function isUnlocked(i) {
    return i === 0 || !!save.done[DETECTIVE_CASES[i - 1].id];
  }

  // ===== Shell HTML =====
  function buildHTML() {
    return `
      <div class="dt-select" id="dt-select">
        <p class="dt-select-intro">🔍 歡迎加入英語偵探社！閱讀英文線索、找出說謊的人、破解密碼，指認出真正的兇手吧！</p>
        <div class="dt-cases" id="dt-cases"></div>
      </div>

      <div class="dt-case" id="dt-case-screen" style="display:none">
        <div class="dt-topbar">
          <button class="dt-exit-btn" id="dt-exit-btn">⬅ 返回案件列表</button>
          <h3 id="dt-case-title"></h3>
        </div>
        <div class="dt-progress" id="dt-progress"></div>
        <button class="dt-clue-toggle" id="dt-clue-toggle">📌 線索板（<span id="dt-clue-count">0</span>）</button>
        <div class="dt-clueboard" id="dt-clueboard" style="display:none"></div>

        <div class="dt-scene-overlay" id="dt-scene-overlay">
          <div class="dt-scene-card">
            <div class="dt-scene-icon" id="dt-scene-icon"></div>
            <p class="dt-scene-text" id="dt-scene-text"></p>
            <button class="dt-scene-go" id="dt-scene-go">🔍 開始辦案！</button>
          </div>
        </div>

        <div class="dt-stage" id="dt-stage"></div>

        <div class="dt-accuse" id="dt-accuse" style="display:none">
          <h3>🎯 指認兇手！</h3>
          <p class="dt-accuse-hint">根據你收集到的所有線索，誰才是真正的兇手？</p>
          <div class="dt-suspect-grid" id="dt-suspect-grid"></div>
        </div>
      </div>

      <div class="dt-clear" id="dt-clear" style="display:none">
        <div id="dt-clear-info"></div>
        <button class="dt-clear-btn" id="dt-clear-btn">回案件列表</button>
      </div>
    `;
  }

  function cacheEls(root) {
    els = {
      select: root.querySelector('#dt-select'),
      cases: root.querySelector('#dt-cases'),
      caseScreen: root.querySelector('#dt-case-screen'),
      caseTitle: root.querySelector('#dt-case-title'),
      progress: root.querySelector('#dt-progress'),
      clueToggle: root.querySelector('#dt-clue-toggle'),
      clueCount: root.querySelector('#dt-clue-count'),
      clueboard: root.querySelector('#dt-clueboard'),
      sceneOverlay: root.querySelector('#dt-scene-overlay'),
      sceneIcon: root.querySelector('#dt-scene-icon'),
      sceneText: root.querySelector('#dt-scene-text'),
      sceneGo: root.querySelector('#dt-scene-go'),
      stage: root.querySelector('#dt-stage'),
      accuse: root.querySelector('#dt-accuse'),
      suspectGrid: root.querySelector('#dt-suspect-grid'),
      exitBtn: root.querySelector('#dt-exit-btn'),
      clear: root.querySelector('#dt-clear'),
      clearInfo: root.querySelector('#dt-clear-info'),
      clearBtn: root.querySelector('#dt-clear-btn'),
    };
  }

  function bindStatic() {
    els.exitBtn.addEventListener('click', exitToSelect);
    els.clearBtn.addEventListener('click', exitToSelect);
    els.clueToggle.addEventListener('click', () => {
      const showing = els.clueboard.style.display !== 'none';
      els.clueboard.style.display = showing ? 'none' : 'block';
    });
    els.sceneGo.addEventListener('click', startInvestigation);
  }

  function showScreen(name) {
    screen = name;
    els.select.style.display = name === 'select' ? 'block' : 'none';
    els.caseScreen.style.display = (name === 'scene' || name === 'room' || name === 'accuse') ? 'block' : 'none';
    els.clear.style.display = name === 'clear' ? 'flex' : 'none';
    els.sceneOverlay.style.display = name === 'scene' ? 'flex' : 'none';
    els.stage.style.display = name === 'room' ? 'block' : 'none';
    els.accuse.style.display = name === 'accuse' ? 'block' : 'none';
  }

  // ===== Case select =====
  function renderSelect() {
    els.cases.innerHTML = '';
    DETECTIVE_CASES.forEach((c, i) => {
      const unlocked = isUnlocked(i);
      const stars = save.done[c.id] || 0;
      const card = document.createElement('button');
      card.className = 'dt-case-card' + (unlocked ? '' : ' locked') + (stars ? ' cleared' : '');
      card.innerHTML =
        `<span class="dt-case-icon">${unlocked ? c.icon : '🔒'}</span>` +
        `<span class="dt-case-name">案件 ${i + 1}：${c.title}</span>` +
        `<span class="dt-case-stars">${stars ? '⭐'.repeat(stars) : (unlocked ? '尚未偵破' : '完成上一案解鎖')}</span>`;
      if (unlocked) card.addEventListener('click', () => enterCase(c));
      els.cases.appendChild(card);
    });
  }

  function exitToSelect() {
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    cs = null;
    showScreen('select');
    renderSelect();
  }

  // ===== Case flow =====
  function enterCase(c) {
    cs = c;
    roomIdx = 0;
    clues = [];
    firstTryCount = 0;
    wrongAccuseCount = 0;
    roomRT = null;
    GameEngine.setDeferLevelUp(true);

    els.caseTitle.textContent = `${c.icon} ${c.title}`;
    els.sceneIcon.textContent = c.icon;
    els.sceneText.textContent = c.sceneZh;
    renderProgress();
    renderClueBoard();
    showScreen('scene');
  }

  function startInvestigation() {
    renderRoom(0);
  }

  function renderProgress() {
    els.progress.innerHTML = '';
    cs.rooms.forEach((r, i) => {
      const dot = document.createElement('span');
      dot.className = 'dt-progress-dot' + (i < roomIdx ? ' done' : (i === roomIdx && screen === 'room' ? ' active' : ''));
      dot.textContent = i < roomIdx ? '✅' : String(i + 1);
      els.progress.appendChild(dot);
    });
  }

  function renderClueBoard() {
    els.clueCount.textContent = String(clues.length);
    els.clueboard.innerHTML = clues.length
      ? clues.map((c, i) => `<div class="dt-clue-note">📌 <b>線索 ${i + 1}：</b>${c}</div>`).join('')
      : '<div class="dt-clue-empty">尚未發現任何線索……快去解開謎題吧！</div>';
  }

  // ===== Rooms =====
  function currentRoom() {
    return cs ? cs.rooms[roomIdx] : null;
  }

  function renderRoom(idx) {
    roomIdx = idx;
    showScreen('room');
    renderProgress();
    const room = currentRoom();
    roomRT = { firstTry: true, hintUsed: false };
    els.stage.innerHTML = '';
    els.stage.appendChild(buildPuzzle(room));
  }

  function buildPuzzle(room) {
    const wrap = document.createElement('div');
    wrap.className = 'dt-puzzle dt-puzzle-' + room.type;

    if (room.type === 'read') {
      wrap.innerHTML = `
        <div class="dt-puzzle-label">📖 閱讀線索</div>
        <p class="dt-passage" id="dt-passage-text">${room.textEn}</p>
        <p class="dt-question">${room.question}</p>
        <div class="dt-options" id="dt-options"></div>
        <div class="dt-feedback" id="dt-feedback"></div>
      `;
      if (TTSManager.isSupported()) {
        wrap.querySelector('#dt-passage-text').after(ttsAfter(room.textEn));
      }
      const optWrap = wrap.querySelector('#dt-options');
      room.options.forEach((opt, j) => optWrap.appendChild(makeOptionButton(opt, j, room)));
      maybeAddHintOption(wrap, room);
    } else if (room.type === 'liar') {
      wrap.innerHTML = `
        <div class="dt-puzzle-label">🕵️ 誰在說謊？</div>
        <p class="dt-fact">📋 已知事實：${room.factZh}</p>
        <div class="dt-statements" id="dt-statements"></div>
        <div class="dt-feedback" id="dt-feedback"></div>
      `;
      const stWrap = wrap.querySelector('#dt-statements');
      room.statements.forEach((st, j) => {
        const row = document.createElement('div');
        row.className = 'dt-statement';
        const speaker = document.createElement('div');
        speaker.className = 'dt-speaker';
        speaker.textContent = st.speaker;
        const text = document.createElement('div');
        text.className = 'dt-statement-text';
        text.textContent = `"${st.textEn}"`;
        row.appendChild(speaker);
        row.appendChild(text);
        if (TTSManager.isSupported()) row.appendChild(TTSManager.createButton(st.textEn, 'en-US'));
        const btn = document.createElement('button');
        btn.className = 'dt-opt dt-liar-btn';
        btn.dataset.idx = j;
        btn.textContent = '🚨 就是這句是謊言！';
        btn.addEventListener('click', () => onAnswer(room, j, btn, wrap));
        row.appendChild(btn);
        stWrap.appendChild(row);
      });
      maybeAddHintOption(wrap, room);
    } else if (room.type === 'code') {
      wrap.innerHTML = `
        <div class="dt-puzzle-label">🔐 解碼謎題</div>
        <p class="dt-riddle" id="dt-riddle-text">${room.riddleEn}</p>
        <div class="dt-code-display" id="dt-code-display"></div>
        <div class="dt-letter-bank" id="dt-letter-bank"></div>
        <div class="dt-code-actions">
          <button class="dt-backspace-btn" id="dt-backspace-btn">⌫ 刪除</button>
        </div>
        <div class="dt-feedback" id="dt-feedback"></div>
      `;
      if (TTSManager.isSupported()) wrap.querySelector('#dt-riddle-text').after(ttsAfter(room.riddleEn));
      setupCodeRoom(wrap, room);
    } else if (room.type === 'witness') {
      wrap.innerHTML = `
        <div class="dt-puzzle-label">👀 目擊者描述</div>
        <p class="dt-desc" id="dt-desc-text">${room.descEn}</p>
        <div class="dt-suspect-grid" id="dt-suspect-options"></div>
        <div class="dt-feedback" id="dt-feedback"></div>
      `;
      if (TTSManager.isSupported()) wrap.querySelector('#dt-desc-text').after(ttsAfter(room.descEn));
      const grid = wrap.querySelector('#dt-suspect-options');
      room.options.forEach((opt, j) => {
        const btn = document.createElement('button');
        btn.className = 'dt-opt dt-suspect-opt';
        btn.dataset.idx = j;
        btn.innerHTML = `<span class="dt-suspect-emoji">${opt.emoji}</span><span class="dt-suspect-label">${opt.label}</span>`;
        btn.addEventListener('click', () => onAnswer(room, j, btn, wrap));
        grid.appendChild(btn);
      });
      maybeAddHintOption(wrap, room);
    }
    return wrap;
  }

  function ttsAfter(text) {
    const span = document.createElement('div');
    span.className = 'dt-tts-row';
    if (TTSManager.isSupported()) span.appendChild(TTSManager.createButton(text, 'en-US'));
    return span;
  }

  function makeOptionButton(text, j, room) {
    const btn = document.createElement('button');
    btn.className = 'dt-opt';
    btn.dataset.idx = j;
    btn.textContent = text;
    btn.addEventListener('click', () => onAnswer(room, j, btn, btn.closest('.dt-puzzle')));
    return btn;
  }

  // Hint crystal: eliminate one wrong option (read/liar/witness)
  function maybeAddHintOption(wrap, room) {
    if (!GameEngine.hasBuff('hint') || roomRT.hintUsed) return;
    const hb = document.createElement('button');
    hb.className = 'dt-hint-btn';
    hb.textContent = '🔮 用提示水晶刪去一個錯誤選項';
    hb.addEventListener('click', () => {
      if (!GameEngine.hasBuff('hint') || roomRT.hintUsed) return;
      GameEngine.consumeBuff('hint');
      roomRT.hintUsed = true;
      GameEngine.showToast('🔮 提示水晶生效！', 'achievement');
      const wrongBtns = [...wrap.querySelectorAll('.dt-opt')].filter(b => Number(b.dataset.idx) !== room.a && !b.disabled);
      if (wrongBtns.length) { wrongBtns[0].disabled = true; wrongBtns[0].classList.add('eliminated'); }
      hb.remove();
    });
    wrap.appendChild(hb);
  }

  function onAnswer(room, idx, btn, wrap) {
    if (btn.disabled) return;
    if (idx === room.a) {
      btn.classList.add('correct');
      finishRoomCorrect(room, wrap);
    } else {
      btn.disabled = true;
      btn.classList.add('wrong');
      roomRT.firstTry = false;
      SoundManager.playWrong();
      const fb = wrap.querySelector('#dt-feedback');
      fb.textContent = `💡 ${room.explainZh} 再試一次！`;
      fb.classList.add('show');
    }
  }

  function finishRoomCorrect(room, wrap) {
    SoundManager.playCorrect();
    const fb = wrap.querySelector('#dt-feedback');
    if (fb) { fb.textContent = `✅ 答對了！${room.explainZh}`; fb.classList.add('show', 'good'); }

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

    if (roomRT.firstTry) firstTryCount++;
    clues.push(room.clueZh);
    renderClueBoard();

    setTimeout(() => {
      if (roomIdx + 1 < cs.rooms.length) {
        renderRoom(roomIdx + 1);
      } else {
        renderAccuse();
      }
    }, 900);
  }

  // ===== Code puzzle =====
  function setupCodeRoom(wrap, room) {
    const bankLetters = shuffle(room.letterBank.slice());
    roomRT.bank = bankLetters.map(ch => ({ ch, used: false }));
    roomRT.built = []; // array of bank indices, in order typed
    const bankWrap = wrap.querySelector('#dt-letter-bank');
    roomRT.bank.forEach((entry, bi) => {
      const b = document.createElement('button');
      b.className = 'dt-letter-btn';
      b.textContent = entry.ch;
      b.dataset.bi = bi;
      b.addEventListener('click', () => pickLetter(wrap, room, bi));
      bankWrap.appendChild(b);
    });
    wrap.querySelector('#dt-backspace-btn').addEventListener('click', () => backspaceLetter(wrap, room));
    renderCodeDisplay(wrap, room);

    // Hint crystal: reveal the next correct letter
    if (GameEngine.hasBuff('hint') && !roomRT.hintUsed) {
      const hb = document.createElement('button');
      hb.className = 'dt-hint-btn';
      hb.textContent = '🔮 用提示水晶顯示下一個字母';
      hb.addEventListener('click', () => {
        if (!GameEngine.hasBuff('hint') || roomRT.hintUsed) return;
        const need = room.answer[roomRT.built.length];
        const bi = roomRT.bank.findIndex(e => !e.used && e.ch === need);
        if (bi === -1) return;
        GameEngine.consumeBuff('hint');
        roomRT.hintUsed = true;
        GameEngine.showToast('🔮 提示水晶生效！', 'achievement');
        pickLetter(wrap, room, bi);
        hb.remove();
      });
      wrap.appendChild(hb);
    }
  }

  function renderCodeDisplay(wrap, room) {
    const disp = wrap.querySelector('#dt-code-display');
    disp.innerHTML = '';
    for (let i = 0; i < room.answer.length; i++) {
      const slot = document.createElement('span');
      slot.className = 'dt-code-slot' + (i < roomRT.built.length ? ' filled' : '');
      slot.textContent = i < roomRT.built.length ? roomRT.bank[roomRT.built[i]].ch : '_';
      disp.appendChild(slot);
    }
  }

  function pickLetter(wrap, room, bi) {
    if (roomRT.built.length >= room.answer.length) return;
    const entry = roomRT.bank[bi];
    if (!entry || entry.used) return;
    entry.used = true;
    roomRT.built.push(bi);
    const btn = wrap.querySelector(`.dt-letter-btn[data-bi="${bi}"]`);
    if (btn) btn.disabled = true;
    renderCodeDisplay(wrap, room);
    if (roomRT.built.length === room.answer.length) checkCode(wrap, room);
  }

  function backspaceLetter(wrap, room) {
    if (!roomRT.built.length) return;
    const bi = roomRT.built.pop();
    roomRT.bank[bi].used = false;
    const btn = wrap.querySelector(`.dt-letter-btn[data-bi="${bi}"]`);
    if (btn) btn.disabled = false;
    renderCodeDisplay(wrap, room);
  }

  function checkCode(wrap, room) {
    const built = roomRT.built.map(bi => roomRT.bank[bi].ch).join('');
    if (built === room.answer) {
      finishRoomCorrect(room, wrap);
    } else {
      roomRT.firstTry = false;
      SoundManager.playWrong();
      const fb = wrap.querySelector('#dt-feedback');
      fb.textContent = `💡 ${room.explainZh} 再試一次！`;
      fb.classList.add('show');
      setTimeout(() => {
        // reset the attempt so the player (or test) can retry
        roomRT.built.forEach(bi => { roomRT.bank[bi].used = false; });
        roomRT.built = [];
        wrap.querySelectorAll('.dt-letter-btn').forEach(b => { b.disabled = false; });
        renderCodeDisplay(wrap, room);
      }, 700);
    }
  }

  // ===== Culprit accusation =====
  function renderAccuse() {
    showScreen('accuse');
    renderProgress();
    els.suspectGrid.innerHTML = '';
    cs.culprit.suspects.forEach((s, j) => {
      const btn = document.createElement('button');
      btn.className = 'dt-opt dt-suspect-opt dt-accuse-opt';
      btn.dataset.idx = j;
      btn.innerHTML = `<span class="dt-suspect-emoji">${s.emoji}</span><span class="dt-suspect-label">${s.name}</span><span class="dt-suspect-desc">${s.zh}</span>`;
      btn.addEventListener('click', () => onAccuse(j, btn));
      els.suspectGrid.appendChild(btn);
    });
  }

  function onAccuse(idx, btn) {
    if (idx === cs.culprit.answer) {
      btn.classList.add('correct');
      SoundManager.playQuestComplete();
      closeCase();
    } else {
      btn.classList.add('wrong');
      wrongAccuseCount++;
      SoundManager.playWrong();
      GameEngine.showToast('❌ 不是這個人！再想想線索板上的證據吧！', 'error');
      setTimeout(() => { btn.classList.remove('wrong'); }, 500);
    }
  }

  function closeCase() {
    const ratio = firstTryCount / cs.rooms.length;
    let stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
    if (wrongAccuseCount > 0) stars = Math.max(1, stars - 1);

    let xp = 40, gems = 10;
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
    GameEngine.recordDetectiveCase();
    SoundManager.playQuestComplete();

    save.done[cs.id] = Math.max(save.done[cs.id] || 0, stars);
    persist();

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    const idx = DETECTIVE_CASES.findIndex(c => c.id === cs.id);
    const next = DETECTIVE_CASES[idx + 1];
    els.clearInfo.innerHTML =
      `<div class="dt-clear-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` +
      `${cs.icon} <b>${cs.title}</b> 案件偵破！（答對率 ${Math.round(ratio * 100)}%）<br>` +
      `🔎 <b>兇手就是：${cs.culprit.suspects[cs.culprit.answer].emoji} ${cs.culprit.suspects[cs.culprit.answer].name}</b><br>` +
      `<p class="dt-clear-clue">${cs.culprit.clueZh}</p>` +
      `獲得 <b>+${xp} XP</b> 和 <b>+${gems} 💎</b><br>` +
      (next ? `🔓 已解鎖：案件 ${idx + 2}：${next.icon} ${next.title}` : '🏆 恭喜你偵破了英語偵探社的所有案件！');
    showScreen('clear');
  }

  // ===== Test helpers =====
  function testAnswer(correctBool) {
    const room = currentRoom();
    if (!room || screen !== 'room') return;
    if (room.type === 'code') {
      const guess = correctBool ? room.answer.split('') : wrongCodeGuess(room);
      // Clear any partially built state first
      if (roomRT.built.length) {
        while (roomRT.built.length) {
          const bi = roomRT.built.pop();
          roomRT.bank[bi].used = false;
        }
        const wrap = els.stage.querySelector('.dt-puzzle-code');
        if (wrap) { wrap.querySelectorAll('.dt-letter-btn').forEach(b => { b.disabled = false; }); renderCodeDisplay(wrap, room); }
      }
      const wrap = els.stage.querySelector('.dt-puzzle-code');
      guess.forEach(ch => {
        const bi = roomRT.bank.findIndex(e => !e.used && e.ch === ch);
        if (bi !== -1) pickLetter(wrap, room, bi);
      });
    } else {
      const idx = correctBool ? room.a : (room.a === 0 ? 1 : 0);
      const wrap = els.stage.firstElementChild;
      const btn = wrap && wrap.querySelector(`.dt-opt[data-idx="${idx}"]`);
      if (btn) btn.click();
    }
  }

  // Build a wrong-length-matching guess for a code room's answer, guaranteed
  // to differ from the real answer (used by wrong-path tests).
  function wrongCodeGuess(room) {
    const bankChars = room.letterBank.slice();
    const len = room.answer.length;
    // Rotate the answer's own letters by one so length matches but the
    // word (almost certainly) doesn't, falling back to a decoy swap.
    let guess = room.answer.split('');
    guess.push(guess.shift());
    if (guess.join('') === room.answer) {
      // answer was a single repeated letter (never happens here) — swap
      // in a decoy letter instead.
      const decoy = bankChars.find(ch => !room.answer.includes(ch));
      if (decoy) guess[0] = decoy;
    }
    return guess;
  }

  function testAccuse(idx) {
    if (screen !== 'accuse') return;
    const btn = els.suspectGrid.querySelector(`.dt-opt[data-idx="${idx}"]`);
    if (btn) btn.click();
  }

  // ===== Utils =====
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { init };
})();
