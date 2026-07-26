/* ===== Order Up! data (英語打工大亂鬥 🍜 餐飲世界) =====
   Customers order in whole English sentences and the child has to BUILD the
   order, not pick an answer. That turns listening into action, and it puts the
   weight on exactly the words Taiwanese kids skip: with / no / two / large.

   `w`   is the identifier, the label AND the TTS script, so multi-word items are
         spelled with a real space (`miso soup`, not `misosoup`) — otherwise the
         customer's voice says something no English speaker would recognise.
   `def` are ingredients the item arrives with — that is what makes "no tomato"
   a real instruction (you must take it off) instead of a freebie.
   `ex`  are optional add-ons the customer can ask for with "with ...".
   `pl`  is only set on items where "two ___" is natural English; items without
         it are never ordered in quantity, so no sentence can come out wrong.
   `art: 'some'` marks the uncountables. That is the ONLY legal value — a/an is
         computed by articleFor() in js/order.js from whichever word is actually
         spoken first, because "large" / "hot" / "iced" can come between the
         article and the noun ("an iced tea", but "a hot tea").
         art:'some' and `pl` are mutually exclusive ("two some beef").

   ORDER_EXTRAS is global (ingredients repeat across shops); menu emoji are
   unique *within* a shop, which is all that matters since one shop is on
   screen at a time.
*/

const ORDER_EXTRAS = {
  lettuce:  { zh: '生菜',   e: '🥬' },
  tomato:   { zh: '番茄',   e: '🍅' },
  cheese:   { zh: '起司',   e: '🧀' },
  ham:      { zh: '火腿',   e: '🍖' },
  egg:      { zh: '蛋',     e: '🥚' },
  butter:   { zh: '奶油',   e: '🧈' },
  jam:      { zh: '果醬',   e: '🍓' },
  syrup:    { zh: '糖漿',   e: '🍯' },
  corn:     { zh: '玉米',   e: '🌽' },
  onion:    { zh: '洋蔥',   e: '🧅' },
  bacon:    { zh: '培根',   e: '🥓' },
  pickle:   { zh: '酸黃瓜', e: '🥒' },
  ketchup:  { zh: '番茄醬', e: '🥫' },
  mustard:  { zh: '黃芥末', e: '🟡' },
  salt:     { zh: '鹽',     e: '🧂' },
  pearls:   { zh: '珍珠',   e: '⚫' },
  pudding:  { zh: '布丁',   e: '🍮' },
  jelly:    { zh: '果凍',   e: '🟩' },
  lemon:    { zh: '檸檬',   e: '🍋' },
  honey:    { zh: '蜂蜜',   e: '🍯' },
  ice:      { zh: '冰塊',   e: '🧊' },
  sugar:    { zh: '糖',     e: '🍬' },
  milk:     { zh: '牛奶',   e: '🥛' },
  cream:    { zh: '鮮奶油', e: '☁️' },
  garlic:   { zh: '蒜頭',   e: '🧄' },
  chili:    { zh: '辣椒',   e: '🌶️' },
  'soy sauce': { zh: '醬油', e: '🍶' },
  wasabi:   { zh: '哇沙米', e: '🟢' },
  ginger:   { zh: '薑',     e: '🫚' },
  sesame:   { zh: '芝麻',   e: '🟤' },
};

