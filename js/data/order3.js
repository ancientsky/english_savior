/* ===== 🏪 生活服務 — the second world of 英語打工大亂鬥 =====
   Must load AFTER js/data/order.js (it appends to ORDER_WORLDS and ORDER_EXTRAS).

   Why a separate world rather than more regions on the restaurant: progress.
   The 25th restaurant unlocks at 248 orders served; appending would bury the
   post office behind a quarter of a thousand burgers. This world has its own
   save key and its own `served` counter, starting from zero.

   Why these scenes and not others — the site already teaches situational
   English heavily elsewhere, but always as MULTIPLE CHOICE:
   `EMPIRE_LIFE` has 856 scenes (hotel 44, phone 40, doctor 39, airport 24,
   library 24) and RPG has 14 life-service chapters. What no other zone does is
   listen-then-BUILD. So these 20 counters lean on situations the site does not
   cover at all — bank, salon, taxi, cinema, optician, photo studio, florist,
   bike rental — and on the mechanic, not the topic.

   The skeleton this engine can speak is OPENER + noun phrase(s) + ask + please.
   Scenes that need a different sentence shape are deliberately absent:
     · 加油站 — the real line is "Fill it up, please", a fixed phrase
     · 洗衣店 — needs a past participle ("these shirts dry cleaned by tomorrow")
     · 修理店 / 獸醫 — verb-headed ("Can you fix my phone?")
   Faking those would produce sentences a child will never actually hear, and
   this project would rather ship twenty real counters than twenty-three with
   three that lie.
*/

// Service counters have real with/no options — in Taiwan "no bag, please" is a
// daily utterance. Same global ORDER_EXTRAS table as the restaurant: an id is
// spoken bare after "with"/"no", so it must be a mass or plural noun
// ("with staples" ✓, "with a cover" ✗).
Object.assign(ORDER_EXTRAS, {
  tracking:   { zh: '追蹤條碼', e: '🔎' },
  insurance:  { zh: '保險',     e: '🛡️' },
  'bubble wrap': { zh: '氣泡紙', e: '🫧' },
  tape:       { zh: '膠帶',     e: '📎' },
  staples:    { zh: '訂書針',   e: '📌' },
  lamination: { zh: '護貝',     e: '✨' },
  ribbon:     { zh: '緞帶',     e: '🎀' },
  // "with seats" is not what anyone books — the phrase is "reserved seats".
  'reserved seats': { zh: '劃位', e: '💺' },
  snacks:     { zh: '零食',     e: '🍿' },
  butter:     { zh: '奶油',     e: '🧈' },
  // bare after no/with, so no article: "a haircut, no wash, please" ✓
  wash:       { zh: '洗頭',     e: '🚿' },
  gel:        { zh: '髮膠',     e: '💈' },
  bangs:      { zh: '瀏海',     e: '✂️' },
  'a receipt':{ zh: '收據',     e: '🧾' },
  'a car seat': { zh: '兒童座椅', e: '🪑' },
  'wrapping paper': { zh: '包裝紙', e: '🎁' },
  borders:    { zh: '白邊',     e: '🖼️' },
  retouching: { zh: '修圖',     e: '🪄' },
  envelopes:  { zh: '信封',     e: '✉️' },
  stamps:     { zh: '郵票',     e: '📮' },
  // 👕 挑選與試穿. An id that carries its own article reads fine after "with"
  // ("with a strap") but NOT after "no", so these may only ever sit in `ex` —
  // the validator enforces it, because "no a wash" already shipped once.
  'gift wrap':      { zh: '禮物包裝', e: '🧧' },
  'spare buttons':  { zh: '備用鈕扣', e: '🔘' },
  stickers:         { zh: '貼紙',   e: '💮' },
  solution:         { zh: '保養液', e: '🧴' },
  'a case':         { zh: '收納盒', e: '🧰' },
  'a strap':        { zh: '掛繩',   e: '🪢' },
  'a clip':         { zh: '扣環',   e: '🧷' },
  'a name tag':     { zh: '名牌',   e: '🏷️' },
  'a bell':         { zh: '鈴鐺',   e: '🔔' },
  cable:            { zh: '充電線', e: '🔌' },
  padding:          { zh: '軟墊',   e: '🛋️' },
  'a hanger':       { zh: '衣架',   e: '🪝' },
});

