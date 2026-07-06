/* ===== Roblox Grammar Module =====
   Obby-style grammar run: answer to leap across platforms through
   themed worlds. Lives, combos, a timer and fast-answer bonuses keep
   the pace exciting; the runner uses the player's equipped shop skin.
*/

const RobloxGame = (() => {
  const QUESTIONS_PER_RUN = 10;
  const MAX_LIVES = 3;
  const TIME_PER_QUESTION = 15; // seconds

  // Visual worlds the run travels through (3 random ones per run)
  const THEMES = [
    { name: '草原世界', icon: '🌳', sky: 'linear-gradient(180deg,#87ceeb,#5eb3e4)', ground: 'linear-gradient(180deg,#3d6b1f,#1a3a0a)', deco: ['🌳', '🌸', '🍄', '🦋'], accent: '#4ecca3' },
    { name: '沙漠世界', icon: '🏜️', sky: 'linear-gradient(180deg,#f7c873,#e8975a)', ground: 'linear-gradient(180deg,#c98d4f,#7a5230)', deco: ['🌵', '🐪', '🦂', '☀️'], accent: '#f39c12' },
    { name: '冰雪世界', icon: '❄️', sky: 'linear-gradient(180deg,#bcd9e8,#8fb8d0)', ground: 'linear-gradient(180deg,#e8f0f5,#9ab8cc)', deco: ['⛄', '❄️', '🎿', '🧊'], accent: '#00b4d8' },
    { name: '火山世界', icon: '🌋', sky: 'linear-gradient(180deg,#4a1a1a,#8b3a2a)', ground: 'linear-gradient(180deg,#3a2018,#1f100a)', deco: ['🌋', '🔥', '🪨', '🦖'], accent: '#e74c3c' },
    { name: '太空世界', icon: '🚀', sky: 'linear-gradient(180deg,#0f0c29,#302b63)', ground: 'linear-gradient(180deg,#4a4a6a,#22223a)', deco: ['🪐', '⭐', '👾', '🛸'], accent: '#7b2ff7' },
  ];

  let questions = [];
  let currentIndex = 0;
  let correctCount = 0;
  let answered = false;
  let reviveUsedThisQuestion = false;
  let lives = MAX_LIVES;
  let combo = 0;
  let worldSeq = [];
  let currentWorldIdx = -1;
  let timeLeft = 0;
  let timerId = null;
  let advanceTimer = null;

  function init() {
    // Tap anywhere on the question/feedback area to skip the wait
    document.getElementById('zone-roblox').addEventListener('click', () => {
      if (answered && advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
        nextQuestion();
      }
    });
    document.getElementById('rb-retry').addEventListener('click', () => {
      document.getElementById('rb-results').style.display = 'none';
      document.querySelector('.rb-question-area').style.display = 'block';
      startRun();
    });
    startRun();
  }

  function startRun() {
    questions = shuffle([...GRAMMAR_DATA]).slice(0, QUESTIONS_PER_RUN);
    currentIndex = 0;
    correctCount = 0;
    lives = MAX_LIVES;
    combo = 0;
    answered = false;
    worldSeq = shuffle([...THEMES]).slice(0, 3);
    currentWorldIdx = -1;
    // Don't interrupt the run with level-up modals; show them at the end
    GameEngine.setDeferLevelUp(true);
    buildTrack();
    updateStatus();
    loadQuestion();
  }

  // World changes at questions 1, 5 and 9 (3 worlds per run)
  function worldForIndex(i) {
    return Math.min(2, Math.floor(i / Math.ceil(QUESTIONS_PER_RUN / 3)));
  }

  function applyWorld(idx) {
    if (idx === currentWorldIdx) return;
    const first = currentWorldIdx === -1;
    currentWorldIdx = idx;
    const t = worldSeq[idx];

    const track = document.getElementById('rb-track');
    track.style.background = t.sky;
    track.style.setProperty('--rb-ground', t.ground);
    document.getElementById('rb-world').textContent = `${t.icon} ${t.name}`;

    // Scatter themed decorations along the track
    const deco = document.getElementById('rb-deco');
    deco.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('span');
      d.textContent = t.deco[i % t.deco.length];
      d.style.left = (4 + i * 14 + Math.random() * 6) + '%';
      d.style.bottom = (26 + Math.random() * 12) + 'px';
      d.style.fontSize = (14 + Math.random() * 10) + 'px';
      d.style.animationDelay = (Math.random() * 2) + 's';
      deco.appendChild(d);
    }

    const area = document.querySelector('.rb-question-area');
    area.style.borderColor = t.accent;

    if (!first) {
      GameEngine.showToast(`${t.icon} 進入${t.name}！`, 'achievement');
      SoundManager.playCorrect();
    }
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
    // Use the player's equipped shop skin as the runner
    const skin = GameEngine.getEquippedSkin?.();
    document.getElementById('rb-character').textContent = skin?.icon || '🏃';
    updateCharacterPos();
    document.getElementById('rb-total').textContent = questions.length;
  }

  function updateCharacterPos() {
    const pct = 5 + (currentIndex / questions.length) * 85;
    document.getElementById('rb-character').style.left = pct + '%';
    document.querySelectorAll('.rb-platform').forEach((p, i) => {
      p.classList.toggle('current', i === currentIndex);
    });
  }

  function updateStatus() {
    let hearts = '';
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? '❤️' : '🖤';
    document.getElementById('rb-lives').textContent = hearts;

    const comboEl = document.getElementById('rb-combo');
    if (combo >= 2) {
      comboEl.style.display = 'block';
      comboEl.textContent = `🔥 連擊 ×${combo}`;
    } else {
      comboEl.style.display = 'none';
    }
  }

  // ===== Question timer =====
  function startTimer() {
    stopTimer();
    timeLeft = TIME_PER_QUESTION;
    const bar = document.getElementById('rb-timer-bar');
    bar.style.width = '100%';
    bar.classList.remove('low');
    timerId = setInterval(() => {
      // Pause while another zone is open
      const zone = document.getElementById('zone-roblox');
      if (!zone.classList.contains('active')) return;
      timeLeft -= 0.1;
      const pct = Math.max(0, (timeLeft / TIME_PER_QUESTION) * 100);
      bar.style.width = pct + '%';
      bar.classList.toggle('low', timeLeft <= 5);
      if (timeLeft <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 100);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function loadQuestion() {
    if (currentIndex >= questions.length) {
      showResults(false);
      return;
    }

    answered = false;
    reviveUsedThisQuestion = false;
    const q = questions[currentIndex];
    document.getElementById('rb-stage').textContent = currentIndex + 1;
    document.getElementById('rb-next-hint').style.display = 'none';
    applyWorld(worldForIndex(currentIndex));

    // Build sentence with blank
    const parts = q.sentence.split('_____');
    let html = '';
    if (parts.length === 2) {
      html = parts[0] + '<span class="rb-blank">?</span>' + parts[1];
    } else {
      html = q.sentence.replace(/_____/g, '<span class="rb-blank">?</span>');
    }

    const sentenceEl = document.getElementById('rb-sentence');
    sentenceEl.innerHTML = html;
    if (TTSManager.isSupported()) {
      const fullSentence = q.sentence.replace(/_____/g, q.blank);
      sentenceEl.appendChild(TTSManager.createButton(fullSentence, 'en-US'));
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
      btn.addEventListener('click', e => {
        e.stopPropagation(); // don't trigger the skip-wait zone click
        handleAnswer(btn, opt, q);
      });
      optContainer.appendChild(btn);

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

    // Hint crystal buff: show Chinese translation
    const hintEl = document.getElementById('rb-hint');
    if (GameEngine.hasBuff('hint') && q.translation) {
      hintEl.textContent = `🔮 提示：${q.translation}`;
      hintEl.style.display = 'block';
      GameEngine.consumeBuff('hint');
      GameEngine.showToast('🔮 提示水晶生效！顯示中文翻譯', 'achievement');
    } else {
      hintEl.textContent = '';
      hintEl.style.display = 'none';
    }

    document.getElementById('rb-feedback').textContent = '';
    document.getElementById('rb-feedback').className = 'rb-feedback';
    updateCharacterPos();
    startTimer();
  }

  function handleTimeout() {
    if (answered) return;
    const q = questions[currentIndex];
    answered = true;
    combo = 0;
    lives--;
    SoundManager.playWrong();
    characterFall();
    document.querySelectorAll('.rb-option').forEach(o => {
      o.classList.add('disabled');
      if (o.textContent === q.blank) o.classList.add('correct');
    });
    document.querySelectorAll('.rb-blank').forEach(b => {
      b.textContent = q.blank;
      b.style.color = 'var(--accent)';
    });
    document.querySelector(`.rb-platform[data-index="${currentIndex}"]`)?.classList.add('failed');
    document.getElementById('rb-feedback').innerHTML =
      `⏰ 時間到！答案是「${q.blank}」。${q.explain}`;
    document.getElementById('rb-feedback').className = 'rb-feedback wrong';
    updateStatus();
    scheduleAdvance(2600);
  }

  function handleAnswer(btn, selected, q) {
    if (answered) return;

    const isCorrect = selected === q.blank;
    const platform = document.querySelector(`.rb-platform[data-index="${currentIndex}"]`);

    // Revive feather: one retry on a wrong answer
    if (!isCorrect && !reviveUsedThisQuestion && GameEngine.hasBuff('revive')) {
      reviveUsedThisQuestion = true;
      GameEngine.consumeBuff('revive');
      btn.classList.add('wrong');
      setTimeout(() => btn.classList.remove('wrong'), 400);
      document.getElementById('rb-feedback').textContent = '🪶 復活羽毛生效！再試一次吧！';
      document.getElementById('rb-feedback').className = 'rb-feedback';
      GameEngine.showToast('🪶 復活羽毛生效！再試一次！', 'achievement');
      return;
    }

    answered = true;
    stopTimer();
    document.querySelectorAll('.rb-option').forEach(o => o.classList.add('disabled'));

    if (isCorrect) {
      const fast = timeLeft >= TIME_PER_QUESTION - 5; // answered within 5s
      combo++;
      btn.classList.add('correct');
      platform.classList.add('passed');
      correctCount++;
      SoundManager.playCorrect();

      // Leap animation
      const character = document.getElementById('rb-character');
      character.classList.add('jumping');
      setTimeout(() => character.classList.remove('jumping'), 600);

      document.querySelectorAll('.rb-blank').forEach(b => {
        b.textContent = q.blank;
        b.style.color = 'var(--green)';
      });

      // Rewards: base + fast-answer bonus + combo bonus, with buffs
      let xpReward = 15;
      let gemReward = 2;
      let extras = '';
      if (fast) { xpReward += 5; extras += ' ⚡快答 +5 XP！'; }
      if (combo >= 3) { gemReward += 1; extras += ` 🔥連擊 ×${combo} +1 💎！`; }

      if (GameEngine.hasBuff('double_xp')) {
        xpReward *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      if (GameEngine.hasBuff('gem_bonus')) {
        gemReward += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }

      GameEngine.addXP(xpReward);
      GameEngine.addGems(gemReward);
      GameEngine.recordGrammar();

      document.getElementById('rb-feedback').innerHTML =
        `✅ 正確！${extras} ${q.explain}` +
        (q.translation ? `<br><span style="color:var(--text-dim);font-size:0.93em">📝 ${q.translation}</span>` : '');
      document.getElementById('rb-feedback').className = 'rb-feedback correct';
      updateStatus();
      scheduleAdvance(1700);
    } else {
      combo = 0;
      lives--;
      btn.classList.add('wrong');
      platform.classList.add('failed');
      SoundManager.playWrong();
      characterFall();

      document.querySelectorAll('.rb-option').forEach(o => {
        if (o.textContent === q.blank) o.classList.add('correct');
      });
      document.querySelectorAll('.rb-blank').forEach(b => {
        b.textContent = q.blank;
        b.style.color = 'var(--accent)';
      });
      document.getElementById('rb-feedback').innerHTML =
        `❌ 答案是「${q.blank}」。${q.explain}` +
        (q.translation ? `<br><span style="color:var(--text-dim);font-size:0.93em">📝 ${q.translation}</span>` : '');
      document.getElementById('rb-feedback').className = 'rb-feedback wrong';
      updateStatus();
      scheduleAdvance(2600);
    }
  }

  function characterFall() {
    const character = document.getElementById('rb-character');
    character.classList.add('falling');
    setTimeout(() => character.classList.remove('falling'), 900);
  }

  function scheduleAdvance(delay) {
    document.getElementById('rb-next-hint').style.display = 'block';
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      nextQuestion();
    }, delay);
  }

  function nextQuestion() {
    if (lives <= 0) {
      showResults(true);
      return;
    }
    currentIndex++;
    loadQuestion();
  }

  function showResults(fell) {
    stopTimer();
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    const total = questions.length;
    const score = Math.round((correctCount / total) * 100);
    const isPerfect = correctCount === total && !fell;
    if (isPerfect) GameEngine.recordPerfectGrammar();

    // Star rating keeps kids chasing a better run
    const stars = isPerfect ? 3 : score >= 80 ? 2 : score >= 50 ? 1 : 0;
    const starHtml = '⭐'.repeat(stars) + '<span class="rb-star-dim">' + '⭐'.repeat(3 - stars) + '</span>';

    document.querySelector('.rb-question-area').style.display = 'none';
    document.getElementById('rb-next-hint').style.display = 'none';
    document.getElementById('rb-feedback').textContent = '';

    const results = document.getElementById('rb-results');
    document.getElementById('rb-results-title').textContent =
      fell ? '💥 掉下懸崖了！' : isPerfect ? '🎉 完美通關！' : score >= 70 ? '🎊 太厲害了！' : '💪 繼續加油！';
    document.getElementById('rb-results-stars').innerHTML = starHtml;
    document.getElementById('rb-results-score').textContent = `${correctCount} / ${total}`;
    document.getElementById('rb-results-info').textContent =
      fell ? '別灰心，獲得的獎勵都還在！再挑戰一次吧！' : `正確率 ${score}%，已獲得 ${correctCount * 15}+ XP 和 ${correctCount * 2}+ 💎`;
    results.style.display = 'block';

    if (stars >= 2) {
      spawnConfetti(results);
      SoundManager.playQuestComplete();
    }
  }

  function spawnConfetti(container) {
    const colors = ['#f5c518', '#4ecca3', '#e94560', '#00b4d8', '#7b2ff7', '#ff9f1c'];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement('div');
      c.className = 'rb-confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.8) + 's';
      c.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      container.appendChild(c);
      setTimeout(() => c.remove(), 3400);
    }
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
