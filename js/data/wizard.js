/* ===== Word Wizard data (單字魔法師) =====
   A Scribblenauts-style summon puzzle. The player spells an English word to
   summon that object into the scene; the object's TAGS decide what it can do.
   Levels never name a single right answer — they list OBSTACLES, and every
   tag in an obstacle's `solve` list is a genuinely different way through.
   That is the whole point: a wider vocabulary literally means more solutions.

   - WIZARD_TAGS      12 abilities an object can have
   - WIZARD_OBSTACLES 8 blockers, each with the tags that beat it
   - WIZARD_WORDS     summonable objects { w, zh, e, tags, lv }
   - WIZARD_CHAPTERS  5 scene themes (sky/ground colours for the canvas)
   - WIZARD_LEVELS    30 levels, 6 per chapter,每章最後一關是雙重難關
   - WIZARD_UNLOCK    how many cleared levels unlock each word tier
*/

// ===== Abilities =====
// `verb` is the one-line Chinese explanation shown on the word card and in
// the spellbook's ability filter.
const WIZARD_TAGS = {
  float: { name: '會浮', icon: '🌊', verb: '浮在水面上，可以踩著過去' },
  heavy: { name: '很重', icon: '🪨', verb: '沉下去，把坑洞填平' },
  long:  { name: '很長', icon: '📏', verb: '橫著架過去，變成一座橋' },
  fly:   { name: '會飛', icon: '🎈', verb: '帶著小巫師飛過去' },
  climb: { name: '能爬', icon: '🪜', verb: '靠著它爬上去或爬過去' },
  fire:  { name: '有火', icon: '🔥', verb: '燒掉擋路的東西，也會發亮' },
  water: { name: '有水', icon: '💧', verb: '把火澆熄' },
  cut:   { name: '能切', icon: '✂️', verb: '切斷繩子、藤蔓和鎖' },
  food:  { name: '是食物', icon: '🍎', verb: '餵飽肚子餓的怪獸' },
  light: { name: '會亮', icon: '💡', verb: '照亮黑漆漆的地方' },
  cold:  { name: '冰冷', icon: '🧊', verb: '把水結成冰，也能滅火' },
  key:   { name: '能開鎖', icon: '🔑', verb: '打開鎖住的門' },
};

// ===== Obstacles =====
// `solve` is the full list of tags that get past this obstacle — the level's
// star targets are derived from it, so adding a tag here adds a solution to
// every level that uses this obstacle.
const WIZARD_OBSTACLES = {
  river:   { name: '河流', icon: '🌊', zh: '又寬又急的河擋在前面',
             solve: ['float', 'long', 'fly', 'cold'],
             tip: '水上要有東西可以踩，或是架一座橋，不然就飛過去、把水凍起來！' },
  pit:     { name: '深坑', icon: '🕳️', zh: '一個深不見底的大坑',
             solve: ['heavy', 'long', 'fly', 'climb'],
             tip: '丟重的東西把坑填平，或架長長的東西跨過去，也可以飛過去、爬下去再爬上來。' },
  wall:    { name: '高牆', icon: '🧱', zh: '一面爬不上去的高牆',
             solve: ['climb', 'fly', 'long'],
             tip: '找可以爬的東西靠著牆，或是會飛的東西，長長的東西也能當斜坡！' },
  flame:   { name: '火牆', icon: '🔥', zh: '燒得正旺的火焰擋住去路',
             solve: ['water', 'cold', 'fly'],
             tip: '用水澆熄它，用冰冷的東西凍熄它，或是從上面飛過去。' },
  rope:    { name: '藤網', icon: '🕸️', zh: '纏成一片的藤蔓網',
             solve: ['cut', 'fire', 'climb'],
             tip: '把它切斷、燒掉，或者……乾脆爬過去！' },
  monster: { name: '餓怪獸', icon: '👹', zh: '肚子餓得咕嚕叫的怪獸',
             solve: ['food', 'fire', 'fly'],
             tip: '餵牠吃東西牠就讓路，或用火嚇跑牠，也可以從牠頭上飛過去。' },
  dark:    { name: '黑暗', icon: '🌑', zh: '伸手不見五指的漆黑',
             solve: ['light', 'fire'],
             tip: '需要會發亮的東西，有火的東西也會亮！' },
  lock:    { name: '鎖住的門', icon: '🔒', zh: '掛著一把大鎖的門',
             solve: ['key', 'cut', 'heavy'],
             tip: '用鑰匙開、把鎖剪斷，或用很重的東西砸開它！' },
};

