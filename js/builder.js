/* ===== Sentence Builder Module =====
   Duolingo-style word-order game with a world-landmark twist: tap
   shuffled word blocks to assemble the sentence shown in Chinese;
   every correct sentence adds a layer to a world-famous building
   (33 landmarks, each with a cultural fun fact). Completed landmarks
   are collected across sessions (localStorage). Reuses GRAMMAR_DATA
   and VOCAB_DATA sentences (no new sentence data needed).
*/

const BuilderGame = (() => {
  const STORAGE_KEY = 'english_savior_builder';
  const DIFF_CONFIG = {
    easy:   { min: 4, max: 6, xp: 15, bonus: 10 },
    medium: { min: 6, max: 8, xp: 20, bonus: 15 },
    hard:   { min: 8, max: 11, xp: 25, bonus: 20 },
  };

  // 33 world-famous landmarks. `layers` are emoji rows, bottom → top,
  // one per completed sentence; `fact` is a kid-friendly culture note.
  const LANDMARKS = [
    { id: 'eiffel', name: 'Eiffel Tower', zh: '艾菲爾鐵塔', country: '法國', flag: '🇫🇷',
      layers: ['🟫🟫🟫🟫🟫', '⬛⬜⬜⬜⬛', '⬛⬜⬜⬛', '⬛⬜⬛', '⬛⬛', '🔺', '📡'],
      fact: '1889 年為巴黎世界博覽會而建，高 324 公尺，晚上每個整點都會閃亮 5 分鐘！' },
    { id: 'taipei101', name: 'Taipei 101', zh: '台北 101', country: '台灣', flag: '🇹🇼',
      layers: ['⬜⬜⬜⬜', '🟦🟦🟦', '🟩🟩🟩', '🟦🟦🟦', '🟩🟩🟩', '🟦🟦', '📡'],
      fact: '高 508 公尺，2004 年曾是世界第一高樓，樓上掛著 660 噸重的金色大圓球（阻尼器）幫大樓抗震！' },
    { id: 'greatwall', name: 'Great Wall of China', zh: '萬里長城', country: '中國', flag: '🇨🇳',
      layers: ['🟩🟩🟩🟩🟩🟩', '🧱🧱🧱🧱🧱🧱', '🧱⬜🧱⬜🧱', '🏯🧱🧱🧱🏯', '🚩🚩'],
      fact: '全長超過 2 萬公里，是世界上最長的城牆，前前後後蓋了超過 2000 年！' },
    { id: 'liberty', name: 'Statue of Liberty', zh: '自由女神像', country: '美國', flag: '🇺🇸',
      layers: ['🟦🟦🟦🟦', '⬜⬜⬜', '🟩🟩', '🟩🟩', '👑', '🔥'],
      fact: '是法國在美國獨立 100 週年時送的禮物！她右手舉火炬，左手抱著獨立宣言。' },
    { id: 'bigben', name: 'Big Ben', zh: '大笨鐘', country: '英國', flag: '🇬🇧',
      layers: ['🟫🟫🟫', '🟨🟨', '🟨🟨', '🕰️', '🔺', '🚩'],
      fact: '倫敦的大鐘每 15 分鐘就會噹噹響，其實「大笨鐘」是塔裡面那口大鐘的名字！' },
    { id: 'pisa', name: 'Leaning Tower of Pisa', zh: '比薩斜塔', country: '義大利', flag: '🇮🇹',
      layers: ['⬜⬜⬜', '⬜⬜', '⬜⬜', '⬜⬜', '⬜⬜', '🔔'],
      fact: '因為地基太軟，蓋到一半就開始傾斜，斜了 800 多年到現在還沒倒！' },
    { id: 'colosseum', name: 'Colosseum', zh: '羅馬競技場', country: '義大利', flag: '🇮🇹',
      layers: ['🟫🟫🟫🟫🟫', '🟧🟧🟧🟧', '⬜🟧⬜🟧', '🟧⬜🟧', '🏛️'],
      fact: '2000 年前的羅馬人在這裡看角鬥士比賽，可以坐 5 萬人，跟現代大型體育場一樣大！' },
    { id: 'pyramid', name: 'Pyramids of Giza', zh: '吉薩金字塔', country: '埃及', flag: '🇪🇬',
      layers: ['🟨🟨🟨🟨🟨🟨', '🟨🟨🟨🟨🟨', '🟨🟨🟨🟨', '🟨🟨🟨', '🟨🟨', '🔺'],
      fact: '4500 年前古埃及法老王的陵墓，用了 230 萬塊大石頭，每塊平均重 2.5 噸！' },
    { id: 'sphinx', name: 'Great Sphinx', zh: '獅身人面像', country: '埃及', flag: '🇪🇬',
      layers: ['🟨🟨🟨🟨🟨', '🟧🟧🟧🟧', '🦁🟧🟧', '🟧🟧', '🙂'],
      fact: '獅子的身體加上法老的臉，趴在金字塔旁邊守護了 4500 年，鼻子去哪了至今是個謎！' },
    { id: 'tajmahal', name: 'Taj Mahal', zh: '泰姬瑪哈陵', country: '印度', flag: '🇮🇳',
      layers: ['⬜⬜⬜⬜⬜', '🕌⬜⬜🕌', '⬜⬜⬜', '⚪⚪', '🌙'],
      fact: '印度皇帝為了紀念心愛的皇后，用白色大理石蓋了 22 年才完工！' },
    { id: 'skytree', name: 'Tokyo Skytree', zh: '東京晴空塔', country: '日本', flag: '🇯🇵',
      layers: ['🟦🟦🟦🟦', '⬜⬜⬜', '⬜⬜', '⬜⬜', '⬜', '📡', '✨'],
      fact: '高 634 公尺，是世界最高的塔！日文「634」唸起來像「武藏」，正是東京一帶的古地名。' },
    { id: 'osaka', name: 'Osaka Castle', zh: '大阪城', country: '日本', flag: '🇯🇵',
      layers: ['🟫🟫🟫🟫🟫', '⬜⬜⬜⬜', '🟩🟩🟩', '⬜⬜', '🟩🟩', '🐟'],
      fact: '400 多年前豐臣秀吉蓋的名城，屋頂上有金色的鯱（虎頭魚身的神獸）守護城堡！' },
    { id: 'fuji', name: 'Mount Fuji', zh: '富士山', country: '日本', flag: '🇯🇵',
      layers: ['🌸🌸🌸🌸🌸', '🟩🟩🟩🟩', '🟦🟦🟦', '⬜⬜', '☁️'],
      fact: '日本最高的山（3776 公尺）其實是一座火山！夏天很多人半夜爬上山頂看日出。' },
    { id: 'sydney', name: 'Sydney Opera House', zh: '雪梨歌劇院', country: '澳洲', flag: '🇦🇺',
      layers: ['🌊🌊🌊🌊🌊', '🟫🟫🟫🟫', '⬜⬜⬜', '⛵⛵⛵', '⛵⛵'],
      fact: '屋頂像一片片白色風帆，蓋了 14 年！每年有超過 1500 場表演在這裡演出。' },
    { id: 'rio', name: 'Christ the Redeemer', zh: '里約基督像', country: '巴西', flag: '🇧🇷',
      layers: ['⛰️⛰️⛰️⛰️', '🟫🟫🟫', '⬜⬜', '🕊️🙌🕊️', '😇'],
      fact: '站在 700 公尺高的山頂張開雙臂擁抱整座城市，是世界新七大奇蹟之一！' },
    { id: 'basil', name: "Saint Basil's Cathedral", zh: '聖巴西爾大教堂', country: '俄羅斯', flag: '🇷🇺',
      layers: ['🟥🟥🟥🟥🟥', '⬜🟥⬜🟥⬜', '🟥⬜🟥', '🧅🧅🧅', '⭐'],
      fact: '莫斯科紅場上的教堂，屋頂像一顆顆彩色洋蔥，每個「洋蔥頭」的顏色花紋都不一樣！' },
    { id: 'parthenon', name: 'Parthenon', zh: '帕德嫩神殿', country: '希臘', flag: '🇬🇷',
      layers: ['⛰️⛰️⛰️⛰️⛰️', '🟫🟫🟫🟫🟫', '🏛️🏛️🏛️', '⬜⬜⬜⬜', '🔺🔺'],
      fact: '2500 年前希臘人蓋給智慧女神雅典娜的神殿，整座用白色大理石柱子撐起來！' },
    { id: 'angkor', name: 'Angkor Wat', zh: '吳哥窟', country: '柬埔寨', flag: '🇰🇭',
      layers: ['🟩🟩🟩🟩🟩', '🟫🟫🟫🟫', '🛕🛕🛕', '🛕🛕', '🛕'],
      fact: '世界最大的廟宇建築群，藏在柬埔寨的叢林裡，日出時映在水池上的倒影超級美！' },
    { id: 'burj', name: 'Burj Khalifa', zh: '哈里發塔', country: '阿聯', flag: '🇦🇪',
      layers: ['🟨🟨🟨🟨', '⬜⬜⬜', '🟦🟦🟦', '⬜⬜', '🟦🟦', '⬜', '📍'],
      fact: '高 828 公尺，是目前世界第一高樓，搭高速電梯上觀景台只要約 1 分鐘！' },
    { id: 'goldengate', name: 'Golden Gate Bridge', zh: '金門大橋', country: '美國', flag: '🇺🇸',
      layers: ['🌊🌊🌊🌊🌊', '🚗🚗🚗🚗', '🟥🟥🟥🟥', '🟥⬜⬜🟥', '🌁'],
      fact: '它的橘紅色有個帥氣的名字叫「國際橘」，就是為了讓大橋在濃霧裡也看得見！' },
    { id: 'towerbridge', name: 'Tower Bridge', zh: '倫敦塔橋', country: '英國', flag: '🇬🇧',
      layers: ['🌊🌊🌊🌊🌊', '🟦🟦🟦🟦', '🏰🛣️🛣️🏰', '🏰⬜⬜🏰', '🔺🔺'],
      fact: '橋的中間可以像翹翹板一樣打開讓大船通過，一年要開合大約 800 次！' },
    { id: 'sagrada', name: 'Sagrada Família', zh: '聖家堂', country: '西班牙', flag: '🇪🇸',
      layers: ['🟫🟫🟫🟫🟫', '🟨🟨🟨🟨', '🗼🟨🗼', '🗼🗼🗼', '✝️'],
      fact: '從 1882 年蓋到現在還沒完工！設計師高第說：「我的客戶（上帝）不趕時間。」' },
    { id: 'neuschwanstein', name: 'Neuschwanstein Castle', zh: '新天鵝堡', country: '德國', flag: '🇩🇪',
      layers: ['⛰️⛰️⛰️⛰️', '⬜⬜⬜⬜', '⬜🏰⬜', '🔺🔺🔺', '🚩'],
      fact: '德國國王路德維希二世的夢幻城堡，迪士尼的睡美人城堡就是照著它設計的！' },
    { id: 'windmill', name: 'Dutch Windmills', zh: '荷蘭風車', country: '荷蘭', flag: '🇳🇱',
      layers: ['🌷🌷🌷🌷🌷', '🟫🟫🟫', '🟫🟫', '✖️', '🌬️'],
      fact: '荷蘭有四分之一的土地比海面還低，幾百年來靠風車不停抽水，把海變成了陸地！' },
    { id: 'chichen', name: 'Chichén Itzá', zh: '奇琴伊察金字塔', country: '墨西哥', flag: '🇲🇽',
      layers: ['🟩🟩🟩🟩🟩🟩', '⬜⬜⬜⬜⬜', '⬜⬜⬜⬜', '⬜⬜⬜', '🛖'],
      fact: '馬雅人的金字塔就是一個巨大的日曆：四面階梯加起來剛好 365 階，跟一年的天數一樣！' },
    { id: 'machu', name: 'Machu Picchu', zh: '馬丘比丘', country: '祕魯', flag: '🇵🇪',
      layers: ['⛰️⛰️⛰️⛰️⛰️', '🟩🟩🟩🟩', '🧱🧱🧱', '🛖🛖', '🦙'],
      fact: '印加帝國藏在安地斯山上 2400 公尺高的「天空之城」，旁邊還有羊駝悠閒散步！' },
    { id: 'gyeongbok', name: 'Gyeongbokgung Palace', zh: '景福宮', country: '韓國', flag: '🇰🇷',
      layers: ['🟫🟫🟫🟫🟫', '🟥🟥🟥🟥', '🟩🟩🟩', '🟥🟥', '🏯'],
      fact: '朝鮮王朝的皇宮，每天有穿古裝的守門將換崗儀式，穿韓服去參觀還可以免費入場！' },
    { id: 'bangkok', name: 'Grand Palace', zh: '曼谷大皇宮', country: '泰國', flag: '🇹🇭',
      layers: ['⬜⬜⬜⬜⬜', '🟨🟨🟨🟨', '🟥🟨🟥', '🛕🛕', '👑'],
      fact: '泰國國王的宮殿金光閃閃，裡面的玉佛寺供奉著用整塊翡翠雕成的佛像！' },
    { id: 'marinabay', name: 'Marina Bay Sands', zh: '濱海灣金沙', country: '新加坡', flag: '🇸🇬',
      layers: ['🌊🌊🌊🌊🌊', '🏢🏢🏢', '🏢🏢🏢', '🏢🏢🏢', '🛳️'],
      fact: '三棟大樓的頂上放了一艘「大船」，船上有 150 公尺長的無邊際泳池，游泳像飄在天空！' },
    { id: 'cntower', name: 'CN Tower', zh: '加拿大國家電視塔', country: '加拿大', flag: '🇨🇦',
      layers: ['⬜⬜⬜⬜', '⬜⬜', '⬜⬜', '🔴', '⬜', '📡'],
      fact: '高 553 公尺，膽子大的人可以綁著安全繩，在塔頂外圍「無扶手」漫步一圈！' },
    { id: 'hagia', name: 'Hagia Sophia', zh: '聖索菲亞', country: '土耳其', flag: '🇹🇷',
      layers: ['🟫🟫🟫🟫🟫', '🗼🟧🟧🗼', '🟧🟧🟧', '⚪⚪', '🌙'],
      fact: '1500 年來當過教堂也當過清真寺，巨大的圓頂在當時是全世界的建築奇蹟！' },
    { id: 'whitehouse', name: 'White House', zh: '白宮', country: '美國', flag: '🇺🇸',
      layers: ['🟩🟩🟩🟩🟩', '⬜⬜⬜⬜', '🏛️⬜🏛️', '⬜⬜⬜', '🦅'],
      fact: '美國總統的家兼辦公室，有 132 個房間，還有電影院、保齡球道和游泳池！' },
    { id: 'stonehenge', name: 'Stonehenge', zh: '巨石陣', country: '英國', flag: '🇬🇧',
      layers: ['🌿🟩🟩🟩🌿', '🗿🗿🗿🗿', '🟫🟫🟫', '🗿🗿', '☀️'],
      fact: '5000 年前的人搬來幾十噸重的巨石排成圓圈，到現在沒人確定他們是怎麼搬的！' },
  ];

  let difficulty = 'easy';
  let pool = [];            // prepared sentences for current difficulty
  let current = null;       // { tokens: [...], zh, display }
  let placed = [];          // indices into tiles
  let tiles = [];           // shuffled tokens [{ text, id }]
  let sentenceNum = 0;      // 0-based within the landmark
  let wrongTries = 0;
  let checking = false;

  let deck = [];            // shuffled landmark indices, uncollected drawn first
  let landmark = null;      // current LANDMARKS entry
  let collected = loadCollection();

  let els = {};

  function init() {
    els = {
      zh: document.getElementById('bd-zh'),
      slots: document.getElementById('bd-slots'),
      tiles: document.getElementById('bd-tiles'),
      feedback: document.getElementById('bd-feedback'),
      house: document.getElementById('bd-house'),
      progress: document.getElementById('bd-progress'),
      houses: document.getElementById('bd-houses'),
      startScreen: document.getElementById('bd-start-screen'),
      startBtn: document.getElementById('bd-start-btn'),
      doneScreen: document.getElementById('bd-done-screen'),
      doneInfo: document.getElementById('bd-done-info'),
      doneBtn: document.getElementById('bd-done-btn'),
      gameArea: document.getElementById('bd-game'),
    };

    document.querySelectorAll('.bd-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bd-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    els.startBtn.addEventListener('click', startHouse);
    els.doneBtn.addEventListener('click', startHouse);
    updateCollectionHUD();

    // Read-only hook for automated tests (token order is closure state)
    window.__builderTest = {
      current: () => (current ? { ...current } : null),
      landmark: () => (landmark ? { ...landmark } : null),
      collectedCount: () => collected.size,
    };
  }

  // ===== Landmark collection =====
  function loadCollection() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return new Set(d && Array.isArray(d.collected) ? d.collected : []);
    } catch {
      return new Set();
    }
  }

  function saveCollection() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collected: [...collected] }));
  }

  function nextLandmark() {
    if (deck.length === 0) {
      deck = LANDMARKS.map((_, i) => i);
      shuffleInPlace(deck);
      // Draw uncollected landmarks first (pop takes from the end)
      deck.sort((a, b) =>
        (collected.has(LANDMARKS[a].id) ? 0 : 1) - (collected.has(LANDMARKS[b].id) ? 0 : 1));
    }
    return LANDMARKS[deck.pop()];
  }

  function updateCollectionHUD() {
    els.houses.textContent = `🗼 ${collected.size} / ${LANDMARKS.length}`;
    els.houses.title = `已收藏 ${collected.size} / ${LANDMARKS.length} 座世界地標`;
  }

  // ===== Sentence pool =====
  function cleanZh(zh) {
    return zh.replace(/\*\*/g, '');
  }

  function tokenize(sentence) {
    // Strip trailing punctuation, keep contractions/hyphens inside words
    return sentence.replace(/[.!?]+\s*$/, '').trim().split(/\s+/);
  }

  function buildPool() {
    const cfg = DIFF_CONFIG[difficulty];
    pool = [];
    // Grammar sentences (have proper translations)
    GRAMMAR_DATA.forEach(q => {
      const full = q.sentence.replace(/_____/g, q.blank);
      if (full.includes('_')) return;
      const tokens = tokenize(full);
      if (tokens.length >= cfg.min && tokens.length <= cfg.max && q.translation) {
        pool.push({ tokens, zh: q.translation, display: full });
      }
    });
    // Vocab example sentences
    const tier = difficulty;
    VOCAB_DATA[tier].forEach(w => {
      const full = w.sentence.replace(/_____/g, w.word.toLowerCase());
      if (full.includes('_')) return;
      const tokens = tokenize(full);
      if (tokens.length >= cfg.min && tokens.length <= cfg.max) {
        pool.push({ tokens, zh: cleanZh(w.zh), display: full });
      }
    });
    shuffleInPlace(pool);
  }

  // ===== Round lifecycle =====
  function startHouse() {
    els.startScreen.style.display = 'none';
    els.doneScreen.style.display = 'none';
    els.gameArea.style.display = 'block';
    buildPool();
    landmark = nextLandmark();
    sentenceNum = 0;
    GameEngine.setDeferLevelUp(true);
    renderHouse();
    nextSentence();
  }

  function houseComplete() {
    const isNew = !collected.has(landmark.id);
    if (isNew) {
      collected.add(landmark.id);
      saveCollection();
      updateCollectionHUD();
    }
    GameEngine.recordBuilderLandmark();
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    GameEngine.setDeferLevelUp(true);

    let bonus = DIFF_CONFIG[difficulty].bonus;
    if (GameEngine.hasBuff('gem_bonus')) {
      bonus += 5;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
    }
    GameEngine.addGems(bonus);
    SoundManager.playQuestComplete();

    els.gameArea.style.display = 'none';
    els.doneInfo.innerHTML =
      `<div class="bd-done-house">${landmark.layers.map(l => `<div class="bd-layer">${l}</div>`).join('')}</div>` +
      `<div class="bd-done-name">${landmark.flag} ${landmark.name}<br>${landmark.zh}（${landmark.country}）</div>` +
      (isNew ? '<div class="bd-new-badge">🎉 新地標入藏！</div>' : '') +
      `<div class="bd-fact">💡 ${landmark.fact}</div>` +
      `<div>完工獎勵 <b>+${bonus} 💎</b> ・ 已收藏 <b>${collected.size} / ${LANDMARKS.length}</b> 座世界地標</div>`;
    els.doneScreen.style.display = 'flex';
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
  }

  function nextSentence() {
    if (sentenceNum >= landmark.layers.length) {
      houseComplete();
      return;
    }
    if (pool.length === 0) buildPool();
    current = pool.pop();
    placed = [];
    wrongTries = 0;
    checking = false;

    els.zh.innerHTML = '';
    const zhText = document.createElement('span');
    zhText.textContent = current.zh;
    els.zh.appendChild(zhText);
    if (TTSManager.isSupported()) {
      els.zh.appendChild(TTSManager.createButton(current.display, 'en-US'));
    }

    tiles = current.tokens.map((text, id) => ({ text, id }));
    shuffleInPlace(tiles);
    // Guard: a shuffle can accidentally be the correct order — reshuffle once
    if (tiles.every((t, i) => t.id === i) && tiles.length > 1) shuffleInPlace(tiles);

    els.feedback.textContent = '';
    els.feedback.className = 'bd-feedback';
    els.progress.textContent =
      `🏗️ 正在建造：${landmark.flag} ${landmark.zh} ・ 第 ${sentenceNum + 1} / ${landmark.layers.length} 句`;
    render();
  }

  // ===== Interaction =====
  function placeTile(tileIdx) {
    if (checking || placed.includes(tileIdx)) return;
    placed.push(tileIdx);
    render();
    if (placed.length === tiles.length) checkAnswer();
  }

  function removePlaced(pos) {
    if (checking) return;
    placed.splice(pos, 1);
    render();
  }

  function useHintBuff() {
    // Hint crystal: auto-place the next correct token
    if (!GameEngine.hasBuff('hint') || checking) return false;
    const want = current.tokens[placed.length];
    const tileIdx = tiles.findIndex((t, i) => !placed.includes(i) && t.text === want);
    if (tileIdx === -1) return false;
    GameEngine.consumeBuff('hint');
    GameEngine.showToast('🔮 提示水晶生效！自動放上一塊', 'achievement');
    placeTile(tileIdx);
    return true;
  }

  function checkAnswer() {
    checking = true;
    const built = placed.map(i => tiles[i].text);
    const correct = built.every((w, i) => w === current.tokens[i]);

    if (correct) {
      SoundManager.playCorrect();
      els.feedback.innerHTML = `✅ ${current.display}`;
      els.feedback.className = 'bd-feedback correct';
      if (TTSManager.isSupported()) {
        TTSManager.speak(current.display, 'en-US', 0.9);
      }

      // Rewards
      let xp = DIFF_CONFIG[difficulty].xp;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      let gems = 1;
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }
      GameEngine.addXP(xp);
      GameEngine.addGems(gems);
      GameEngine.recordGrammar();
      GameEngine.recordBuilder();

      sentenceNum++;
      renderHouse(true);
      setTimeout(() => nextSentence(), 1600);
    } else {
      SoundManager.playWrong();
      wrongTries++;
      // Find the first wrong position and bounce those tiles back
      let firstWrong = built.findIndex((w, i) => w !== current.tokens[i]);
      if (firstWrong === -1) firstWrong = 0;

      // Revive feather: one extra chance without counting the miss
      if (wrongTries >= 3 && GameEngine.hasBuff('revive')) {
        GameEngine.consumeBuff('revive');
        GameEngine.showToast('🪶 復活羽毛生效！再試一次！', 'achievement');
        wrongTries--;
      }

      if (wrongTries >= 3) {
        // Show the correct sentence, then move on (no reward — but learning!)
        els.feedback.innerHTML = `💡 正確順序是：<b>${current.display}</b>`;
        els.feedback.className = 'bd-feedback hint';
        placed = current.tokens.map((_, i) => tiles.findIndex((t, j) => t.id === i));
        render();
        if (TTSManager.isSupported()) TTSManager.speak(current.display, 'en-US', 0.9);
        sentenceNum++; // layer still builds so the landmark always finishes
        renderHouse(true);
        setTimeout(() => nextSentence(), 2600);
      } else {
        els.feedback.textContent = `❌ 第 ${firstWrong + 1} 塊放錯了，退回重排！（第 ${wrongTries} / 2 次）`;
        els.feedback.className = 'bd-feedback wrong';
        // Return tiles from the first wrong position onward
        setTimeout(() => {
          placed = placed.slice(0, firstWrong);
          checking = false;
          render();
        }, 900);
      }
    }
  }

  // ===== Rendering =====
  function render() {
    // Build slots (placed words)
    els.slots.innerHTML = '';
    placed.forEach((tileIdx, pos) => {
      const b = document.createElement('button');
      b.className = 'bd-block placed';
      b.textContent = tiles[tileIdx].text;
      b.addEventListener('click', () => removePlaced(pos));
      els.slots.appendChild(b);
    });
    // Empty slot indicator
    for (let i = placed.length; i < tiles.length; i++) {
      const s = document.createElement('span');
      s.className = 'bd-slot-empty';
      els.slots.appendChild(s);
    }

    // Tile tray
    els.tiles.innerHTML = '';
    tiles.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'bd-block' + (placed.includes(i) ? ' used' : '');
      b.textContent = t.text;
      b.disabled = placed.includes(i);
      b.addEventListener('click', () => placeTile(i));
      els.tiles.appendChild(b);
    });

    // Hint buff button
    if (GameEngine.hasBuff('hint') && !checking && placed.length < tiles.length) {
      const hintBtn = document.createElement('button');
      hintBtn.className = 'bd-hint-btn';
      hintBtn.textContent = '🔮 用提示水晶放一塊';
      hintBtn.addEventListener('click', useHintBuff);
      els.tiles.appendChild(hintBtn);
    }
  }

  function renderHouse(justBuilt) {
    els.house.innerHTML = '';
    for (let i = 0; i < sentenceNum && i < landmark.layers.length; i++) {
      const layer = document.createElement('div');
      layer.className = 'bd-layer';
      layer.textContent = landmark.layers[i];
      if (justBuilt && i === sentenceNum - 1) layer.classList.add('new');
      els.house.appendChild(layer);
    }
    if (sentenceNum === 0) {
      const ground = document.createElement('div');
      ground.className = 'bd-layer ghost';
      ground.textContent = '🏗️ 空地';
      els.house.appendChild(ground);
    }
  }

  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  return { init };
})();