/* Regions are the chapters of the game: five shops each, and each region brings
   ONE new sentence pattern with it. `teaches` is inherited cumulatively — a shop
   gets its own region's pattern plus every earlier region's — so the learning
   path reads top to bottom here and it is structurally impossible for a later
   region to forget an earlier pattern.

   `teaches` values are the per-item / per-shop flags in js/order.js:
     togo   — the customer says "for here" or "to go"
     temps  — drinks come "hot" or "iced"
     amt    — an ingredient can be "extra X" or "less X"

   Shops must stay grouped by region in ORDER_SHOPS order, and unlockAt must be
   strictly ascending across the WHOLE array (see 2c in js/order.js shopsOpen).
*/
const ORDER_REGIONS = [
  { id: 'court', name: '學校美食街', e: '🏫', teaches: null,
    tip: '基本功：with（加）、no（不要）、two（幾份）、large/small（大小杯）。' },
  { id: 'night', name: '熱鬧夜市', e: '🎡', teaches: 'togo',
    tip: '這一區的客人會多說一句 for here（內用）或 to go（外帶）——別忘了按！' },
  { id: 'mall', name: '百貨美食層', e: '🏬', teaches: 'temps',
    tip: '這一區的飲料要聽 hot（熱的）還是 iced（冰的）。' },
  { id: 'world', name: '跨國料理街', e: '🌏', teaches: 'amt',
    tip: '這一區的客人會說 extra（多一點）或 less（少一點）某種配料。' },
  { id: 'chef', name: '神級餐廳', e: '⭐', teaches: null,
    tip: '全部句型一起來，訂單也最長。你已經是主廚了！' },
];

