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
  'wrapping paper': { zh: '包裝紙', e: '🎁' },
  borders:    { zh: '白邊',     e: '🖼️' },
  retouching: { zh: '修圖',     e: '🪄' },
  envelopes:  { zh: '信封',     e: '✉️' },
  stamps:     { zh: '郵票',     e: '📮' },
});

const LIFE_REGIONS = [
  { id: 'errand', name: '生活小舖', e: '🏪', teaches: null,
    tip: '基本功：聽清楚要幾個、要加什麼、不要什麼。' },
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