const LIFE_REGIONS = [
  { id: 'errand', name: '生活小舖', e: '🏪', teaches: null,
    tip: '基本功：聽清楚要幾個、要加什麼、不要什麼。' },
  { id: 'outing', name: '出門辦事', e: '🚉', teaches: 'when',
    tip: '這一區的客人會說什麼時候——today、tomorrow、at three o\'clock。買票的還會說 one-way（單程）還是 round-trip（來回）。' },
  // Two patterns at once, because they are one phrase: a shop that taught size
  // but not colour would leave the child able to hear half of "a medium blue
  // t-shirt" and no more.
  { id: 'fitting', name: '挑選與試穿', e: '👕', teaches: ['fit', 'colour'],
    tip: '這一區要聽兩件事：尺寸（small／medium／large）和顏色（black／white／red／blue／green）。英文的順序是尺寸在前、顏色在後——a medium blue t-shirt。' },
];

const LIFE_SHOPS = [
  {
    id: 'post', name: '郵局櫃台', e: '🏣', unlockAt: 0, region: 'errand',
    intro: '第一天到郵局幫忙！客人會說要幾張郵票、要不要加追蹤。',
    menu: [
      { w: 'stamp', zh: '郵票', e: '📮', kind: 'doc', pl: 'stamps',
        def: [], ex: ['envelopes'] },
      { w: 'postcard', zh: '明信片', e: '💌', kind: 'doc', pl: 'postcards',
        def: [], ex: ['stamps'] },
      { w: 'envelope', zh: '信封', e: '✉️', kind: 'doc', pl: 'envelopes',
        def: [], ex: ['stamps', 'tape'] },
      { w: 'box', zh: '紙箱', e: '📦', kind: 'item', pl: 'boxes',
        def: ['tape'], ex: ['bubble wrap'] },
      { w: 'package', zh: '包裹', e: '🎁', kind: 'item', pl: 'packages',
        def: ['tape'], ex: ['tracking', 'insurance', 'bubble wrap'] },
    ],
  },
  {
    id: 'copyshop', name: '影印小舖', e: '🖨️', unlockAt: 3, region: 'errand',
    intro: '影印店最常聽到的就是「幾份」——three copies 要聽清楚。',
    menu: [
      { w: 'copy', zh: '影印', e: '📄', kind: 'doc', pl: 'copies',
        def: [], ex: ['staples', 'lamination'] },
      { w: 'poster', zh: '海報', e: '🖼️', kind: 'doc', pl: 'posters',
        def: [], ex: ['lamination'] },
      { w: 'name card', zh: '名片', e: '🪪', kind: 'doc', pl: 'name cards',
        def: [], ex: ['lamination'] },
      { w: 'notebook', zh: '筆記本', e: '📓', kind: 'item', pl: 'notebooks',
        def: [], ex: ['staples'] },
      { w: 'photo', zh: '照片', e: '🏞️', kind: 'doc', pl: 'photos',
        def: [], ex: ['borders', 'lamination'] },
    ],
  },
  {
    id: 'florist', name: '街角花店', e: '💐', unlockAt: 7, region: 'errand',
    intro: '花店的客人會說要幾朵、要不要包裝。',
    menu: [
      { w: 'rose', zh: '玫瑰', e: '🌹', kind: 'item', pl: 'roses',
        def: ['wrapping paper'], ex: ['ribbon'] },
      { w: 'sunflower', zh: '向日葵', e: '🌻', kind: 'item', pl: 'sunflowers',
        def: ['wrapping paper'], ex: ['ribbon'] },
      { w: 'tulip', zh: '鬱金香', e: '🌷', kind: 'item', pl: 'tulips',
        def: ['wrapping paper'], ex: ['ribbon'] },
      { w: 'bouquet', zh: '花束', e: '💐', kind: 'item', pl: 'bouquets',
        def: ['wrapping paper'], ex: ['ribbon'] },
      { w: 'plant', zh: '盆栽', e: '🪴', kind: 'item', pl: 'plants',
        def: [], ex: ['wrapping paper', 'ribbon'] },
    ],
  },
  {
    id: 'photostudio', name: '照相館', e: '📷', unlockAt: 12, region: 'errand',
    intro: '照相館：大頭照要幾張？要不要修圖？',
    menu: [
      { w: 'passport photo', zh: '大頭照', e: '🪪', kind: 'doc', pl: 'passport photos',
        def: [], ex: ['retouching', 'borders'] },
      { w: 'photo', zh: '照片', e: '🖼️', kind: 'doc', pl: 'photos',
        def: ['borders'], ex: ['retouching', 'lamination'] },
      { w: 'frame', zh: '相框', e: '🖌️', kind: 'item', pl: 'frames',
        def: [], ex: ['wrapping paper'] },
      { w: 'photo album', zh: '相簿', e: '📔', kind: 'item', pl: 'photo albums',
        def: [], ex: ['wrapping paper'] },
      { w: 'sticker photo', zh: '大頭貼', e: '✨', kind: 'doc', pl: 'sticker photos',
        def: [], ex: ['borders', 'retouching'] },
    ],
  },
  {
    id: 'bank', name: '銀行櫃台', e: '🏦', unlockAt: 18, region: 'errand',
    intro: '生活小舖最後一關！銀行的表單和零錢都要算清楚。',
    menu: [
      { w: 'form', zh: '表單', e: '📋', kind: 'doc', pl: 'forms',
        def: [], ex: ['envelopes'] },
      { w: 'bank book', zh: '存摺', e: '📕', kind: 'item', pl: 'bank books',
        def: [], ex: ['envelopes'] },
      { w: 'new card', zh: '新卡片', e: '💳', kind: 'item', pl: 'new cards',
        def: [], ex: ['insurance'] },
      { w: 'coin bag', zh: '零錢袋', e: '🪙', kind: 'item', pl: 'coin bags',
        def: [], ex: ['envelopes', 'staples'] },
      { w: 'receipt', zh: '收據', e: '🧾', kind: 'doc', pl: 'receipts',
        def: [], ex: ['staples'] },
    ],
  },
  /* ================= 🚉 出門辦事 — when（時間）＋ trip（單程/來回）=================
     `when` is the region's ask; `trip` rides on the ticket items only. A shop
     may carry at most ONE ask, which is why nothing here also uses togo. */
  {
    id: 'trainstation', name: '火車站售票口', e: '🚄', unlockAt: 24, region: 'outing',
    when: 1, trip: 1,
    intro: '售票口！客人會說單程還是來回，還會說哪一天要走。',
    menu: [
      { w: 'ticket', zh: '車票', e: '🎫', kind: 'ticket', pl: 'tickets', choices: ['trip'],
        def: [], ex: ['reserved seats'] },
      { w: 'child ticket', zh: '兒童票', e: '🧒', kind: 'ticket', pl: 'child tickets', choices: ['trip'],
        def: [], ex: ['reserved seats'] },
      { w: 'student ticket', zh: '學生票', e: '🎓', kind: 'ticket', pl: 'student tickets', choices: ['trip'],
        def: [], ex: ['reserved seats'] },
      // a day pass is not a seat booking, so it takes the receipt instead
      { w: 'day pass', zh: '一日券', e: '🗓️', kind: 'ticket', pl: 'day passes',
        def: [], ex: ['a receipt'] },
      { w: 'lunch box', zh: '鐵路便當', e: '🍱', kind: 'item', pl: 'lunch boxes',
        def: [], ex: ['snacks'] },
    ],
  },
  {
    id: 'busstation', name: '客運轉運站', e: '🚌', unlockAt: 31, region: 'outing',
    when: 1, trip: 1,
    intro: '客運站的客人趕時間，班次和單程來回都要一次聽清楚。',
    menu: [
      { w: 'bus ticket', zh: '客運票', e: '🎫', kind: 'ticket', pl: 'bus tickets', choices: ['trip'],
        def: [], ex: ['reserved seats'] },
      { w: 'child ticket', zh: '兒童票', e: '🧒', kind: 'ticket', pl: 'child tickets', choices: ['trip'],
        def: [], ex: ['reserved seats'] },
      { w: 'luggage tag', zh: '行李吊牌', e: '🏷️', kind: 'item', pl: 'luggage tags',
        def: [], ex: ['ribbon'] },
      { w: 'blanket', zh: '毯子', e: '🧣', kind: 'item', pl: 'blankets',
        def: [], ex: ['snacks'] },
      { w: 'bottle of water', zh: '瓶裝水', e: '💧', kind: 'item', pl: 'bottles of water',
        def: [], ex: ['snacks'] },
    ],
  },
  {
    id: 'cinema', name: '電影院售票口', e: '🎬', unlockAt: 39, region: 'outing',
    when: 1, askOpts: { when: ["for the four o'clock show", "for the seven o'clock show", 'today', 'tomorrow'] },
    intro: '電影院：幾張票、哪一場，還有爆米花要不要加奶油。',
    menu: [
      { w: 'movie ticket', zh: '電影票', e: '🎟️', kind: 'ticket', pl: 'movie tickets',
        def: [], ex: ['reserved seats'] },
      { w: 'child ticket', zh: '兒童票', e: '🧒', kind: 'ticket', pl: 'child tickets',
        def: [], ex: ['reserved seats'] },
      { w: 'popcorn', zh: '爆米花', e: '🍿', kind: 'item', art: 'some',
        def: ['butter'], ex: ['salt'] },
      { w: 'drink', zh: '飲料', e: '🥤', kind: 'drink', sizes: true, pl: 'drinks',
        def: ['ice'], ex: [] },
      { w: 'poster', zh: '海報', e: '🖼️', kind: 'item', pl: 'posters',
        def: [], ex: ['lamination'] },
    ],
  },
  {
    id: 'taxi', name: '叫車服務台', e: '🚕', unlockAt: 48, region: 'outing',
    when: 1,
    intro: '幫客人叫車：幾台、什麼時候、要不要兒童座椅。',
    menu: [
      { w: 'taxi', zh: '計程車', e: '🚕', kind: 'service', pl: 'taxis',
        def: [], ex: ['a car seat', 'a receipt'] },
      { w: 'van', zh: '廂型車', e: '🚐', kind: 'service', pl: 'vans',
        def: [], ex: ['a car seat', 'a receipt'] },
      { w: 'airport taxi', zh: '機場接送', e: '✈️', kind: 'service', pl: 'airport taxis',
        def: [], ex: ['a receipt'] },
      { w: 'luggage tag', zh: '行李吊牌', e: '🏷️', kind: 'item', pl: 'luggage tags',
        def: [], ex: ['ribbon'] },
      { w: 'bottle of water', zh: '瓶裝水', e: '💧', kind: 'item', pl: 'bottles of water',
        def: [], ex: ['snacks'] },
    ],
  },
  {
    id: 'salon', name: '美髮沙龍', e: '💇', unlockAt: 58, region: 'outing',
    when: 1,
    intro: '出門辦事最後一站！剪髮要預約時間，還要說洗不洗、要不要抓髮膠。',
    menu: [
      { w: 'haircut', zh: '剪髮', e: '💇', kind: 'service', pl: 'haircuts',
        def: ['wash'], ex: ['gel', 'bangs'] },
      // "some shampoo" would be the bottle on the shelf; the service a salon
      // sells at the counter is a blow dry, and it counts.
      { w: 'blow dry', zh: '吹整', e: '💨', kind: 'service', pl: 'blow dries',
        def: ['wash'], ex: ['gel'] },
      { w: 'hair dye', zh: '染髮', e: '🎨', kind: 'service', art: 'some',
        def: ['wash'], ex: ['gel'] },
      { w: 'perm', zh: '燙髮', e: '🌀', kind: 'service', pl: 'perms',
        def: ['wash'], ex: ['gel'] },
      { w: 'hair band', zh: '髮帶', e: '🎀', kind: 'item', pl: 'hair bands',
        def: [], ex: ['ribbon'] },
    ],
  },
  /* ================= 👕 挑選與試穿 — fit（尺寸）＋ colour（顏色）=================
     `fit` and `colour` only go on items where they are a real question. Glasses
     have a colour but not a size; a cable has neither a size nor much of a
     colour choice, so it carries only what it really has. Putting an axis on an
     item that does not have it would teach a phrase nobody says. */
  {
    id: 'clothes', name: '潮流服飾店', e: '👕', unlockAt: 68, region: 'fitting',
    intro: '服飾店！客人會說尺寸和顏色——a medium blue t-shirt，兩件都要聽到。',
    menu: [
      { w: 't-shirt', zh: '短T', e: '👕', kind: 'wear', pl: 't-shirts', choices: ['fit', 'colour'],
        def: [], ex: ['gift wrap', 'a hanger'] },
      { w: 'hoodie', zh: '帽T', e: '🧥', kind: 'wear', pl: 'hoodies', choices: ['fit', 'colour'],
        def: [], ex: ['gift wrap', 'spare buttons'] },
      { w: 'skirt', zh: '裙子', e: '👗', kind: 'wear', pl: 'skirts', choices: ['fit', 'colour'],
        def: [], ex: ['gift wrap', 'spare buttons'] },
      { w: 'cap', zh: '鴨舌帽', e: '🧢', kind: 'wear', pl: 'caps', choices: ['colour'],
        def: [], ex: ['gift wrap'] },
      { w: 'scarf', zh: '圍巾', e: '🧣', kind: 'wear', pl: 'scarves', choices: ['colour'],
        def: [], ex: ['gift wrap'] },
    ],
  },
  {
    id: 'optician', name: '眼鏡行', e: '👓', unlockAt: 79, region: 'fitting',
    intro: '眼鏡行：鏡框有顏色，但沒有 S／M／L——只有能問的才會被問到。',
    menu: [
      // plural-only nouns: "a glasses" is not English, so the data says "some"
      { w: 'glasses', zh: '眼鏡', e: '👓', kind: 'item', art: 'some', choices: ['colour'],
        def: [], ex: ['a case', 'a strap'] },
      { w: 'sunglasses', zh: '太陽眼鏡', e: '🕶️', kind: 'item', art: 'some', choices: ['colour'],
        def: [], ex: ['a case'] },
      { w: 'glasses case', zh: '眼鏡盒', e: '🧰', kind: 'item', pl: 'glasses cases', choices: ['colour'],
        def: [], ex: ['a strap', 'stickers'] },
      { w: 'lens cloth', zh: '拭鏡布', e: '🧽', kind: 'item', pl: 'lens cloths', choices: ['colour'],
        def: [], ex: ['gift wrap'] },
      { w: 'contact lenses', zh: '隱形眼鏡', e: '🔵', kind: 'item', art: 'some',
        def: ['solution'], ex: ['a case'] },
    ],
  },
  {
    id: 'phoneshop', name: '手機配件行', e: '📱', unlockAt: 91, region: 'fitting',
    intro: '手機配件行：殼和耳機都有顏色，客人還會說要不要附充電線。',
    menu: [
      { w: 'phone case', zh: '手機殼', e: '📱', kind: 'item', pl: 'phone cases', choices: ['colour'],
        def: [], ex: ['a strap', 'stickers'] },
      { w: 'power bank', zh: '行動電源', e: '🔋', kind: 'item', pl: 'power banks', choices: ['colour'],
        def: ['cable'], ex: ['a case'] },
      { w: 'earphones', zh: '耳機', e: '🎧', kind: 'item', art: 'some', choices: ['colour'],
        def: [], ex: ['a case', 'a clip'] },
      { w: 'screen protector', zh: '保護貼', e: '🛡️', kind: 'item', pl: 'screen protectors',
        def: [], ex: ['gift wrap'] },
      { w: 'phone strap', zh: '手機掛繩', e: '🪢', kind: 'item', pl: 'phone straps', choices: ['colour'],
        def: [], ex: ['a clip', 'stickers'] },
    ],
  },
  {
    id: 'stationery', name: '文具背包店', e: '🎒', unlockAt: 104, region: 'fitting',
    intro: '開學季的文具店！背包和水壺都有大小和顏色。',
    menu: [
      { w: 'backpack', zh: '背包', e: '🎒', kind: 'item', pl: 'backpacks', choices: ['fit', 'colour'],
        def: [], ex: ['a name tag', 'stickers'] },
      { w: 'water bottle', zh: '水壺', e: '🍶', kind: 'item', pl: 'water bottles', choices: ['fit', 'colour'],
        def: [], ex: ['a strap', 'stickers'] },
      { w: 'lunch bag', zh: '便當袋', e: '🥪', kind: 'item', pl: 'lunch bags', choices: ['fit', 'colour'],
        def: [], ex: ['a name tag'] },
      { w: 'pencil case', zh: '鉛筆盒', e: '✏️', kind: 'item', pl: 'pencil cases', choices: ['colour'],
        def: [], ex: ['stickers', 'a name tag'] },
      { w: 'umbrella', zh: '雨傘', e: '☂️', kind: 'item', pl: 'umbrellas', choices: ['colour'],
        def: [], ex: ['a name tag'] },
    ],
  },
  {
    id: 'petshop', name: '寵物用品店', e: '🐾', unlockAt: 118, region: 'fitting',
    intro: '挑選與試穿最後一站！狗狗的項圈也要合身——尺寸和顏色一起說。',
    menu: [
      { w: 'collar', zh: '項圈', e: '📿', kind: 'item', pl: 'collars', choices: ['fit', 'colour'],
        def: [], ex: ['a bell', 'a name tag'] },
      { w: 'leash', zh: '牽繩', e: '🐕', kind: 'item', pl: 'leashes', choices: ['fit', 'colour'],
        def: [], ex: ['a clip'] },
      { w: 'pet bed', zh: '寵物床', e: '🛏️', kind: 'item', pl: 'pet beds', choices: ['fit', 'colour'],
        def: ['padding'], ex: ['a name tag'] },
      { w: 'pet bowl', zh: '飼料碗', e: '🥣', kind: 'item', pl: 'pet bowls', choices: ['fit', 'colour'],
        def: [], ex: ['a name tag', 'stickers'] },
      { w: 'pet carrier', zh: '外出籠', e: '🧳', kind: 'item', pl: 'pet carriers', choices: ['fit', 'colour'],
        def: ['padding'], ex: ['a strap'] },
    ],
  },
];

ORDER_WORLDS.push({
  id: 'life', name: '生活服務', e: '🏪', saveKey: 'english_savior_life',
  shops: LIFE_SHOPS, regions: LIFE_REGIONS, openers: ORDER_OPENERS,
  sub: '20 個生活櫃台，從郵局到飯店',
  t: {
    tray: '🧾 你的櫃台', serve: '🛎️ 交給客人', toShops: '🏪 換場景',
    shopsTitle: '🏪 場景', shopWord: '場景', servedWord: '服務', unitWord: '位客人',
    empty: '點下面的清單，把客人要的東西準備好 👇',
    emptyWarn: '櫃台是空的！先從下面的清單準備東西給客人。',
    closed: '今天的班結束了！',
    intro: `<p>這裡不是餐廳，是<strong>生活裡真的會遇到的櫃台</strong>——郵局、影印店、
        花店、照相館、銀行。客人一樣用<strong>一整句英文</strong>說他要什麼。</p>
      <p>「Can I have <strong>three</strong> stamps <strong>with</strong> envelopes, please?」<br>
         → 拿三張郵票、附上信封。</p>
      <p>和餐廳共用同一套規則：three（幾個）、with（要加）、no（不要）。</p>`,
  },
});
