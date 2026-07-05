/* ===== YouTube Comprehension Module ===== */

const YoutubeGame = (() => {
  let shuffledIndices = [];
  let currentPosition = 0;
  let selectedAnswers = {};

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
    document.getElementById('yt-submit-quiz').addEventListener('click', submitQuiz);
    document.getElementById('yt-next-lesson').addEventListener('click', nextLesson);
    buildShuffledOrder();
    loadLesson();
  }

  function loadLesson() {
    const lesson = VIDEO_LESSONS[shuffledIndices[currentPosition]];
    selectedAnswers = {};

    // Thumbnail
    const thumb = document.getElementById('yt-thumbnail');
    thumb.innerHTML = `
      <div style="font-size:48px;margin-bottom:8px">${lesson.thumbnail}</div>
      <div class="yt-title-overlay">${lesson.title}</div>
      <span class="yt-play-btn">▶</span>
    `;

    // Script (hidden initially)
    const script = document.getElementById('yt-script');
    script.innerHTML = '';

    const scriptP = document.createElement('p');
    scriptP.innerHTML = lesson.script;
    script.appendChild(scriptP);

    // Add TTS button for the script (strip HTML tags for plain text reading)
    if (TTSManager.isSupported()) {
      const plainText = lesson.script.replace(/<[^>]*>/g, '');
      const ttsBtn = TTSManager.createButton(plainText, 'en-US');
      ttsBtn.style.marginTop = '12px';
      script.appendChild(ttsBtn);
    }

    script.classList.remove('visible');

    // Click to "play" (show script)
    thumb.style.cursor = 'pointer';
    thumb.onclick = () => {
      script.classList.add('visible');
      thumb.querySelector('.yt-play-btn').textContent = '⏸';
    };

    // Vocab sidebar
    const vocabList = document.getElementById('yt-vocab-list');
    vocabList.innerHTML = '';
    lesson.vocab.forEach(v => {
      const item = document.createElement('div');
      item.className = 'yt-vocab-item';

      const wordDiv = document.createElement('div');
      wordDiv.className = 'yt-vocab-word';
      wordDiv.textContent = v.word;

      // Add TTS button for vocabulary word
      if (TTSManager.isSupported()) {
        const ttsBtn = TTSManager.createButton(v.word, 'en-US', '🔊');
        ttsBtn.style.width = '24px';
        ttsBtn.style.height = '24px';
        ttsBtn.style.fontSize = '12px';
        ttsBtn.style.marginLeft = '6px';
        wordDiv.appendChild(ttsBtn);
      }

      const defDiv = document.createElement('div');
      defDiv.className = 'yt-vocab-def';
      defDiv.textContent = v.def;

      item.appendChild(wordDiv);
      item.appendChild(defDiv);
      vocabList.appendChild(item);
    });

    // Quiz
    const quizArea = document.getElementById('yt-quiz-questions');
    quizArea.innerHTML = '';
    lesson.questions.forEach((q, qi) => {
      const qDiv = document.createElement('div');
      qDiv.className = 'yt-question';

      const questionP = document.createElement('p');
      questionP.textContent = `${qi + 1}. ${q.q}`;

      // Add TTS button for question
      if (TTSManager.isSupported()) {
        const ttsBtn = TTSManager.createButton(q.q, 'en-US', '🔊');
        ttsBtn.style.width = '28px';
        ttsBtn.style.height = '28px';
        ttsBtn.style.fontSize = '14px';
        questionP.appendChild(ttsBtn);
      }

      qDiv.appendChild(questionP);

      const optsDiv = document.createElement('div');
      optsDiv.className = 'yt-question-options';
      q.options.forEach((opt, oi) => {
        const optWrapper = document.createElement('div');
        optWrapper.style.display = 'flex';
        optWrapper.style.alignItems = 'center';
        optWrapper.style.gap = '6px';

        const btn = document.createElement('button');
        btn.className = 'yt-q-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => selectOption(qi, oi, btn));
        optWrapper.appendChild(btn);

        // Add TTS button for each option
        if (TTSManager.isSupported()) {
          const optTtsBtn = TTSManager.createButton(opt, 'en-US', '🔊');
          optTtsBtn.style.width = '24px';
          optTtsBtn.style.height = '24px';
          optTtsBtn.style.fontSize = '12px';
          optTtsBtn.style.marginLeft = '0';
          optWrapper.appendChild(optTtsBtn);
        }

        optsDiv.appendChild(optWrapper);
      });
      qDiv.appendChild(optsDiv);
      quizArea.appendChild(qDiv);
    });

    document.getElementById('yt-feedback').textContent = '';
    document.getElementById('yt-submit-quiz').style.display = 'block';
  }

  function selectOption(qIndex, optIndex, btn) {
    // Deselect siblings
    const parent = btn.parentElement;
    parent.querySelectorAll('.yt-q-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedAnswers[qIndex] = optIndex;
  }

  function submitQuiz() {
    const lesson = VIDEO_LESSONS[shuffledIndices[currentPosition]];
    let correct = 0;

    // Require every question to be answered before grading,
    // otherwise the quiz could be farmed by mashing submit
    const total0 = lesson.questions.length;
    if (Object.keys(selectedAnswers).length < total0) {
      const fb0 = document.getElementById('yt-feedback');
      fb0.textContent = '⚠️ 還有題目沒作答，全部作答後再提交！';
      fb0.style.color = 'var(--gold)';
      return;
    }

    lesson.questions.forEach((q, qi) => {
      const questionDiv = document.querySelectorAll('.yt-question')[qi];
      const options = questionDiv.querySelectorAll('.yt-q-option');
      options.forEach((opt, oi) => {
        opt.style.pointerEvents = 'none';
        if (oi === q.answer) opt.classList.add('correct');
        if (selectedAnswers[qi] === oi && oi !== q.answer) opt.classList.add('wrong');
      });
      if (selectedAnswers[qi] === q.answer) correct++;
    });

    const total = lesson.questions.length;
    const fb = document.getElementById('yt-feedback');

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

    if (correct === total) {
      fb.textContent = `🎉 全部正確！太厲害了！獲得 ${xpReward} XP 和 ${gemReward} 💎`;
      fb.style.color = 'var(--green)';
      SoundManager.playQuestComplete();
    } else {
      fb.textContent = `答對 ${correct}/${total} 題。獲得 ${xpReward} XP`;
      fb.style.color = 'var(--gold)';
      if (correct > 0) {
        SoundManager.playCorrect();
      } else {
        SoundManager.playWrong();
      }
    }
    if (xpReward > 0) GameEngine.addXP(xpReward);
    if (gemReward > 0) GameEngine.addGems(gemReward);

    // Only count the video as completed when the quiz was actually passed
    if (correct === total) {
      GameEngine.recordVideo();
    }
    document.getElementById('yt-submit-quiz').style.display = 'none';
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
