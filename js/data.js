/* ===== Game Data =====
   All vocabulary, grammar, and video lesson content.
   Themed around Minecraft, Roblox, and gaming culture.
*/

const VOCAB_DATA = {
  easy: [
    { word: 'SWORD', hint: '⚔️', zh: '劍 — 用來攻擊怪物的武器', sentence: 'I crafted a diamond _____.' },
    { word: 'BLOCK', hint: '🟫', zh: '方塊 — Minecraft 的基本元素', sentence: 'Place the _____ on the ground.' },
    { word: 'CRAFT', hint: '🔨', zh: '合成 — 用材料製作物品', sentence: 'You can _____ tools at the workbench.' },
    { word: 'MINE', hint: '⛏️', zh: '挖掘 — 挖地下的礦物', sentence: 'Let\'s _____ for diamonds!' },
    { word: 'BUILD', hint: '🏗️', zh: '建造 — 蓋房子或建築', sentence: 'I want to _____ a castle.' },
    { word: 'SPAWN', hint: '✨', zh: '生成 — 角色出現在世界中', sentence: 'Monsters _____ at night.' },
    { word: 'CHEST', hint: '📦', zh: '箱子 — 存放物品的容器', sentence: 'Put your items in the _____.' },
    { word: 'ARMOR', hint: '🛡️', zh: '盔甲 — 保護身體的裝備', sentence: 'Wear _____ to reduce damage.' },
    { word: 'STONE', hint: '🪨', zh: '石頭 — 常見的建築材料', sentence: 'Break the _____ with a pickaxe.' },
    { word: 'TORCH', hint: '🔦', zh: '火把 — 照亮黑暗的工具', sentence: 'Place a _____ to light the cave.' },
    { word: 'CREEP', hint: '💚', zh: '潛行/苦力怕 — 會爆炸的怪物', sentence: 'Watch out for the _____er!' },
    { word: 'LEVEL', hint: '📊', zh: '等級 — 你的經驗等級', sentence: 'I reached _____ 50 today!' },
    { word: 'TRADE', hint: '🤝', zh: '交易 — 和村民換東西', sentence: 'You can _____ with villagers.' },
    { word: 'JUMP', hint: '🦘', zh: '跳躍 — 按空白鍵跳起來', sentence: 'Press space to _____.' },
    { word: 'FARM', hint: '🌾', zh: '農場 — 種植食物的地方', sentence: 'I built a wheat _____.' },
  ],
  medium: [
    { word: 'DIAMOND', hint: '💎', zh: '鑽石 — 最稀有的礦物', sentence: 'I finally found a _____!' },
    { word: 'POTION', hint: '🧪', zh: '藥水 — 給予特殊效果', sentence: 'Drink the _____ of healing.' },
    { word: 'SHIELD', hint: '🛡️', zh: '盾牌 — 擋住攻擊', sentence: 'Use your _____ to block arrows.' },
    { word: 'PORTAL', hint: '🌀', zh: '傳送門 — 通往其他世界', sentence: 'Step into the nether _____.' },
    { word: 'BEACON', hint: '💡', zh: '信標 — 發出光芒的方塊', sentence: 'The _____ gives special powers.' },
    { word: 'ZOMBIE', hint: '🧟', zh: '殭屍 — 在夜晚出現的怪物', sentence: 'A _____ is coming towards us!' },
    { word: 'RECIPE', hint: '📜', zh: '配方 — 合成物品的方法', sentence: 'Check the crafting _____.' },
    { word: 'ISLAND', hint: '🏝️', zh: '島嶼 — 被水包圍的陸地', sentence: 'We built a base on the _____.' },
    { word: 'AVATAR', hint: '👤', zh: '角色 — 你在遊戲中的形象', sentence: 'Customize your _____.' },
    { word: 'REDSTONE', hint: '🔴', zh: '紅石 — 用來做電路的材料', sentence: '_____ powers the machine.' },
    { word: 'ENCHANT', hint: '✨', zh: '附魔 — 給裝備加上魔法', sentence: '_____ your sword for more damage.' },
    { word: 'FURNACE', hint: '🔥', zh: '熔爐 — 用來燒煉物品', sentence: 'Smelt iron in the _____.' },
    { word: 'PICKAXE', hint: '⛏️', zh: '鎬 — 挖礦的工具', sentence: 'Use a diamond _____.' },
    { word: 'SURVIVE', hint: '❤️', zh: '生存 — 活下去', sentence: 'Can you _____ the night?' },
    { word: 'EXPLORE', hint: '🗺️', zh: '探索 — 去發現新的地方', sentence: 'Let\'s _____ the caves.' },
  ],
  hard: [
    { word: 'ADVENTURE', hint: '⚔️', zh: '冒險 — 刺激的旅程', sentence: 'Start a new _____ mode.' },
    { word: 'INVENTORY', hint: '🎒', zh: '物品欄 — 存放你的物品', sentence: 'Check your _____ for supplies.' },
    { word: 'BIOME', hint: '🌍', zh: '生態系 — 不同的地形區域', sentence: 'The jungle _____ has parrots.' },
    { word: 'MULTIPLAYER', hint: '👥', zh: '多人遊戲', sentence: '_____ mode is more fun with friends.' },
    { word: 'ACHIEVEMENT', hint: '🏆', zh: '成就 — 完成特殊任務獲得', sentence: 'You unlocked a new _____!' },
    { word: 'EXPERIENCE', hint: '💫', zh: '經驗值 — 升級需要的點數', sentence: 'Gain _____ by defeating mobs.' },
    { word: 'CHALLENGE', hint: '🎯', zh: '挑戰 — 困難的任務', sentence: 'Accept the _____!' },
    { word: 'FORTRESS', hint: '🏰', zh: '堡壘 — 地獄中的建築', sentence: 'Find the nether _____.' },
    { word: 'SPECTATOR', hint: '👁️', zh: '旁觀者 — 只能看不能玩', sentence: 'Switch to _____ mode.' },
    { word: 'STRUCTURE', hint: '🏛️', zh: '結構 — 自然生成的建築', sentence: 'Discover a new _____.' },
    { word: 'DIMENSION', hint: '🌀', zh: '維度 — 不同的世界', sentence: 'Travel to another _____.' },
    { word: 'VILLAGER', hint: '👨‍🌾', zh: '村民 — NPC角色', sentence: 'The _____ sells enchanted books.' },
    { word: 'OBSIDIAN', hint: '⬛', zh: '黑曜石 — 最硬的方塊之一', sentence: '_____ is needed for the portal.' },
    { word: 'SKELETON', hint: '💀', zh: '骷髏 — 會射箭的怪物', sentence: 'A _____ shot me with an arrow!' },
    { word: 'TREASURE', hint: '💰', zh: '寶藏 — 藏起來的珍貴物品', sentence: 'Follow the map to find the _____.' },
  ]
};

