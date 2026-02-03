/* ===== Minecraft Vocabulary Module ===== */

const MinecraftGame = (() => {
  let currentDifficulty = 'easy';
  let currentWord = null;
  let currentSlotIndex = 0;
  let usedWords = [];

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

    // Set hint
    document.getElementById('mc-hint-img').textContent = currentWord.hint;

    // Add TTS button for the sentence
    const hintTextEl = document.getElementById('mc-hint-text');
    hintTextEl.innerHTML = '';
    const sentenceText = currentWord.sentence.replace('_____', '______');
    hintTextEl.textContent = sentenceText;
    if (TTSManager.isSupported()) {
      const ttsBtn = TTSManager.createButton(currentWord.sentence.replace('_____', currentWord.word), 'en-US');
      hintTextEl.appendChild(ttsBtn);
    }

    // Add TTS button for Chinese translation
    const hintZhEl = document.getElementById('mc-hint-zh');
    hintZhEl.innerHTML = '';
    hintZhEl.textContent = currentWord.zh;
    if (TTSManager.isSupported()) {
      const ttsBtnZh = TTSManager.createButton(currentWord.zh, 'zh-TW');
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
      // Correct letter
      slot.textContent = letter;
      slot.classList.add('filled');
      block.classList.add('used');
      currentSlotIndex++;

      // Check if complete
      if (currentSlotIndex >= currentWord.word.length) {
        wordComplete();
      }
    } else {
      // Wrong letter — shake
      slot.classList.add('wrong');
      setTimeout(() => slot.classList.remove('wrong'), 400);
      document.getElementById('mc-feedback').textContent = `❌ 不是 ${letter}，再試試看！`;
      document.getElementById('mc-feedback').className = 'mc-feedback wrong';
    }
  }

  function wordComplete() {
    usedWords.push(currentWord.word);
    document.getElementById('mc-result-word').textContent = currentWord.word;
    document.getElementById('mc-result').classList.add('success');

    // Add feedback with TTS button for the completed word
    const feedbackEl = document.getElementById('mc-feedback');
    feedbackEl.innerHTML = '';
    feedbackEl.textContent = `✅ 太棒了！「${currentWord.word}」合成成功！`;
    feedbackEl.className = 'mc-feedback correct';

    if (TTSManager.isSupported()) {
      const ttsBtn = TTSManager.createButton(currentWord.word, 'en-US');
      feedbackEl.appendChild(ttsBtn);
    }

    // Rewards
    const xpReward = { easy: 10, medium: 20, hard: 35 }[currentDifficulty];
    const gemReward = { easy: 1, medium: 2, hard: 4 }[currentDifficulty];
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