const ORDER_SHOPS = [
  {
    id: 'breakfast', name: '晨光早餐店', e: '🥪', unlockAt: 0, region: 'court',
    intro: '第一天上班！客人會用英文跟你點餐，聽清楚他要什麼再做給他。',
    menu: [
      { w: 'sandwich', zh: '三明治', e: '🥪', kind: 'food', pl: 'sandwiches',
        def: ['lettuce', 'tomato'], ex: ['cheese', 'ham', 'egg'] },
      { w: 'toast',    zh: '吐司',   e: '🍞', kind: 'food', art: 'some',
        def: ['butter'], ex: ['jam', 'cheese', 'egg'] },
      { w: 'pancake',  zh: '鬆餅',   e: '🥞', kind: 'food', pl: 'pancakes',
        def: ['syrup'], ex: ['butter', 'egg'] },
      { w: 'omelet',   zh: '蛋餅',   e: '🍳', kind: 'food', pl: 'omelets',
        def: ['cheese'], ex: ['ham', 'corn'] },
      { w: 'bagel',    zh: '貝果',   e: '🥯', kind: 'food', pl: 'bagels',
        def: [], ex: ['butter', 'jam', 'cheese'] },
      { w: 'milk',     zh: '牛奶',   e: '🥛', kind: 'drink', sizes: true, def: [], ex: ['sugar'] },
      { w: 'tea',      zh: '紅茶',   e: '🍵', kind: 'drink', sizes: true, def: [], ex: ['milk', 'sugar', 'lemon'] },
      { w: 'juice',    zh: '果汁',   e: '🧃', kind: 'drink', sizes: true, def: [], ex: ['ice'] },
      { w: 'soy milk', zh: '豆漿',   e: '🫘', kind: 'drink', sizes: true, def: [], ex: ['sugar'] },
    ],
  },
  {
    id: 'burger', name: '大口漢堡店', e: '🍔', unlockAt: 12, region: 'court',
    intro: '升級到漢堡店了！這裡的客人很愛加料，也很常說「不要放……」。',
    menu: [
      { w: 'hamburger', zh: '漢堡',   e: '🍔', kind: 'food', pl: 'hamburgers',
        def: ['lettuce', 'onion'], ex: ['cheese', 'bacon', 'pickle', 'tomato'] },
      { w: 'hot dog',   zh: '熱狗',   e: '🌭', kind: 'food', pl: 'hot dogs',
        def: ['ketchup'], ex: ['cheese', 'onion', 'mustard'] },
      { w: 'fries',     zh: '薯條',   e: '🍟', kind: 'food', sizes: true, art: 'some',
        def: ['salt'], ex: ['cheese', 'ketchup'] },
      { w: 'nuggets',   zh: '雞塊',   e: '🍗', kind: 'food', art: 'some',
        def: [], ex: ['ketchup', 'mustard'] },
      { w: 'salad',     zh: '沙拉',   e: '🥗', kind: 'food', pl: 'salads',
        def: ['tomato'], ex: ['cheese', 'corn', 'egg'] },
      { w: 'cola',      zh: '可樂',   e: '🥤', kind: 'drink', sizes: true, pl: 'colas',
        def: ['ice'], ex: [] },
      { w: 'lemonade',  zh: '檸檬水', e: '🍋', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['sugar'] },
      { w: 'milkshake', zh: '奶昔',   e: '🍨', kind: 'drink', sizes: true, pl: 'milkshakes',
        def: [], ex: ['cream'] },
    ],
  },
  {
    id: 'drinks', name: '珍奶手搖店', e: '🧋', unlockAt: 28, region: 'court',
    intro: '手搖飲最難的是「加料」和「大小杯」——每個字都要聽清楚！',
    menu: [
      { w: 'bubble tea', zh: '珍珠奶茶', e: '🧋', kind: 'drink', sizes: true,
        def: ['pearls'], ex: ['pudding', 'jelly', 'ice'] },
      { w: 'milk tea',  zh: '奶茶',     e: '🥤', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['pearls', 'pudding', 'sugar'] },
      { w: 'green tea', zh: '綠茶',     e: '🍵', kind: 'drink', sizes: true,
        def: [], ex: ['lemon', 'honey', 'ice'] },
      { w: 'coffee',    zh: '咖啡',     e: '☕', kind: 'drink', sizes: true,
        def: ['sugar'], ex: ['milk', 'cream'] },
      { w: 'smoothie',  zh: '冰沙',     e: '🍹', kind: 'drink', sizes: true, pl: 'smoothies',
        def: ['ice'], ex: ['honey', 'milk'] },
      { w: 'cocoa',     zh: '可可',     e: '🍫', kind: 'drink', sizes: true,
        def: ['milk'], ex: ['cream', 'sugar'] },
    ],
  },
  {
    id: 'hotpot', name: '暖呼呼火鍋店', e: '🍲', unlockAt: 48, region: 'court',
    intro: '火鍋店客人一次點好幾樣，要邊聽邊記下來！',
    menu: [
      { w: 'beef',     zh: '牛肉',   e: '🥩', kind: 'food', art: 'some', def: [], ex: ['garlic', 'chili'] },
      { w: 'pork',     zh: '豬肉',   e: '🍖', kind: 'food', art: 'some', def: [], ex: ['garlic', 'soy sauce'] },
      { w: 'shrimp',   zh: '蝦子',   e: '🍤', kind: 'food', art: 'some', def: [], ex: ['garlic', 'chili'] },
      { w: 'tofu',     zh: '豆腐',   e: '🧈', kind: 'food', art: 'some', def: [], ex: ['soy sauce', 'chili'] },
      { w: 'mushroom', zh: '香菇',   e: '🍄', kind: 'food', pl: 'mushrooms', def: [], ex: ['garlic'] },
      { w: 'cabbage',  zh: '高麗菜', e: '🥬', kind: 'food', art: 'some', def: [], ex: ['garlic'] },
      { w: 'noodles',  zh: '麵',     e: '🍜', kind: 'food', art: 'some', def: [], ex: ['egg', 'chili'] },
      { w: 'dumpling', zh: '水餃',   e: '🥟', kind: 'food', pl: 'dumplings', def: [], ex: ['soy sauce', 'chili'] },
      { w: 'tea',      zh: '茶',     e: '🍵', kind: 'drink', sizes: true, def: [], ex: ['lemon'] },
      { w: 'soda',     zh: '汽水',   e: '🥤', kind: 'drink', sizes: true, pl: 'sodas', def: ['ice'], ex: [] },
    ],
  },
  {
    id: 'sushi', name: '海之味壽司店', e: '🍣', unlockAt: 72, region: 'court',
    intro: '最後一家店！客人點得又快又多，你已經是資深店員了。',
    menu: [
      { w: 'salmon',   zh: '鮭魚',     e: '🍣', kind: 'food', art: 'some', def: [], ex: ['wasabi', 'soy sauce'] },
      { w: 'tuna',     zh: '鮪魚',     e: '🐟', kind: 'food', art: 'some', def: [], ex: ['wasabi', 'ginger'] },
      { w: 'shrimp',   zh: '甜蝦',     e: '🍤', kind: 'food', art: 'some', def: [], ex: ['wasabi', 'soy sauce'] },
      { w: 'egg',       zh: '玉子燒',   e: '🍳', kind: 'food', def: [], ex: ['sesame'] },
      { w: 'rice ball', zh: '飯糰',     e: '🍙', kind: 'food', pl: 'rice balls', def: ['seaweed'], ex: ['sesame', 'tuna'] },
      { w: 'ramen',     zh: '拉麵',     e: '🍜', kind: 'food', art: 'some', def: ['egg'], ex: ['corn', 'chili'] },
      { w: 'miso soup', zh: '味噌湯',   e: '🥣', kind: 'food', art: 'some', def: [], ex: ['tofu', 'seaweed'] },
      { w: 'green tea', zh: '綠茶',     e: '🍵', kind: 'drink', sizes: true, def: [], ex: ['honey'] },
      { w: 'water',    zh: '水',       e: '💧', kind: 'drink', sizes: true, def: ['ice'], ex: [] },
    ],
  },
];