const GRAMMAR_DATA = [
  {
    sentence: 'I _____ playing Minecraft right now.',
    blank: 'am',
    options: ['am', 'is', 'are', 'was'],
    explain: '主詞是 I，現在進行式用 am + V-ing',
    topic: '現在進行式'
  },
  {
    sentence: 'She _____ a diamond yesterday.',
    blank: 'found',
    options: ['find', 'found', 'finds', 'finding'],
    explain: 'yesterday 表示過去，動詞要用過去式 found',
    topic: '過去式'
  },
  {
    sentence: 'We _____ built a huge castle.',
    blank: 'have',
    options: ['have', 'has', 'had', 'having'],
    explain: '主詞 We 搭配 have + 過去分詞（現在完成式）',
    topic: '現在完成式'
  },
  {
    sentence: 'The creeper is _____ than the zombie.',
    blank: 'more dangerous',
    options: ['dangerous', 'more dangerous', 'most dangerous', 'dangerousest'],
    explain: '兩者比較用 more + 長形容詞',
    topic: '比較級'
  },
  {
    sentence: 'If I _____ enough iron, I will make armor.',
    blank: 'have',
    options: ['have', 'had', 'has', 'will have'],
    explain: 'If 條件句（第一條件）：If + 現在式, will + 原形',
    topic: '條件句'
  },
  {
    sentence: 'You should _____ before going to the Nether.',
    blank: 'prepare',
    options: ['prepare', 'prepares', 'prepared', 'preparing'],
    explain: 'should 後面接原形動詞',
    topic: '助動詞'
  },
  {
    sentence: 'There _____ many mobs in the cave.',
    blank: 'are',
    options: ['is', 'are', 'was', 'am'],
    explain: 'many mobs 是複數，用 there are',
    topic: 'There is/are'
  },
  {
    sentence: 'He _____ Roblox every day after school.',
    blank: 'plays',
    options: ['play', 'plays', 'played', 'playing'],
    explain: '主詞 He（第三人稱單數）+ every day（習慣）→ plays',
    topic: '現在簡單式'
  },
  {
    sentence: 'The sword was _____ by the blacksmith.',
    blank: 'made',
    options: ['make', 'made', 'making', 'makes'],
    explain: '被動語態：was + 過去分詞 (made)',
    topic: '被動語態'
  },
  {
    sentence: 'I want _____ a new world.',
    blank: 'to create',
    options: ['create', 'creating', 'to create', 'created'],
    explain: 'want 後面要接 to + 原形動詞',
    topic: '不定詞'
  },
  {
    sentence: 'This is the _____ sword in the game.',
    blank: 'strongest',
    options: ['strong', 'stronger', 'strongest', 'more strong'],
    explain: '三者以上的最高級：the + 最高級 (-est)',
    topic: '最高級'
  },
  {
    sentence: '_____ you ever been to the End?',
    blank: 'Have',
    options: ['Have', 'Has', 'Did', 'Do'],
    explain: '主詞 you + 現在完成式疑問句：Have you ever...?',
    topic: '現在完成式疑問句'
  },
  {
    sentence: 'He told me _____ he found a village.',
    blank: 'that',
    options: ['that', 'what', 'which', 'where'],
    explain: '名詞子句用 that 連接',
    topic: '名詞子句'
  },
  {
    sentence: 'I was mining _____ a creeper exploded.',
    blank: 'when',
    options: ['when', 'while', 'if', 'because'],
    explain: '「正在做某事時，突然...」用 when',
    topic: '時間連接詞'
  },
  {
    sentence: 'Neither the sword _____ the axe is strong enough.',
    blank: 'nor',
    options: ['or', 'nor', 'and', 'but'],
    explain: 'neither...nor 是固定搭配：既不...也不',
    topic: '對等連接詞'
  },
  {
    sentence: 'The house _____ I built is near the river.',
    blank: 'that',
    options: ['who', 'that', 'where', 'when'],
    explain: '關係代名詞修飾 house（物）用 that/which',
    topic: '關係子句'
  },
  {
    sentence: 'They _____ playing for three hours.',
    blank: 'have been',
    options: ['have been', 'has been', 'was', 'are'],
    explain: '現在完成進行式：have been + V-ing（持續動作）',
    topic: '現在完成進行式'
  },
  {
    sentence: 'If I _____ a diamond pickaxe, I would mine obsidian.',
    blank: 'had',
    options: ['have', 'had', 'has', 'having'],
    explain: '第二條件句（假設）：If + 過去式, would + 原形',
    topic: '假設語氣'
  },
  {
    sentence: 'Let\'s _____ a team and play together!',
    blank: 'form',
    options: ['form', 'forms', 'formed', 'forming'],
    explain: 'Let\'s 後面接原形動詞',
    topic: '祈使句'
  },
  {
    sentence: 'The game is _____ exciting _____ I can\'t stop playing.',
    blank: 'so...that',
    options: ['so...that', 'such...that', 'too...to', 'enough...to'],
    explain: 'so + 形容詞 + that：如此...以至於',
    topic: '結果子句'
  },
];