// ===== Summonable objects =====
// lv = which spellbook tier the word lives in (see WIZARD_UNLOCK).
// Every tag has at least 2 words at lv 1 so no early level can dead-end.
const WIZARD_WORDS = [
  // ---- 會浮 float ----
  { w: 'boat',       zh: '小船',     e: '⛵', tags: ['float'], lv: 1 },
  { w: 'duck',       zh: '鴨子',     e: '🦆', tags: ['float'], lv: 1 },
  { w: 'ball',       zh: '球',       e: '⚽', tags: ['float'], lv: 1 },
  { w: 'raft',       zh: '木筏',     e: '🛟', tags: ['float'], lv: 2 },
  { w: 'leaf',       zh: '葉子',     e: '🍃', tags: ['float'], lv: 2 },
  { w: 'turtle',     zh: '烏龜',     e: '🐢', tags: ['float'], lv: 2 },
  { w: 'log',        zh: '木頭',     e: '🪵', tags: ['float', 'long'], lv: 2 },
  { w: 'ship',       zh: '大船',     e: '🚢', tags: ['float'], lv: 3 },
  { w: 'bottle',     zh: '瓶子',     e: '🧴', tags: ['float'], lv: 3 },
  { w: 'door',       zh: '門',       e: '🚪', tags: ['float', 'long'], lv: 3 },
  { w: 'skateboard', zh: '滑板',     e: '🛹', tags: ['float'], lv: 3 },
  { w: 'crocodile',  zh: '鱷魚',     e: '🐊', tags: ['float', 'long', 'cut'], lv: 3 },
  { w: 'canoe',      zh: '獨木舟',   e: '🛶', tags: ['float'], lv: 4 },
  { w: 'swan',       zh: '天鵝',     e: '🦢', tags: ['float', 'fly'], lv: 4 },
  { w: 'bed',        zh: '床',       e: '🛏️', tags: ['float', 'long'], lv: 4 },
  { w: 'barrel',     zh: '木桶',     e: '🛢️', tags: ['float'], lv: 5 },

  // ---- 很重 heavy ----
  { w: 'rock',       zh: '石頭',     e: '🪨', tags: ['heavy'], lv: 1 },
  { w: 'brick',      zh: '磚頭',     e: '🧱', tags: ['heavy'], lv: 1 },
  { w: 'box',        zh: '箱子',     e: '📦', tags: ['heavy'], lv: 1 },
  { w: 'anchor',     zh: '錨',       e: '⚓', tags: ['heavy'], lv: 2 },
  { w: 'elephant',   zh: '大象',     e: '🐘', tags: ['heavy'], lv: 2 },
  { w: 'horse',      zh: '馬',       e: '🐴', tags: ['heavy'], lv: 2 },
  { w: 'bear',       zh: '熊',       e: '🐻', tags: ['heavy'], lv: 3 },
  { w: 'hippo',      zh: '河馬',     e: '🦛', tags: ['heavy'], lv: 3 },
  { w: 'car',        zh: '汽車',     e: '🚗', tags: ['heavy'], lv: 3 },
  { w: 'truck',      zh: '卡車',     e: '🚚', tags: ['heavy'], lv: 4 },
  { w: 'piano',      zh: '鋼琴',     e: '🎹', tags: ['heavy'], lv: 4 },
  { w: 'tent',       zh: '帳篷',     e: '⛺', tags: ['heavy'], lv: 4 },
  { w: 'dinosaur',   zh: '恐龍',     e: '🦕', tags: ['heavy', 'long'], lv: 4 },
  { w: 'statue',     zh: '石像',     e: '🗿', tags: ['heavy'], lv: 5 },
  { w: 'rhino',      zh: '犀牛',     e: '🦏', tags: ['heavy'], lv: 5 },

  // ---- 很長 long ----
  { w: 'ladder',     zh: '梯子',     e: '🪜', tags: ['long', 'climb'], lv: 1 },
  { w: 'stick',      zh: '棍子',     e: '🥢', tags: ['long'], lv: 1 },
  { w: 'pencil',     zh: '鉛筆',     e: '✏️', tags: ['long'], lv: 1 },
  { w: 'ruler',      zh: '尺',       e: '📏', tags: ['long'], lv: 1 },
  { w: 'bone',       zh: '骨頭',     e: '🦴', tags: ['long'], lv: 2 },
  { w: 'bridge',     zh: '橋',       e: '🌉', tags: ['long'], lv: 2 },
  { w: 'tree',       zh: '樹',       e: '🌲', tags: ['long', 'climb'], lv: 2 },
  { w: 'rope',       zh: '繩子',     e: '🪢', tags: ['long', 'climb'], lv: 2 },
  { w: 'snake',      zh: '蛇',       e: '🐍', tags: ['long'], lv: 3 },
  { w: 'sword',      zh: '劍',       e: '🗡️', tags: ['long', 'cut'], lv: 3 },
  { w: 'octopus',    zh: '章魚',     e: '🐙', tags: ['long', 'climb'], lv: 3 },
  { w: 'chain',      zh: '鐵鍊',     e: '⛓️', tags: ['long', 'climb'], lv: 4 },
  { w: 'giraffe',    zh: '長頸鹿',   e: '🦒', tags: ['long', 'climb'], lv: 4 },
  { w: 'flute',      zh: '笛子',     e: '🪈', tags: ['long'], lv: 4 },
  { w: 'train',      zh: '火車',     e: '🚂', tags: ['long', 'heavy'], lv: 5 },

  // ---- 會飛 fly ----
  { w: 'balloon',    zh: '氣球',     e: '🎈', tags: ['fly'], lv: 1 },
  { w: 'bird',       zh: '小鳥',     e: '🐦', tags: ['fly'], lv: 1 },
  { w: 'kite',       zh: '風箏',     e: '🪁', tags: ['fly'], lv: 1 },
  { w: 'plane',      zh: '飛機',     e: '✈️', tags: ['fly'], lv: 2 },
  { w: 'broom',      zh: '掃把',     e: '🧹', tags: ['fly'], lv: 2 },
  { w: 'eagle',      zh: '老鷹',     e: '🦅', tags: ['fly'], lv: 2 },
  { w: 'butterfly',  zh: '蝴蝶',     e: '🦋', tags: ['fly'], lv: 2 },
  { w: 'umbrella',   zh: '雨傘',     e: '☂️', tags: ['fly', 'water'], lv: 2 },
  { w: 'cloud',      zh: '雲',       e: '☁️', tags: ['fly', 'water'], lv: 2 },
  { w: 'dragon',     zh: '龍',       e: '🐉', tags: ['fly', 'fire'], lv: 3 },
  { w: 'helicopter', zh: '直升機',   e: '🚁', tags: ['fly'], lv: 3 },
  { w: 'rocket',     zh: '火箭',     e: '🚀', tags: ['fly', 'fire'], lv: 3 },
  { w: 'bat',        zh: '蝙蝠',     e: '🦇', tags: ['fly'], lv: 4 },
  { w: 'parrot',     zh: '鸚鵡',     e: '🦜', tags: ['fly'], lv: 4 },
  { w: 'wind',       zh: '風',       e: '💨', tags: ['fly', 'cold'], lv: 4 },
  { w: 'angel',      zh: '天使',     e: '👼', tags: ['fly'], lv: 5 },
  { w: 'ghost',      zh: '幽靈',     e: '👻', tags: ['fly'], lv: 5 },

  // ---- 能爬 climb ----
  { w: 'cat',        zh: '貓',       e: '🐱', tags: ['climb'], lv: 1 },
  { w: 'vine',       zh: '藤蔓',     e: '🌿', tags: ['climb'], lv: 2 },
  { w: 'monkey',     zh: '猴子',     e: '🐒', tags: ['climb'], lv: 2 },
  { w: 'net',        zh: '網子',     e: '🥅', tags: ['climb'], lv: 3 },
  { w: 'spider',     zh: '蜘蛛',     e: '🕷️', tags: ['climb'], lv: 3 },
  { w: 'squirrel',   zh: '松鼠',     e: '🐿️', tags: ['climb'], lv: 3 },

  // ---- 有火 fire ----
  { w: 'fire',       zh: '火',       e: '🔥', tags: ['fire', 'light'], lv: 1 },
  { w: 'torch',      zh: '火把',     e: '🪔', tags: ['fire', 'light'], lv: 1 },
  { w: 'candle',     zh: '蠟燭',     e: '🕯️', tags: ['fire', 'light'], lv: 1 },
  { w: 'sun',        zh: '太陽',     e: '☀️', tags: ['fire', 'light'], lv: 2 },
  { w: 'chili',      zh: '辣椒',     e: '🌶️', tags: ['fire', 'food'], lv: 3 },
  { w: 'lava',       zh: '岩漿',     e: '🌋', tags: ['fire'], lv: 4 },
  { w: 'firework',   zh: '煙火',     e: '🎆', tags: ['fire', 'light'], lv: 4 },
  { w: 'firecracker', zh: '鞭炮',    e: '🧨', tags: ['fire', 'key'], lv: 4 },
  { w: 'lightning',  zh: '閃電',     e: '⚡', tags: ['fire', 'light', 'cut'], lv: 5 },

  // ---- 有水 water ----
  { w: 'water',      zh: '水',       e: '💧', tags: ['water'], lv: 1 },
  { w: 'rain',       zh: '雨',       e: '🌧️', tags: ['water'], lv: 1 },
  { w: 'bucket',     zh: '水桶',     e: '🪣', tags: ['water'], lv: 1 },
  { w: 'wave',       zh: '海浪',     e: '🌊', tags: ['water'], lv: 2 },
  { w: 'juice',      zh: '果汁',     e: '🧃', tags: ['water', 'food'], lv: 2 },
  { w: 'milk',       zh: '牛奶',     e: '🥛', tags: ['water', 'food'], lv: 2 },
  { w: 'soup',       zh: '湯',       e: '🍲', tags: ['water', 'food'], lv: 3 },
  { w: 'shower',     zh: '蓮蓬頭',   e: '🚿', tags: ['water'], lv: 3 },
  { w: 'fountain',   zh: '噴泉',     e: '⛲', tags: ['water'], lv: 4 },

  // ---- 能切 cut ----
  { w: 'knife',      zh: '刀子',     e: '🔪', tags: ['cut'], lv: 1 },
  { w: 'scissors',   zh: '剪刀',     e: '✂️', tags: ['cut'], lv: 1 },
  { w: 'axe',        zh: '斧頭',     e: '🪓', tags: ['cut'], lv: 2 },
  { w: 'saw',        zh: '鋸子',     e: '🪚', tags: ['cut'], lv: 2 },
  { w: 'crab',       zh: '螃蟹',     e: '🦀', tags: ['cut'], lv: 3 },
  { w: 'shark',      zh: '鯊魚',     e: '🦈', tags: ['cut'], lv: 4 },
  { w: 'teeth',      zh: '牙齒',     e: '🦷', tags: ['cut'], lv: 4 },

  // ---- 是食物 food ----
  { w: 'apple',      zh: '蘋果',     e: '🍎', tags: ['food'], lv: 1 },
  { w: 'cake',       zh: '蛋糕',     e: '🎂', tags: ['food'], lv: 1 },
  { w: 'pizza',      zh: '披薩',     e: '🍕', tags: ['food'], lv: 1 },
  { w: 'bread',      zh: '麵包',     e: '🍞', tags: ['food'], lv: 1 },
  { w: 'banana',     zh: '香蕉',     e: '🍌', tags: ['food'], lv: 1 },
  { w: 'cookie',     zh: '餅乾',     e: '🍪', tags: ['food'], lv: 2 },
  { w: 'burger',     zh: '漢堡',     e: '🍔', tags: ['food'], lv: 2 },
  { w: 'candy',      zh: '糖果',     e: '🍬', tags: ['food'], lv: 2 },
  { w: 'cheese',     zh: '起司',     e: '🧀', tags: ['food'], lv: 2 },
  { w: 'fish',       zh: '魚',       e: '🐟', tags: ['food'], lv: 2 },
  { w: 'mushroom',   zh: '蘑菇',     e: '🍄', tags: ['food'], lv: 2 },
  { w: 'carrot',     zh: '紅蘿蔔',   e: '🥕', tags: ['food'], lv: 2 },
  { w: 'meat',       zh: '肉',       e: '🍖', tags: ['food'], lv: 3 },
  { w: 'noodles',    zh: '麵',       e: '🍜', tags: ['food'], lv: 3 },
  { w: 'donut',      zh: '甜甜圈',   e: '🍩', tags: ['food'], lv: 3 },
  { w: 'corn',       zh: '玉米',     e: '🌽', tags: ['food'], lv: 4 },
  { w: 'honey',      zh: '蜂蜜',     e: '🍯', tags: ['food'], lv: 4 },
  { w: 'egg',        zh: '蛋',       e: '🥚', tags: ['food'], lv: 4 },
  { w: 'watermelon', zh: '西瓜',     e: '🍉', tags: ['food', 'heavy'], lv: 5 },

  // ---- 會亮 light ----
  { w: 'lamp',       zh: '燈',       e: '💡', tags: ['light'], lv: 1 },
  { w: 'flashlight', zh: '手電筒',   e: '🔦', tags: ['light'], lv: 1 },
  { w: 'moon',       zh: '月亮',     e: '🌙', tags: ['light'], lv: 2 },
  { w: 'phone',      zh: '手機',     e: '📱', tags: ['light'], lv: 2 },
  { w: 'rainbow',    zh: '彩虹',     e: '🌈', tags: ['light', 'long'], lv: 3 },
  { w: 'diamond',    zh: '鑽石',     e: '💎', tags: ['light'], lv: 3 },
  { w: 'crystal',    zh: '水晶球',   e: '🔮', tags: ['light'], lv: 4 },

  // ---- 冰冷 cold ----
  { w: 'ice',        zh: '冰塊',     e: '🧊', tags: ['cold', 'float'], lv: 1 },
  { w: 'snow',       zh: '雪',       e: '❄️', tags: ['cold'], lv: 1 },
  { w: 'snowman',    zh: '雪人',     e: '⛄', tags: ['cold'], lv: 2 },
  { w: 'penguin',    zh: '企鵝',     e: '🐧', tags: ['cold'], lv: 2 },
  { w: 'iceberg',    zh: '冰山',     e: '🏔️', tags: ['cold', 'float'], lv: 3 },
  { w: 'popsicle',   zh: '剉冰',     e: '🍧', tags: ['cold', 'food'], lv: 3 },
  { w: 'icecream',   zh: '冰淇淋',   e: '🍦', tags: ['cold', 'food'], lv: 3 },
  { w: 'yeti',       zh: '雪怪',     e: '🧌', tags: ['cold'], lv: 5 },

  // ---- 能開鎖 key ----
  { w: 'key',        zh: '鑰匙',     e: '🔑', tags: ['key'], lv: 1 },
  { w: 'spoon',      zh: '湯匙',     e: '🥄', tags: ['key'], lv: 1 },
  { w: 'hammer',     zh: '鎚子',     e: '🔨', tags: ['key', 'heavy'], lv: 2 },
  { w: 'magnet',     zh: '磁鐵',     e: '🧲', tags: ['key'], lv: 3 },
  { w: 'card',       zh: '卡片',     e: '💳', tags: ['key'], lv: 3 },
  { w: 'screwdriver', zh: '螺絲起子', e: '🪛', tags: ['key'], lv: 3 },
  { w: 'robot',      zh: '機器人',   e: '🤖', tags: ['key', 'heavy'], lv: 4 },
  { w: 'crown',      zh: '皇冠',     e: '👑', tags: ['key'], lv: 5 },
  // 全能彩蛋：五種能力一次到位，最後一頁才解鎖
  { w: 'wizard',     zh: '魔法師',   e: '🧙', tags: ['key', 'fly', 'fire', 'light', 'cut'], lv: 5 },
];

