/* ===== Order Up! expansion pack (英語餐廳大亂鬥 — 第 2-5 區) =====
   Pushes 20 shops into ORDER_SHOPS. Must load AFTER js/data/order.js.

   Same contract as the base file. The rules a shop cannot break (all enforced by
   validate_order.js in the scratchpad):
     · at least 3 menu items (hard mode orders 2-3 at once)
     · every item needs a non-empty `def` OR `ex`, or the mods budget refunds
       itself on it and the shop never actually drills with / no
     · `w` unique and emoji unique WITHIN the shop (itemOf keys on w)
     · an item may not have `temps` and `ice` in def/ex — "a hot soda with no ice"
     · `art: 'some'` is the only legal art value, and never together with `pl`
     · unlockAt strictly ascending across the WHOLE of ORDER_SHOPS, staggered so
       only one shop ever opens per order served
*/

// New ingredients this pack introduces. `amt: true` marks the uncountable ones
// "extra X" / "less X" reads naturally on — never a count noun.
// Ingredient ids are read aloud by TTS inside "with ..." / "no ...", so they are
// written the way a person says them ("bbq sauce", not "bbq").
Object.assign(ORDER_EXTRAS, {
  pepper:           { zh: '胡椒',   e: '⚫', amt: true },
  basil:            { zh: '九層塔', e: '🌿', amt: true },
  'plum powder':    { zh: '梅子粉', e: '🟣', amt: true },
  scallion:         { zh: '蔥',     e: '🌱', amt: true },
  'brown sugar':    { zh: '黑糖',   e: '🟤', amt: true },
  peanuts:          { zh: '花生',   e: '🥜', amt: true },
  'condensed milk': { zh: '煉乳',   e: '🥛', amt: true },
  'red bean':       { zh: '紅豆',   e: '🔴', amt: true },
  taro:             { zh: '芋頭',   e: '🟪', amt: true },
  'bbq sauce':      { zh: '烤肉醬', e: '🟫', amt: true },
  cabbage:          { zh: '高麗菜', e: '🥬', amt: true },
  mango:            { zh: '芒果',   e: '🥭' },
  strawberry:       { zh: '草莓',   e: '🍓' },
  banana:           { zh: '香蕉',   e: '🍌' },
});

// Mark the base pack's uncountable ingredients as amount-adjustable too, so the
// 跨國 region can say "extra cheese" on food the child already knows.
['cheese', 'ketchup', 'ice', 'sugar', 'milk', 'butter', 'syrup', 'honey', 'corn',
  'onion', 'bacon', 'salt', 'cream', 'garlic', 'chili', 'soy sauce', 'wasabi',
  'ginger', 'sesame', 'mustard', 'jam', 'lettuce', 'seaweed'].forEach(x => {
  if (ORDER_EXTRAS[x]) ORDER_EXTRAS[x].amt = true;
});