const VIDEO_LESSONS = [
  {
    title: 'How to Survive Your First Night in Minecraft',
    titleZh: '如何在 Minecraft 度過第一個夜晚',
    thumbnail: '🌙⛏️🏠',
    script: `Welcome to Minecraft! Your <span class="yt-highlight" data-word="goal">goal</span> is to <span class="yt-highlight" data-word="survive">survive</span> the first night. First, punch a tree to get <span class="yt-highlight" data-word="wood">wood</span>. Then, open your <span class="yt-highlight" data-word="inventory">inventory</span> and <span class="yt-highlight" data-word="craft">craft</span> wooden planks. Make a crafting table and build basic <span class="yt-highlight" data-word="tools">tools</span>: a pickaxe, a sword, and a shovel. Before sunset, find or build a <span class="yt-highlight" data-word="shelter">shelter</span>. Monsters <span class="yt-highlight" data-word="spawn">spawn</span> in the dark, so place <span class="yt-highlight" data-word="torches">torches</span> everywhere. If you see a creeper, run away <span class="yt-highlight" data-word="immediately">immediately</span>! Good luck, adventurer!`,
    vocab: [
      { word: 'goal', def: '目標' },
      { word: 'survive', def: '生存、活下來' },
      { word: 'wood', def: '木頭' },
      { word: 'inventory', def: '物品欄' },
      { word: 'craft', def: '合成、製作' },
      { word: 'tools', def: '工具' },
      { word: 'shelter', def: '避難所、庇護處' },
      { word: 'spawn', def: '生成、出現' },
      { word: 'torches', def: '火把' },
      { word: 'immediately', def: '立刻、馬上' },
    ],
    questions: [
      { q: 'What is the first thing you should do?', options: ['Build a house', 'Punch a tree', 'Find diamonds', 'Fight zombies'], answer: 1 },
      { q: 'Why should you place torches?', options: ['They look cool', 'To cook food', 'Monsters spawn in the dark', 'To find diamonds'], answer: 2 },
      { q: 'What should you do if you see a creeper?', options: ['Attack it', 'Feed it', 'Run away immediately', 'Ignore it'], answer: 2 },
    ]
  },
  {
    title: 'Top 5 Roblox Games for Beginners',
    titleZh: 'Roblox 新手必玩的 5 款遊戲',
    thumbnail: '🎮🏆5️⃣',
    script: `Today we're looking at the top five Roblox games for <span class="yt-highlight" data-word="beginners">beginners</span>. Number five: Adopt Me! This game lets you <span class="yt-highlight" data-word="adopt">adopt</span> and raise virtual pets. It's very <span class="yt-highlight" data-word="popular">popular</span> and easy to learn. Number four: Natural Disaster <span class="yt-highlight" data-word="Survival">Survival</span>. You must <span class="yt-highlight" data-word="escape">escape</span> from earthquakes, floods, and tornadoes! Number three: Tower of Hell. This is an <span class="yt-highlight" data-word="obstacle">obstacle</span> course where you climb towers. Number two: Brookhaven. A <span class="yt-highlight" data-word="roleplay">roleplay</span> game where you can be anything! And number one: Blox Fruits. <span class="yt-highlight" data-word="Explore">Explore</span> the ocean, find <span class="yt-highlight" data-word="powerful">powerful</span> fruits, and <span class="yt-highlight" data-word="defeat">defeat</span> enemies!`,
    vocab: [
      { word: 'beginners', def: '初學者、新手' },
      { word: 'adopt', def: '領養' },
      { word: 'popular', def: '受歡迎的' },
      { word: 'Survival', def: '生存' },
      { word: 'escape', def: '逃跑、逃脫' },
      { word: 'obstacle', def: '障礙物' },
      { word: 'roleplay', def: '角色扮演' },
      { word: 'Explore', def: '探索' },
      { word: 'powerful', def: '強大的' },
      { word: 'defeat', def: '擊敗' },
    ],
    questions: [
      { q: 'Which game is number one on the list?', options: ['Adopt Me', 'Tower of Hell', 'Blox Fruits', 'Brookhaven'], answer: 2 },
      { q: 'What do you do in Natural Disaster Survival?', options: ['Raise pets', 'Climb towers', 'Escape from disasters', 'Roleplay'], answer: 2 },
      { q: 'What kind of game is Brookhaven?', options: ['Racing game', 'Roleplay game', 'Fighting game', 'Puzzle game'], answer: 1 },
    ]
  },
  {
    title: 'Minecraft Redstone Basics Tutorial',
    titleZh: 'Minecraft 紅石基礎教學',
    thumbnail: '🔴⚡🔧',
    script: `Let's learn about <span class="yt-highlight" data-word="redstone">redstone</span>! Redstone is like <span class="yt-highlight" data-word="electricity">electricity</span> in Minecraft. You can use it to build amazing <span class="yt-highlight" data-word="machines">machines</span> and <span class="yt-highlight" data-word="automatic">automatic</span> farms. First, you need redstone <span class="yt-highlight" data-word="dust">dust</span>. Place it on the ground to create a <span class="yt-highlight" data-word="circuit">circuit</span>. Add a lever or button as a <span class="yt-highlight" data-word="switch">switch</span>. When you <span class="yt-highlight" data-word="activate">activate</span> the switch, the signal travels through the redstone. You can connect it to pistons, doors, or <span class="yt-highlight" data-word="dispensers">dispensers</span>. The <span class="yt-highlight" data-word="possibilities">possibilities</span> are endless! Start with simple circuits and work your way up to complex contraptions.`,
    vocab: [
      { word: 'redstone', def: '紅石' },
      { word: 'electricity', def: '電力' },
      { word: 'machines', def: '機器' },
      { word: 'automatic', def: '自動的' },
      { word: 'dust', def: '粉末' },
      { word: 'circuit', def: '電路' },
      { word: 'switch', def: '開關' },
      { word: 'activate', def: '啟動、開啟' },
      { word: 'dispensers', def: '發射器' },
      { word: 'possibilities', def: '可能性（複數）' },
    ],
    questions: [
      { q: 'What is redstone compared to?', options: ['Water', 'Fire', 'Electricity', 'Magic'], answer: 2 },
      { q: 'What do you need to start a redstone circuit?', options: ['Diamond', 'Redstone dust', 'Gold', 'Iron'], answer: 1 },
      { q: 'What can you use as a switch?', options: ['A sword', 'A lever or button', 'A torch', 'A block'], answer: 1 },
    ]
  },
  {
    title: 'How to Trade in Roblox Safely',
    titleZh: '如何安全地在 Roblox 交易',
    thumbnail: '🤝🔒💰',
    script: `Trading in Roblox can be fun, but you need to be <span class="yt-highlight" data-word="careful">careful</span>! First, never share your <span class="yt-highlight" data-word="password">password</span> with anyone. Scammers might <span class="yt-highlight" data-word="pretend">pretend</span> to be your friend. Always <span class="yt-highlight" data-word="verify">verify</span> the trade before you <span class="yt-highlight" data-word="accept">accept</span> it. Check the <span class="yt-highlight" data-word="value">value</span> of items on trusted websites. If a deal seems too good to be <span class="yt-highlight" data-word="true">true</span>, it probably is! Enable <span class="yt-highlight" data-word="two-factor">two-factor</span> authentication on your account. Report <span class="yt-highlight" data-word="suspicious">suspicious</span> players to keep the <span class="yt-highlight" data-word="community">community</span> safe. Remember: your account security is your responsibility!`,
    vocab: [
      { word: 'careful', def: '小心的' },
      { word: 'password', def: '密碼' },
      { word: 'pretend', def: '假裝' },
      { word: 'verify', def: '驗證、確認' },
      { word: 'accept', def: '接受' },
      { word: 'value', def: '價值' },
      { word: 'true', def: '真的' },
      { word: 'two-factor', def: '雙重（驗證）' },
      { word: 'suspicious', def: '可疑的' },
      { word: 'community', def: '社群' },
    ],
    questions: [
      { q: 'What should you never share?', options: ['Your game items', 'Your password', 'Your username', 'Your avatar'], answer: 1 },
      { q: 'What should you enable for security?', options: ['Dark mode', 'Two-factor authentication', 'Auto-trade', 'Guest mode'], answer: 1 },
      { q: 'What should you do with suspicious players?', options: ['Trade with them', 'Ignore them', 'Report them', 'Friend them'], answer: 2 },
    ]
  },
  {
    title: 'Building Your First Minecraft House',
    titleZh: '建造你的第一棟 Minecraft 房子',
    thumbnail: '🏠🪵🔨',
    script: `Ready to build your first house? Let's go! <span class="yt-highlight" data-word="Choose">Choose</span> a flat area near water. <span class="yt-highlight" data-word="Gather">Gather</span> materials: you'll need about 64 blocks of wood or <span class="yt-highlight" data-word="cobblestone">cobblestone</span>. Start by making the <span class="yt-highlight" data-word="foundation">foundation</span> — a 7 by 7 square on the ground. Build the <span class="yt-highlight" data-word="walls">walls</span> four blocks high. Leave <span class="yt-highlight" data-word="spaces">spaces</span> for windows and a door. For the <span class="yt-highlight" data-word="roof">roof</span>, use stairs blocks to create a nice shape. Add <span class="yt-highlight" data-word="furniture">furniture</span> inside: a bed, crafting table, and furnace. Don't forget to light up everything with torches so monsters don't spawn <span class="yt-highlight" data-word="inside">inside</span>! Your cozy home is <span class="yt-highlight" data-word="complete">complete</span>!`,
    vocab: [
      { word: 'Choose', def: '選擇' },
      { word: 'Gather', def: '收集' },
      { word: 'cobblestone', def: '鵝卵石、圓石' },
      { word: 'foundation', def: '地基' },
      { word: 'walls', def: '牆壁' },
      { word: 'spaces', def: '空間' },
      { word: 'roof', def: '屋頂' },
      { word: 'furniture', def: '家具' },
      { word: 'inside', def: '裡面' },
      { word: 'complete', def: '完成的' },
    ],
    questions: [
      { q: 'Where should you build your house?', options: ['In a cave', 'On a mountain', 'Near water on flat ground', 'In the Nether'], answer: 2 },
      { q: 'How high should you build the walls?', options: ['Two blocks', 'Three blocks', 'Four blocks', 'Five blocks'], answer: 2 },
      { q: 'Why do you need torches inside?', options: ['For decoration', 'To cook food', 'So monsters don\'t spawn', 'To see your items'], answer: 2 },
    ]
  },
];

