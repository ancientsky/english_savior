/* ===== Spell Academy (Speaking) Module =====
   Say the spell out loud! A monster approaches; the on-screen "spell"
   (an English word or short sentence) must be spoken into the mic.
   Web Speech Recognition checks the pronunciation; where the API is
   unavailable (e.g. iOS Safari) an honor mode lets kids self-grade
   after repeating the TTS model, at half rewards.
*/

const SpeakGame = (() => {
  const ROUND_SIZE = 10;
  const MAX_LIVES = 3;
  const APPROACH_SECONDS = 18;
  const MONSTERS = ['🧟', '💀', '👻', '🧌', '🐉', '👹', '🦇', '🕷️', '🧟‍♀️', '👺'];

  const DIFF_CONFIG = {
    easy:   { xp: 12, bonus: 10 },
    medium: { xp: 16, bonus: 15 },
    hard:   { xp: 20, bonus: 20 },
  };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let difficulty = 'easy';
  let honorMode = !SR;      // no recognition API → self-grade mode
  let recognizer = null;
  let listening = false;

  let lives, killed, spellIdx;
  let currentSpell = null;  // { text, zh, isWord }
  let approachTimer = null;
  let approachLeft = 0;
  let roundActive = false;

  let els = {};

  function init() {
    els = {
      lives: document.getElementById('sk-lives'),
      score: document.getElementById('sk-score'),
      monster: document.getElementById('sk-monster'),
      stage: document.getElementById('sk-stage'),
      approachBar: document.getElementById('sk-approach-bar'),
      spell: document.getElementById('sk-spell'),
      zh: document.getElementById('sk-zh'),
      heard: document.getElementById('sk-heard'),
      micBtn: document.getElementById('sk-mic-btn'),
      honorBox: document.getElementById('sk-honor'),
      honorYes: document.getElementById('sk-honor-yes'),
      honorNo: document.getElementById('sk-honor-no'),
      startScreen: document.getElementById('sk-start-screen'),
      startBtn: document.getElementById('sk-start-btn'),
      modeNote: document.getElementById('sk-mode-note'),
      overScreen: document.getElementById('sk-over-screen'),
      overTitle: document.getElementById('sk-over-title'),
      overInfo: document.getElementById('sk-over-info'),
      overBtn: document.getElementById('sk-over-btn'),
      gameArea: document.getElementById('sk-game'),
    };

    document.querySelectorAll('.sk-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sk-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    els.modeNote.textContent = honorMode
      ? '⚠️ 這個瀏覽器不支援語音辨識，將使用「榮譽模式」：跟著唸、自己評分（獎勵減半）。建議用 Chrome 或 Edge 玩完整版！'
      : '🎙️ 按住魔杖按鈕，大聲唸出咒語！（第一次會請求麥克風權限）';

    els.startBtn.addEventListener('click', startRound);
    els.overBtn.addEventListener('click', startRound);
    els.micBtn.addEventListener('click', toggleListen);
    els.honorYes.addEventListener('click', () => resolveSpell(true, true));
    els.honorNo.addEventListener('click', () => {
      els.heard.textContent = '沒關係，聽一次示範再唸唸看！';
      playModel();
    });

    // Test hook: lets automated tests inject a transcript / read state
    window.__speakTest = {
      spell: () => (currentSpell ? { ...currentSpell } : null),
      forceTranscript: t => handleTranscript(t),
      isHonorMode: () => honorMode,
      isListening: () => listening,
      tapMic: () => toggleListen(),
    };
  }

  // ===== Spell pool =====
  function cleanZh(zh) { return zh.replace(/\*\*/g, ''); }

  function pickSpell() {
    if (difficulty === 'easy') {
      const w = VOCAB_DATA.easy[Math.floor(Math.random() * VOCAB_DATA.easy.length)];
      return { text: w.word.toLowerCase(), zh: cleanZh(w.zh), isWord: true, word: w.word };
    }
    if (difficulty === 'medium') {
      if (Math.random() < 0.6) {
        const w = VOCAB_DATA.medium[Math.floor(Math.random() * VOCAB_DATA.medium.length)];
        return { text: w.word.toLowerCase(), zh: cleanZh(w.zh), isWord: true, word: w.word };
      }
      const pool = EMPIRE_LIFE.easy.concat(EMPIRE_LIFE.medium).filter(e => e.a.split(' ').length <= 6);
      const e = pool[Math.floor(Math.random() * pool.length)];
      return { text: e.a, zh: e.scene, isWord: false };
    }
    // hard: short full sentences
    const pool = EMPIRE_DIALOGUES.easy.concat(EMPIRE_DIALOGUES.medium)
      .filter(e => e.a.split(' ').length <= 8);
    const e = pool[Math.floor(Math.random() * pool.length)];
    return { text: e.a, zh: e.qZh ? `回應：${e.q}` : '', isWord: false };
  }

  // ===== Round lifecycle =====
  function startRound() {
    els.startScreen.style.display = 'none';
    els.overScreen.style.display = 'none';
    els.gameArea.style.display = 'block';
    lives = MAX_LIVES;
    killed = 0;
    spellIdx = 0;
    roundActive = true;
    GameEngine.setDeferLevelUp(true);
    updateHUD();
    nextSpell();
  }

  function endRound(completed) {
    roundActive = false;
    stopApproach();
    stopListening();
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    if (completed) {
      let bonus = DIFF_CONFIG[difficulty].bonus;
      if (honorMode) bonus = Math.ceil(bonus / 2);
      if (GameEngine.hasBuff('gem_bonus')) {
        bonus += 5;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
      }
      GameEngine.addGems(bonus);
      SoundManager.playQuestComplete();
      els.overTitle.textContent = '🎓 學院畢業考通過！';
      els.overInfo.innerHTML = `你用聲音擊退了 ${killed} 隻怪物！<br>回合獎勵 <b>+${bonus} 💎</b>`;
    } else {
      els.overTitle.textContent = '💥 怪物闖進學院了';
      els.overInfo.innerHTML = `你擊退了 <b>${killed}</b> / ${ROUND_SIZE} 隻怪物，獎勵都有拿到！<br><small>多聽 🔊 示範發音，大聲唸出來就對了！</small>`;
    }
    els.overBtn.textContent = '🎤 再挑戰一輪';
    els.gameArea.style.display = 'none';
    els.overScreen.style.display = 'flex';
  }

  function nextSpell() {
    if (spellIdx >= ROUND_SIZE) {
      endRound(true);
      return;
    }
    spellIdx++;
    currentSpell = pickSpell();

    // Monster enters
    els.monster.textContent = MONSTERS[(spellIdx - 1) % MONSTERS.length];
    els.monster.className = 'sk-monster approaching';
    els.stage.classList.remove('zapped');

    // Spell card
    els.spell.innerHTML = '';
    const t = document.createElement('span');
    t.textContent = currentSpell.text;
    els.spell.appendChild(t);
    if (TTSManager.isSupported()) {
      els.spell.appendChild(TTSManager.createButton(currentSpell.text, 'en-US'));
    }
    els.zh.textContent = currentSpell.zh;
    els.heard.textContent = honorMode ? '先聽 🔊 示範，跟著大聲唸，唸完自己評分！' : '';
    els.heard.className = 'sk-heard';

    els.honorBox.style.display = honorMode ? 'flex' : 'none';
    els.micBtn.style.display = honorMode ? 'none' : 'inline-flex';
    stopListening(); // fully release any session before the next word's mic
    updateHUD();

    if (honorMode) playModel();
    startApproach();
  }

  function playModel() {
    if (TTSManager.isSupported()) TTSManager.speak(currentSpell.text, 'en-US', 0.85);
  }

  // ===== Monster approach timer =====
  function startApproach() {
    stopApproach();
    approachLeft = APPROACH_SECONDS;
    approachTimer = setInterval(() => {
      const zone = document.getElementById('zone-speak');
      if (!zone.classList.contains('active')) return; // pause when hidden
      approachLeft -= 0.1;
      const pct = Math.max(0, approachLeft / APPROACH_SECONDS);
      els.approachBar.style.width = (pct * 100) + '%';
      els.approachBar.classList.toggle('low', approachLeft <= 5);
      // Monster slides closer
      els.monster.style.left = (78 - pct * 68) + '%';
      if (approachLeft <= 0) {
        stopApproach();
        monsterArrives();
      }
    }, 100);
  }

  function stopApproach() {
    if (approachTimer) { clearInterval(approachTimer); approachTimer = null; }
  }

  function monsterArrives() {
    stopListening();
    // Revive feather blocks the hit
    if (GameEngine.hasBuff('revive')) {
      GameEngine.consumeBuff('revive');
      GameEngine.showToast('🪶 復活羽毛擋下了怪物！', 'achievement');
      startApproach();
      return;
    }
    lives--;
    SoundManager.playWrong();
    els.stage.classList.add('shake');
    setTimeout(() => els.stage.classList.remove('shake'), 500);
    updateHUD();
    if (lives <= 0) {
      endRound(false);
    } else {
      els.heard.textContent = `😱 怪物碰到你了！咒語是「${currentSpell.text}」，下一隻！`;
      setTimeout(() => nextSpell(), 1400);
    }
  }

  // ===== Speech recognition =====
  // The browser exposes a SINGLE global speech service, so only one
  // SpeechRecognition session can be active at a time. The previous word's
  // session can still be winding down when the player taps the wand for the
  // next word, and start() then throws InvalidStateError. The old code
  // swallowed that in a catch and left the button wedged on "唸出咒語" —
  // tapping again just threw again until the old session finally released.
  // Fix: (1) abort any lingering session before starting a fresh one,
  // (2) auto-retry once after a short back-off if start() still throws, and
  // (3) never let a desynced `listening` flag block the toggle.
  function toggleListen() {
    if (listening && recognizer) { stopListening(); return; }
    if (!SR) return;
    startListening(true);
  }

  function startListening(allowRetry) {
    teardownRecognizer(); // release any half-dead session from the previous word
    let rec;
    try {
      rec = new SR();
    } catch { setMicState(false); return; }
    recognizer = rec;
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = ev => {
      let transcript = '';
      for (const res of ev.results) transcript += res[0].transcript + ' ';
      els.heard.textContent = `👂 ${transcript.trim()}`;
      if ([...ev.results].some(r => r.isFinal)) {
        handleTranscript(transcript);
      }
    };
    rec.onerror = ev => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        stopListening();
        honorMode = true;
        GameEngine.showToast('🎙️ 無法使用麥克風，改用榮譽模式（跟著唸、自己評分）', 'error');
        els.honorBox.style.display = 'flex';
        els.micBtn.style.display = 'none';
        playModel();
      } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
        stopListening();
        els.heard.textContent = '😅 沒聽清楚，再按魔杖唸一次！';
      }
      // 'aborted'/'no-speech' let the quiet onend below reset the button
    };
    rec.onend = () => {
      if (rec === recognizer) recognizer = null;
      setMicState(false);
    };
    try {
      rec.start();
      setMicState(true);
    } catch {
      // The old session hasn't released the mic yet. Drop this instance and,
      // once, retry after a short back-off so the player never has to guess
      // why the wand "won't press".
      if (rec === recognizer) recognizer = null;
      try { rec.abort(); } catch { /* noop */ }
      setMicState(false);
      if (allowRetry && roundActive && !honorMode) {
        els.heard.textContent = '🎙️ 麥克風準備中，馬上就好……';
        setTimeout(() => {
          if (roundActive && !listening && !honorMode) startListening(false);
        }, 350);
      } else {
        els.heard.textContent = '🎙️ 再按一次魔杖，唸出咒語！';
      }
    }
  }

  function teardownRecognizer() {
    if (!recognizer) return;
    const rec = recognizer;
    recognizer = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    // abort() frees the mic immediately; stop() would wait for a final result
    try { rec.abort(); } catch { try { rec.stop(); } catch { /* already dead */ } }
  }

  function stopListening() {
    teardownRecognizer();
    setMicState(false);
  }

  function setMicState(on) {
    listening = on;
    els.micBtn.classList.toggle('listening', on);
    els.micBtn.textContent = on ? '🎙️ 聽你唸咒語中……（再按一下停止）' : '🪄 按我，唸出咒語！';
  }

  function normalize(t) {
    return t.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function matches(transcript, target) {
    const heard = normalize(transcript);
    const want = normalize(target);
    if (!heard) return false;
    if (heard.includes(want)) return true;
    const wantWords = want.split(' ');
    if (wantWords.length === 1) {
      // Single word: accept exact token match
      return heard.split(' ').includes(want);
    }
    // Sentence: accept if ≥80% of the words were heard in any order
    const heardSet = new Set(heard.split(' '));
    const hit = wantWords.filter(w => heardSet.has(w)).length;
    return hit / wantWords.length >= 0.8;
  }

  function handleTranscript(transcript) {
    if (!roundActive || !currentSpell) return;
    stopListening();
    if (matches(transcript, currentSpell.text)) {
      resolveSpell(true, false);
    } else {
      SoundManager.playWrong();
      els.heard.textContent = `👂 你唸的聽起來像「${transcript.trim()}」— 再聽一次示範，大聲唸！`;
      els.heard.className = 'sk-heard wrong';
    }
  }

  // Correct pronunciation (or honor-mode self pass) → zap the monster
  function resolveSpell(success, isHonor) {
    if (!roundActive || !success) return;
    stopApproach();
    stopListening();
    killed++;
    SoundManager.playCorrect();

    // Zap animation
    els.stage.classList.add('zapped');
    els.monster.className = 'sk-monster dying';

    // Rewards (honor mode = half)
    let xp = DIFF_CONFIG[difficulty].xp;
    let gems = 1;
    if (isHonor || honorMode) { xp = Math.ceil(xp / 2); gems = 1; }
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
    GameEngine.recordSpeak();
    if (currentSpell.isWord) GameEngine.recordWord(currentSpell.word);

    els.heard.textContent = `✨ ${currentSpell.text} — 咒語成功！`;
    els.heard.className = 'sk-heard correct';
    updateHUD();
    setTimeout(() => nextSpell(), 1300);
  }

  function updateHUD() {
    let hearts = '';
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? '❤️' : '🖤';
    els.lives.textContent = hearts;
    els.score.textContent = `${killed} / ${ROUND_SIZE}`;
  }

  return { init };
})();
