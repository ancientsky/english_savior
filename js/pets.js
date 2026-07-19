/* ===== 單字寵物島 (Word Pets Island) =====
   Pokemon-style collect-and-battle module.
   - 草叢探險: wander the grass, meet a wild PET_SPECIES, answer vocab
     questions to throw balls (rising catch chance 50/75/100% on the
     1st/2nd/3rd correct answer; a wrong answer risks the pet fleeing).
   - 對戰引擎: shared 1v1 turn-based battle used both by a post-catch
     "practice battle" and by the 5 gyms. Each round is a vocab question;
     correct -> player attacks (type-advantage multiplier), wrong -> the
     enemy attacks. Fainted pets auto-switch; team wipe = gentle defeat.
   - 道館 x15: sequential gyms with ascending levels (gym 1 ~lv4 up to
     gym 15 ~lv60); beating all fifteen unlocks the champion banner.
     Gyms 1-5 use easy/medium/hard tiers as before; 6-10 are medium,
     11-15 are hard.
   - 圖鑑: PET_SPECIES.length-slot collection grid (caught pets show
     word/zh/level, TTS on tap; uncaught show a ??? silhouette).
   Save: localStorage `english_savior_pets` = { collection, team, gymsBeaten }.
*/

const PetsGame = (() => {
  const SAVE_KEY = 'english_savior_pets';
  const MAX_TEAM = 3;

  // ===== Gyms (sequential unlock) =====
  const GYMS = [
    {
      id: 'gym_grass', name: '草原道館', icon: '🌾', leader: '花仙子 莉莉', leaderEmoji: '🧚',
      team: [{ species: 'seed', lv: 4 }, { species: 'flower', lv: 5 }, { species: 'worm', lv: 5 }],
    },
    {
      id: 'gym_fire', name: '火山道館', icon: '🌋', leader: '火焰騎士 布雷茲', leaderEmoji: '🔥',
      team: [{ species: 'match', lv: 7 }, { species: 'flame', lv: 8 }, { species: 'sun', lv: 8 }],
    },
    {
      id: 'gym_water', name: '湖泊道館', icon: '🌊', leader: '潮汐公主 瑪莉娜', leaderEmoji: '🧜‍♀️',
      team: [{ species: 'drop', lv: 10 }, { species: 'fish', lv: 12 }, { species: 'rain', lv: 12 }],
    },
    {
      id: 'gym_electric', name: '雷電道館', icon: '⚡', leader: '雷霆隊長 沃特', leaderEmoji: '🦸',
      team: [{ species: 'spark', lv: 14 }, { species: 'battery', lv: 15 }, { species: 'flash', lv: 16 }],
    },
    {
      id: 'gym_champion', name: '冠軍殿堂', icon: '👑', leader: '寵物大師', leaderEmoji: '👑',
      team: [{ species: 'thunder', lv: 20 }, { species: 'tree', lv: 20 }, { species: 'rooster', lv: 20 }, { species: 'storm', lv: 20 }],
    },
    // ===== Expansion pack: gyms 6-15 (medium tier 6-10, hard tier 11-15) =====
    {
      id: 'gym_forest', name: '森林道館', icon: '🌲', leader: '森林精靈 艾莉', leaderEmoji: '🧚‍♀️',
      team: [{ species: 'bush', lv: 22 }, { species: 'squirrel', lv: 23 }, { species: 'jungle', lv: 24 }],
    },
    {
      id: 'gym_desert', name: '沙漠道館', icon: '🏜️', leader: '沙漠遊俠 卡登', leaderEmoji: '🤠',
      team: [{ species: 'fox', lv: 26 }, { species: 'bull', lv: 27 }, { species: 'elephant', lv: 28 }],
    },
    {
      id: 'gym_ice', name: '冰原道館', icon: '❄️', leader: '冰霜女王 賽琳', leaderEmoji: '👸',
      team: [{ species: 'snowman', lv: 30 }, { species: 'lobster', lv: 31 }, { species: 'penguin', lv: 32 }],
    },
    {
      id: 'gym_ocean', name: '海洋道館', icon: '🌊', leader: '海洋公爵 崔頓', leaderEmoji: '🔱',
      team: [{ species: 'frog', lv: 33 }, { species: 'crocodile', lv: 35 }, { species: 'octopus', lv: 36 }],
    },
    {
      id: 'gym_starry', name: '星空道館', icon: '🌌', leader: '星際使者 諾娃', leaderEmoji: '🌠',
      team: [{ species: 'moon', lv: 37 }, { species: 'comet', lv: 39 }, { species: 'galaxy', lv: 40 }],
    },
    {
      id: 'gym_machine', name: '機械道館', icon: '⚙️', leader: '機械公爵 泰坦', leaderEmoji: '🤖',
      team: [{ species: 'gem', lv: 42 }, { species: 'crystal', lv: 43 }, { species: 'diamond', lv: 44 }, { species: 'machine', lv: 44 }],
    },
    {
      id: 'gym_valley', name: '幽谷道館', icon: '🌫️', leader: '幽谷智者 賽奇', leaderEmoji: '🧙‍♀️',
      team: [{ species: 'ant', lv: 45 }, { species: 'spider', lv: 47 }, { species: 'scorpion', lv: 48 }],
    },
    {
      id: 'gym_dragonlair', name: '龍巢道館', icon: '🐲', leader: '燄龍武士 炎', leaderEmoji: '🥷',
      team: [{ species: 'rocket', lv: 49 }, { species: 'satellite', lv: 51 }, { species: 'alien', lv: 52 }, { species: 'tiger', lv: 52 }],
    },
    {
      id: 'gym_sky', name: '天空道館', icon: '🕊️', leader: '天空騎士 溫蒂', leaderEmoji: '🦸‍♀️',
      team: [{ species: 'duck', lv: 53 }, { species: 'swan', lv: 55 }, { species: 'owl', lv: 56 }, { species: 'wolf', lv: 56 }],
    },
    {
      id: 'gym_legend', name: '傳說殿堂', icon: '🌟', leader: '傳說訓練大師 凱旋', leaderEmoji: '👑',
      team: [{ species: 'rhino', lv: 58 }, { species: 'rainbow', lv: 59 }, { species: 'treasure', lv: 60 }, { species: 'galaxy', lv: 60 }],
    },
  ];

  // fire>grass, grass>water, water>fire, electric>water; normal neutral
  const BEATS = { fire: 'grass', grass: 'water', water: 'fire', electric: 'water' };

  let save = { collection: {}, team: [], gymsBeaten: [] };
  let els = {};
  let currentScreen = 'main';

  // Encounter (catch) state
  let wild = null;         // { species }
  let catchCorrect = 0;    // correct answers so far this encounter

  // Battle state
  let battle = null;       // { enemyTeam, enemyIdx, playerIds, playerIdx, playerHp, playerMax, tier, isGym, gymIdx, gymId }

  // Shared quiz state — one active quiz at a time, driven identically by
  // real clicks and the test hook's answer(correct).
  let activeQuiz = null;   // { options: [{ btn, isCorrect }] }

  function init() {
    const root = document.getElementById('pt-root');
    if (!root) return;
    loadSave();
    buildDom(root);
    renderMain();
    showScreen('main');

    window.__petsTest = {
      save: () => JSON.parse(JSON.stringify(save)),
      wild: () => (wild ? { id: wild.species.id, word: wild.species.word } : null),
      forceWild: (id) => {
        const sp = PET_SPECIES.find(s => s.id === id);
        if (sp) startEncounter(sp);
      },
      answer: (correct) => {
        if (!activeQuiz) return false;
        const entry = activeQuiz.options.find(o => o.isCorrect === !!correct);
        if (!entry) return false;
        entry.btn.click();
        return true;
      },
      battle: () => {
        if (!battle) return null;
        const enemy = battle.enemyTeam[battle.enemyIdx];
        return { playerHp: battle.playerHp, enemyHp: enemy ? enemy.hp : 0, enemyId: enemy ? enemy.speciesId : null };
      },
      startGym: (i) => startGymBattle(i),
      teamSet: (ids) => { setTeam(ids); },
      screen: () => currentScreen,
      gymsCount: () => GYMS.length,
    };
  }

  // ===== Persistence =====
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        save = {
          collection: parsed.collection || {},
          team: Array.isArray(parsed.team) ? parsed.team : [],
          gymsBeaten: Array.isArray(parsed.gymsBeaten) ? parsed.gymsBeaten : [],
        };
      }
    } catch { /* keep defaults */ }
  }

  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // ===== Species / stats helpers =====
  function speciesById(id) { return PET_SPECIES.find(s => s.id === id); }

  function statsFor(species, lv) {
    const hp = Math.round(species.baseHp + (lv - 1) * 4);
    const atk = Math.round(species.baseAtk + (lv - 1) * 1.2);
    return { hp, atk };
  }

  function tierForRarity(rarity) { return rarity >= 3 ? 'hard' : rarity === 2 ? 'medium' : 'easy'; }
  // gymIdx is 1-based. Gyms 1-5 keep their original easy/medium/hard split;
  // the expansion pack adds 6-10 (medium) and 11-15 (hard).
  function tierForGym(gymIdx) {
    if (gymIdx <= 1) return 'easy';
    if (gymIdx <= 3) return 'medium';
    if (gymIdx <= 5) return 'hard';
    if (gymIdx <= 10) return 'medium';
    return 'hard';
  }

  function typeMult(atkType, defType) {
    if (BEATS[atkType] === defType) return 1.5;
    if (BEATS[defType] === atkType) return 0.67;
    return 1;
  }

  function shortZh(zh) {
    const bold = zh.match(/\*\*(.+?)\*\*/);
    if (bold) return bold[1].trim();
    if (zh.includes('—')) return zh.split('—')[0].trim();
    return zh.trim();
  }

  // ===== DOM scaffold =====
  function buildDom(root) {
    root.innerHTML = `
      <div class="pt-screen" id="pt-screen-main">
        <div class="pt-banner" id="pt-champion-banner" style="display:none">🏆 你已成為寵物大師！</div>
        <div class="pt-team-bar" id="pt-team-bar"></div>
        <div class="pt-menu">
          <button type="button" class="pt-menu-btn pt-wild-btn" id="pt-btn-wild">🌿 草叢探險</button>
          <button type="button" class="pt-menu-btn pt-gym-btn" id="pt-btn-gym">🏟️ 道館挑戰</button>
          <button type="button" class="pt-menu-btn pt-dex-btn" id="pt-btn-dex">📖 寵物圖鑑</button>
        </div>
        <div class="pt-gym-badges" id="pt-gym-badges"></div>
      </div>

      <div class="pt-screen" id="pt-screen-team" style="display:none">
        <h3>👥 選擇隊伍（最多 3 隻）</h3>
        <div class="pt-team-pick" id="pt-team-pick"></div>
        <button type="button" class="pt-back-btn" id="pt-team-done">✅ 完成</button>
      </div>

      <div class="pt-screen" id="pt-screen-encounter" style="display:none">
        <div class="pt-encounter-card">
          <div class="pt-enc-emoji" id="pt-enc-emoji">❓</div>
          <div class="pt-enc-text" id="pt-enc-text"></div>
          <div class="pt-ball-row" id="pt-ball-row"></div>
        </div>
        <div class="pt-quiz" id="pt-enc-quiz"></div>
        <div class="pt-result" id="pt-enc-result" style="display:none"></div>
      </div>

      <div class="pt-screen" id="pt-screen-battle" style="display:none">
        <div class="pt-battle-stage">
          <div class="pt-fighter pt-enemy">
            <div class="pt-fighter-name" id="pt-enemy-name"></div>
            <div class="pt-hp-bar"><div class="pt-hp-fill" id="pt-enemy-hp-fill"></div></div>
            <div class="pt-hp-text" id="pt-enemy-hp-text"></div>
            <div class="pt-sprite" id="pt-enemy-sprite">❓</div>
          </div>
          <div class="pt-fighter pt-player">
            <div class="pt-sprite" id="pt-player-sprite">❓</div>
            <div class="pt-fighter-name" id="pt-player-name"></div>
            <div class="pt-hp-bar"><div class="pt-hp-fill" id="pt-player-hp-fill"></div></div>
            <div class="pt-hp-text" id="pt-player-hp-text"></div>
          </div>
        </div>
        <div class="pt-battle-msg" id="pt-battle-msg"></div>
        <div class="pt-quiz" id="pt-battle-quiz"></div>
        <div class="pt-result" id="pt-battle-result" style="display:none"></div>
      </div>

      <div class="pt-screen" id="pt-screen-gyms" style="display:none">
        <h3>🏟️ 道館挑戰</h3>
        <div class="pt-gym-list" id="pt-gym-list"></div>
        <button type="button" class="pt-back-btn" id="pt-gym-back">⬅️ 返回</button>
      </div>

      <div class="pt-screen" id="pt-screen-dex" style="display:none">
        <h3>📖 寵物圖鑑 <span id="pt-dex-count"></span></h3>
        <div class="pt-dex-grid" id="pt-dex-grid"></div>
        <button type="button" class="pt-back-btn" id="pt-dex-back">⬅️ 返回</button>
      </div>
    `;

    els = {
      screens: {
        main: document.getElementById('pt-screen-main'),
        team: document.getElementById('pt-screen-team'),
        encounter: document.getElementById('pt-screen-encounter'),
        battle: document.getElementById('pt-screen-battle'),
        gyms: document.getElementById('pt-screen-gyms'),
        dex: document.getElementById('pt-screen-dex'),
      },
      championBanner: document.getElementById('pt-champion-banner'),
      teamBar: document.getElementById('pt-team-bar'),
      gymBadges: document.getElementById('pt-gym-badges'),
      teamPick: document.getElementById('pt-team-pick'),
      teamDone: document.getElementById('pt-team-done'),
      encEmoji: document.getElementById('pt-enc-emoji'),
      encText: document.getElementById('pt-enc-text'),
      ballRow: document.getElementById('pt-ball-row'),
      encQuiz: document.getElementById('pt-enc-quiz'),
      encResult: document.getElementById('pt-enc-result'),
      enemyName: document.getElementById('pt-enemy-name'),
      enemyHpFill: document.getElementById('pt-enemy-hp-fill'),
      enemyHpText: document.getElementById('pt-enemy-hp-text'),
      enemySprite: document.getElementById('pt-enemy-sprite'),
      playerName: document.getElementById('pt-player-name'),
      playerHpFill: document.getElementById('pt-player-hp-fill'),
      playerHpText: document.getElementById('pt-player-hp-text'),
      playerSprite: document.getElementById('pt-player-sprite'),
      battleMsg: document.getElementById('pt-battle-msg'),
      battleQuiz: document.getElementById('pt-battle-quiz'),
      battleResult: document.getElementById('pt-battle-result'),
      gymList: document.getElementById('pt-gym-list'),
      dexCount: document.getElementById('pt-dex-count'),
      dexGrid: document.getElementById('pt-dex-grid'),
    };

    document.getElementById('pt-btn-wild').addEventListener('click', startWild);
    document.getElementById('pt-btn-gym').addEventListener('click', () => { renderGymList(); showScreen('gyms'); });
    document.getElementById('pt-btn-dex').addEventListener('click', () => { renderDex(); showScreen('dex'); });
    els.teamBar.addEventListener('click', () => { renderTeamPick(); showScreen('team'); });
    els.teamDone.addEventListener('click', () => { renderMain(); showScreen('main'); });
    document.getElementById('pt-gym-back').addEventListener('click', () => showScreen('main'));
    document.getElementById('pt-dex-back').addEventListener('click', () => showScreen('main'));
  }

  function showScreen(name) {
    currentScreen = name;
    Object.entries(els.screens).forEach(([k, el]) => { el.style.display = k === name ? 'block' : 'none'; });
  }

  // ===== Main screen =====
  function renderMain() {
    els.championBanner.style.display = save.gymsBeaten.length >= GYMS.length ? 'block' : 'none';

    els.teamBar.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'pt-team-label';
    label.textContent = '👥 我的隊伍（點擊管理）';
    els.teamBar.appendChild(label);
    const slots = document.createElement('div');
    slots.className = 'pt-team-slots';
    for (let i = 0; i < MAX_TEAM; i++) {
      const id = save.team[i];
      const slot = document.createElement('div');
      slot.className = 'pt-team-slot' + (id ? '' : ' empty');
      if (id) {
        const sp = speciesById(id);
        const entry = save.collection[id];
        slot.innerHTML = `<span class="pt-slot-emoji">${sp.emoji}</span><span class="pt-slot-lv">Lv.${entry.lv}</span>`;
      } else {
        slot.textContent = '➕';
      }
      slots.appendChild(slot);
    }
    els.teamBar.appendChild(slots);

    els.gymBadges.innerHTML = '';
    GYMS.forEach(g => {
      const beaten = save.gymsBeaten.includes(g.id);
      const badge = document.createElement('div');
      badge.className = 'pt-gym-badge' + (beaten ? ' beaten' : '');
      badge.title = g.name;
      badge.textContent = beaten ? g.icon : '🔒';
      els.gymBadges.appendChild(badge);
    });
  }

  // ===== Team management =====
  function setTeam(ids) {
    save.team = ids.filter(id => save.collection[id]).slice(0, MAX_TEAM);
    persist();
    renderMain();
  }

  function renderTeamPick() {
    els.teamPick.innerHTML = '';
    const ids = Object.keys(save.collection);
    if (ids.length === 0) {
      els.teamPick.innerHTML = '<p class="pt-empty-note">還沒有捕獲任何寵物，先去 🌿 草叢探險吧！</p>';
      return;
    }
    ids.forEach(id => {
      const sp = speciesById(id);
      const entry = save.collection[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      const inTeam = save.team.includes(id);
      btn.className = 'pt-pick-card' + (inTeam ? ' picked' : '');
      btn.innerHTML = `<span class="pt-pick-emoji">${sp.emoji}</span><span class="pt-pick-word">${sp.word}</span><span class="pt-pick-lv">Lv.${entry.lv}</span>`;
      btn.addEventListener('click', () => {
        const idx = save.team.indexOf(id);
        if (idx >= 0) {
          save.team.splice(idx, 1);
        } else if (save.team.length < MAX_TEAM) {
          save.team.push(id);
        } else {
          GameEngine.showToast('隊伍最多只能有 3 隻寵物！', 'info');
          return;
        }
        persist();
        renderTeamPick();
      });
      els.teamPick.appendChild(btn);
    });
  }

  // ===== Shared vocab quiz =====
  // Renders a 4-option zh-meaning quiz into `container` using words from
  // VOCAB_DATA[tier]; calls onAnswer(isCorrect, wordEntry) once, exactly
  // like js/candy.js's magic-star quiz.
  function renderQuiz(container, tier, onAnswer) {
    const fullPool = VOCAB_DATA[tier] || VOCAB_DATA.easy;
    const pool = fullPool.filter(w => {
      const m = shortZh(w.zh);
      return m && m.length <= 10 && m !== w.zh;
    });
    const source = pool.length >= 8 ? pool : fullPool;
    const quizWord = source[Math.floor(Math.random() * source.length)];

    const options = [quizWord];
    let guard = 0;
    while (options.length < 4 && guard < 300) {
      const w = source[Math.floor(Math.random() * source.length)];
      if (!options.some(o => o.word === w.word || shortZh(o.zh) === shortZh(w.zh))) options.push(w);
      guard++;
    }
    const shuffled = shuffle(options);

    container.innerHTML = '';
    const wordRow = document.createElement('div');
    wordRow.className = 'pt-quiz-word';
    const wordSpan = document.createElement('span');
    wordSpan.textContent = `${quizWord.hint} ${quizWord.word}`;
    wordRow.appendChild(wordSpan);
    if (TTSManager.isSupported()) {
      wordRow.appendChild(TTSManager.createButton(quizWord.word, 'en-US'));
      TTSManager.speak(quizWord.word, 'en-US', 0.85);
    }
    container.appendChild(wordRow);

    const feedback = document.createElement('div');
    feedback.className = 'pt-quiz-feedback';
    feedback.textContent = '這個單字是什麼意思？';
    container.appendChild(feedback);

    const optWrap = document.createElement('div');
    optWrap.className = 'pt-quiz-options';
    container.appendChild(optWrap);

    activeQuiz = { options: [] };
    shuffled.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pt-quiz-option';
      btn.textContent = shortZh(opt.zh);
      const isCorrect = opt.word === quizWord.word;
      btn.addEventListener('click', () => {
        if (!activeQuiz) return;
        activeQuiz.options.forEach(o => { o.btn.disabled = true; });
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
          activeQuiz.options.forEach(o => { if (o.isCorrect) o.btn.classList.add('reveal'); });
        }
        feedback.textContent = isCorrect
          ? `✅ 正確！${quizWord.word} = ${shortZh(quizWord.zh)}`
          : `❌ 答案是「${shortZh(quizWord.zh)}」`;
        feedback.className = 'pt-quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
        activeQuiz = null;
        (isCorrect ? SoundManager.playCorrect : SoundManager.playWrong)();
        if (isCorrect) GameEngine.recordWord(quizWord.word);
        setTimeout(() => onAnswer(isCorrect, quizWord), 700);
      });
      optWrap.appendChild(btn);
      activeQuiz.options.push({ btn, isCorrect });
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

  // ===== Wild encounter (catch) =====
  function pickWildSpecies() {
    const weights = PET_SPECIES.map(sp => {
      let w = sp.rarity === 1 ? 70 : sp.rarity === 2 ? 25 : 5;
      if (!save.collection[sp.id]) w *= 1.5;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < PET_SPECIES.length; i++) {
      r -= weights[i];
      if (r <= 0) return PET_SPECIES[i];
    }
    return PET_SPECIES[PET_SPECIES.length - 1];
  }

  function startWild() {
    startEncounter(pickWildSpecies());
  }

  function startEncounter(species) {
    wild = { species };
    catchCorrect = 0;
    els.encResult.style.display = 'none';
    els.encQuiz.style.display = 'block';
    els.encEmoji.textContent = species.emoji;
    els.encText.textContent = `野生的 ${species.word}（${species.zh}）出現了！`;
    renderBalls();
    showScreen('encounter');
    askCatchQuestion();
  }

  function renderBalls() {
    els.ballRow.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const ball = document.createElement('span');
      ball.className = 'pt-ball' + (i < catchCorrect ? ' thrown' : '');
      ball.textContent = '⚾';
      els.ballRow.appendChild(ball);
    }
  }

  function askCatchQuestion() {
    if (!wild) return;
    renderQuiz(els.encQuiz, tierForRarity(wild.species.rarity), handleCatchAnswer);
  }

  function handleCatchAnswer(isCorrect) {
    if (!wild) return;
    if (isCorrect) {
      catchCorrect++;
      renderBalls();
      const chance = [0.5, 0.75, 1.0][catchCorrect - 1] ?? 1.0;
      if (catchCorrect >= 3 || Math.random() < chance) {
        caughtPet(wild.species);
      } else {
        els.encText.textContent = `${wild.species.word} 掙脫了球！再試一次！`;
        askCatchQuestion();
      }
    } else if (Math.random() < 0.4) {
      fled();
    } else {
      els.encText.textContent = `${wild.species.word} 還在原地，再想想看！`;
      askCatchQuestion();
    }
  }

  function fled() {
    const word = wild.species.word;
    wild = null; // encounter resolved — clears the test hook's wild() reading
    els.encQuiz.style.display = 'none';
    els.encQuiz.innerHTML = '';
    els.encResult.style.display = 'block';
    els.encResult.className = 'pt-result fled';
    els.encResult.innerHTML = `<p>💨 ${word} 逃走了！下次再試試看吧。</p>
      <button type="button" class="pt-back-btn" id="pt-enc-back">🏠 返回主畫面</button>`;
    document.getElementById('pt-enc-back').addEventListener('click', () => { renderMain(); showScreen('main'); });
  }

  function caughtPet(species) {
    wild = null; // encounter resolved — clears the test hook's wild() reading
    SoundManager.playAchievement();
    const isNew = !save.collection[species.id];
    if (isNew) {
      save.collection[species.id] = { lv: 1, exp: 0 };
    }
    persist();
    GameEngine.recordWord(species.word);
    GameEngine.recordPetCatch();
    let xp = 10, gems = 2;
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
    TTSManager.speak(species.word, 'en-US', 0.85);

    els.encQuiz.style.display = 'none';
    els.encQuiz.innerHTML = '';
    els.encResult.style.display = 'block';
    els.encResult.className = 'pt-result caught';
    els.encResult.innerHTML = `
      <div class="pt-catch-flash">🎉</div>
      <p>${species.emoji} 捕捉成功！${isNew ? '新寵物加入圖鑑！' : '再次捕捉！'}<br>
      獲得 <b>+${xp} XP</b> 和 <b>+${gems} 💎</b></p>
      <div class="pt-result-btns">
        <button type="button" class="pt-back-btn" id="pt-enc-practice">⚔️ 練習對戰</button>
        <button type="button" class="pt-back-btn" id="pt-enc-back">🏠 返回主畫面</button>
      </div>`;
    document.getElementById('pt-enc-back').addEventListener('click', () => { wild = null; renderMain(); showScreen('main'); });
    document.getElementById('pt-enc-practice').addEventListener('click', () => {
      const practiceSpecies = pickWildSpecies();
      const lv = Math.max(1, Math.round(catchCorrect >= 1 ? 3 : 1));
      wild = null;
      startBattle([{ species: practiceSpecies.id, lv }], { isGym: false });
    });
  }

  // ===== Battle engine (shared: wild practice + gyms) =====
  function startBattle(enemyTeamDef, opts) {
    if (save.team.length === 0) {
      GameEngine.showToast('要先組成隊伍才能對戰！點擊隊伍列選寵物。', 'info');
      return;
    }
    const enemyTeam = enemyTeamDef.map(e => {
      const sp = speciesById(e.species);
      const stats = statsFor(sp, e.lv);
      return { speciesId: e.species, lv: e.lv, hp: stats.hp, maxHp: stats.hp, atk: stats.atk, type: sp.type };
    });
    battle = {
      enemyTeam, enemyIdx: 0,
      playerIds: save.team.slice(),
      playerIdx: 0,
      playerHp: 0, playerMax: 0,
      isGym: !!opts.isGym,
      gymIdx: opts.gymIdx || 0,
      gymId: opts.gymId || null,
    };
    setActivePlayerStats();
    GameEngine.setDeferLevelUp(true);
    updateBattleHud();
    els.battleResult.style.display = 'none';
    els.battleQuiz.style.display = 'block';
    els.battleMsg.textContent = battle.isGym ? '⚔️ 道館戰開始！' : '⚔️ 練習對戰開始！';
    showScreen('battle');
    nextBattleRound();
  }

  function startGymBattle(i) {
    if (i < 0 || i >= GYMS.length) return;
    if (i > 0 && !save.gymsBeaten.includes(GYMS[i - 1].id)) {
      GameEngine.showToast('要先打贏前一座道館！', 'info');
      return;
    }
    const gym = GYMS[i];
    startBattle(gym.team, { isGym: true, gymIdx: i + 1, gymId: gym.id });
  }

  function setActivePlayerStats() {
    const id = battle.playerIds[battle.playerIdx];
    const sp = speciesById(id);
    const entry = save.collection[id];
    const stats = statsFor(sp, entry.lv);
    // Preserve current HP across rounds within the same pet's turn — only
    // reset to full when this pet first becomes active.
    if (battle.playerHp === undefined || battle.playerMax === 0 || battle._activeId !== id) {
      battle.playerHp = stats.hp;
    }
    battle.playerMax = stats.hp;
    battle._activeId = id;
    battle._activeAtk = stats.atk;
    battle._activeType = sp.type;
  }

  function battleTier() {
    return battle.isGym ? tierForGym(battle.gymIdx) : tierForRarity(speciesById(battle.enemyTeam[battle.enemyIdx].speciesId).rarity);
  }

  function updateBattleHud() {
    const enemy = battle.enemyTeam[battle.enemyIdx];
    const enemySp = speciesById(enemy.speciesId);
    els.enemyName.textContent = `${enemySp.word} Lv.${enemy.lv}`;
    els.enemySprite.textContent = enemySp.emoji;
    els.enemyHpFill.style.width = Math.max(0, enemy.hp / enemy.maxHp * 100) + '%';
    els.enemyHpText.textContent = `${Math.max(0, Math.round(enemy.hp))}/${enemy.maxHp}`;

    const playerId = battle.playerIds[battle.playerIdx];
    const playerSp = speciesById(playerId);
    const entry = save.collection[playerId];
    els.playerName.textContent = `${playerSp.word} Lv.${entry.lv}`;
    els.playerSprite.textContent = playerSp.emoji;
    els.playerHpFill.style.width = Math.max(0, battle.playerHp / battle.playerMax * 100) + '%';
    els.playerHpText.textContent = `${Math.max(0, Math.round(battle.playerHp))}/${battle.playerMax}`;
  }

  function nextBattleRound() {
    if (!battle) return;
    renderQuiz(els.battleQuiz, battleTier(), handleBattleAnswer);
  }

  function handleBattleAnswer(isCorrect) {
    if (!battle) return;
    if (isCorrect) {
      playerAttack();
    } else {
      enemyAttack();
    }
  }

  function playerAttack() {
    const enemy = battle.enemyTeam[battle.enemyIdx];
    const mult = typeMult(battle._activeType, enemy.type);
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.max(1, Math.round(battle._activeAtk * mult * variance));
    enemy.hp -= dmg;
    els.enemySprite.classList.add('pt-hit');
    setTimeout(() => els.enemySprite.classList.remove('pt-hit'), 400);
    els.battleMsg.textContent = mult > 1 ? `💥 效果絕佳！造成 ${dmg} 傷害！` : mult < 1 ? `⚔️ 效果不太好，造成 ${dmg} 傷害。` : `⚔️ 造成 ${dmg} 傷害！`;
    updateBattleHud();

    if (enemy.hp <= 0) {
      battle.enemyIdx++;
      if (battle.enemyIdx >= battle.enemyTeam.length) {
        setTimeout(() => victory(), 500);
        return;
      }
      setTimeout(() => {
        els.battleMsg.textContent = '對方派出下一隻寵物！';
        updateBattleHud();
        nextBattleRound();
      }, 700);
      return;
    }
    setTimeout(() => nextBattleRound(), 500);
  }

  function enemyAttack() {
    const enemy = battle.enemyTeam[battle.enemyIdx];
    const mult = typeMult(enemy.type, battle._activeType);
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.max(1, Math.round(enemy.atk * mult * variance));
    battle.playerHp -= dmg;
    els.playerSprite.classList.add('pt-hit');
    setTimeout(() => els.playerSprite.classList.remove('pt-hit'), 400);
    els.battleMsg.textContent = `😖 對方攻擊！受到 ${dmg} 傷害！`;
    updateBattleHud();

    if (battle.playerHp <= 0) {
      battle.playerIdx++;
      if (battle.playerIdx >= battle.playerIds.length) {
        setTimeout(() => defeat(), 600);
        return;
      }
      setTimeout(() => {
        setActivePlayerStats();
        els.battleMsg.textContent = '你派出下一隻寵物！';
        updateBattleHud();
        nextBattleRound();
      }, 700);
      return;
    }
    setTimeout(() => nextBattleRound(), 500);
  }

  function victory() {
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    els.battleQuiz.style.display = 'none';
    els.battleQuiz.innerHTML = '';

    // Every surviving (not-fainted) team pet gains exp
    const expGain = battle.isGym ? 25 : 15;
    const survivorMsgs = [];
    battle.playerIds.forEach((id, i) => {
      if (i < battle.playerIdx) return; // fainted already
      const evo = grantExp(id, expGain);
      survivorMsgs.push(evo);
    });

    let xp = 0, gems = 0;
    let badgeMsg = '';
    if (battle.isGym) {
      xp = 50; gems = 15;
      if (!save.gymsBeaten.includes(battle.gymId)) save.gymsBeaten.push(battle.gymId);
      GameEngine.recordPetGym();
      badgeMsg = `🎖️ 獲得 ${GYMS[battle.gymIdx - 1].name} 徽章！`;
      if (save.gymsBeaten.length >= GYMS.length) badgeMsg += '<br>🏆 恭喜成為寵物大師！';
    } else {
      xp = 12; gems = 3;
    }
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += battle.isGym ? 5 : 2;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！額外寶石', 'gem');
    }
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);
    SoundManager.playQuestComplete();
    persist();

    els.battleResult.style.display = 'block';
    els.battleResult.className = 'pt-result victory';
    els.battleResult.innerHTML = `
      <p>🎉 勝利！獲得 <b>+${xp} XP</b> 和 <b>+${gems} 💎</b><br>${badgeMsg}
      ${survivorMsgs.filter(Boolean).join('<br>')}</p>
      <button type="button" class="pt-back-btn" id="pt-battle-back">🏠 返回主畫面</button>`;
    document.getElementById('pt-battle-back').addEventListener('click', () => {
      battle = null;
      renderMain();
      showScreen('main');
    });
  }

  function defeat() {
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    els.battleQuiz.style.display = 'none';
    els.battleQuiz.innerHTML = '';
    persist();
    els.battleResult.style.display = 'block';
    els.battleResult.className = 'pt-result defeat';
    els.battleResult.innerHTML = `
      <p>😢 你的隊伍都倒下了……別灰心，多練習單字再來挑戰吧！</p>
      <button type="button" class="pt-back-btn" id="pt-battle-back">🏠 返回主畫面</button>`;
    document.getElementById('pt-battle-back').addEventListener('click', () => {
      battle = null;
      renderMain();
      showScreen('main');
    });
  }

  // Add exp to a collection pet; handles level-ups and evolution.
  // Returns a toast-string (or '' if nothing notable happened).
  function grantExp(id, amount) {
    const entry = save.collection[id];
    if (!entry) return '';
    entry.exp += amount;
    let msg = '';
    let sp = speciesById(id);
    while (entry.exp >= entry.lv * 20) {
      entry.exp -= entry.lv * 20;
      entry.lv++;
      if (sp.evolvesTo && entry.lv >= sp.evolveLevel) {
        const next = speciesById(sp.evolvesTo);
        if (next) {
          const oldWord = sp.word;
          delete save.collection[id];
          save.collection[next.id] = { lv: entry.lv, exp: entry.exp };
          GameEngine.recordWord(next.word);
          GameEngine.showToast(`🎉 ${oldWord} 進化成 ${next.word}！`, 'achievement');
          msg = `🎉 ${oldWord} 進化成 ${next.word}！`;
          // Update team reference to the new species id
          const ti = save.team.indexOf(id);
          if (ti >= 0) save.team[ti] = next.id;
          id = next.id;
          entry.lv = save.collection[id].lv;
          entry.exp = save.collection[id].exp;
          sp = next;
        }
      }
    }
    persist();
    return msg;
  }

  // ===== Gym select screen =====
  function renderGymList() {
    els.gymList.innerHTML = '';
    GYMS.forEach((g, i) => {
      const beaten = save.gymsBeaten.includes(g.id);
      const locked = i > 0 && !save.gymsBeaten.includes(GYMS[i - 1].id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'pt-gym-card' + (beaten ? ' beaten' : '') + (locked ? ' locked' : '');
      card.innerHTML = `<span class="pt-gym-icon">${g.icon}</span>
        <span class="pt-gym-name">${g.name}</span>
        <span class="pt-gym-leader">${g.leaderEmoji} ${g.leader}</span>
        <span class="pt-gym-status">${beaten ? '✅ 已擊敗' : locked ? '🔒 尚未解鎖' : '⚔️ 挑戰'}</span>`;
      card.disabled = locked;
      card.addEventListener('click', () => startGymBattle(i));
      els.gymList.appendChild(card);
    });
  }

  // ===== Dex =====
  function renderDex() {
    const caught = Object.keys(save.collection).length;
    els.dexCount.textContent = `${caught}/${PET_SPECIES.length}`;
    els.dexGrid.innerHTML = '';
    PET_SPECIES.forEach(sp => {
      const entry = save.collection[sp.id];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pt-dex-cell' + (entry ? ' caught type-' + sp.type : ' unknown');
      if (entry) {
        cell.innerHTML = `<span class="pt-dex-emoji">${sp.emoji}</span>
          <span class="pt-dex-word">${sp.word}</span>
          <span class="pt-dex-zh">${sp.zh}</span>
          <span class="pt-dex-lv">Lv.${entry.lv}</span>`;
        cell.addEventListener('click', () => TTSManager.speak(sp.word.toLowerCase(), 'en-US', 0.85));
      } else {
        cell.innerHTML = `<span class="pt-dex-emoji">❓</span><span class="pt-dex-word">???</span>`;
      }
      els.dexGrid.appendChild(cell);
    });
  }

  return { init };
})();
