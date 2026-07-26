/* ===== Word Wizard data (單字魔法師) =====
   A Scribblenauts-style summon puzzle. The player spells an English word to
   summon that object into the scene; the object's TAGS decide what it can do.
   Levels never name a single right answer — they list OBSTACLES, and every
   tag in an obstacle's `solve` list is a genuinely different way through.
   That is the whole point: a wider vocabulary literally means more solutions.

   - WIZARD_TAGS      12 abilities an object can have
   - WIZARD_CATS      7 categories — what KIND of thing a word is
   - WIZARD_OBSTACLES 8 blockers, each with the tags that beat it
   - WIZARD_WORDS     summonable objects { w, zh, e, tags, cat, lv }
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

// ===== Categories =====
// What KIND of thing a word is. The spellbook browses by this — deliberately
// not by ability, because "show me everything that floats" is the puzzle's
// answer and handing it over leaves nothing to work out.
const WIZARD_CATS = {
  animal:  { name: '動物',     icon: '🐾' },
  food:    { name: '食物',     icon: '🍕' },
  tool:    { name: '工具',     icon: '🔧' },
  nature:  { name: '大自然',   icon: '🌿' },
  vehicle: { name: '交通工具', icon: '🚗' },
  magic:   { name: '魔法',     icon: '✨' },
  stuff:   { name: '物品',     icon: '🧸' },
};

// ===== Obstacles =====
// `solve` is the full list of tags that get past this obstacle — the level's
// star targets are derived from it, so adding a tag here adds a solution to
// every level that uses this obstacle.
//
// `tip` describes the SITUATION and never the answer; it is always on screen.
// `hint` is the list of ways through and only appears behind the 「💡 想不出來」
// button, which costs a star. The first version put the whole hint in `tip`,
// which turned every level into "read the answer, tap a card".
//
// W3 side effects. `react` says what a scene-wide element does to this
// obstacle even when the wizard isn't standing in front of it yet:
//   flammable  fire anywhere burns it away
//   freezable  cold anywhere freezes it solid
//   douseable  water anywhere puts it out
//   lightable  any light anywhere reveals it
// `badge` is the marker drawn on the obstacle so a child can SEE which ones
// will react before they act — the chain has to be predictable, not a surprise.
const WIZARD_OBSTACLES = {
  river:   { name: '河流', icon: '🌊', zh: '又寬又急的河擋在前面',
             solve: ['float', 'long', 'fly', 'cold'],
             freezable: true, badge: '💧',
             tip: '河水又深又急，小巫師不會游泳，一下水就會被沖走。',
             hint: '水上要有東西可以踩，或是架一座橋，不然就飛過去、把水凍起來！' },
  // No `climb` here: with real physics a ladder is not wide enough to get
  // anyone across a pit, and the game must not offer a solution it won't honour.
  pit:     { name: '深坑', icon: '🕳️', zh: '一個深不見底的大坑',
             solve: ['heavy', 'long', 'fly'],
             tip: '坑又深又黑，看不到底，跳過去一定跳不過。',
             hint: '丟很重的東西把坑填平，或架長長的東西跨過去，也可以直接飛過去。' },
  wall:    { name: '高牆', icon: '🧱', zh: '一面爬不上去的高牆',
             solve: ['climb', 'fly', 'long'],
             tip: '牆比小巫師高好幾倍，表面又滑又平，手抓不到任何東西。',
             hint: '找可以爬的東西靠著牆，或是會飛的東西，長長的東西也能當斜坡！' },
  flame:   { name: '火牆', icon: '🔥', zh: '燒得正旺的火焰擋住去路',
             solve: ['water', 'cold', 'fly'],
             douseable: true, badge: '💦', glows: true,
             tip: '火燒得又高又燙，站在三步外就熱得受不了。',
             hint: '用水澆熄它，用冰冷的東西凍熄它，或是從上面飛過去。' },
  rope:    { name: '藤網', icon: '🕸️', zh: '纏成一片的藤蔓網',
             solve: ['cut', 'fire', 'climb'],
             flammable: true, badge: '🪵',
             tip: '藤蔓一條纏著一條，乾得像柴一樣，用手扯根本扯不開。',
             hint: '把它切斷、燒掉，或者……乾脆爬過去！' },
  monster: { name: '餓怪獸', icon: '👹', zh: '肚子餓得咕嚕叫的怪獸',
             solve: ['food', 'fire', 'fly'],
             tip: '怪獸坐在路中間，肚子咕嚕咕嚕叫，眼睛一直盯著小巫師看。',
             hint: '餵牠吃東西牠就讓路，或用火嚇跑牠，也可以從牠頭上飛過去。' },
  dark:    { name: '黑暗', icon: '🌑', zh: '伸手不見五指的漆黑',
             solve: ['light', 'fire'],
             lightable: true, badge: '💡',
             tip: '前面黑得伸手不見五指，再走一步就不知道會踩到什麼。',
             hint: '需要會發亮的東西，有火的東西也會亮！' },
  lock:    { name: '鎖住的門', icon: '🔒', zh: '掛著一把大鎖的門',
             solve: ['key', 'cut', 'heavy'],
             tip: '門上掛著一把又大又重的鎖，推也推不開、踢也踢不動。',
             hint: '用鑰匙開、把鎖剪斷，或用很重的東西砸開它！' },
};

// Which scene-wide element clears which marked obstacle, and with what tag.
// Every `tag` here must appear in that obstacle's own `solve` list — a chain
// is a real solution arriving for free, not a special case.
const WIZARD_REACTS = {
  fire:  { prop: 'flammable', tag: 'fire',  verb: '也一起燒掉了' },
  cold:  { prop: 'freezable', tag: 'cold',  verb: '也結成冰了' },
  water: { prop: 'douseable', tag: 'water', verb: '也被澆熄了' },
  light: { prop: 'lightable', tag: 'light', verb: '也被照亮了' },
};

// ===== Summonable objects =====
// lv = which spellbook tier the word lives in (see WIZARD_UNLOCK).
// Every tag has at least 2 words at lv 1 so no early level can dead-end.
const WIZARD_WORDS = [
  // ---- 會浮 float ----
  { w: 'boat',       zh: '小船',     e: '⛵', tags: ['float'], cat: 'vehicle', lv: 1 },
  { w: 'duck',       zh: '鴨子',     e: '🦆', tags: ['float'], cat: 'animal', lv: 1 },
  { w: 'ball',       zh: '球',       e: '⚽', tags: ['float'], cat: 'stuff', lv: 1 },
  { w: 'raft',       zh: '木筏',     e: '🛟', tags: ['float'], cat: 'vehicle', lv: 2 },
  { w: 'leaf',       zh: '葉子',     e: '🍃', tags: ['float'], cat: 'nature', lv: 2 },
  { w: 'turtle',     zh: '烏龜',     e: '🐢', tags: ['float'], cat: 'animal', lv: 2 },
  { w: 'log',        zh: '木頭',     e: '🪵', tags: ['float', 'long'], cat: 'nature', lv: 2 },
  { w: 'ship',       zh: '大船',     e: '🚢', tags: ['float'], cat: 'vehicle', lv: 3 },
  { w: 'bottle',     zh: '瓶子',     e: '🧴', tags: ['float'], cat: 'stuff', lv: 3 },
  { w: 'door',       zh: '門',       e: '🚪', tags: ['float', 'long'], cat: 'stuff', lv: 3 },
  { w: 'skateboard', zh: '滑板',     e: '🛹', tags: ['float'], cat: 'vehicle', lv: 3 },
  { w: 'crocodile',  zh: '鱷魚',     e: '🐊', tags: ['float', 'long', 'cut'], cat: 'animal', lv: 3 },
  { w: 'canoe',      zh: '獨木舟',   e: '🛶', tags: ['float'], cat: 'vehicle', lv: 4 },
  { w: 'swan',       zh: '天鵝',     e: '🦢', tags: ['float', 'fly'], cat: 'animal', lv: 4 },
  { w: 'bed',        zh: '床',       e: '🛏️', tags: ['float', 'long'], cat: 'stuff', lv: 4 },
  { w: 'barrel',     zh: '木桶',     e: '🛢️', tags: ['float'], cat: 'stuff', lv: 5 },

  // ---- 很重 heavy ----
  { w: 'rock',       zh: '石頭',     e: '🪨', tags: ['heavy'], cat: 'nature', lv: 1 },
  { w: 'brick',      zh: '磚頭',     e: '🧱', tags: ['heavy'], cat: 'stuff', lv: 1 },
  { w: 'box',        zh: '箱子',     e: '📦', tags: ['heavy'], cat: 'stuff', lv: 1 },
  { w: 'anchor',     zh: '錨',       e: '⚓', tags: ['heavy'], cat: 'tool', lv: 2 },
  { w: 'elephant',   zh: '大象',     e: '🐘', tags: ['heavy'], cat: 'animal', lv: 2 },
  { w: 'horse',      zh: '馬',       e: '🐴', tags: ['heavy'], cat: 'animal', lv: 2 },
  { w: 'bear',       zh: '熊',       e: '🐻', tags: ['heavy'], cat: 'animal', lv: 3 },
  { w: 'hippo',      zh: '河馬',     e: '🦛', tags: ['heavy'], cat: 'animal', lv: 3 },
  { w: 'car',        zh: '汽車',     e: '🚗', tags: ['heavy'], cat: 'vehicle', lv: 3 },
  { w: 'truck',      zh: '卡車',     e: '🚚', tags: ['heavy'], cat: 'vehicle', lv: 4 },
  { w: 'piano',      zh: '鋼琴',     e: '🎹', tags: ['heavy'], cat: 'stuff', lv: 4 },
  { w: 'tent',       zh: '帳篷',     e: '⛺', tags: ['heavy'], cat: 'stuff', lv: 4 },
  { w: 'dinosaur',   zh: '恐龍',     e: '🦕', tags: ['heavy', 'long'], cat: 'animal', lv: 4 },
  { w: 'statue',     zh: '石像',     e: '🗿', tags: ['heavy'], cat: 'stuff', lv: 5 },
  { w: 'rhino',      zh: '犀牛',     e: '🦏', tags: ['heavy'], cat: 'animal', lv: 5 },

  // ---- 很長 long ----
  { w: 'ladder',     zh: '梯子',     e: '🪜', tags: ['long', 'climb'], cat: 'tool', lv: 1 },
  { w: 'stick',      zh: '棍子',     e: '🥢', tags: ['long'], cat: 'nature', lv: 1 },
  { w: 'pencil',     zh: '鉛筆',     e: '✏️', tags: ['long'], cat: 'tool', lv: 1 },
  { w: 'ruler',      zh: '尺',       e: '📏', tags: ['long'], cat: 'tool', lv: 1 },
  { w: 'bone',       zh: '骨頭',     e: '🦴', tags: ['long'], cat: 'stuff', lv: 2 },
  { w: 'bridge',     zh: '橋',       e: '🌉', tags: ['long'], cat: 'stuff', lv: 2 },
  { w: 'tree',       zh: '樹',       e: '🌲', tags: ['long', 'climb'], cat: 'nature', lv: 2 },
  { w: 'rope',       zh: '繩子',     e: '🪢', tags: ['long', 'climb'], cat: 'tool', lv: 2 },
  { w: 'snake',      zh: '蛇',       e: '🐍', tags: ['long'], cat: 'animal', lv: 3 },
  { w: 'sword',      zh: '劍',       e: '🗡️', tags: ['long', 'cut'], cat: 'tool', lv: 3 },
  { w: 'octopus',    zh: '章魚',     e: '🐙', tags: ['long', 'climb'], cat: 'animal', lv: 3 },
  { w: 'chain',      zh: '鐵鍊',     e: '⛓️', tags: ['long', 'climb'], cat: 'tool', lv: 4 },
  { w: 'giraffe',    zh: '長頸鹿',   e: '🦒', tags: ['long', 'climb'], cat: 'animal', lv: 4 },
  { w: 'flute',      zh: '笛子',     e: '🪈', tags: ['long'], cat: 'stuff', lv: 4 },
  { w: 'train',      zh: '火車',     e: '🚂', tags: ['long', 'heavy'], cat: 'vehicle', lv: 5 },

  // ---- 會飛 fly ----
  { w: 'balloon',    zh: '氣球',     e: '🎈', tags: ['fly'], cat: 'stuff', lv: 1 },
  { w: 'bird',       zh: '小鳥',     e: '🐦', tags: ['fly'], cat: 'animal', lv: 1 },
  { w: 'kite',       zh: '風箏',     e: '🪁', tags: ['fly'], cat: 'stuff', lv: 1 },
  { w: 'plane',      zh: '飛機',     e: '✈️', tags: ['fly'], cat: 'vehicle', lv: 2 },
  { w: 'broom',      zh: '掃把',     e: '🧹', tags: ['fly'], cat: 'tool', lv: 2 },
  { w: 'eagle',      zh: '老鷹',     e: '🦅', tags: ['fly'], cat: 'animal', lv: 2 },
  { w: 'butterfly',  zh: '蝴蝶',     e: '🦋', tags: ['fly'], cat: 'animal', lv: 2 },
  { w: 'umbrella',   zh: '雨傘',     e: '☂️', tags: ['fly', 'water'], cat: 'stuff', lv: 2 },
  { w: 'cloud',      zh: '雲',       e: '☁️', tags: ['fly', 'water'], cat: 'nature', lv: 2 },
  { w: 'dragon',     zh: '龍',       e: '🐉', tags: ['fly', 'fire'], cat: 'magic', lv: 3 },
  { w: 'helicopter', zh: '直升機',   e: '🚁', tags: ['fly'], cat: 'vehicle', lv: 3 },
  { w: 'rocket',     zh: '火箭',     e: '🚀', tags: ['fly', 'fire'], cat: 'vehicle', lv: 3 },
  { w: 'bat',        zh: '蝙蝠',     e: '🦇', tags: ['fly'], cat: 'animal', lv: 4 },
  { w: 'parrot',     zh: '鸚鵡',     e: '🦜', tags: ['fly'], cat: 'animal', lv: 4 },
  { w: 'wind',       zh: '風',       e: '💨', tags: ['fly', 'cold'], cat: 'nature', lv: 4 },
  { w: 'angel',      zh: '天使',     e: '👼', tags: ['fly'], cat: 'magic', lv: 5 },
  { w: 'ghost',      zh: '幽靈',     e: '👻', tags: ['fly'], cat: 'magic', lv: 5 },

  // ---- 能爬 climb ----
  { w: 'cat',        zh: '貓',       e: '🐱', tags: ['climb'], cat: 'animal', lv: 1 },
  { w: 'vine',       zh: '藤蔓',     e: '🌿', tags: ['climb'], cat: 'nature', lv: 2 },
  { w: 'monkey',     zh: '猴子',     e: '🐒', tags: ['climb'], cat: 'animal', lv: 2 },
  { w: 'net',        zh: '網子',     e: '🥅', tags: ['climb'], cat: 'tool', lv: 3 },
  { w: 'spider',     zh: '蜘蛛',     e: '🕷️', tags: ['climb'], cat: 'animal', lv: 3 },
  { w: 'squirrel',   zh: '松鼠',     e: '🐿️', tags: ['climb'], cat: 'animal', lv: 3 },

  // ---- 有火 fire ----
  { w: 'fire',       zh: '火',       e: '🔥', tags: ['fire', 'light'], cat: 'nature', lv: 1 },
  { w: 'torch',      zh: '火把',     e: '🪔', tags: ['fire', 'light'], cat: 'tool', lv: 1 },
  { w: 'candle',     zh: '蠟燭',     e: '🕯️', tags: ['fire', 'light'], cat: 'stuff', lv: 1 },
  { w: 'sun',        zh: '太陽',     e: '☀️', tags: ['fire', 'light'], cat: 'nature', lv: 2 },
  { w: 'chili',      zh: '辣椒',     e: '🌶️', tags: ['fire', 'food'], cat: 'food', lv: 3 },
  { w: 'lava',       zh: '岩漿',     e: '🌋', tags: ['fire'], cat: 'nature', lv: 4 },
  { w: 'firework',   zh: '煙火',     e: '🎆', tags: ['fire', 'light'], cat: 'stuff', lv: 4 },
  { w: 'firecracker', zh: '鞭炮',    e: '🧨', tags: ['fire', 'key'], cat: 'stuff', lv: 4 },
  { w: 'lightning',  zh: '閃電',     e: '⚡', tags: ['fire', 'light', 'cut'], cat: 'nature', lv: 5 },

  // ---- 有水 water ----
  { w: 'water',      zh: '水',       e: '💧', tags: ['water'], cat: 'nature', lv: 1 },
  { w: 'rain',       zh: '雨',       e: '🌧️', tags: ['water'], cat: 'nature', lv: 1 },
  { w: 'bucket',     zh: '水桶',     e: '🪣', tags: ['water'], cat: 'tool', lv: 1 },
  { w: 'wave',       zh: '海浪',     e: '🌊', tags: ['water'], cat: 'nature', lv: 2 },
  { w: 'juice',      zh: '果汁',     e: '🧃', tags: ['water', 'food'], cat: 'food', lv: 2 },
  { w: 'milk',       zh: '牛奶',     e: '🥛', tags: ['water', 'food'], cat: 'food', lv: 2 },
  { w: 'soup',       zh: '湯',       e: '🍲', tags: ['water', 'food'], cat: 'food', lv: 3 },
  { w: 'shower',     zh: '蓮蓬頭',   e: '🚿', tags: ['water'], cat: 'stuff', lv: 3 },
  { w: 'fountain',   zh: '噴泉',     e: '⛲', tags: ['water'], cat: 'stuff', lv: 4 },

  // ---- 能切 cut ----
  { w: 'knife',      zh: '刀子',     e: '🔪', tags: ['cut'], cat: 'tool', lv: 1 },
  { w: 'scissors',   zh: '剪刀',     e: '✂️', tags: ['cut'], cat: 'tool', lv: 1 },
  { w: 'axe',        zh: '斧頭',     e: '🪓', tags: ['cut'], cat: 'tool', lv: 2 },
  { w: 'saw',        zh: '鋸子',     e: '🪚', tags: ['cut'], cat: 'tool', lv: 2 },
  { w: 'crab',       zh: '螃蟹',     e: '🦀', tags: ['cut'], cat: 'animal', lv: 3 },
  { w: 'shark',      zh: '鯊魚',     e: '🦈', tags: ['cut'], cat: 'animal', lv: 4 },
  { w: 'teeth',      zh: '牙齒',     e: '🦷', tags: ['cut'], cat: 'stuff', lv: 4 },

  // ---- 是食物 food ----
  { w: 'apple',      zh: '蘋果',     e: '🍎', tags: ['food'], cat: 'food', lv: 1 },
  { w: 'cake',       zh: '蛋糕',     e: '🎂', tags: ['food'], cat: 'food', lv: 1 },
  { w: 'pizza',      zh: '披薩',     e: '🍕', tags: ['food'], cat: 'food', lv: 1 },
  { w: 'bread',      zh: '麵包',     e: '🍞', tags: ['food'], cat: 'food', lv: 1 },
  { w: 'banana',     zh: '香蕉',     e: '🍌', tags: ['food'], cat: 'food', lv: 1 },
  { w: 'cookie',     zh: '餅乾',     e: '🍪', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'burger',     zh: '漢堡',     e: '🍔', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'candy',      zh: '糖果',     e: '🍬', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'cheese',     zh: '起司',     e: '🧀', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'fish',       zh: '魚',       e: '🐟', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'mushroom',   zh: '蘑菇',     e: '🍄', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'carrot',     zh: '紅蘿蔔',   e: '🥕', tags: ['food'], cat: 'food', lv: 2 },
  { w: 'meat',       zh: '肉',       e: '🍖', tags: ['food'], cat: 'food', lv: 3 },
  { w: 'noodles',    zh: '麵',       e: '🍜', tags: ['food'], cat: 'food', lv: 3 },
  { w: 'donut',      zh: '甜甜圈',   e: '🍩', tags: ['food'], cat: 'food', lv: 3 },
  { w: 'corn',       zh: '玉米',     e: '🌽', tags: ['food'], cat: 'food', lv: 4 },
  { w: 'honey',      zh: '蜂蜜',     e: '🍯', tags: ['food'], cat: 'food', lv: 4 },
  { w: 'egg',        zh: '蛋',       e: '🥚', tags: ['food'], cat: 'food', lv: 4 },
  { w: 'watermelon', zh: '西瓜',     e: '🍉', tags: ['food', 'heavy'], cat: 'food', lv: 5 },

  // ---- 會亮 light ----
  { w: 'lamp',       zh: '燈',       e: '💡', tags: ['light'], cat: 'stuff', lv: 1 },
  { w: 'flashlight', zh: '手電筒',   e: '🔦', tags: ['light'], cat: 'tool', lv: 1 },
  { w: 'moon',       zh: '月亮',     e: '🌙', tags: ['light'], cat: 'nature', lv: 2 },
  { w: 'phone',      zh: '手機',     e: '📱', tags: ['light'], cat: 'stuff', lv: 2 },
  { w: 'rainbow',    zh: '彩虹',     e: '🌈', tags: ['light', 'long'], cat: 'nature', lv: 3 },
  { w: 'diamond',    zh: '鑽石',     e: '💎', tags: ['light'], cat: 'nature', lv: 3 },
  { w: 'crystal',    zh: '水晶球',   e: '🔮', tags: ['light'], cat: 'nature', lv: 4 },

  // ---- 冰冷 cold ----
  { w: 'ice',        zh: '冰塊',     e: '🧊', tags: ['cold', 'float'], cat: 'nature', lv: 1 },
  { w: 'snow',       zh: '雪',       e: '❄️', tags: ['cold'], cat: 'nature', lv: 1 },
  { w: 'snowman',    zh: '雪人',     e: '⛄', tags: ['cold'], cat: 'stuff', lv: 2 },
  { w: 'penguin',    zh: '企鵝',     e: '🐧', tags: ['cold'], cat: 'animal', lv: 2 },
  { w: 'iceberg',    zh: '冰山',     e: '🏔️', tags: ['cold', 'float'], cat: 'nature', lv: 3 },
  { w: 'popsicle',   zh: '剉冰',     e: '🍧', tags: ['cold', 'food'], cat: 'food', lv: 3 },
  { w: 'icecream',   zh: '冰淇淋',   e: '🍦', tags: ['cold', 'food'], cat: 'food', lv: 3 },
  { w: 'yeti',       zh: '雪怪',     e: '🧌', tags: ['cold'], cat: 'magic', lv: 5 },

  // ---- 能開鎖 key ----
  { w: 'key',        zh: '鑰匙',     e: '🔑', tags: ['key'], cat: 'tool', lv: 1 },
  { w: 'spoon',      zh: '湯匙',     e: '🥄', tags: ['key'], cat: 'tool', lv: 1 },
  { w: 'hammer',     zh: '鎚子',     e: '🔨', tags: ['key', 'heavy'], cat: 'tool', lv: 2 },
  { w: 'magnet',     zh: '磁鐵',     e: '🧲', tags: ['key'], cat: 'tool', lv: 3 },
  { w: 'card',       zh: '卡片',     e: '💳', tags: ['key'], cat: 'stuff', lv: 3 },
  { w: 'screwdriver', zh: '螺絲起子', e: '🪛', tags: ['key'], cat: 'tool', lv: 3 },
  { w: 'robot',      zh: '機器人',   e: '🤖', tags: ['key', 'heavy'], cat: 'stuff', lv: 4 },
  { w: 'crown',      zh: '皇冠',     e: '👑', tags: ['key'], cat: 'stuff', lv: 5 },
  // 全能彩蛋：五種能力一次到位，最後一頁才解鎖
  { w: 'wizard',     zh: '魔法師',   e: '🧙', tags: ['key', 'fly', 'fire', 'light', 'cut'], cat: 'magic', lv: 5 },
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
//
// Levels 1-4 are single-obstacle tutorials — one blocker, one idea. From
// level 5 on almost everything is 2-3 blockers, because that is where the
// game actually is: a summon acts on the WHOLE scene, so the tool you pick
// for the blocker in front of you decides whether the one behind it clears
// itself for free. 25 of the 30 levels used to be a single obstacle, which is
// why the whole thing played as "read the tip, tap a card".
const WIZARD_LEVELS = [
  // ---- 第 1 章 翠綠森林（教學：一關一個觀念）----
  { id: 'w1',  ch: 1, name: '過小溪',       obs: ['river'],            intro: '小巫師想去對面的草地摘星星，可是溪水好深！' },
  { id: 'w2',  ch: 1, name: '大坑洞',       obs: ['pit'],              intro: '路中間破了一個大洞，掉下去可就麻煩了。' },
  { id: 'w3',  ch: 1, name: '石頭牆',       obs: ['wall'],             intro: '一面比小巫師還高好幾倍的石牆擋在前面。' },
  { id: 'w4',  ch: 1, name: '藤蔓擋路',     obs: ['rope'],             intro: '整片藤蔓把小路封死了，得想辦法穿過去。' },
  { id: 'w5',  ch: 1, name: '森林怪與藤網', obs: ['monster', 'rope'],  intro: '森林怪擋在路中間肚子咕嚕叫，牠後面還有一整片乾藤蔓。有的東西，一次能對付兩個喔！' },
  { id: 'w6',  ch: 1, name: '森林的出口',   obs: ['river', 'pit', 'rope'], intro: '出口就在前面！一條河、一個大坑，最後還有一片藤網。', boss: true },

  // ---- 第 2 章 幽暗洞窟（火與光的連鎖）----
  { id: 'w7',  ch: 2, name: '黑漆漆的洞口', obs: ['dark', 'rope'],     intro: '洞裡黑得什麼都看不見，摸過去還有一片乾掉的蜘蛛網。' },
  { id: 'w8',  ch: 2, name: '地底裂縫',     obs: ['pit', 'dark'],      intro: '地面裂開一道深縫，過了縫之後就沒有光了。' },
  { id: 'w9',  ch: 2, name: '蜘蛛的巢',     obs: ['rope', 'river'],    intro: '一張比人還大的蜘蛛網黏在通道上，網後面還有地下水流過。' },
  { id: 'w10', ch: 2, name: '地下暗河',     obs: ['river', 'wall'],    intro: '冰冷的地下河擋在前面，對岸是一面濕滑的岩壁。' },
  { id: 'w11', ch: 2, name: '岩漿與暗房',   obs: ['flame', 'dark'],    intro: '岩漿從地縫冒出來，再過去是一間沒有光的石室。想清楚：火滅了，前面就更黑了。' },
  { id: 'w12', ch: 2, name: '洞窟最深處',   obs: ['dark', 'river', 'rope'], intro: '最深處又黑、有暗河、還有纏成一片的老藤。', boss: true },

  // ---- 第 3 章 古老城堡 ----
  { id: 'w13', ch: 3, name: '護城河',       obs: ['river', 'lock'],    intro: '城堡外圍是一圈護城河，過了河還有一道上鎖的側門。' },
  { id: 'w14', ch: 3, name: '城堡大門',     obs: ['lock', 'monster'],  intro: '大門掛著生鏽的大鎖，門後傳來咕嚕咕嚕的肚子叫聲。' },
  { id: 'w15', ch: 3, name: '守門怪獸',     obs: ['monster', 'wall'],  intro: '守門的大怪獸擋在走廊上，牠背後是一面光滑的高牆。' },
  { id: 'w16', ch: 3, name: '火把走廊',     obs: ['flame', 'dark'],    intro: '走廊兩側的火焰燒成一道火牆，走廊盡頭是一片漆黑。' },
  { id: 'w17', ch: 3, name: '高高的城牆',   obs: ['wall', 'pit'],      intro: '通往塔頂的城牆又直又滑，牆後還有一道護城壕。' },
  { id: 'w18', ch: 3, name: '王座之間',     obs: ['lock', 'monster', 'flame'], intro: '王座前有一道鎖住的門，門後一隻怪獸，最後還有一圈守護的火。', boss: true },

  // ---- 第 4 章 雲端天空 ----
  { id: 'w19', ch: 4, name: '雲朵斷層',     obs: ['pit', 'wall'],      intro: '雲朵之間破了一個大洞，洞的另一邊是一道厚厚的雲牆。' },
  { id: 'w20', ch: 4, name: '天空之牆',     obs: ['wall', 'rope'],     intro: '白色的雲牆高高聳立，翻過去還纏著一團乾枯的雲絲。' },
  { id: 'w21', ch: 4, name: '風之網',       obs: ['rope', 'monster'],  intro: '被風纏成一團的雲絲網擋住去路，網後面有隻餓壞的雲獸。' },
  { id: 'w22', ch: 4, name: '無邊雲海',     obs: ['river', 'pit'],     intro: '眼前是一片望不到底的雲海，雲海後面還有一個空洞。' },
  { id: 'w23', ch: 4, name: '太陽的火焰',   obs: ['flame', 'wall'],    intro: '離太陽太近了，前面燒起一片火焰，火後面是一道發燙的牆。' },
  { id: 'w24', ch: 4, name: '天空神殿',     obs: ['wall', 'flame', 'river'], intro: '神殿的高牆、火焰結界，最後還有一條天上的河。', boss: true },

  // ---- 第 5 章 祕密實驗室 ----
  { id: 'w25', ch: 5, name: '電子鎖',       obs: ['lock', 'dark'],     intro: '實驗室的門用電子鎖鎖死了，門後的房間一片漆黑。' },
  { id: 'w26', ch: 5, name: '停電的走廊',   obs: ['dark', 'flame'],    intro: '停電了，走廊黑得像墨水，遠處有一團電線走火的火焰。' },
  { id: 'w27', ch: 5, name: '廢料坑',       obs: ['pit', 'rope'],      intro: '地板塌了一塊，坑的對面纏著一大捆乾掉的舊電纜。' },
  { id: 'w28', ch: 5, name: '實驗怪獸',     obs: ['monster', 'lock'],  intro: '從培養槽跑出來的怪獸餓得直流口水，牠後面是一道保險門。' },
  { id: 'w29', ch: 5, name: '雷射網',       obs: ['rope', 'wall'],     intro: '一整面交錯的雷射網封住通道，網後面是一道無縫的合金牆。' },
  { id: 'w30', ch: 5, name: '最終實驗室',   obs: ['lock', 'dark', 'river'], intro: '最後一關！鎖住的門、漆黑的房間、還有一池冷卻液。撐過去就是大魔法師了！', boss: true },
];