// Ingredients only referenced by the sushi shop
ORDER_EXTRAS.seaweed = { zh: '海苔', e: '🌿' };
ORDER_EXTRAS.tofu = { zh: '豆腐', e: '🧈' };
ORDER_EXTRAS.tuna = { zh: '鮪魚', e: '🐟' };

// Sentence openers the customers use, so the same order never sounds identical.
// The Can/Could/May ones are questions and buildSentence() ends them with "?".
const ORDER_OPENERS = [
  'I want', 'I would like', "I'd like", "I'll have",
  'Can I have', 'Could I get', 'May I have',
];

/* ===== Worlds =====
   The zone holds two separate games sharing one engine: the restaurant (25
   shops) and life-service counters (20 scenes). They are separate WORLDS, not
   more regions, because they need separate progress — the 25th restaurant
   unlocks at 248 orders served, and nobody should have to grind that far before
   the post office exists.

   Each world owns its save key, its shop and region arrays, and the handful of
   UI words that are genuinely restaurant-flavoured. `shops`/`regions` hold live
   references, so the `*2.js` / `*3.js` expansion packs keep pushing into them.

   `t` is the string table. Only ten labels differ; 客人 (customer) is right at
   every counter and needs no override.
*/
const ORDER_WORLDS = [
  {
    id: 'food', name: '餐飲', e: '🍜', saveKey: 'english_savior_order',
    shops: ORDER_SHOPS, regions: ORDER_REGIONS, openers: ORDER_OPENERS,
    sub: '25 家餐廳，從學校美食街到神級餐廳',
    t: {
      tray: '🍽️ 你的托盤', serve: '🛎️ 送出餐點', toShops: '🏪 換店',
      shopsTitle: '🏪 店家', shopWord: '店', servedWord: '出餐', unitWord: '份',
      empty: '點下面的菜單，把客人要的東西做出來 👇',
      emptyWarn: '托盤是空的！先點菜單做東西給客人。',
      closed: '今天打烊囉！',
      intro: `<p>客人會用<strong>一整句英文</strong>跟你點餐。你不用選答案——<strong>直接把餐做出來</strong>！</p>
        <p>「Can I have a hamburger <strong>with cheese</strong>, <strong>no onion</strong>, please?」<br>
           → 做漢堡、加起司、把洋蔥拿掉。</p>
        <p>with（加）、no（不要）、two（兩份）、large（大杯）——每個字都會改變你要做的東西。</p>`,
    },
  },
];
