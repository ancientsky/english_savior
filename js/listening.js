/* ===== Listening Game — Magical Card Hearing Challenge ===== */

const ListeningGame = (() => {
  // Difficulty config
  const DIFF_CONFIG = {
    easy:   { timer: 7, cardShow: 'both',    pool: 'easy',   xpPerCorrect: 10, label: '簡單' },
    medium: { timer: 5, cardShow: 'zh',      pool: 'medium', xpPerCorrect: 12, label: '中等' },
    hard:   { timer: 4, cardShow: 'en',      pool: 'hard',   xpPerCorrect: 15, label: '困難' },
  };

  const TOTAL_ROUNDS = 10;
  const MAX_LIVES = 3;
  const GEMS_PER_CORRECT = 1;
  const GEMS_BONUS_COMPLETE = 5;

  // State
  let difficulty = 'easy';
  let round = 0;
  let lives = MAX_LIVES;
  let correctCount = 0;
  let cards = [];         // 3 word objects for current round
  let correctIndex = -1;  // which card is the answer
  let timerInterval = null;
  let timeLeft = 0;
  let gameActive = false;
  let answered = false;
  let usedWords = [];
  let reviveUsedThisRound = false;

  // DOM refs (cached in init)
  let els = {};

  function init() {
    els = {
      diffBtns:      document.querySelectorAll('.ls-diff-btn'),
      hud:           document.querySelector('.ls-hud'),
      lives:         document.getElementById('ls-lives'),
      roundInfo:     document.getElementById('ls-round-info'),
      timer:         document.getElementById('ls-timer'),
      timerBar:      document.getElementById('ls-timer-bar'),
      wizard:        document.getElementById('ls-wizard'),
      replayHint:    document.getElementById('ls-replay-hint'),
      cardsContainer:document.getElementById('ls-cards'),
      feedback:      document.getElementById('ls-feedback'),
      gameArea:      document.getElementById('ls-game-area'),
      startScreen:   document.getElementById('ls-start-screen'),
      startBtn:      document.getElementById('ls-start-btn'),
      gameoverScreen:document.getElementById('ls-gameover-screen'),
      gameoverWords: document.getElementById('ls-final-correct'),
      gameoverReward:document.getElementById('ls-final-reward'),
      restartBtn:    document.getElementById('ls-restart-btn'),
      completeScreen:document.getElementById('ls-complete-screen'),
      completeGems:  document.getElementById('ls-complete-gems'),
      completeRestartBtn: document.getElementById('ls-complete-restart'),
    };

    // Difficulty buttons
    els.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    // Start button
    els.startBtn.addEventListener('click', startGame);
    els.restartBtn.addEventListener('click', restartGame);
    els.completeRestartBtn.addEventListener('click', restartGame);

    // Wizard click = replay audio
    els.wizard.addEventListener('click', replayAudio);
  }

  function startGame() {
    els.startScreen.style.display = 'none';
    els.gameoverScreen.style.display = 'none';
    els.completeScreen.style.display = 'none';

    round = 0;
    lives = MAX_LIVES;
    correctCount = 0;
    usedWords = [];
    gameActive = true;

    GameEngine.setDeferLevelUp(true);

    updateHUD();
    nextRound();
  }

  function restartGame() {
    els.gameoverScreen.style.display = 'none';
    els.completeScreen.style.display = 'none';
    startGame();
  }

  function nextRound() {
    if (!gameActive) return;
    round++;
    answered = false;
    reviveUsedThisRound = false;

    if (round > TOTAL_ROUNDS) {
      endGame(true);
      return;
    }

    updateHUD();
    clearFeedback();
    pickCards();
    renderCards();

    // Deal animation: after a small delay, add 'dealt' class
    const cardEls = els.cardsContainer.querySelectorAll('.ls-card');
    setTimeout(() => {
      cardEls.forEach(c => c.classList.add('dealt'));
    }, 50);

    // Wizard speaks after cards are dealt (1 second)
    els.wizard.classList.remove('casting');
    els.replayHint.classList.remove('visible');

    setTimeout(() => {
      speakWord();
      els.replayHint.classList.add('visible');
      // Start countdown after speaking
      startTimer();
    }, 1000);
  }

  function pickCards() {
    const config = DIFF_CONFIG[difficulty];
    const pool = VOCAB_DATA[config.pool];
    if (!pool || pool.length < 3) return;

    // Pick 3 distinct words not recently used
    cards = [];
    const available = pool.filter(w => !usedWords.includes(w.word));
    const source = available.length >= 3 ? available : pool;

    // Shuffle and pick 3
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    cards = shuffled.slice(0, 3);

    // Track the correct word
    correctIndex = Math.floor(Math.random() * 3);
    usedWords.push(cards[correctIndex].word);

    // Keep usedWords from growing too large
    if (usedWords.length > 30) usedWords = usedWords.slice(-15);
  }

  function renderCards() {
    const config = DIFF_CONFIG[difficulty];
    els.cardsContainer.innerHTML = '';

    cards.forEach((wordObj, i) => {
      const card = document.createElement('div');
      card.className = 'ls-card';
      card.dataset.index = i;

      // Sparkle decorations
      let sparkles = '<span class="ls-card-sparkle">✦</span><span class="ls-card-sparkle">✧</span><span class="ls-card-sparkle">✦</span>';

      // Card number
      let numberHtml = `<span class="ls-card-number">${i + 1}</span>`;

      // Card content based on difficulty
      let contentHtml = '';
      const hintEmoji = wordObj.hint || '🔮';

      if (config.cardShow === 'both') {
        // Easy: show English + Chinese
        contentHtml = `
          <div class="ls-card-icon">${hintEmoji}</div>
          <div class="ls-card-word">${wordObj.word}</div>
          <div class="ls-card-zh">${getShortZh(wordObj.zh)}</div>
        `;
      } else if (config.cardShow === 'zh') {
        // Medium: show only Chinese
        contentHtml = `
          <div class="ls-card-icon">${hintEmoji}</div>
          <div class="ls-card-zh" style="font-size:15px;">${getShortZh(wordObj.zh)}</div>
        `;
      } else {
        // Hard: show only English
        contentHtml = `
          <div class="ls-card-icon">${hintEmoji}</div>
          <div class="ls-card-word">${wordObj.word}</div>
        `;
      }

      card.innerHTML = sparkles + numberHtml + contentHtml;

      card.addEventListener('click', () => handleCardClick(i));
      els.cardsContainer.appendChild(card);
    });
  }

  function getShortZh(zh) {
    // Extract just the main translation (before the dash/long explanation)
    if (!zh) return '';
    const parts = zh.split('—');
    return parts[0].trim();
  }

  function speakWord() {
    const word = cards[correctIndex];
    if (!word) return;

    els.wizard.classList.add('casting');
    setTimeout(() => els.wizard.classList.remove('casting'), 600);

    TTSManager.speak(word.word, 'en-US', 0.85);
  }

  function replayAudio() {
    if (!gameActive || answered) return;
    if (timeLeft <= 0) return;

    // Penalty: -2 seconds
    timeLeft = Math.max(1, timeLeft - 2);
    updateTimerDisplay();

    speakWord();
    GameEngine.showToast('重聽 -2 秒', 'info');
  }

  function startTimer() {
    const config = DIFF_CONFIG[difficulty];
    timeLeft = config.timer;
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      updateTimerDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        if (!answered) {
          handleTimeout();
        }
      }
    }, 100);
  }

  function updateTimerDisplay() {
    const config = DIFF_CONFIG[difficulty];
    const seconds = Math.max(0, Math.ceil(timeLeft * 10) / 10);
    els.timer.textContent = seconds.toFixed(1) + 's';

    const pct = (Math.max(0, timeLeft) / config.timer) * 100;
    els.timerBar.style.width = pct + '%';

    if (timeLeft <= 2) {
      els.timer.classList.add('urgent');
      els.timerBar.classList.add('urgent');
    } else {
      els.timer.classList.remove('urgent');
      els.timerBar.classList.remove('urgent');
    }
  }

  function handleCardClick(index) {
    if (!gameActive || answered) return;

    clearInterval(timerInterval);
    timerInterval = null;
    answered = true;

    const cardEls = els.cardsContainer.querySelectorAll('.ls-card');

    if (index === correctIndex) {
      // Correct!
      cardEls[index].classList.add('correct');
      disableAllCards();
      showFeedback('correct', '正確！✨');
      SoundManager.playCorrect();

      correctCount++;
      const config = DIFF_CONFIG[difficulty];

      // Award XP
      let xp = config.xpPerCorrect;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
      }
      GameEngine.addXP(xp);

      // Award gem per correct
      let gems = GEMS_PER_CORRECT;
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 2;
        GameEngine.consumeBuff('gem_bonus');
      }
      GameEngine.addGems(gems);

      // Record as a word learned
      GameEngine.recordWord(cards[correctIndex].word);

      // Move to next round after delay
      setTimeout(() => nextRound(), 1200);

    } else {
      // Wrong!
      cardEls[index].classList.add('wrong');

      // Check revive buff
      if (!reviveUsedThisRound && GameEngine.hasBuff('revive')) {
        GameEngine.consumeBuff('revive');
        reviveUsedThisRound = true;
        showFeedback('wrong', '🪶 復活羽毛救了你！再試一次');
        GameEngine.showToast('🪶 復活羽毛生效！', 'achievement');

        // Allow retry: remove wrong state, re-enable
        setTimeout(() => {
          cardEls[index].classList.add('disabled');
          cardEls[index].classList.remove('wrong');
          answered = false;
          // Restart timer with remaining time (at least 3 seconds)
          timeLeft = Math.max(3, timeLeft);
          startTimer();
        }, 800);
        return;
      }

      SoundManager.playWrong();
      lives--;
      updateHUD();

      // Show correct answer
      cardEls[correctIndex].classList.add('reveal-correct');
      disableAllCards();
      showFeedback('wrong', `答案是：${cards[correctIndex].word}（${getShortZh(cards[correctIndex].zh)}）`);

      // Speak the correct word so they learn
      setTimeout(() => TTSManager.speak(cards[correctIndex].word, 'en-US', 0.8), 500);

      if (lives <= 0) {
        setTimeout(() => endGame(false), 1800);
      } else {
        setTimeout(() => nextRound(), 2000);
      }
    }
  }

  function handleTimeout() {
    if (answered) return;
    answered = true;

    // Check revive
    if (!reviveUsedThisRound && GameEngine.hasBuff('revive')) {
      GameEngine.consumeBuff('revive');
      reviveUsedThisRound = true;
      showFeedback('wrong', '🪶 復活羽毛！再給你一次機會');
      GameEngine.showToast('🪶 復活羽毛生效！', 'achievement');
      setTimeout(() => {
        answered = false;
        timeLeft = 3;
        startTimer();
        clearFeedback();
      }, 800);
      return;
    }

    SoundManager.playWrong();
    lives--;
    updateHUD();

    const cardEls = els.cardsContainer.querySelectorAll('.ls-card');
    cardEls[correctIndex].classList.add('reveal-correct');
    disableAllCards();
    showFeedback('wrong', `時間到！答案是：${cards[correctIndex].word}（${getShortZh(cards[correctIndex].zh)}）`);

    setTimeout(() => TTSManager.speak(cards[correctIndex].word, 'en-US', 0.8), 500);

    if (lives <= 0) {
      setTimeout(() => endGame(false), 1800);
    } else {
      setTimeout(() => nextRound(), 2000);
    }
  }

  function endGame(completed) {
    gameActive = false;
    clearInterval(timerInterval);
    timerInterval = null;

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    // Calculate rewards
    const totalGems = correctCount * GEMS_PER_CORRECT;

    if (completed) {
      // Completed all rounds — bonus gems
      GameEngine.addGems(GEMS_BONUS_COMPLETE);

      // Check for perfect run
      if (correctCount === TOTAL_ROUNDS) {
        GameEngine.getState().perfectListeningRun = true;
        GameEngine.save();
        GameEngine.checkAchievements();
      }

      els.completeGems.textContent = totalGems + GEMS_BONUS_COMPLETE;
      els.completeScreen.style.display = 'flex';
      SoundManager.playQuestComplete();
    } else {
      // Game over
      els.gameoverWords.textContent = correctCount;
      els.gameoverReward.textContent = totalGems > 0 ? `已獲得 ${totalGems} 💎` : '';
      els.gameoverScreen.style.display = 'flex';
    }

    // Record listening for daily quest
    if (correctCount > 0) {
      const state = GameEngine.getState();
      state.dailyListening = (state.dailyListening || 0) + correctCount;
      GameEngine.save();
    }
  }

  function disableAllCards() {
    els.cardsContainer.querySelectorAll('.ls-card').forEach(c => {
      c.classList.add('disabled');
    });
  }

  function updateHUD() {
    // Lives
    let heartsHtml = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      heartsHtml += i < lives ? '❤️' : '🖤';
    }
    els.lives.innerHTML = heartsHtml;

    // Round info
    els.roundInfo.textContent = `回合 ${Math.min(round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`;
  }

  function showFeedback(type, msg) {
    els.feedback.textContent = msg;
    els.feedback.className = 'ls-feedback ' + type;
  }

  function clearFeedback() {
    els.feedback.textContent = '';
    els.feedback.className = 'ls-feedback';
  }

  return { init };
})();