const ACHIEVEMENTS = [
  { id: 'first_word', name: '初來乍到', desc: '完成第一個單字', icon: '🌱', condition: s => s.wordsLearned >= 1 },
  { id: 'ten_words', name: '字彙新手', desc: '學會 10 個單字', icon: '📖', condition: s => s.wordsLearned >= 10 },
  { id: 'fifty_words', name: '字彙達人', desc: '學會 50 個單字', icon: '📚', condition: s => s.wordsLearned >= 50 },
  { id: 'first_grammar', name: '文法起步', desc: '完成第一個文法題', icon: '✏️', condition: s => s.grammarPassed >= 1 },
  { id: 'ten_grammar', name: '文法勇者', desc: '通過 10 個文法關卡', icon: '📝', condition: s => s.grammarPassed >= 10 },
  { id: 'first_video', name: '觀影入門', desc: '完成第一個影片課程', icon: '📺', condition: s => s.videosCompleted >= 1 },
  { id: 'level5', name: '五級冒險者', desc: '達到等級 5', icon: '⭐', condition: s => s.level >= 5 },
  { id: 'level10', name: '十級勇者', desc: '達到等級 10', icon: '🌟', condition: s => s.level >= 10 },
  { id: 'streak3', name: '三日連勝', desc: '連續學習 3 天', icon: '🔥', condition: s => s.streak >= 3 },
  { id: 'streak7', name: '一週戰士', desc: '連續學習 7 天', icon: '💪', condition: s => s.streak >= 7 },
  { id: 'gems100', name: '百寶收藏家', desc: '累積 100 顆寶石', icon: '💎', condition: s => s.gems >= 100 },
  { id: 'perfect_grammar', name: '完美文法', desc: '一輪文法全部答對', icon: '🏅', condition: s => s.perfectGrammarRun },
];