ORDER_SHOPS.push(
  /* ================= 🎡 熱鬧夜市 — for here / to go ================= */
  {
    id: 'fried', name: '香酥鹽酥雞攤', e: '🍗', unlockAt: 84, region: 'night',
    intro: '夜市的客人趕時間，會告訴你要在這裡吃還是帶走。',
    menu: [
      { w: 'chicken', zh: '鹽酥雞', e: '🍗', kind: 'food', art: 'some',
        def: ['salt', 'pepper'], ex: ['basil', 'chili', 'garlic'] },
      { w: 'squid', zh: '魷魚', e: '🦑', kind: 'food', art: 'some',
        def: ['salt'], ex: ['pepper', 'chili'] },
      { w: 'tofu', zh: '臭豆腐', e: '🧈', kind: 'food', art: 'some',
        def: ['cabbage'], ex: ['chili', 'garlic'] },
      { w: 'mushroom', zh: '杏鮑菇', e: '🍄', kind: 'food', pl: 'mushrooms',
        def: ['salt'], ex: ['pepper', 'basil'] },
      { w: 'sausage', zh: '香腸', e: '🌭', kind: 'food', pl: 'sausages',
        def: [], ex: ['garlic', 'bbq sauce'] },
      { w: 'fries', zh: '地瓜薯條', e: '🍟', kind: 'food', sizes: true, art: 'some',
        def: ['salt'], ex: ['plum powder', 'pepper'] },
      { w: 'soda', zh: '汽水', e: '🥤', kind: 'drink', sizes: true, pl: 'sodas',
        def: ['ice'], ex: ['lemon'] },
    ],
  },
  {
    id: 'waffle', name: '古早味雞蛋糕', e: '🧇', unlockAt: 92, region: 'night',
    intro: '甜點攤也一樣要問內用外帶——帶走的話要包起來喔。',
    menu: [
      { w: 'waffle', zh: '雞蛋糕', e: '🧇', kind: 'food', pl: 'waffles',
        def: [], ex: ['syrup', 'butter', 'honey'] },
      { w: 'pancake', zh: '車輪餅', e: '🥞', kind: 'food', pl: 'pancakes',
        def: ['red bean'], ex: ['cream', 'taro'] },
      { w: 'donut', zh: '甜甜圈', e: '🍩', kind: 'food', pl: 'donuts',
        def: ['sugar'], ex: ['honey', 'peanuts'] },
      { w: 'crepe', zh: '可麗餅', e: '🌯', kind: 'food', pl: 'crepes',
        def: ['cream'], ex: ['banana', 'strawberry', 'syrup'] },
      { w: 'toast', zh: '厚片吐司', e: '🍞', kind: 'food', art: 'some',
        def: ['butter'], ex: ['jam', 'peanuts', 'condensed milk'] },
      { w: 'milk', zh: '鮮奶', e: '🥛', kind: 'drink', sizes: true,
        def: [], ex: ['sugar', 'brown sugar'] },
    ],
  },
  {
    id: 'juice', name: '現打果汁攤', e: '🥤', unlockAt: 100, region: 'night',
    intro: '果汁攤最忙，一定要聽清楚是不是要帶走。',
    menu: [
      { w: 'juice', zh: '果汁', e: '🧃', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['sugar', 'lemon'] },
      { w: 'smoothie', zh: '冰沙', e: '🍹', kind: 'drink', sizes: true, pl: 'smoothies',
        def: ['ice'], ex: ['mango', 'strawberry', 'banana'] },
      { w: 'lemonade', zh: '檸檬汁', e: '🍋', kind: 'drink', sizes: true,
        def: ['ice', 'sugar'], ex: ['honey'] },
      { w: 'papaya milk', zh: '木瓜牛奶', e: '🥛', kind: 'drink', sizes: true,
        def: ['milk'], ex: ['sugar', 'ice'] },
      { w: 'sugarcane juice', zh: '甘蔗汁', e: '🟩', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['lemon'] },
      { w: 'watermelon juice', zh: '西瓜汁', e: '🍉', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['sugar'] },
    ],
  },
  {
    id: 'grill', name: '炭火烤物攤', e: '🍢', unlockAt: 108, region: 'night',
    intro: '烤好要一段時間，客人會先說內用外帶再等你。',
    menu: [
      { w: 'skewer', zh: '串燒', e: '🍢', kind: 'food', pl: 'skewers',
        def: ['bbq sauce'], ex: ['pepper', 'scallion', 'chili'] },
      { w: 'corn', zh: '烤玉米', e: '🌽', kind: 'food', art: 'some',
        def: ['bbq sauce'], ex: ['butter', 'pepper'] },
      { w: 'squid', zh: '烤魷魚', e: '🦑', kind: 'food', art: 'some',
        def: ['bbq sauce'], ex: ['chili', 'garlic'] },
      { w: 'beef', zh: '烤牛肉', e: '🥩', kind: 'food', art: 'some',
        def: ['pepper'], ex: ['bbq sauce', 'garlic', 'scallion'] },
      { w: 'rice ball', zh: '烤飯糰', e: '🍙', kind: 'food', pl: 'rice balls',
        def: ['soy sauce'], ex: ['seaweed', 'sesame'] },
      { w: 'sausage', zh: '烤香腸', e: '🌭', kind: 'food', pl: 'sausages',
        def: [], ex: ['garlic', 'bbq sauce', 'basil'] },
      { w: 'tea', zh: '青草茶', e: '🍵', kind: 'drink', sizes: true,
        def: ['ice'], ex: ['honey'] },
    ],
  },
  {
    id: 'shaved', name: '透心涼冰品店', e: '🍧', unlockAt: 116, region: 'night',
    intro: '夜市最後一攤！冰要帶走的話，動作得快一點。',
    menu: [
      { w: 'shaved ice', zh: '刨冰', e: '🍧', kind: 'dessert', art: 'some',
        def: ['condensed milk'], ex: ['red bean', 'taro', 'mango'] },
      { w: 'popsicle', zh: '冰棒', e: '🍡', kind: 'dessert', pl: 'popsicles',
        def: [], ex: ['red bean', 'peanuts'] },
      { w: 'ice cream', zh: '冰淇淋', e: '🍨', kind: 'dessert', art: 'some',
        def: [], ex: ['strawberry', 'banana', 'peanuts', 'syrup'] },
      { w: 'pudding', zh: '布丁', e: '🍮', kind: 'dessert', pl: 'puddings',
        def: ['syrup'], ex: ['cream'] },
      { w: 'jelly', zh: '仙草凍', e: '🟩', kind: 'dessert', art: 'some',
        def: ['brown sugar'], ex: ['condensed milk', 'peanuts'] },
      { w: 'tofu pudding', zh: '豆花', e: '🥣', kind: 'dessert', art: 'some',
        def: ['brown sugar'], ex: ['red bean', 'taro', 'peanuts'] },
    ],
  },
);
