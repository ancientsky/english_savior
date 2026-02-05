/* ===== Roblox Grammar Module ===== */

const RobloxGame = (() => {
  let questions = [];
  let currentIndex = 0;
  let correctCount = 0;
  let answered = false;
  let reviveUsedThisQuestion = false; // Track if revive was used for current question

  function init() {
    startRun();
  }

  function startRun() {
    // Pick 10 random grammar questions
    questions = shuffle([...GRAMMAR_DATA]).slice(0, 10);
    currentIndex = 0;
    correctCount = 0;
    answered = false;
    buildTrack();
    loadQuestion();
  }

  function buildTrack() {
    const platforms = document.getElementById('rb-platforms');
    platforms.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
      const p = document.createElement('div');
      p.className = 'rb-platform inactive';
      p.dataset.index = i;
      platforms.appendChild(p);
    }
    updateCharacterPos();
    document.getElementById('rb-stage').textContent = 1;
    document.getElementById('rb-total').textContent = questions.length;
  }

  function updateCharacterPos() {
    const pct = 5 + (currentIndex / questions.length) * 85;
    document.getElementById('rb-character').style.left = pct + '%';

    // Update platforms
    document.querySelectorAll('.rb-platform').forEach((p, i) => {
      p.classList.remove('current');
      if (i === currentIndex) p.classList.add('current');
    });
  }

  function loadQuestion() {
    if (currentIndex >= questions.length) {
      showResults();
      return;
    }

    answered = false;
    reviveUsedThisQuestion = false; // Reset revive status for new question
    const q = questions[currentIndex];
    document.getElementById('rb-stage').textContent = currentIndex + 1;

    // Build sentence with blank
    const parts = q.sentence.split('_____');
    let html = '';
    if (parts.length === 2) {
      html = parts[0] + '<span class="rb-blank">?</span>' + parts[1];
    } else if (q.sentence.includes('_____ exciting _____ ')) {
      // Special case for so...that
      html = q.sentence
        .replace('_____', '<span class="rb-blank">?</span>')
        .replace('_____', '<span class="rb-blank">?</span>');
    } else {
      html = q.sentence.replace('_____', '<span class="rb-blank">?</span>');
    }

    const sentenceEl = document.getElementById('rb-sentence');
    sentenceEl.innerHTML = html;

    // Add TTS button for the sentence
    if (TTSManager.isSupported()) {
      const fullSentence = q.sentence.replace(/_____/g, q.blank);
      const ttsBtn = TTSManager.createButton(fullSentence, 'en-US');
      sentenceEl.appendChild(ttsBtn);
    }

    // Options
    const opts = document.getElementById('rb-options');
    opts.innerHTML = '';
    shuffle(q.options).forEach(opt => {
      const optContainer = document.createElement('div');
      optContainer.style.display = 'flex';
      optContainer.style.alignItems = 'center';
      optContainer.style.gap = '8px';

      const btn = document.createElement('button');
      btn.className = 'rb-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleAnswer(btn, opt, q));

      optContainer.appendChild(btn);

      // Add small TTS button for each option
      if (TTSManager.isSupported()) {
        const ttsBtn = TTSManager.createButton(opt, 'en-US', '🔊');
        ttsBtn.style.width = '28px';
        ttsBtn.style.height = '28px';
        ttsBtn.style.fontSize = '14px';
        ttsBtn.style.marginLeft = '0';
        optContainer.appendChild(ttsBtn);
      }

      opts.appendChild(optContainer);
    });

    document.getElementById('rb-feedback').textContent = '';
    document.getElementById('rb-feedback').className = 'rb-feedback';
    updateCharacterPos();
  }

  function handleAnswer(btn, selected, q) {
    if (answered) return;

    const isCorrect = selected === q.blank;
    const platform = document.querySelector(`.rb-platform[data-index="${currentIndex}"]`);

    // Check for revive buff on wrong answer
    if (!isCorrect && !reviveUsedThisQuestion && GameEngine.hasBuff('revive')) {
      reviveUsedThisQuestion = true;
      GameEngine.consumeBuff('revive');
      btn.classList.add('wrong');
      setTimeout(() => btn.classList.remove('wrong'), 400);
      document.getElementById('rb-feedback').textContent = `🪶 復活羽毛生效！再試一次吧！`;
      document.getElementById('rb-feedback').className = 'rb-feedback';
      GameEngine.showToast('🪶 復活羽毛生效！再試一次！', 'achievement');
      return; // Don't mark as answered, let them try again
    }

    answered = true;

    // Disable all options
    document.querySelectorAll('.rb-option').forEach(o => o.classList.add('disabled'));

    if (isCorrect) {
      btn.classList.add('correct');
      platform.classList.add('passed');
      correctCount++;
      document.getElementById('rb-feedback').textContent = `✅ 正確！${q.explain}`;
      document.getElementById('rb-feedback').className = 'rb-feedback correct';
      SoundManager.playCorrect();

      // 觸發角色跳躍動畫
      const character = document.getElementById('rb-character');
      character.classList.add('jumping');
      setTimeout(() => character.classList.remove('jumping'), 600);
      // Fill in blank
      document.querySelectorAll('.rb-blank').forEach(b => {
        b.textContent = q.blank;
        b.style.color = 'var(--green)';
      });

      // Calculate rewards with buff checks
      let xpReward = 15;
      let gemReward = 2;

      // Double XP buff
      if (GameEngine.hasBuff('double_xp')) {
        xpReward *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }

      // Gem bonus buff
      if (GameEngine.hasBuff('gem_bonus')) {
        gemReward += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }

      GameEngine.addXP(xpReward);
      GameEngine.addGems(gemReward);
      GameEngine.recordGrammar();
    } else {
      btn.classList.add('wrong');
      platform.classList.add('failed');
      SoundManager.playWrong();

      // 觸發角色踉蹌動畫
      const character = document.getElementById('rb-character');
      character.classList.add('stumble');
      setTimeout(() => character.classList.remove('stumble'), 500);
      // Highlight correct
      document.querySelectorAll('.rb-option').forEach(o => {
        if (o.textContent === q.blank) o.classList.add('correct');
      });
      document.querySelectorAll('.rb-blank').forEach(b => {
        b.textContent = q.blank;
        b.style.color = 'var(--accent)';
      });
      document.getElementById('rb-feedback').textContent = `❌ 答案是「${q.blank}」。${q.explain}`;
      document.getElementById('rb-feedback').className = 'rb-feedback wrong';
    }

    // Auto advance after delay
    setTimeout(() => {
      currentIndex++;
      loadQuestion();
    }, 2500);
  }

  function showResults() {
    const container = document.querySelector('.rb-container');
    const score = Math.round((correctCount / questions.length) * 100);
    const isPerfect = correctCount === questions.length;

    if (isPerfect) GameEngine.recordPerfectGrammar();

    container.innerHTML = `
      <div class="rb-celebrate">
        <h2>${isPerfect ? '🎉 完美通關！' : score >= 70 ? '🎊 太厲害了！' : '💪 繼續加油！'}</h2>
        <div class="rb-score">${correctCount} / ${questions.length}</div>
        <p style="margin-bottom:8px;color:var(--text-dim)">正確率 ${score}%</p>
        <p style="margin-bottom:20px;color:var(--gold)">獲得 ${correctCount * 15} XP 和 ${correctCount * 2} 💎</p>
        <button class="rb-retry-btn" id="rb-retry">🏃 再跑一次</button>
      </div>
    `;

    document.getElementById('rb-retry').addEventListener('click', () => {
      container.innerHTML = `
        <div class="rb-header">
          <h2>🏃 文法跑酷大冒險</h2>
          <div class="rb-progress">關卡 <span id="rb-stage">1</span> / <span id="rb-total">10</span></div>
        </div>
        <div class="rb-track">
          <div class="rb-character" id="rb-character">🏃</div>
          <div class="rb-platforms" id="rb-platforms"></div>
        </div>
        <div class="rb-question-area">
          <div class="rb-sentence" id="rb-sentence"></div>
          <div class="rb-options" id="rb-options"></div>
        </div>
        <div class="rb-feedback" id="rb-feedback"></div>
      `;
      startRun();
    });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { init };
})();