const DAILY_QUESTS = [
  { id: 'dq_words', name: '學習 3 個新單字', desc: '在單字合成工坊學習 3 個單字', icon: '⛏️', target: 3, key: 'dailyWords' },
  { id: 'dq_grammar', name: '通過 3 個文法關卡', desc: '在文法跑酷中答對 3 題', icon: '🏃', target: 3, key: 'dailyGrammar' },
  { id: 'dq_video', name: '完成 1 個影片課程', desc: '看完一個影片並通過測驗', icon: '📺', target: 1, key: 'dailyVideos' },
];

const INVENTORY_ITEMS = [
  { id: 'wood_sword', name: '木劍', icon: '🗡️', desc: '初學者的武器' },
  { id: 'stone_pick', name: '石鎬', icon: '⛏️', desc: '挖掘知識的工具' },
  { id: 'iron_shield', name: '鐵盾', icon: '🛡️', desc: '保護你的英文基礎' },
  { id: 'gold_apple', name: '金蘋果', icon: '🍎', desc: '恢復學習動力' },
  { id: 'diamond_book', name: '鑽石書', icon: '📘', desc: '珍貴的知識結晶' },
  { id: 'enchant_scroll', name: '附魔卷軸', icon: '📜', desc: '強化你的能力' },
  { id: 'nether_star', name: '乙太之星', icon: '⭐', desc: '來自異世界的獎勵' },
  { id: 'totem', name: '不死圖騰', icon: '🗿', desc: '永不放棄的象徵' },
];
