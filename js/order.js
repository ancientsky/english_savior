/* ===== Order Up! Module (🛎️ 英語打工大亂鬥) =====
   Overcooked-style listening game. A customer orders in a whole English
   sentence and the child BUILDS the order instead of picking an answer, so
   listening turns straight into action. The words that carry the meaning are
   exactly the ones Taiwanese kids drop: with / no / two / large / small.

   "no tomato" is a real instruction here, not a freebie — items arrive with
   their default ingredients already on, so the child has to take the tomato
   off. That is the whole reason negation is worth drilling.

   The zone holds TWO worlds sharing this engine (ORDER_WORLDS in
   js/data/order.js): 🍜 餐飲 (25 restaurants) and 🏪 生活服務 (20 counters).
   Separate save keys and separate `served` counters, so the life world starts
   from zero instead of behind 248 restaurant orders.

   Save: localStorage `english_savior_order` / `english_savior_life`
     { served, shops, shop, best: { shopId: bestShift }, diff, taught, world? }
*/

const OrderGame = (() => {
  const ZONE_NAME = '英語打工大亂鬥';
  const SHIFT_LEN = 6;   // customers per shift

  // `facts` is the ceiling on how much the child has to remember at once (see
  // factsOf). Without it, qty / size / temperature / amount are independent dice
  // and hard mode can roll a nine-fact, twenty-four-word order on three replays.
  const DIFFS = {
    easy:   { label: '簡單', xp: 10, gem: 1, bonus: 10, lines: [1, 1], mods: 0,
              qty: false, size: false, showText: true, replays: 99, facts: 2,
              desc: '一樣東西、不加料，句子看得到' },
    medium: { label: '中等', xp: 14, gem: 1, bonus: 15, lines: [1, 2], mods: 1,
              qty: false, size: true, showText: false, replays: 99, facts: 5,
              desc: '兩樣、會加料或說不要，句子藏起來（可無限重聽）' },
    hard:   { label: '困難', xp: 18, gem: 2, bonus: 20, lines: [2, 3], mods: 3,
              qty: true, size: true, showText: false, replays: 3, facts: 8,
              desc: '最多三樣＋數量＋大小杯，只能重聽 3 次' },
  };

  let els = {};
  // Two worlds share this engine (see ORDER_WORLDS). Both saves are loaded at
  // init; `save` is a pointer into `saves`, never a copy — and persist() takes
  // the world explicitly so a callback that fires after a world switch cannot
  // write one world's progress under the other world's key.
  const blank = () => ({ served: 0, shops: 1, shop: 0, best: {}, diff: 'easy', taught: {} });
  const saves = {};
  ORDER_WORLDS.forEach(w => { saves[w.id] = blank(); });
  // Bound at load, not in init(): validate_order.js evals this module headlessly
  // and calls the pure hooks without ever running init().
  let world = ORDER_WORLDS[0];
  let save = saves[world.id];
  let difficulty = 'easy';

  // ---- current shift ----
  let shop = null, shopIndex = 0;
  let order = null;        // [{ w, qty, size, temp, ing: [], added, dropped, lv }]
  let sentence = '';
  let tray = [];           // [{ w, qty, size, temp, ing: [], lv }]
  // 內用/外帶 is an ORDER-level answer, not a per-item one, so it lives beside
  // `order`/`tray` rather than inside them: turning those into { lines, place }
  // would touch a dozen order.forEach / tray.find call sites for no gain.
  let orderAsks = {};      // { place: 'to go' } — what THIS customer asked for
  let trayAsks = {};       // what the child picked; a missing key means "not answered"
  let customer = 0, correctCount = 0, replaysLeft = 0, retried = false;
  let running = false;
  let nextTimer = null;

  const CUSTOMERS = ['🧒', '👦', '👧', '🧑', '👩', '👨', '👵', '👴', '🧔', '👱‍♀️'];

  const SHOPS = () => world.shops;
  const REGIONS = () => world.regions;
  const T = () => world.t;

  const itemOf = w => shop.menu.find(m => m.w === w);
  const extraOf = w => ORDER_EXTRAS[w] || { zh: w, e: '•' };

  /* ================= choice axes =================
     A "choice" is a word the customer attaches to ONE item to say which kind
     they want: hot/iced, one-way/round-trip, a medium shirt, in blue, for two
     nights. They are all the same shape, so they live in one table instead of
     four near-identical code paths through lineText/checkOrder/renderTray.

     `slot` orders the words around the noun: < 5 goes in front (adjectives, in
     English order: size 1, colour 2, kind 3), >= 5 goes behind (phrases). The
     noun itself sits at 5. That is what makes "a medium blue t-shirt" and
     "a large iced tea" both come out right with no special cases.

     `field` says where the answer is stored on a line. `temp` keeps its own
     literal `line.temp` — the game's tests read it by name, and one documented
     special case is far cheaper than migrating them. Everything else lives in
     `line.ch`.

     `sizes` is deliberately NOT in here. It looks similar but behaves
     differently in four ways (tray default 'small', a DIFFS switch, counted by
     factsOf, stripped by trimToBudget), and folding it in would buy nothing.
     A garment size is a `fit` choice instead, which is the more accurate model:
     an unheard "large coffee" means the child didn't care, an unheard "medium
     shirt" means they missed it — so one wants a default and the other must not
     have one.
  */
  const ORDER_CHOICES = {
    temp: {
      slot: 3, feat: 'temps', field: 'temp', noun: '冷熱', ask: '冰的還是熱的？',
      cls: 'od-temp', attr: 'data-temp',
      opts: [{ w: 'hot', zh: '熱的', btn: '熱', e: '🔥' },
             { w: 'iced', zh: '冰的', btn: '冰', e: '🧊' }],
    },
    // 🚉 出門辦事. Structurally identical to hot/iced — a two-way adjective in
    // front of the noun — which is exactly why the registry exists.
    trip: {
      slot: 3, feat: 'trip', noun: '單程來回',
      opts: [{ w: 'one-way', zh: '單程', btn: '單程', e: '➡️' },
             { w: 'round-trip', zh: '來回', btn: '來回', e: '🔁' }],
    },
    // 👕 挑選與試穿. Slots 1 and 2 put these BEFORE hot/iced, which is the real
    // English order for the stack a clothes shop needs: "a medium blue t-shirt".
    // Deliberately NOT merged into `sizes`: an unheard "large coffee" means the
    // child didn't mind, so small is a fair default; an unheard "medium shirt"
    // means they missed it, so the tray must start empty and be marked wrong.
    fit: {
      slot: 1, feat: 'fit', noun: '尺寸',
      opts: [{ w: 'small', zh: '小號', btn: 'S', e: '🩳' },
             { w: 'medium', zh: '中號', btn: 'M', e: '👕' },
             { w: 'large', zh: '大號', btn: 'L', e: '🧥' }],
    },
    colour: {
      slot: 2, feat: 'colour', noun: '顏色',
      opts: [{ w: 'black', zh: '黑色', btn: '黑', e: '⬛' },
             { w: 'white', zh: '白色', btn: '白', e: '⬜' },
             { w: 'red', zh: '紅色', btn: '紅', e: '🟥' },
             { w: 'blue', zh: '藍色', btn: '藍', e: '🟦' },
             { w: 'green', zh: '綠色', btn: '綠', e: '🟩' }],
    },
    /* 🛎️ 服務與等待 — how long. Deliberately an ENUMERATED PHRASE at slot 9,
       not a second number field. "a room for two nights" counts nights, not
       rooms, so a second − 2 + stepper next to the quantity one would be two
       identical-looking counters in front of a nine-year-old. Spelling the
       options out also makes "for one nights" unconstructable — the singular is
       guaranteed by the list rather than by a pluralisation rule this file would
       otherwise have to invent, and get wrong.
       Both axes share feat 'stay': one region teaches "how long", and each item
       carries whichever unit is real for it. No item ever has both. */
    nights: {
      slot: 9, feat: 'stay', noun: '住幾晚',
      opts: [{ w: 'for one night', zh: '一晚', btn: '1 晚', e: '🌙' },
             { w: 'for two nights', zh: '兩晚', btn: '2 晚', e: '🌙' },
             { w: 'for three nights', zh: '三晚', btn: '3 晚', e: '🌙' }],
    },
    hours: {
      slot: 9, feat: 'stay', noun: '借幾小時',
      opts: [{ w: 'for one hour', zh: '一小時', btn: '1 hr', e: '⏱️' },
             { w: 'for two hours', zh: '兩小時', btn: '2 hr', e: '⏱️' },
             { w: 'for three hours', zh: '三小時', btn: '3 hr', e: '⏱️' }],
    },
  };

  const chAxis = id => ORDER_CHOICES[id];
  const chGet = (line, id) =>
    (ORDER_CHOICES[id].field ? line[ORDER_CHOICES[id].field] : (line.ch || {})[id]) || null;
  function chSet(line, id, v) {
    const f = ORDER_CHOICES[id].field;
    if (f) line[f] = v;
    else { line.ch = line.ch || {}; if (v == null) delete line.ch[id]; else line.ch[id] = v; }
  }
  const chOpt = (id, w) => ORDER_CHOICES[id].opts.find(o => o.w === w) || { w, zh: w };
  // Which axes this item actually offers, in slot order. An axis only counts if
  // the region has switched its feature on — same rule as every other pattern.
  const choicesOf = item => {
    const ids = item.choices ? item.choices.slice() : (item.temps ? ['temp'] : []);
    return ids.filter(id => ORDER_CHOICES[id] && hasFeature(ORDER_CHOICES[id].feat))
      .sort((a, b) => ORDER_CHOICES[a].slot - ORDER_CHOICES[b].slot);
  };
  const regionOf = s => REGIONS().find(r => r.id === s.region) || REGIONS()[0];

  // Sentence patterns are INHERITED: a shop gets its own region's pattern plus
  // every earlier region's, so a later region can never silently drop one. A
  // shop may still opt in early with its own flag.
  function featuresOf(s) {
    const on = new Set();
    for (const r of REGIONS()) {
      teachesOf(r).forEach(f => on.add(f));
      if (r.id === s.region) break;
    }
    PATTERN_FEATURES().forEach(f => { if (s[f]) on.add(f); });
    return on;
  }

  // A region may introduce more than one pattern at once when they only make
  // sense together — a clothes shop that taught size but not colour would be
  // teaching half a phrase. Always an array, so callers never branch.
  const teachesOf = r => (!r || !r.teaches) ? [] : [].concat(r.teaches);

  // What THIS shop exists to teach: its region's patterns plus anything it opted
  // into early. Everything else it has is inherited revision. The distinction
  // drives the choice budget below — same rule factsOf already uses for asks.
  function ownFeatures(s) {
    return new Set([
      ...teachesOf(regionOf(s)),
      ...PATTERN_FEATURES().filter(f => s[f]),
    ]);
  }

  // Every pattern flag a shop may switch on early. Derived from the choice
  // registry so adding an axis never needs this list edited — forgetting it is
  // silent (the axis simply never appears) and that is the worst kind of bug.
  const PATTERN_FEATURES = () => [...new Set([
    'amt',
    ...Object.values(ORDER_CHOICES).map(a => a.feat),
    ...Object.values(ORDER_ASKS).map(a => a.feat),
  ])];

  /* ================= save ================= */

  function loadSave(w) {
    saves[w.id] = blank();
    try {
      const d = JSON.parse(localStorage.getItem(w.saveKey));
      if (d && typeof d === 'object') {
        saves[w.id] = {
          served: Number(d.served) || 0,
          shops: Number(d.shops) || 1,
          shop: Number(d.shop) || 0,
          best: d.best && typeof d.best === 'object' ? d.best : {},
          diff: DIFFS[d.diff] ? d.diff : 'easy',
          // which sentence patterns the child has already been shown a card for
          taught: d.taught && typeof d.taught === 'object' ? d.taught : {},
          // which world the child was last in — remembered in the FOOD save so a
          // fresh/old save always lands on the restaurant, which is what every
          // existing test and every existing player expects
          world: typeof d.world === 'string' ? d.world : undefined,
        };
      }
    } catch { /* first run */ }
    saves[w.id].shops = shopsOpen(w);
  }

  function persist(w = world) {
    const sv = saves[w.id];
    if (!sv) return;
    if (w === world) sv.diff = difficulty;
    try { localStorage.setItem(w.saveKey, JSON.stringify(sv)); } catch { /* quota */ }
  }

  function shopsOpen(w = world) {
    const sv = saves[w.id];
    return Math.max(1, w.shops.filter(s => sv.served >= s.unlockAt).length);
  }

  /* ================= order generation ================= */

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function makeOrder() {
    const cfg = DIFFS[difficulty];
    const n = cfg.lines[0] + rand(cfg.lines[1] - cfg.lines[0] + 1);
    const chosen = shuffled(shop.menu).slice(0, Math.min(n, shop.menu.length));

    // with/no/extra/less phrases are budgeted across the WHOLE order, not per
    // item: three items each carrying "with X and Y, no Z" is unparseable by ear
    // even for an adult, and this is a listening game, not a memory test.
    const amt = hasFeature('amt');
    let budget = cfg.mods;
    // Easy mode has mods: 0, so without this the child would meet extra/less for
    // the first time in medium, where the sentence is hidden. One item, one
    // "extra", sentence on screen is the right introduction.
    // Not every easy order, or the region's easy mode would never once show a
    // plain "Can I have a naan, please?" again.
    let forceLevel = false;
    if (amt && !budget && Math.random() < 0.6) { budget = 1; forceLevel = true; }
    // "no X" is the highest-value phrase in the game and must not be diluted by a
    // third axis, so amounts get a per-order sub-cap on top of the shared budget.
    let levelsLeft = amt ? (difficulty === 'hard' ? 2 : 1) : 0;

    orderAsks = makeAsks();

    // Choice axes are exempt from DIFFS.facts on purpose (see factsOf), but a
    // hard three-line order at a clothes shop could otherwise carry six of them
    // uncounted. So they get their own per-order budget — and, exactly like the
    // asks, whatever THIS shop is here to teach is mandatory and free: a size
    // budget that stripped "a medium blue t-shirt" back to "a t-shirt" would
    // mean the region never once teaches its own phrase.
    const mustCh = ownFeatures(shop);
    let chLeft = { easy: 1, medium: 2, hard: 3 }[difficulty] || 2;

    return trimToBudget(chosen.map(item => {
      // Quantity only where "two ___" is real English (the data marks those)
      const qty = cfg.qty && item.pl && Math.random() < 0.45 ? 2 + rand(2) : 1;
      const size = cfg.size && item.sizes && Math.random() < 0.6 ? pick(['small', 'large']) : null;
      // Choices have no DIFFS switch on purpose: a shop with `temps` items IS the
      // shop that teaches hot/iced, and its EASY mode — one item, no add-ons,
      // sentence on screen — is the ideal first meeting with the word. Gating it
      // by difficulty would introduce "iced" for the first time in medium, where
      // the sentence is hidden.
      const line = { w: item.w, qty, size, temp: null, ch: {} };
      const setCh = id => chSet(line, id, pick(ORDER_CHOICES[id].opts).w);
      const cs = choicesOf(item);
      const must = cs.filter(id => mustCh.has(ORDER_CHOICES[id].feat));
      must.forEach(setCh);
      // no line carries more than two axes however much budget is left — three
      // adjectives stacked on one noun stops being listenable
      let room = 2 - must.length;
      cs.filter(id => !mustCh.has(ORDER_CHOICES[id].feat)).forEach(id => {
        if (room > 0 && chLeft > 0 && Math.random() < 0.6) { setCh(id); room--; chLeft--; }
      });
      // "two rooms for two nights" is two different numbers in one breath, and
      // the second one does not count rooms. A duration wins: it is what this
      // region is teaching, so the quantity drops back to one.
      if (cs.some(id => ORDER_CHOICES[id].slot >= 5 && chGet(line, id))) line.qty = 1;

      let take = forceLevel ? 1 : (budget > 0 ? rand(Math.min(budget, 2) + 1) : 0);
      budget -= take;
      const added = [], dropped = [];
      const lv = {};
      const canAdd = shuffled(item.ex || []);
      const canDrop = shuffled(item.def || []);
      // extra/less only ever applies to a `def` ingredient, and only to the ones
      // the data marks uncountable ("extra pickle" is not a thing). Keeping it off
      // `added` means a def ingredient carries exactly one of {—, no, extra, less}
      // so nothing is ever ambiguous, in the sentence or on the tray.
      const canAmt = shuffled((item.def || []).filter(x => (ORDER_EXTRAS[x] || {}).amt));
      while (take-- > 0) {
        const wantLevel = amt && canAmt.length && levelsLeft > 0
          && (forceLevel || Math.random() < 0.25);
        // otherwise prefer whichever kind still has options, so "no ..." keeps
        // showing up: drop 40 / add 35 / level 25
        if (wantLevel) {
          const x = canAmt.pop();
          lv[x] = Math.random() < 0.5 ? 'extra' : 'less';
          levelsLeft--;
          // that ingredient is now spoken for — it can't also be refused
          const i = canDrop.indexOf(x);
          if (i >= 0) canDrop.splice(i, 1);
        } else if (canDrop.length && (!canAdd.length || Math.random() < 0.53)) {
          const x = canDrop.pop();
          dropped.push(x);
          // and it can no longer be adjusted — "with extra soy sauce, no soy
          // sauce" on one item is nonsense, and this exclusion has to hold in
          // BOTH orders, not just level-then-drop
          const i = canAmt.indexOf(x);
          if (i >= 0) canAmt.splice(i, 1);
          delete lv[x];
        } else if (canAdd.length) added.push(canAdd.pop());
        else budget++;   // nothing left to modify on this item — give it back
      }
      const ing = (item.def || []).filter(x => !dropped.includes(x)).concat(added);
      return Object.assign(line, { ing, added, dropped, lv });
    }));
  }

  // Never store 'normal': a present key with a normal value would make two
  // otherwise-identical lines compare unequal.
  const lvOf = (line, x) => (line && line.lv && line.lv[x]) || null;

  // The OPTIONAL load: qty / size / mods are independent dice rolls, so hard mode
  // could roll a 24-word order with nine facts in it — and hard only gets a
  // couple of replays.
  //
  // 內用/外帶 and hot/iced are deliberately NOT counted. They are the reason the
  // region exists, they are mandatory there, and making them compete for the
  // budget had a nasty consequence: in 百貨美食層 the compulsory "for here" ate
  // easy mode's entire allowance, so "iced" never once appeared in the mode whose
  // whole job is to introduce it (one item, no add-ons, sentence on screen).
  function factsOf(o) {
    let n = 0;
    o.forEach(l => {
      n += 1;
      if (l.qty > 1) n++;
      if (l.size) n++;
      n += l.added.length + l.dropped.length + Object.keys(l.lv || {}).length;
    });
    return n;
  }

  // Peel optional facts off until the order fits, oldest lesson first. Trimming
  // starts from the LAST item, so the front of the sentence — the part a child
  // still has attention for — keeps its detail.
  function trimToBudget(o) {
    const cap = DIFFS[difficulty].facts;
    if (!cap) return o;
    const strip = [
      l => { if (l.size) { l.size = null; return true; } },
      l => { if (l.qty > 1) { l.qty = 1; return true; } },
    ];
    for (const step of strip) {
      for (let i = o.length - 1; i >= 0 && factsOf(o) > cap; i--) step(o[i]);
      if (factsOf(o) <= cap) break;
    }
    return o;
  }

  // Always asked in a `togo` shop, at every difficulty, 50/50 either way.
  // Omitting it at random would teach the child to ignore it, and it would make
  // "always press 外帶" a winning strategy (it passes every "to go" and every
  // customer who didn't ask, and only fails "for here").
  // Deliberately NOT part of the mods budget: it is always in the same slot,
  // right before `please`, so the cost to the ear is close to nothing.
  const hasFeature = f => featuresOf(shop).has(f);
  // The amount buttons only appear where the customer could actually have asked:
  // on a `def` ingredient the data marks uncountable, in a region that teaches it.
  const canLevel = (item, x) =>
    hasFeature('amt') && (item.def || []).includes(x) && !!(ORDER_EXTRAS[x] || {}).amt;

  /* ================= order-level asks =================
     An "ask" is one answer that belongs to the WHOLE order rather than to any
     item: 內用/外帶, or when the customer wants to pick something up.

     `comma` is the part that matters linguistically. "for here" / "to go" are
     parenthetical, so ", to go, please" is right and the comma is load-bearing
     (TTS pauses on it, which is the only way a child hears the phrase as one
     unit). But ", tomorrow, please" is NOT how anyone speaks — that phrase runs
     straight on, and printing a comma there would be teaching wrong English.
     So each ask declares its own punctuation.
  */
  const ORDER_ASKS = {
    place: {
      feat: 'togo', comma: true, noun: '內用還是外帶', label: '內用還是外帶？',
      cls: 'od-place', attr: 'data-place',
      opts: [{ w: 'for here', zh: '內用', e: '🍽️' }, { w: 'to go', zh: '外帶', e: '🥡' }],
    },
    // comma: false — "Can I have a haircut tomorrow, please?" runs straight on.
    // Printing ", tomorrow," would be teaching a pause nobody makes.
    when: {
      feat: 'when', comma: false, noun: '時間', label: '什麼時候？',
      cls: 'od-when', attr: 'data-when',
      opts: [
        { w: 'today', zh: '今天', e: '📅' },
        { w: 'tomorrow', zh: '明天', e: '🌅' },
        { w: "at three o'clock", zh: '三點', e: '🕒' },
        { w: "at five o'clock", zh: '五點', e: '🕔' },
        // These two override the ask's comma:false. A bare adverbial runs on,
        // but a "for ..." phrase landing right after a "no butter" clause reads
        // as "no butter for the show" — so it takes the parenthetical comma back.
        // `only` — a cinema line, so no shop gets it unless it names it
        { w: 'for the four o\'clock show', zh: '四點那場', e: '🎬', comma: true, only: true },
        { w: 'for the seven o\'clock show', zh: '七點那場', e: '🎬', comma: true, only: true },
      ],
    },
  };

  const asksOf = s2 => Object.keys(ORDER_ASKS).filter(id => featuresOf(s2).has(ORDER_ASKS[id].feat));
  const askOpt = (id, w) => ORDER_ASKS[id].opts.find(o => o.w === w) || { w, zh: w };
  // A shop may narrow the options — "for the seven o'clock show" is right at a
  // cinema and absurd at a bank. Options flagged `only` are OUT of the default
  // set and have to be asked for by name: defaulting to "every option" meant a
  // clothes shop that simply didn't mention `when` inherited the cinema's lines
  // and sold backpacks "for the four o'clock show".
  const askOpts = id => {
    const only = (shop.askOpts || {})[id];
    return only ? ORDER_ASKS[id].opts.filter(o => only.includes(o.w))
                : ORDER_ASKS[id].opts.filter(o => !o.only);
  };

  function makeAsks() {
    const out = {};
    asksOf(shop).forEach(id => { out[id] = pick(askOpts(id)).w; });
    return out;
  }

  function listWords(arr) {
    if (arr.length <= 1) return arr.map(x => x).join('');
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
  }

  const NUM = ['zero', 'one', 'two', 'three', 'four'];

  // a/an is decided by the first word actually SPOKEN, not by the noun: an
  // adjective can sit in between ("an iced tea" but "a hot tea"), so the data
  // cannot hard-code it. This vocabulary is small and closed, so an explicit
  // exception set beats a clever heuristic.
  const AN_EXCEPTIONS = new Set(['hour', 'honest', 'honor', 'herb', 'herbal']);
  const A_EXCEPTIONS = /^(uni|use|usu|eu|one)/;   // vowel letter, consonant sound

  function articleFor(word) {
    const w = String(word || '').toLowerCase();
    if (AN_EXCEPTIONS.has(w)) return 'an';
    if (A_EXCEPTIONS.test(w)) return 'a';
    return /^[aeiou]/.test(w) ? 'an' : 'a';
  }

  function lineText(line) {
    const item = itemOf(line.w);
    const noun = line.qty === 1 ? item.w : (item.pl || item.w);
    // Everything the customer said about this item, sorted around the noun by
    // slot: "two large iced teas" (size 1 … kind 3, noun 5) and "a room for two
    // nights" (phrase at 9). `size` is not a choice axis but occupies slot 1.
    const parts = [];
    if (line.size) parts.push({ slot: 1, w: line.size });
    choicesOf(item).forEach(id => {
      const v = chGet(line, id);
      if (v) parts.push({ slot: ORDER_CHOICES[id].slot, w: v });
    });
    parts.push({ slot: 5, w: noun });
    parts.sort((a, b) => a.slot - b.slot);
    const words = parts.map(p => p.w);
    const first = words[0];
    let head;
    if (line.qty > 1) head = `${NUM[line.qty]} ${words.join(' ')}`;
    else if (item.art === 'some') head = `some ${words.join(' ')}`;
    else head = `${articleFor(first)} ${words.join(' ')}`;
    let s = head;
    // Plain add-ons first, adjusted ones last, each modifier hugging its own
    // noun: "with extra pearls and honey" leaves a listener unable to tell
    // whether "extra" reaches the honey.
    const adds = line.added.concat(
      Object.keys(line.lv || {}).map(x => `${line.lv[x]} ${x}`));
    if (adds.length) s += ` with ${listWords(adds)}`;
    if (line.dropped.length) s += `, no ${line.dropped.join(' or ')}`;
    return s;
  }

  // Items are separated by commas with a final "and", because a line can itself
  // contain "with A and B" — joining every line with "and" runs them together.
  function buildSentence(o, asks) {
    const parts = o.map(lineText);
    let body;
    if (parts.length === 1) body = parts[0];
    else if (parts.length === 2) body = `${parts[0]}, and ${parts[1]}`;
    else body = `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
    const opener = pick(shop.openers || world.openers);
    // "Can I have ... please." is a question wearing a full stop, and easy mode
    // shows the sentence on screen, so the punctuation is being taught too.
    const end = /^(Can|Could|May)\b/.test(opener) ? '?' : '.';
    // Each ask brings its own punctuation — see ORDER_ASKS. A parenthetical like
    // "to go" is comma-wrapped; a run-on adverbial like "tomorrow" is not.
    let tail = '';
    Object.keys(asks || {}).forEach(id => {
      if (!ORDER_ASKS[id]) return;
      const a = ORDER_ASKS[id];
      const opt = a.opts.find(o => o.w === asks[id]);
      const comma = opt && opt.comma !== undefined ? opt.comma : a.comma;
      tail += (comma ? ', ' : ' ') + asks[id];
    });
    return `${opener} ${body}${tail}, please${end}`;
  }

  /* ================= shift flow ================= */

  function startShift(i) {
    clearTimeout(nextTimer);
    shopIndex = i;
    shop = SHOPS()[i];
    save.shop = i;
    persist();
    customer = 0;
    correctCount = 0;
    running = true;
    GameEngine.setDeferLevelUp(true);
    els.shops.classList.remove('open');
    els.done.classList.remove('open');
    els.start.style.display = 'none';
    els.floor.style.display = '';
    nextCustomer();
    teachRegion();
  }

  // A brand-new sentence pattern used to appear with no explanation whatsoever.
  // The region's `tip` is shown once, the first time the child works a shop that
  // introduces it, and remembered in save.taught.
  function teachRegion() {
    const r = regionOf(shop);
    const fs = teachesOf(r);
    // shown once if ANY of the region's patterns is new; still keyed per pattern
    // so saves written before regions could teach two things keep working
    if (!fs.length || fs.every(f => save.taught[f])) return;
    fs.forEach(f => { save.taught[f] = 1; });
    persist();
    els.result.innerHTML =
      `<div class="od-result ok od-teach"><strong>${r.e} ${r.name}：新句型！</strong>
        <p>${r.tip}</p></div>`;
  }

  function nextCustomer() {
    if (customer >= SHIFT_LEN) { finishShift(); return; }
    order = makeOrder();          // also sets orderAsks
    sentence = buildSentence(order, orderAsks);
    resetTray();
    // The previous customer's verdict used to stay on screen while the next one
    // was already talking — and it kept the once-per-region teaching card alive
    // for the whole shift.
    if (els.result) els.result.innerHTML = '';
    retried = false;
    replaysLeft = DIFFS[difficulty].replays;
    renderAll();
    speak();
  }

  function speak() {
    if (typeof TTSManager !== 'undefined') TTSManager.speak(sentence, 'en-US', 0.85);
  }

  function replay() {
    if (replaysLeft <= 0) return;
    if (DIFFS[difficulty].replays < 99) replaysLeft--;
    speak();
    renderOrderBar();
  }

  /* ================= tray editing ================= */

  // One place to clear everything the child has answered. Order-level answers
  // (內用/外帶) live outside `tray`, so three scattered `tray = []` would leave
  // the previous customer's answer sitting there for the next one.
  function resetTray() {
    tray = [];
    trayAsks = {};      // empty, not pre-filled — "not answered yet" is honest
  }

  function setAsk(id, v) {
    if (!running || !ORDER_ASKS[id]) return;
    trayAsks[id] = v;
    renderTray();
  }
  const setPlace = p => setAsk('place', p);

  function addToTray(w) {
    if (!running) return;
    const item = itemOf(w);
    const line = tray.find(t => t.w === w);
    if (line) line.qty = Math.min(4, line.qty + 1);
    // size defaults to small because "didn't say" means "doesn't mind", but temp
    // has NO default: pre-selecting 'hot' would silently pass every order whose
    // "hot" the child never heard.
    else tray.push({ w, qty: 1, size: item.sizes ? 'small' : null, temp: null, ch: {}, ing: (item.def || []).slice() });
    renderTray();
  }

  function removeLine(w) { tray = tray.filter(t => t.w !== w); renderTray(); }

  function bumpQty(w, d) {
    const line = tray.find(t => t.w === w);
    if (!line) return;
    // clamped like addToTray — NUM only goes up to four
    line.qty = Math.min(4, line.qty + d);
    if (line.qty <= 0) removeLine(w); else renderTray();
  }

  function setSize(w, size) {
    const line = tray.find(t => t.w === w);
    if (line) { line.size = size; renderTray(); }
  }

  function setChoice(w, id, v) {
    const line = tray.find(t => t.w === w);
    if (line && ORDER_CHOICES[id]) { chSet(line, id, v); renderTray(); }
  }
  const setTemp = (w, temp) => setChoice(w, 'temp', temp);

  function toggleIng(w, ing) {
    const line = tray.find(t => t.w === w);
    if (!line) return;
    const i = line.ing.indexOf(ing);
    if (i >= 0) {
      line.ing.splice(i, 1);
      // Taking the ingredient off must clear its amount too, or checkOrder would
      // report a 份量 mistake on something that is not even on the plate — the
      // kind of ghost error that makes a child give up.
      if (line.lv) delete line.lv[ing];
    } else line.ing.push(ing);
    renderTray();
  }

  // The amount IS the ingredient's size: two independent toggles, at most one lit,
  // exactly the interaction the child already learned from small/large.
  function setLevel(w, ing, level) {
    const line = tray.find(t => t.w === w);
    if (!line || !line.ing.includes(ing)) return;
    line.lv = line.lv || {};
    if (lvOf(line, ing) === level) delete line.lv[ing];   // press again to clear
    else line.lv[ing] = level;
    renderTray();
  }

  /* ================= serving ================= */

  // How much of the order a mistake ruins, worst first. Packaging comes last on
  // purpose: leading with 「內用還是外帶」 when the burger itself is wrong would
  // teach the child the wrong priority.
  // Packaging is last on purpose: leading with 「內用還是外帶」 while the burger
  // itself is wrong would teach the child exactly the wrong priority.
  const RANK = { missing: 0, extra: 1, qty: 2, size: 3, temp: 4, ing: 5, lv: 6, place: 7 };
  const SHOW_MAX = 3;      // lines the child reads
  const PER_ITEM_MAX = 2;  // …of which at most two may come from one item

  // Returns { all, shown, right }: `all` decides pass/fail, `shown` is what the
  // child reads, `right` is what they already got correct. Twelve <li> of failure
  // is a beating, not a lesson — and nobody remembers twelve things on a replay.
  function checkOrder() {
    const problems = [];   // { rank, key, msg }
    const right = [];
    order.forEach(o => {
      const t = tray.find(x => x.w === o.w);
      const item = itemOf(o.w);
      const add = (rank, msg) => problems.push({ rank, key: o.w, msg });
      if (!t) { add(RANK.missing, `少了 ${item.e} ${item.zh}（${o.w}）`); return; }
      const before = problems.length;
      if (t.qty !== o.qty) add(RANK.qty, `${item.zh} 的數量錯了：要 ${o.qty} 份，你做了 ${t.qty} 份`);
      if ((o.size || null) !== (t.size || null) && o.size) {
        add(RANK.size, `${item.zh} 的大小錯了：要 ${o.size === 'large' ? '大杯 large' : '小杯 small'}`);
      }
      // only compared when the customer actually said one
      choicesOf(item).forEach(id => {
        const want = chGet(o, id), got = chGet(t, id);
        if (!want || want === got) return;
        const ax = ORDER_CHOICES[id], opt = chOpt(id, want);
        add(RANK.temp, got
          ? `${item.zh} 的${ax.noun}錯了：客人說 ${want}（${opt.zh}）`
          : `${item.zh} 還沒選${ax.noun}：客人說 ${want}（${opt.zh}）`);
      });
      const want = [...o.ing].sort(), got = [...t.ing].sort();
      const missing = want.filter(x => !got.includes(x));
      const surplus = got.filter(x => !want.includes(x));
      // Amounts are only checked on ingredients that are actually on the plate,
      // and only when the ingredient itself is right — otherwise the same single
      // mistake gets reported twice.
      want.filter(x => got.includes(x)).forEach(x => {
        const wantLv = lvOf(o, x), gotLv = lvOf(t, x);
        if (wantLv === gotLv) return;
        const zh = `${extraOf(x).e} ${extraOf(x).zh}`;
        add(RANK.lv, wantLv
          ? `${item.zh} 的 ${zh} 份量錯了：客人說 ${wantLv} ${x}（${wantLv === 'extra' ? '多一點' : '少一點'}）`
          : `${item.zh} 的 ${zh} 客人沒有說要多還是少，照原本的份量就好`);
      });
      missing.forEach(x => add(RANK.ing, `${item.zh} 少加了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）`));
      // Two different mistakes, two different lessons: the customer refusing an
      // ingredient is not the same as the child adding one nobody asked for.
      // Saying 「客人說 no X」 for both taught the child to mishear the order.
      surplus.forEach(x => add(RANK.ing, o.dropped.includes(x)
        ? `${item.zh} 多了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）— 客人說 no ${x}，要拿掉`
        : `${item.zh} 多了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）— 客人沒有說要加這個`));
      if (problems.length === before) right.push(`${item.e} ${item.w}`);
    });
    tray.forEach(t => {
      if (!order.find(o => o.w === t.w)) {
        const item = itemOf(t.w);
        problems.push({ rank: RANK.extra, key: t.w, msg: `多做了 ${item.e} ${item.zh}（${t.w}），客人沒有點` });
      }
    });
    Object.keys(orderAsks).forEach(id => {
      const want = orderAsks[id], got = trayAsks[id];
      if (!want || want === got) return;
      const ax = ORDER_ASKS[id];
      problems.push({
        rank: RANK.place, key: '__' + id,
        msg: got
          ? `客人說 ${want}（${askOpt(id, want).zh}），你按成${askOpt(id, got).zh}了`
          : `客人說 ${want}（${askOpt(id, want).zh}），你還沒選${ax.noun}`,
      });
    });

    // Worst first, but no single item may eat the whole quota — otherwise one
    // completely botched item hides the mistake on the next one entirely.
    const perItem = {};
    const shown = problems
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .filter(p => (perItem[p.key] = (perItem[p.key] || 0) + 1) <= PER_ITEM_MAX)
      .slice(0, SHOW_MAX)
      .map(p => p.msg);

    return { all: problems.map(p => p.msg), shown, right, truncated: problems.length > shown.length };
  }

  function serve() {
    if (!running) return;
    if (!tray.length) { flash(T().emptyWarn, 'bad'); return; }
    const res = checkOrder();
    if (res.all.length) {
      SoundManager.playWrong();
      retried = true;
      // Leading with what already works is what makes a three-line cap feel safe
      // instead of arbitrary: the child can see the rest of the tray is fine.
      els.result.innerHTML =
        `<div class="od-result bad"><strong>😕 客人皺眉了…</strong>
          ${res.right.length ? `<p class="od-right">✅ 這些做對了：${res.right.join('　')}</p>` : ''}
          <ul>${res.shown.map(p => `<li>${p}</li>`).join('')}</ul>
          ${res.truncated ? '<p class="od-more">還有其他地方沒對上，再聽一次喔</p>' : ''}
          <p>再聽一次，改好之後重新送出！</p></div>`;
      renderOrderBar();
      return;
    }

    SoundManager.playCorrect();
    const cfg = DIFFS[difficulty];
    if (retried) {
      GameEngine.addXP(Math.floor(cfg.xp / 2));
    } else {
      GameEngine.addXP(cfg.xp);
      GameEngine.addGems(cfg.gem);
      correctCount++;
    }
    save.served++;
    const before = save.shops;
    save.shops = shopsOpen();
    persist();
    GameEngine.recordOrderServed();
    if (world.id !== 'food') GameEngine.recordLifeServed();
    if (save.shops > before) {
      if (world.id === 'food') GameEngine.recordOrderShop(save.shops);
      else GameEngine.recordLifeScene(save.shops);
      flash(`🎉 新${T().shopWord}開張：${SHOPS()[save.shops - 1].e} ${SHOPS()[save.shops - 1].name}！`, 'ok');
    }

    els.result.innerHTML =
      `<div class="od-result ok"><strong>😋 客人很滿意！</strong>
        <p class="od-sentence-reveal">${sentence}</p>
        <p>${retried ? `修正後完成 +${Math.floor(cfg.xp / 2)} XP` : `一次做對 +${cfg.xp} XP +${cfg.gem} 💎`}</p></div>`;
    customer++;
    renderOrderBar();
    // Held so switchWorld()/startShift() can cancel it: `running` alone is not
    // enough, because starting a fresh shift sets it back to true and lets a
    // 2.2s-old callback summon the previous world's next customer.
    nextTimer = setTimeout(() => { if (running) nextCustomer(); }, 2200);
  }

  function finishShift() {
    running = false;
    const cfg = DIFFS[difficulty];
    const perfect = correctCount === SHIFT_LEN;
    let gems = cfg.bonus;
    if (perfect) gems += 5;
    GameEngine.addGems(gems);
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    SoundManager.playQuestComplete();

    const best = save.best[shop.id] || 0;
    if (correctCount > best) { save.best[shop.id] = correctCount; persist(); }

    // the next shop still to open — not shopIndex+1, which makes the hint vanish
    // as soon as the child goes back to replay an earlier shop
    const nextShop = SHOPS().find(s => save.served < s.unlockAt);
    els.doneBody.innerHTML = `
      <div class="od-done-e">${shop.e}</div>
      <h3>${shop.name} ${T().closed}</h3>
      <p class="od-done-line">一次做對 <strong>${correctCount} / ${SHIFT_LEN}</strong> 位客人${perfect ? '　🏆 全對！' : ''}</p>
      <p class="od-done-reward">班別獎金 +${gems} 💎</p>
      <p class="od-done-line">累積${T().servedWord} <strong>${save.served}</strong> ${T().unitWord}　營業中 ${save.shops} / ${SHOPS().length} 個${T().shopWord}</p>
      ${nextShop
        ? `<p class="od-done-tip">🔒 再服務 ${nextShop.unlockAt - save.served} ${T().unitWord}就能開 ${nextShop.e} ${nextShop.name}！</p>` : ''}
      <div class="od-done-row">
        <button class="od-btn" id="od-again">🔄 再開一班</button>
        <button class="od-btn od-btn-main" id="od-toshops">${T().toShops}</button>
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#od-again').addEventListener('click', () => startShift(shopIndex));
    els.doneBody.querySelector('#od-toshops').addEventListener('click', () => { els.done.classList.remove('open'); openShops(); });
  }

  /* ================= render ================= */

  function renderAll() { renderOrderBar(); renderMenu(); renderTray(); }

  function renderOrderBar() {
    if (!els.bubble) return;   // validate_order.js evals this file with no DOM
    const face = CUSTOMERS[(customer + shopIndex) % CUSTOMERS.length];
    const cfg = DIFFS[difficulty];
    els.customer.textContent = face;
    els.progress.textContent = `第 ${Math.min(customer + 1, SHIFT_LEN)} / ${SHIFT_LEN} 位客人　一次做對 ${correctCount}`;
    els.bubble.innerHTML = cfg.showText
      ? `<span class="od-say">${sentence}</span>`
      : `<span class="od-say hidden">🔊 用聽的！按重聽再放一次</span>`;
    els.replay.textContent = cfg.replays < 99 ? `🔊 重聽（剩 ${replaysLeft}）` : '🔊 重聽';
    els.replay.disabled = replaysLeft <= 0;
  }

  const KIND_HEADS = { food: '🍽️ 餐點', drink: '🥤 飲料', side: '🍟 附餐', dessert: '🍰 甜點' };

  function renderMenu() {
    if (!els.menu) return;
    els.menu.innerHTML = '';
    // Derived from the data, not a hard-coded pair: a kind the list forgot used
    // to be invisible on the menu while makeOrder happily still ordered it, so
    // the customer asked for something the child physically could not make.
    const rank = k => { const i = Object.keys(KIND_HEADS).indexOf(k); return i < 0 ? 99 : i; };
    const kinds = [...new Set(shop.menu.map(m => m.kind))].sort((a, b) => rank(a) - rank(b));
    kinds.forEach(kind => {
      const list = shop.menu.filter(m => m.kind === kind);
      if (!list.length) return;
      const head = document.createElement('div');
      head.className = 'od-menu-head';
      head.textContent = KIND_HEADS[kind] || `🍴 ${kind}`;
      els.menu.appendChild(head);
      list.forEach(m => {
        const b = document.createElement('button');
        b.className = 'od-menu-item';
        b.innerHTML = `<span class="od-mi-e">${m.e}</span><span class="od-mi-w">${m.w}</span><span class="od-mi-zh">${m.zh}</span>`;
        b.addEventListener('click', () => addToTray(m.w));
        els.menu.appendChild(b);
      });
    });
  }

  function renderTray() {
    if (!els.tray) return;
    els.tray.innerHTML = '';
    // The 內用/外帶 row belongs to the order, not to any one item, so it sits at
    // the top of the tray and stays there even while the tray is still empty.
    Object.keys(orderAsks).forEach(id => {
      const ax = ORDER_ASKS[id];
      if (!ax) return;
      const row = document.createElement('div');
      // `cls` keeps each ask's original hook (.od-place) so the DOM contract holds
      row.className = 'od-ask' + (ax.cls ? ' ' + ax.cls : '');
      row.innerHTML = `<span class="od-ask-label">${ax.label}</span>`
        + askOpts(id).map(o => `<button data-ask="${id}" data-ask-v="${o.w}"${ax.attr ? ` ${ax.attr}="${o.w}"` : ''}
            class="${trayAsks[id] === o.w ? 'on' : ''}">${o.e ? o.e + ' ' : ''}${o.w}<small>${o.zh}</small></button>`).join('');
      row.querySelectorAll('[data-ask]').forEach(b =>
        b.addEventListener('click', () => setAsk(id, b.dataset.askV)));
      els.tray.appendChild(row);
    });
    if (!tray.length) {
      els.tray.insertAdjacentHTML('beforeend',
        `<p class="od-tray-empty">${T().empty}</p>`);
      return;
    }
    tray.forEach(t => {
      const item = itemOf(t.w);
      const line = document.createElement('div');
      line.className = 'od-line';

      const optional = (item.ex || []).filter(x => !t.ing.includes(x));
      line.innerHTML = `
        <div class="od-line-head">
          <span class="od-line-e">${item.e}</span>
          <span class="od-line-w">${item.w}<small>${item.zh}</small></span>
          <span class="od-qty">
            <button data-act="minus">−</button><b>${t.qty}</b><button data-act="plus">＋</button>
          </span>
          ${item.sizes ? `<span class="od-size">
            <button data-size="small" class="${t.size === 'small' ? 'on' : ''}">small 小</button>
            <button data-size="large" class="${t.size === 'large' ? 'on' : ''}">large 大</button>
          </span>` : ''}
          ${choicesOf(item).map(id => {
            const ax = ORDER_CHOICES[id];
            // `cls` keeps the original per-axis hook (.od-temp) so the DOM
            // contract the tests were written against does not move.
            return `<span class="od-size od-ch od-ch-${id}${ax.cls ? ' ' + ax.cls : ''}">
            ${ax.opts.map(o => `<button data-ch="${id}" data-ch-v="${o.w}"${ax.attr ? ` ${ax.attr}="${o.w}"` : ''}
              class="${chGet(t, id) === o.w ? 'on' : ''}">${o.e ? o.e + ' ' : ''}${o.w}${o.btn ? ' ' + o.btn : ''}</button>`).join('')}
          </span>`;
          }).join('')}
          <button class="od-line-x" data-act="del">✕</button>
        </div>
        <div class="od-ings">
          ${t.ing.map(x => `<span class="od-ing-wrap">
            <button class="od-ing on" data-ing="${x}">${extraOf(x).e} ${x}<small>${extraOf(x).zh}</small></button>
            ${canLevel(item, x) ? `<span class="od-size od-lv">
              <button data-lv="less" data-lv-ing="${x}" class="${lvOf(t, x) === 'less' ? 'on' : ''}">less 少</button>
              <button data-lv="extra" data-lv-ing="${x}" class="${lvOf(t, x) === 'extra' ? 'on' : ''}">extra 多</button>
            </span>` : ''}
          </span>`).join('')}
          ${optional.map(x => `<button class="od-ing" data-ing="${x}">＋ ${extraOf(x).e} ${x}<small>${extraOf(x).zh}</small></button>`).join('')}
        </div>`;

      line.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'plus') bumpQty(t.w, 1);
        else if (a === 'minus') bumpQty(t.w, -1);
        else removeLine(t.w);
      }));
      line.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => setSize(t.w, b.dataset.size)));
      line.querySelectorAll('[data-ch]').forEach(b =>
        b.addEventListener('click', () => setChoice(t.w, b.dataset.ch, b.dataset.chV)));
      line.querySelectorAll('[data-ing]').forEach(b => b.addEventListener('click', () => toggleIng(t.w, b.dataset.ing)));
      line.querySelectorAll('[data-lv]').forEach(b =>
        b.addEventListener('click', () => setLevel(t.w, b.dataset.lvIng, b.dataset.lv)));
      els.tray.appendChild(line);
    });
  }

  function flash(msg, kind) {
    els.flash.textContent = msg;
    els.flash.className = 'od-flash show ' + (kind || '');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { els.flash.className = 'od-flash'; }, 3200);
  }

  /* ================= worlds ================= */

  function useWorld(id) {
    world = ORDER_WORLDS.find(w => w.id === id) || ORDER_WORLDS[0];
    save = saves[world.id];
    difficulty = DIFFS[save.diff] ? save.diff : 'easy';
    save.shops = shopsOpen();
  }

  function switchWorld(id) {
    if (world && world.id === id) return;
    clearTimeout(nextTimer);
    running = false;
    // A shift abandoned mid-way would otherwise leave level-ups deferred for
    // ever, and the tray/asks of the world we are leaving would linger.
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    persist();
    useWorld(id);
    // remembered in the food save, so an old or fresh save always lands on 餐飲
    saves.food.world = id;
    persist(ORDER_WORLDS[0]);
    resetTray();
    order = null;
    sentence = '';
    applyWorldStrings();
    els.floor.style.display = 'none';
    els.start.style.display = '';
    els.result.innerHTML = '';
    openShops();
  }

  // The shell is built once; only these labels differ between worlds, so they
  // are set here instead of rebuilding (and re-binding) the whole screen.
  function applyWorldStrings() {
    if (!els.root) return;
    const t = T();
    els.startTitle.textContent = `${world.e} ${ZONE_NAME}`;
    els.startIntro.innerHTML = t.intro;
    els.trayTitle.textContent = t.tray;
    els.serve.textContent = t.serve;
    els.shopsBtn.textContent = t.toShops;
    els.shopsTitle.textContent = t.shopsTitle;
    renderWorldRow();
  }

  function renderWorldRow() {
    if (!els.worldRow || ORDER_WORLDS.length < 2) return;
    els.worldRow.innerHTML = '';
    ORDER_WORLDS.forEach(w => {
      const b = document.createElement('button');
      b.className = 'od-world-btn' + (w.id === world.id ? ' active' : '');
      b.innerHTML = `<strong>${w.e} ${w.name}</strong><span>${w.sub}</span>`;
      b.addEventListener('click', () => switchWorld(w.id));
      els.worldRow.appendChild(b);
    });
  }

  /* ================= shops ================= */

  function openShops() {
    els.shopSub.textContent = `累積${T().servedWord} ${save.served} ${T().unitWord}　營業中 ${shopsOpen()} / ${SHOPS().length}`;
    renderDiffRow(els.diffRow2);
    els.shopList.innerHTML = '';
    // grouped by region, like the wizard's openLevels() groups by chapter — the
    // region heading is where the new sentence pattern gets announced
    REGIONS().forEach(r => {
      const shops = SHOPS().map((s, i) => ({ s, i })).filter(({ s }) => s.region === r.id);
      if (!shops.length) return;
      const openCount = shops.filter(({ s }) => save.served >= s.unlockAt).length;
      const sec = document.createElement('div');
      sec.className = 'od-region' + (openCount ? '' : ' locked');
      sec.innerHTML = `<h4>${r.e} ${r.name}<small>${openCount} / ${shops.length} ${T().shopWord}</small></h4>
        <p class="od-region-tip">${r.tip}</p>`;
      const grid = document.createElement('div');
      grid.className = 'od-region-grid';
      shops.forEach(({ s, i }) => {
        const open = save.served >= s.unlockAt;
        const b = document.createElement('button');
        b.className = 'od-shop' + (open ? '' : ' locked');
        b.disabled = !open;
        b.innerHTML = open
          ? `<span class="od-shop-e">${s.e}</span><span class="od-shop-name">${s.name}</span>
             <span class="od-shop-meta">${s.menu.length} 種${save.best[s.id] ? `　最佳 ${save.best[s.id]}/${SHIFT_LEN}` : ''}</span>`
          : `<span class="od-shop-e">🔒</span><span class="od-shop-name">${s.name}</span>
             <span class="od-shop-meta">服務滿 ${s.unlockAt} ${T().unitWord}才開張（還差 ${s.unlockAt - save.served}）</span>`;
        if (open) b.addEventListener('click', () => startShift(i));
        grid.appendChild(b);
      });
      sec.appendChild(grid);
      els.shopList.appendChild(sec);
    });
    els.shops.classList.add('open');
  }

  function renderDiffRow(container) {
    if (!container) return;
    container.innerHTML = '';
    Object.entries(DIFFS).forEach(([key, cfg]) => {
      const b = document.createElement('button');
      b.className = 'od-diff-btn' + (key === difficulty ? ' active' : '');
      b.innerHTML = `<strong>${cfg.label}</strong><span>${cfg.desc}</span>`;
      b.addEventListener('click', () => {
        difficulty = key;
        persist();
        renderDiffRow(els.diffRow);
        renderDiffRow(els.diffRow2);
      });
      container.appendChild(b);
    });
  }

  /* ================= shell ================= */

  function buildShell() {
    const root = document.getElementById('od-root');
    if (!root) return false;
    root.innerHTML = `
      <div class="od-screen" id="od-start">
        <h3 id="od-start-title"></h3>
        <div id="od-start-intro"></div>
        <div class="od-diff" id="od-diff"></div>
        <button class="od-btn od-btn-main od-btn-big" id="od-start-btn">🏪 上工去</button>
      </div>

      <div class="od-floor" id="od-floor" style="display:none">
        <div class="od-counter">
          <span class="od-customer" id="od-customer">🧒</span>
          <div class="od-bubble" id="od-bubble"></div>
          <div class="od-counter-side">
            <button class="od-btn" id="od-replay">🔊 重聽</button>
            <span class="od-progress" id="od-progress"></span>
          </div>
        </div>

        <div class="od-result" id="od-result"></div>

        <div class="od-tray-wrap">
          <h4 id="od-tray-title">🍽️ 你的托盤</h4>
          <div class="od-tray" id="od-tray"></div>
          <div class="od-serve-row">
            <button class="od-btn" id="od-clear">🗑️ 全部清空</button>
            <button class="od-btn od-btn-main od-btn-big" id="od-serve">🛎️ 送出餐點</button>
            <button class="od-btn" id="od-shops-btn">🏪 換店</button>
          </div>
          <div class="od-flash" id="od-flash"></div>
        </div>

        <div class="od-menu" id="od-menu"></div>
      </div>

      <div class="od-overlay" id="od-shops">
        <div class="od-panel">
          <div class="od-panel-head">
            <h3 id="od-shops-title">🏪 店家</h3><span class="od-panel-sub" id="od-shop-sub"></span>
            <button class="od-close" data-od-close="od-shops">✕</button>
          </div>
          <div class="od-world" id="od-world"></div>
          <div class="od-diff" id="od-diff2"></div>
          <div class="od-shop-list" id="od-shop-list"></div>
        </div>
      </div>

      <div class="od-overlay" id="od-done">
        <div class="od-panel od-panel-narrow">
          <div class="od-done-body" id="od-done-body"></div>
        </div>
      </div>
    `;

    els = {
      root,
      start: root.querySelector('#od-start'),
      startTitle: root.querySelector('#od-start-title'),
      startIntro: root.querySelector('#od-start-intro'),
      trayTitle: root.querySelector('#od-tray-title'),
      serve: root.querySelector('#od-serve'),
      shopsBtn: root.querySelector('#od-shops-btn'),
      shopsTitle: root.querySelector('#od-shops-title'),
      worldRow: root.querySelector('#od-world'),
      diffRow: root.querySelector('#od-diff'),
      diffRow2: root.querySelector('#od-diff2'),
      floor: root.querySelector('#od-floor'),
      customer: root.querySelector('#od-customer'),
      bubble: root.querySelector('#od-bubble'),
      replay: root.querySelector('#od-replay'),
      progress: root.querySelector('#od-progress'),
      result: root.querySelector('#od-result'),
      tray: root.querySelector('#od-tray'),
      menu: root.querySelector('#od-menu'),
      flash: root.querySelector('#od-flash'),
      shops: root.querySelector('#od-shops'),
      shopList: root.querySelector('#od-shop-list'),
      shopSub: root.querySelector('#od-shop-sub'),
      done: root.querySelector('#od-done'),
      doneBody: root.querySelector('#od-done-body'),
    };

    root.querySelectorAll('[data-od-close]').forEach(b => {
      b.addEventListener('click', () => root.querySelector('#' + b.dataset.odClose).classList.remove('open'));
    });
    root.querySelectorAll('.od-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });
    root.querySelector('#od-start-btn').addEventListener('click', openShops);
    root.querySelector('#od-shops-btn').addEventListener('click', openShops);
    root.querySelector('#od-replay').addEventListener('click', replay);
    root.querySelector('#od-serve').addEventListener('click', serve);
    root.querySelector('#od-clear').addEventListener('click', () => { resetTray(); renderTray(); });
    return true;
  }

  /* ================= test hooks =================
     Deliberately OUTSIDE init(): validate_order.js evals this file in Node with
     a stubbed document, so the `pure` half has to exist without any DOM at all.
     That way the validator checks the REAL sentence builder instead of keeping
     its own copy of the grammar, which would silently drift.
     The DOM half only does anything once init() has built the shell.
  */

  // The old hook handed tests a shallow copy, i.e. a live reference to `ing`.
  function cloneLine(l) {
    const c = { ...l };
    ['ing', 'added', 'dropped'].forEach(k => { if (Array.isArray(l[k])) c[k] = l[k].slice(); });
    if (l.lv) c.lv = { ...l.lv };
    if (l.ch) c.ch = { ...l.ch };
    return c;
  }

  // Point the module at a shop without disturbing a shift that may be running.
  function withShop(i, diff, fn) {
    const keep = { shop, shopIndex, difficulty, order, sentence, orderAsks };
    shopIndex = i;
    shop = SHOPS()[i];
    if (diff) difficulty = diff;
    try { return fn(); } finally { ({ shop, shopIndex, difficulty, order, sentence, orderAsks } = keep); }
  }

  // Fill in whatever a test literal left out, the same way makeOrder() would.
  function normalizeLine(i, l) {
    const item = SHOPS()[i].menu.find(m => m.w === l.w);
    const added = (l.added || []).slice();
    const dropped = (l.dropped || []).slice();
    return {
      w: l.w, qty: l.qty || 1, size: l.size || null,
      temp: l.temp || null, ch: { ...(l.ch || {}) },
      ing: l.ing ? l.ing.slice() : (item.def || []).filter(x => !dropped.includes(x)).concat(added),
      added, dropped, lv: { ...(l.lv || {}) },
    };
  }

  const TestHooks = {
    pure: {
      // Namespaced view of one world. The flat hooks below stay bound to 餐飲 so
      // every test written before the second world keeps working unchanged.
      worlds: () => ORDER_WORLDS.map(w => w.id),
      world: id => {
        const pick2 = ORDER_WORLDS.find(w => w.id === id) || ORDER_WORLDS[0];
        const inWorld = fn => {
          const keep = world, keepSave = save;
          world = pick2; save = saves[pick2.id];
          try { return fn(); } finally { world = keep; save = keepSave; }
        };
        return {
          shops: () => inWorld(() => pick2.shops),
          regions: () => inWorld(() => pick2.regions),
          features: i => inWorld(() => [...featuresOf(pick2.shops[i])]),
          sample: (i, diff, n) => inWorld(() => TestHooks.pure.sample(i, diff, n)),
          sentenceFor: (i, lines, place) => inWorld(() => TestHooks.pure.sentenceFor(i, lines, place)),
        };
      },
      shops: () => SHOPS(),
      diffs: () => DIFFS,
      // every pattern flag that exists — so the validator's "is this a known
      // pattern?" check can never fall behind the registries the way the
      // module's own featuresOf() once did
      patterns: () => PATTERN_FEATURES(),
      // the ask ids, for the "one ask per shop" rule
      asks: () => Object.values(ORDER_ASKS).map(a => a.feat),
      // every pre-nominal adjective any axis can emit, so checks that have to
      // look "past the adjectives" at the noun stay complete as axes are added
      adjectives: () => Object.values(ORDER_CHOICES)
        .filter(a => a.slot < 5).flatMap(a => a.opts.map(o => o.w)),
      // which sentence patterns a shop actually has switched on (2a inheritance)
      features: i => [...featuresOf(SHOPS()[i])],
      // n generated orders for one (shop, difficulty) — the fuzzing entry point
      sample: (i, diff, n) => withShop(i, diff, () => {
        const out = [];
        for (let k = 0; k < n; k++) {
          const o = makeOrder();     // also sets orderAsks
          const place = orderAsks.place || null;
          out.push({ shop: SHOPS()[i].id, diff, place, asks: { ...orderAsks },
                     sentence: buildSentence(o, orderAsks), order: o.map(cloneLine) });
        }
        return out;
      }),
      // one hand-written order, so a specific phrasing can be asserted
      // `place` may be a bare string (the 內用/外帶 shorthand the tests use) or a
      // full ask map — both are accepted so the older signature keeps working.
      sentenceFor: (i, lines, place) => withShop(i, null, () => buildSentence(
        lines.map(l => normalizeLine(i, l)),
        typeof place === 'string' ? { place } : (place || {}))),
    },

    state: () => ({
      world: world.id,
      shop: shop && shop.id,
      customer, correctCount, running,
      served: save.served, shops: save.shops,
      difficulty, sentence,
      // `place` stays in the surface as a derived alias: it is what the tests
      // written against the 內用/外帶 pattern speak, and there is no reason to
      // make them learn the generalised map.
      orderPlace: orderAsks.place || null,
      trayPlace: trayAsks.place || null,
      orderAsks: { ...orderAsks }, trayAsks: { ...trayAsks },
      order: order && order.map(cloneLine),
      tray: tray.map(cloneLine),
    }),
    save: () => JSON.parse(JSON.stringify(save)),
    setDiff: d => { difficulty = d; renderOrderBar(); },
    switchWorld: id => switchWorld(id),
    startShift: i => startShift(i),
    // Replace the customer's order outright — lets a test aim at one branch of
    // checkOrder() instead of waiting for the dice to produce it.
    setOrder: (lines, place) => {
      resetTray();     // a new order means a new customer — same as nextCustomer
      order = lines.map(l => normalizeLine(shopIndex, l));
      if (place !== undefined) {
        if (place) orderAsks = { place };
        else delete orderAsks.place;
      }
      sentence = buildSentence(order, orderAsks);
      renderAll();
    },
    // Build the tray exactly as the order asks — the "perfect employee" path.
    // Split from autoServe so a test can assert problems() without spending XP.
    autoTray: () => {
      tray = order.map(o => ({
        w: o.w, qty: o.qty,
        size: o.size || (itemOf(o.w).sizes ? 'small' : null),
        temp: o.temp || null,
        ch: { ...(o.ch || {}) },
        ing: o.ing.slice(),
        lv: { ...(o.lv || {}) },
      }));
      trayAsks = { ...orderAsks };
      renderTray();
    },
    autoServe: () => { TestHooks.autoTray(); serve(); },
    add: w => addToTray(w),
    setSize: (w, s) => setSize(w, s),
    setTemp: (w, t) => setTemp(w, t),
    // any axis, not just 冰熱 — setTemp stays as the older alias
    setChoice: (w, id, v) => setChoice(w, id, v),
    setLevel: (w, x, lv) => setLevel(w, x, lv),
    setPlace: p => setPlace(p),
    // any ask, not just 內用/外帶 — setPlace stays as the older alias
    setAsk: (id, v) => setAsk(id, v),
    toggleIng: (w, x) => toggleIng(w, x),
    bumpQty: (w, d) => bumpQty(w, d),
    removeLine: w => removeLine(w),
    serve: () => serve(),
    // { all, shown }: returning only the truncated list would let a regression
    // in the display cap hide real problems from the tests as well.
    problems: () => checkOrder(),
  };

  if (typeof window !== 'undefined') window.__orderTest = TestHooks;

  /* ================= lifecycle ================= */

  function init() {
    ORDER_WORLDS.forEach(loadSave);
    useWorld(saves.food.world || ORDER_WORLDS[0].id);
    if (!buildShell()) return;
    renderDiffRow(els.diffRow);
    applyWorldStrings();
  }

  return { init };
})();
