/* ===== YouTube Comprehension Module =====
   Video-style English lessons: press play and the script narrates
   sentence-by-sentence karaoke-style (TTS + highlighted subtitle line),
   tap glowing vocab words to hear them, then take a one-question-at-a-
   time quiz with instant feedback.
*/

const YoutubeGame = (() => {
  let shuffledIndices = [];
  let currentPosition = 0;

  // Playback state
  let lines = [];          // script sentences
  let lineIdx = 0;
  let playing = false;
  let watched = false;     // unlocks the quiz
  let currentUtter = null;
  let fallbackTimer = null;

  // Quiz state
  let quizIdx = 0;
  let quizCorrectCount = 0;
  let quizFinished = false;

  let els = {};

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildShuffledOrder() {
    shuffledIndices = shuffleArray(Array.from({ length: VIDEO_LESSONS.length }, (_, i) => i));
    currentPosition = 0;
  }

  function init() {
    els = {
      counter: document.getElementById('yt-counter'),
      thumbnail: document.getElementById('yt-thumbnail'),
      script: document.getElementById('yt-script'),
      playToggle: document.getElementById('yt-play-toggle'),
      replay: document.getElementById('yt-replay'),
      progressBar: document.getElementById('yt-progress-bar'),
      eq: document.getElementById('yt-eq'),
      vocabList: document.getElementById('yt-vocab-list'),
      quizLock: document.getElementById('yt-quiz-lock'),
      quizDots: document.getElementById('yt-quiz-dots'),
      quizQuestion: document.getElementById('yt-quiz-questions'),
      feedback: document.getElementById('yt-feedback'),
    };

    els.playToggle.addEventListener('click', togglePlay);
    els.replay.addEventListener('click', () => { stopPlayback(); startPlayback(0); });
    els.thumbnail.addEventListener('click', togglePlay);
    document.getElementById('yt-next-lesson').addEventListener('click', nextLesson);

    buildShuffledOrder();
    loadLesson();
  }

  function currentLesson() {
    return VIDEO_LESSONS[shuffledIndices[currentPosition]];
  }

  // ===== Lesson loading =====
  function loadLesson() {
    const lesson = currentLesson();
    stopPlayback();
    watched = false;
    quizIdx = 0;
    quizCorrectCount = 0;
    quizFinished = false;

    els.counter.textContent = `第 ${currentPosition + 1} / ${VIDEO_LESSONS.length} 課`;

    // Thumbnail "video cover"
    els.thumbnail.innerHTML = `
      <div class="yt-thumb-emoji">${lesson.thumbnail}</div>
      <div class="yt-title-overlay">${lesson.title}<br><small>${lesson.titleZh || ''}</small></div>
      <span class="yt-play-btn">▶</span>
    `;
    els.thumbnail.style.display = 'flex';

    buildScriptLines(lesson);
    renderScript(lesson);
    els.script.classList.remove('visible');
    els.progressBar.style.width = '0%';
    els.playToggle.textContent = '▶ 播放影片';

    // Vocab sidebar (tap an item to hear the word)
    els.vocabList.innerHTML = '';
    lesson.vocab.forEach(v => {
      const item = document.createElement('div');
      item.className = 'yt-vocab-item';
      item.innerHTML = `<div class="yt-vocab-word">${v.word} 🔊</div><div class="yt-vocab-def">${v.def}</div>`;
      item.addEventListener('click', () => TTSManager.speak(v.word, 'en-US', 0.85));
      els.vocabList.appendChild(item);
    });

    // Quiz starts locked until the video is played
    els.quizLock.style.display = 'flex';
    els.quizQuestion.innerHTML = '';
    els.quizDots.innerHTML = '';
    els.feedback.textContent = '';
    els.feedback.className = 'yt-feedback';
  }

  // Split the script into narration lines and remember vocab words
  function buildScriptLines(lesson) {
    const plain = lesson.script.replace(/<[^>]*>/g, '');
    lines = plain.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [plain];
    lineIdx = 0;
  }

  function renderScript(lesson) {
    els.script.innerHTML = '';
    const vocabWords = lesson.vocab.map(v => v.word.toLowerCase());

    lines.forEach((line, i) => {
      const div = document.createElement('div');
      div.className = 'yt-line';
      div.dataset.index = i;
      // Wrap vocab words so kids can tap them
      const parts = line.split(/(\s+)/);
      parts.forEach(part => {
        const clean = part.replace(/[^a-zA-Z']/g, '').toLowerCase();
        if (clean && vocabWords.includes(clean)) {
          const v = lesson.vocab.find(x => x.word.toLowerCase() === clean);
          const span = document.createElement('span');
          span.className = 'yt-highlight';
          span.textContent = part;
          span.addEventListener('click', e => {
            e.stopPropagation();
            TTSManager.speak(v.word, 'en-US', 0.85);
            GameEngine.showToast(`📖 ${v.word} = ${v.def}`, 'info');
          });
          div.appendChild(span);
        } else {
          div.appendChild(document.createTextNode(part));
        }
      });
      div.addEventListener('click', () => {
        // Tap a line to (re)play from it
        stopPlayback();
        startPlayback(i);
      });
      els.script.appendChild(div);
    });
  }

  // ===== Karaoke playback =====
  function togglePlay() {
    if (playing) {
      pausePlayback();
    } else {
      startPlayback(lineIdx >= lines.length ? 0 : lineIdx);
    }
  }

  function startPlayback(from) {
    playing = true;
    watched = true;
    lineIdx = from;
    els.thumbnail.style.display = 'none';
    els.script.classList.add('visible');
    els.playToggle.textContent = '⏸ 暫停';
    els.eq.classList.add('on');
    unlockQuiz();
    speakLine(lineIdx);
  }

  function pausePlayback() {
    playing = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    els.playToggle.textContent = '▶ 繼續播放';
    els.eq.classList.remove('on');
  }

  function stopPlayback() {
    pausePlayback();
    lineIdx = 0;
    document.querySelectorAll('.yt-line.playing').forEach(l => l.classList.remove('playing'));
  }

  function speakLine(i) {
    if (!playing) return;
    if (i >= lines.length) {
      finishPlayback();
      return;
    }

    // Highlight the current subtitle line
    document.querySelectorAll('.yt-line.playing').forEach(l => l.classList.remove('playing'));
    const lineEl = els.script.querySelector(`.yt-line[data-index="${i}"]`);
    if (lineEl) {
      lineEl.classList.add('playing');
      lineEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    els.progressBar.style.width = ((i + 1) / lines.length * 100) + '%';

    const advance = () => {
      if (!playing) return;
      lineIdx = i + 1;
      speakLine(lineIdx);
    };

    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(lines[i]);
      utter.lang = 'en-US';
      utter.rate = 0.86;
      currentUtter = utter;
      utter.onend = () => {
        if (currentUtter === utter) {
          setTimeout(advance, 250);
        }
      };
      utter.onerror = () => {
        if (currentUtter === utter) setTimeout(advance, 250);
      };
      window.speechSynthesis.speak(utter);
    } else {
      // No TTS: advance on a reading-time estimate
      fallbackTimer = setTimeout(advance, 900 + lines[i].length * 55);
    }
  }

  function finishPlayback() {
    playing = false;
    els.playToggle.textContent = '🔁 再看一次';
    els.eq.classList.remove('on');
    lineIdx = 0;
    GameEngine.showToast('🎬 影片看完了！來挑戰測驗吧！', 'achievement');
  }

  // ===== Quiz (one question at a time, instant feedback) =====
  function unlockQuiz() {
    if (els.quizLock.style.display !== 'none') {
      els.quizLock.style.display = 'none';
      renderQuizQuestion();
    }
  }

  function renderQuizDots() {
    const total = currentLesson().questions.length;
    let html = '';
    for (let i = 0; i < total; i++) {
      html += `<span class="yt-dot${i < quizIdx ? ' done' : i === quizIdx ? ' current' : ''}"></span>`;
    }
    els.quizDots.innerHTML = html;
  }

  function renderQuizQuestion() {
    const lesson = currentLesson();
    if (quizIdx >= lesson.questions.length) {
      finishQuiz();
      return;
    }
    renderQuizDots();
    const q = lesson.questions[quizIdx];
    els.quizQuestion.innerHTML = '';

    const qDiv = document.createElement('div');
    qDiv.className = 'yt-question';
    const p = document.createElement('p');
    p.textContent = `${quizIdx + 1}. ${q.q}`;
    if (TTSManager.isSupported()) {
      p.appendChild(TTSManager.createButton(q.q, 'en-US', '🔊'));
    }
    qDiv.appendChild(p);

    const optsDiv = document.createElement('div');
    optsDiv.className = 'yt-question-options';
    q.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.className = 'yt-q-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => answerQuestion(oi, btn, q));
      optsDiv.appendChild(btn);
    });
    qDiv.appendChild(optsDiv);
    els.quizQuestion.appendChild(qDiv);
  }

  function answerQuestion(oi, btn, q) {
    const options = els.quizQuestion.querySelectorAll('.yt-q-option');
    options.forEach(o => o.style.pointerEvents = 'none');

    if (oi === q.answer) {
      quizCorrectCount++;
      btn.classList.add('correct');
      SoundManager.playCorrect();
    } else {
      btn.classList.add('wrong');
      options[q.answer].classList.add('correct');
      SoundManager.playWrong();
    }

    setTimeout(() => {
      quizIdx++;
      renderQuizQuestion();
    }, oi === q.answer ? 900 : 1800);
  }

  function finishQuiz() {
    if (quizFinished) return;
    quizFinished = true;
    renderQuizDots();

    const lesson = currentLesson();
    const total = lesson.questions.length;
    const correct = quizCorrectCount;

    // Base rewards, then honor the same buffs as the other zones
    let xpReward = correct === total ? 30 : correct * 10;
    let gemReward = correct === total ? 5 : correct;

    if (xpReward > 0 && GameEngine.hasBuff('double_xp')) {
      xpReward *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    if (gemReward > 0 && GameEngine.hasBuff('gem_bonus')) {
      gemReward += 2;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
    }

    els.quizQuestion.innerHTML = '';
    if (correct === total) {
      els.feedback.innerHTML = `🎉 全部正確！太厲害了！獲得 <b>${xpReward} XP</b> 和 <b>${gemReward} 💎</b>`;
      els.feedback.className = 'yt-feedback correct';
      SoundManager.playQuestComplete();
      spawnConfetti(document.getElementById('yt-quiz-area'));
    } else {
      els.feedback.innerHTML = `答對 ${correct}/${total} 題，獲得 ${xpReward} XP。再看一次影片，挑戰全對吧！`;
      els.feedback.className = 'yt-feedback partial';
      if (correct > 0) SoundManager.playCorrect();
    }
    if (xpReward > 0) GameEngine.addXP(xpReward);
    if (gemReward > 0) GameEngine.addGems(gemReward);

    // Only count the video as completed when the quiz was fully passed
    if (correct === total) {
      GameEngine.recordVideo();
    }
  }

  function spawnConfetti(container) {
    const colors = ['#f5c518', '#4ecca3', '#e94560', '#00b4d8', '#7b2ff7', '#ff9f1c'];
    for (let i = 0; i < 30; i++) {
      const c = document.createElement('div');
      c.className = 'yt-confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.7) + 's';
      c.style.animationDuration = (1.5 + Math.random() * 1.2) + 's';
      container.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  }

  function nextLesson() {
    currentPosition++;
    if (currentPosition >= shuffledIndices.length) {
      buildShuffledOrder();
    }
    loadLesson();
  }

  return { init };
})();