// 清了幾關之後，魔法書的第 N 頁（lv N 的單字）才會解鎖
const WIZARD_UNLOCK = { 1: 0, 2: 4, 3: 10, 4: 17, 5: 24 };

// ===== Scene themes (one per chapter) =====
const WIZARD_CHAPTERS = [
  { id: 1, name: '翠綠森林', icon: '🌳', sky: ['#8fd6ff', '#d9f5c9'], ground: '#5aa74a', deep: '#3d7a33', deco: ['🌳', '🌿', '🍄', '🦋'] },
  { id: 2, name: '幽暗洞窟', icon: '🕯️', sky: ['#2b2a45', '#4a3f6b'], ground: '#6b5a45', deep: '#43382a', deco: ['🪨', '💎', '🦇', '🕸️'] },
  { id: 3, name: '古老城堡', icon: '🏰', sky: ['#5b6ea8', '#b7a6d6'], ground: '#8a8fa3', deep: '#5f6373', deco: ['🏰', '🛡️', '🕯️', '🚩'] },
  { id: 4, name: '雲端天空', icon: '☁️', sky: ['#7ec8ff', '#ffe9b0'], ground: '#e8f3ff', deep: '#b9d8f2', deco: ['☁️', '🌤️', '🕊️', '⭐'] },
  { id: 5, name: '祕密實驗室', icon: '🧪', sky: ['#1f2a3a', '#2f6d7a'], ground: '#4a5568', deep: '#2d3440', deco: ['🧪', '⚗️', '🔌', '🤖'] },
];

