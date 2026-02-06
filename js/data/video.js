// Video lesson data for YouTube-themed reading comprehension
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
