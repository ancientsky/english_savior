/* ===== Minecraft Vocabulary Module ===== */

const MinecraftGame = (() => {
  let currentDifficulty = 'easy';
  let currentWord = null;
  let currentSlotIndex = 0;
  let usedWords = [];
  let hintShownThisWord = false;
  let streak = 0;       // consecutive words without a wrong block
  let minedCount = 0;   // words crafted this session
  let missedThisWord = false;

  const blockStyles = ['', 'stone', 'diamond', 'gold', 'emerald'];

  function init() {
    // Difficulty buttons
    document.querySelectorAll('.mc-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mc-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
        loadNewWord();
      });
    });

    document.getElementById('mc-next-btn').addEventListener('click', loadNewWord);
    loadNewWord();
  }

  function loadNewWord() {
    const pool = VOCAB_DATA[currentDifficulty].filter(w => !usedWords.includes(w.word));
    if (pool.length === 0) {
      usedWords = [];
      return loadNewWord();
    }

    currentWord = pool[Math.floor(Math.random() * pool.length)];
    currentSlotIndex = 0;
    missedThisWord = false;

    // Check if hint crystal buff is active - show first letter
    hintShownThisWord = GameEngine.hasBuff('hint');
    if (hintShownThisWord) {
      document.getElementById('mc-hint-img').textContent = currentWord.hint + ` 💡 提示：第一個字母是「${currentWord.word[0].toUpperCase()}」`;
    } else {
      document.getElementById('mc-hint-img').textContent = currentWord.hint;
    }

    // Add TTS button for the sentence
    const hintTextEl = document.getElementById('mc-hint-text');
    hintTextEl.innerHTML = '';
    const sentenceText = currentWord.sentence.replace('_____', '______');
    hintTextEl.textContent = sentenceText;
    if (TTSManager.isSupported()) {
      const ttsBtn = TTSManager.createButton(currentWord.sentence.replace('_____', currentWord.word), 'en-US');
      hintTextEl.appendChild(ttsBtn);
    }

    // Chinese hint: render the **關鍵字** marker as a gold highlight
    const hintZhEl = document.getElementById('mc-hint-zh');
    const zhClean = currentWord.zh.replace(/\*\*/g, '');
    hintZhEl.innerHTML = currentWord.zh.replace(/\*\*(.+?)\*\*/g, '<b class="mc-zh-key">$1</b>');
    if (TTSManager.isSupported()) {
      const ttsBtnZh = TTSManager.createButton(zhClean, 'zh-TW');
      hintZhEl.appendChild(ttsBtnZh);
    }

    document.getElementById('mc-feedback').textContent = '';
    document.getElementById('mc-feedback').className = 'mc-feedback';
    document.getElementById('mc-result-word').textContent = '?';
    document.getElementById('mc-result').classList.remove('success');

    // Build crafting slots
    const grid = document.getElementById('mc-crafting-grid');
    grid.innerHTML = '';
    for (let i = 0; i < currentWord.word.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'mc-slot';
      slot.dataset.index = i;
      grid.appendChild(slot);
    }

    // Build letter blocks (word letters + random extras, shuffled)
    const blocks = document.getElementById('mc-blocks');
    blocks.innerHTML = '';
    const letters = currentWord.word.split('');
    // Add 3-5 random distractor letters
    const distractorCount = Math.min(5, Math.max(3, currentWord.word.length - 2));
    for (let i = 0; i < distractorCount; i++) {
      letters.push(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
    }
    shuffle(letters).forEach((letter, idx) => {
      const block = document.createElement('button');
      block.className = 'mc-block ' + blockStyles[Math.floor(Math.random() * blockStyles.length)];
      block.textContent = letter;
      block.dataset.letter = letter;
      block.dataset.idx = idx;
      block.addEventListener('click', () => handleBlockClick(block));
      blocks.appendChild(block);
    });
  }

  function handleBlockClick(block) {
    if (block.classList.contains('used') || currentSlotIndex >= currentWord.word.length) return;

    const letter = block.dataset.letter;
    const expected = currentWord.word[currentSlotIndex];

    const slot = document.querySelector(`.mc-slot[data-index="${currentSlotIndex}"]`);

    if (letter === expected) {
      // Correct letter — "mine" the block: crack, then shatter into bits
      block.classList.add('used', 'mining');
      setTimeout(() => {
        block.classList.add('mined');
        spawnBlockParticles(block);
      }, 150);

      slot.textContent = letter;
      slot.classList.add('filled', 'pop');
      setTimeout(() => slot.classList.remove('pop'), 350);
      currentSlotIndex++;

      // Check if complete
      if (currentSlotIndex >= currentWord.word.length) {
        wordComplete();
      }
    } else {
      // Wrong letter — the block wobbles, slot shakes
      missedThisWord = true;
      block.classList.add('wobble');
      setTimeout(() => block.classList.remove('wobble'), 450);
      slot.classList.add('wrong');
      setTimeout(() => slot.classList.remove('wrong'), 400);
      document.getElementById('mc-feedback').textContent = `❌ 不是 ${letter}，再試試看！`;
      document.getElementById('mc-feedback').className = 'mc-feedback wrong';
      SoundManager.playWrong();
    }
  }

  // Debris particles where a block was mined
  function spawnBlockParticles(block) {
    const rect = block.getBoundingClientRect();
    const colors = ['#c9a84c', '#8b6914', '#6b4f0e', '#a87b1a'];
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('span');
      p.className = 'mc-particle';
      p.style.left = (rect.left + rect.width / 2) + 'px';
      p.style.top = (rect.top + rect.height / 2) + 'px';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      p.style.setProperty('--dy', (Math.random() * -90 - 25) + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
  }

  // Minecraft-style XP orbs flying from the crafted item to the XP bar
  function flyXpOrbs(fromEl, count) {
    const from = fromEl.getBoundingClientRect();
    const bar = document.getElementById('xp-bar');
    if (!bar) return;
    const target = bar.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const orb = document.createElement('span');
        orb.className = 'mc-orb';
        const sx = from.left + from.width / 2 + (Math.random() * 44 - 22);
        const sy = from.top + from.height / 2 + (Math.random() * 30 - 15);
        orb.style.left = sx + 'px';
        orb.style.top = sy + 'px';
        document.body.appendChild(orb);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          orb.style.transform =
            `translate(${target.left + target.width / 2 - sx}px, ${target.top + target.height / 2 - sy}px) scale(0.4)`;
          orb.style.opacity = '0.15';
        }));
        setTimeout(() => orb.remove(), 900);
      }, i * 80);
    }
  }

  function updateStats() {
    const streakEl = document.getElementById('mc-streak');
    const minedEl = document.getElementById('mc-mined');
    if (streakEl) streakEl.textContent = `🔥 ${streak}`;
    if (minedEl) minedEl.textContent = `⛏️ ${minedCount}`;
  }

  function wordComplete() {
    usedWords.push(currentWord.word);
    minedCount++;
    streak = missedThisWord ? 0 : streak + 1;
    updateStats();

    const result = document.getElementById('mc-result');
    document.getElementById('mc-result-word').textContent = currentWord.word;
    result.classList.add('success', 'crafting');
    setTimeout(() => result.classList.remove('crafting'), 1200);

    // Crafted! Sparkles + XP orbs flying to the HUD bar
    spawnBlockParticles(result);
    flyXpOrbs(result, 6);

    // Play correct sound + hear the word
    SoundManager.playCorrect();
    if (TTSManager.isSupported()) {
      setTimeout(() => TTSManager.speak(currentWord.word.toLowerCase(), 'en-US', 0.85), 400);
    }

    // Vein bonus every 5-word streak
    if (streak > 0 && streak % 5 === 0) {
      GameEngine.addGems(3);
      GameEngine.showToast(`💎 挖到鑽石礦脈！連續 ${streak} 個單字 +3 💎`, 'achievement');
    }

    // Add feedback with TTS button for the completed word
    const feedbackEl = document.getElementById('mc-feedback');
    feedbackEl.innerHTML = '';
    feedbackEl.textContent = `✅ 太棒了！「${currentWord.word}」合成成功！`;
    feedbackEl.className = 'mc-feedback correct';

    if (TTSManager.isSupported()) {
      const ttsBtn = TTSManager.createButton(currentWord.word, 'en-US');
      feedbackEl.appendChild(ttsBtn);
    }

    // Rewards - check for buffs
    let xpReward = { easy: 10, medium: 20, hard: 35 }[currentDifficulty];
    let gemReward = { easy: 1, medium: 2, hard: 4 }[currentDifficulty];

    // Double XP buff
    if (GameEngine.hasBuff('double_xp')) {
      xpReward *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }

    // Hint crystal consumed only if the hint was actually shown for this word
    if (hintShownThisWord && GameEngine.hasBuff('hint')) {
      GameEngine.consumeBuff('hint');
      hintShownThisWord = false;
    }

    // Gem bonus buff
    if (GameEngine.hasBuff('gem_bonus')) {
      gemReward += 2;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
    }

    GameEngine.addXP(xpReward);
    GameEngine.addGems(gemReward);
    GameEngine.recordWord(currentWord.word);
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