// ===== Levels =====
// `obs` lists the obstacles between the wizard and the ⭐, left to right.
// Solution tags (and therefore the star targets) come from WIZARD_OBSTACLES.
const WIZARD_LEVELS = [
  // ---- 第 1 章 翠綠森林 ----
  { id: 'w1',  ch: 1, name: '過小溪',       obs: ['river'],            intro: '小巫師想去對面的草地摘星星，可是溪水好深！' },
  { id: 'w2',  ch: 1, name: '大坑洞',       obs: ['pit'],              intro: '路中間破了一個大洞，掉下去可就麻煩了。' },
  { id: 'w3',  ch: 1, name: '石頭牆',       obs: ['wall'],             intro: '一面比小巫師還高好幾倍的石牆擋在前面。' },
  { id: 'w4',  ch: 1, name: '藤蔓擋路',     obs: ['rope'],             intro: '整片藤蔓把小路封死了，得想辦法穿過去。' },
  { id: 'w5',  ch: 1, name: '肚子餓的森林怪', obs: ['monster'],        intro: '森林怪擋在路中間，肚子餓得咕嚕咕嚕叫。' },
  { id: 'w6',  ch: 1, name: '森林的出口',   obs: ['river', 'pit'],     intro: '出口就在前面！可是先有一條河，河的後面還有一個大坑。', boss: true },

  // ---- 第 2 章 幽暗洞窟 ----
  { id: 'w7',  ch: 2, name: '黑漆漆的洞口', obs: ['dark'],             intro: '洞裡黑得什麼都看不見，小巫師不敢往前走。' },
  { id: 'w8',  ch: 2, name: '地底裂縫',     obs: ['pit'],              intro: '地面裂開一道又深又黑的縫。' },
  { id: 'w9',  ch: 2, name: '巨大蜘蛛網',   obs: ['rope'],             intro: '一張比人還大的蜘蛛網黏在通道上。' },
  { id: 'w10', ch: 2, name: '地下暗河',     obs: ['river'],            intro: '洞窟深處流著一條冰冷的地下河。' },
  { id: 'w11', ch: 2, name: '岩漿溝',       obs: ['flame'],            intro: '滾燙的岩漿從地縫冒出來，熱得靠近不了。' },
  { id: 'w12', ch: 2, name: '洞窟最深處',   obs: ['dark', 'river'],    intro: '最深處又黑又有暗河，要先看得見、再過得去。', boss: true },

  // ---- 第 3 章 古老城堡 ----
  { id: 'w13', ch: 3, name: '護城河',       obs: ['river'],            intro: '城堡外圍是一圈又寬又深的護城河。' },
  { id: 'w14', ch: 3, name: '城堡大門',     obs: ['lock'],             intro: '大門上掛著一把生鏽的大鎖。' },
  { id: 'w15', ch: 3, name: '守門怪獸',     obs: ['monster'],          intro: '守門的大怪獸擋在走廊上，看起來餓壞了。' },
  { id: 'w16', ch: 3, name: '火把走廊',     obs: ['flame'],            intro: '走廊兩側的火焰燒成一道火牆。' },
  { id: 'w17', ch: 3, name: '高高的城牆',   obs: ['wall'],             intro: '通往塔頂的城牆又直又滑。' },
  { id: 'w18', ch: 3, name: '王座之間',     obs: ['lock', 'monster'],  intro: '王座前有一道鎖住的門，門後還有一隻怪獸在等著。', boss: true },

  // ---- 第 4 章 雲端天空 ----
  { id: 'w19', ch: 4, name: '雲朵斷層',     obs: ['pit'],              intro: '雲朵之間破了一個大洞，下面什麼都沒有。' },
  { id: 'w20', ch: 4, name: '天空之牆',     obs: ['wall'],             intro: '一道白色的雲牆高高聳立。' },
  { id: 'w21', ch: 4, name: '風之網',       obs: ['rope'],             intro: '被風纏成一團的雲絲網擋住了去路。' },
  { id: 'w22', ch: 4, name: '無邊雲海',     obs: ['river'],            intro: '眼前是一片望不到底的雲海。' },
  { id: 'w23', ch: 4, name: '太陽的火焰',   obs: ['flame'],            intro: '離太陽太近了，前面燒起一片火焰。' },
  { id: 'w24', ch: 4, name: '天空神殿',     obs: ['wall', 'flame'],    intro: '神殿的高牆後面還有一道火焰結界。', boss: true },

  // ---- 第 5 章 祕密實驗室 ----
  { id: 'w25', ch: 5, name: '電子鎖',       obs: ['lock'],             intro: '實驗室的門用電子鎖鎖得死死的。' },
  { id: 'w26', ch: 5, name: '停電的走廊',   obs: ['dark'],             intro: '停電了，整條走廊黑得像墨水。' },
  { id: 'w27', ch: 5, name: '廢料坑',       obs: ['pit'],              intro: '地板塌了一塊，下面是深深的廢料坑。' },
  { id: 'w28', ch: 5, name: '實驗怪獸',     obs: ['monster'],          intro: '從培養槽跑出來的怪獸，餓得直流口水。' },
  { id: 'w29', ch: 5, name: '雷射網',       obs: ['rope'],             intro: '一整面交錯的雷射網封住了通道。' },
  { id: 'w30', ch: 5, name: '最終實驗室',   obs: ['lock', 'dark', 'river'], intro: '最後一關！鎖住的門、漆黑的房間、還有一池冷卻液。撐過去就是大魔法師了！', boss: true },
];
