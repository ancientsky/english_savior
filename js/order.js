/* ===== Order Up! Module (英語餐廳大亂鬥) =====
   Overcooked-style listening game. A customer orders in a whole English
   sentence and the child BUILDS the order instead of picking an answer, so
   listening turns straight into action. The words that carry the meaning are
   exactly the ones Taiwanese kids drop: with / no / two / large / small.

   "no tomato" is a real instruction here, not a freebie — items arrive with
   their default ingredients already on, so the child has to take the tomato
   off. That is the whole reason negation is worth drilling.

   Save: localStorage `english_savior_order`
     { served, shops, shop, best: { shopId: bestShift }, diff }
*/

const OrderGame = (() => {
  const SAVE_KEY = 'english_savior_order';
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
  let save = { served: 0, shops: 1, shop: 0, best: {}, diff: 'easy', taught: {} };
  let difficulty = 'easy';

  // ---- current shift ----
  let shop = null, shopIndex = 0;
  let order = null;        // [{ w, qty, size, temp, ing: [], added, dropped, lv }]
  let sentence = '';
  let tray = [];           // [{ w, qty, size, temp, ing: [], lv }]
  // 內用/外帶 is an ORDER-level answer, not a per-item one, so it lives beside
  // `order`/`tray` rather than inside them: turning those into { lines, place }
  // would touch a dozen order.forEach / tray.find call sites for no gain.
  let orderPlace = null;   // 'for here' | 'to go' | null (this shop never asks)
  let trayPlace = null;    // what the child picked — null means "not answered"
  let customer = 0, correctCount = 0, replaysLeft = 0, retried = false;
  let running = false;

  const CUSTOMERS = ['🧒', '👦', '👧', '🧑', '👩', '👨', '👵', '👴', '🧔', '👱‍♀️'];

  const itemOf = w => shop.menu.find(m => m.w === w);
  const extraOf = w => ORDER_EXTRAS[w] || { zh: w, e: '•' };
  const regionOf = s => ORDER_REGIONS.find(r => r.id === s.region) || ORDER_REGIONS[0];

  // Sentence patterns are INHERITED: a shop gets its own region's pattern plus
  // every earlier region's, so a later region can never silently drop one. A
  // shop may still opt in early with its own flag.
  function featuresOf(s) {
    const on = new Set();
    for (const r of ORDER_REGIONS) {
      if (r.teaches) on.add(r.teaches);
      if (r.id === s.region) break;
    }
    ['togo', 'temps', 'amt'].forEach(f => { if (s[f]) on.add(f); });
    return on;
  }

  /* ================= save ================= */

  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && typeof d === 'object') {
        save = {
          served: Number(d.served) || 0,
          shops: Number(d.shops) || 1,
          shop: Number(d.shop) || 0,
          best: d.best && typeof d.best === 'object' ? d.best : {},
          diff: DIFFS[d.diff] ? d.diff : 'easy',
          // which sentence patterns the child has already been shown a card for
          taught: d.taught && typeof d.taught === 'object' ? d.taught : {},
        };
      }
    } catch { /* first run */ }
    difficulty = save.diff;
    save.shops = shopsOpen();
  }

  function persist() {
    save.diff = difficulty;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota */ }
  }

  function shopsOpen() {
    return Math.max(1, ORDER_SHOPS.filter(s => save.served >= s.unlockAt).length);
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

    // with/no phrases are budgeted across the WHOLE order, not per item: three
    // items each carrying "with X and Y, no Z" is unparseable by ear even for
    // an adult, and this is a listening game, not a memory test.
    let budget = cfg.mods;

    orderPlace = makePlace();

    return trimToBudget(chosen.map(item => {
      // Quantity only where "two ___" is real English (the data marks those)
      const qty = cfg.qty && item.pl && Math.random() < 0.45 ? 2 + rand(2) : 1;
      const size = cfg.size && item.sizes && Math.random() < 0.6 ? pick(['small', 'large']) : null;
      // Temperature has no DIFFS switch on purpose: a shop with `temps` items IS
      // the shop that teaches hot/iced, and its EASY mode — one item, no add-ons,
      // sentence on screen — is the ideal first meeting with the word. Gating it
      // by difficulty would introduce "iced" for the first time in medium, where
      // the sentence is hidden.
      const temp = item.temps && hasFeature('temps') ? pick(['hot', 'iced']) : null;

      let take = budget > 0 ? rand(Math.min(budget, 2) + 1) : 0;
      budget -= take;
      const added = [], dropped = [];
      const canAdd = shuffled(item.ex || []);
      const canDrop = shuffled(item.def || []);
      while (take-- > 0) {
        // prefer whichever kind still has options, so "no ..." really appears
        if (canDrop.length && (!canAdd.length || Math.random() < 0.5)) dropped.push(canDrop.pop());
        else if (canAdd.length) added.push(canAdd.pop());
        else budget++;   // nothing left to modify on this item — give it back
      }
      const ing = (item.def || []).filter(x => !dropped.includes(x)).concat(added);
      return { w: item.w, qty, size, temp, ing, added, dropped };
    }));
  }

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

  function makePlace() {
    if (!hasFeature('togo')) return null;
    return Math.random() < 0.5 ? 'for here' : 'to go';
  }

  const PLACE_ZH = { 'for here': '內用', 'to go': '外帶' };

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
    // size then temperature — "two large iced teas", never "iced large tea"
    const adj = [line.size, line.temp].filter(Boolean);
    const noun = line.qty === 1 ? item.w : (item.pl || item.w);
    let head;
    if (line.qty > 1) head = `${NUM[line.qty]} ${[...adj, noun].join(' ')}`;
    else if (item.art === 'some') head = `some ${[...adj, noun].join(' ')}`;
    else head = `${articleFor(adj[0] || noun)} ${[...adj, noun].join(' ')}`;
    let s = head;
    if (line.added.length) s += ` with ${listWords(line.added)}`;
    if (line.dropped.length) s += `, no ${line.dropped.join(' or ')}`;
    return s;
  }

  // Items are separated by commas with a final "and", because a line can itself
  // contain "with A and B" — joining every line with "and" runs them together.
  function buildSentence(o, place) {
    const parts = o.map(lineText);
    let body;
    if (parts.length === 1) body = parts[0];
    else if (parts.length === 2) body = `${parts[0]}, and ${parts[1]}`;
    else body = `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
    const opener = pick(ORDER_OPENERS);
    // "Can I have ... please." is a question wearing a full stop, and easy mode
    // shows the sentence on screen, so the punctuation is being taught too.
    const end = /^(Can|Could|May)\b/.test(opener) ? '?' : '.';
    // The comma is load-bearing: it gives TTS a pause, which is the only way a
    // child hears "for here" as one phrase instead of trailing off the last item.
    const tail = place ? `, ${place}` : '';
    return `${opener} ${body}${tail}, please${end}`;
  }

  /* ================= shift flow ================= */

  function startShift(i) {
    shopIndex = i;
    shop = ORDER_SHOPS[i];
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
    if (!r.teaches || save.taught[r.teaches]) return;
    save.taught[r.teaches] = 1;
    persist();
    els.result.innerHTML =
      `<div class="od-result ok od-teach"><strong>${r.e} ${r.name}：新句型！</strong>
        <p>${r.tip}</p></div>`;
  }

  function nextCustomer() {
    if (customer >= SHIFT_LEN) { finishShift(); return; }
    order = makeOrder();          // also sets orderPlace
    sentence = buildSentence(order, orderPlace);
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
    trayPlace = null;   // null, not 'for here' — "not answered yet" is honest
  }

  function setPlace(p) {
    if (!running) return;
    trayPlace = p;
    renderTray();
  }

  function addToTray(w) {
    if (!running) return;
    const item = itemOf(w);
    const line = tray.find(t => t.w === w);
    if (line) line.qty = Math.min(4, line.qty + 1);
    // size defaults to small because "didn't say" means "doesn't mind", but temp
    // has NO default: pre-selecting 'hot' would silently pass every order whose
    // "hot" the child never heard.
    else tray.push({ w, qty: 1, size: item.sizes ? 'small' : null, temp: null, ing: (item.def || []).slice() });
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

  function setTemp(w, temp) {
    const line = tray.find(t => t.w === w);
    if (line) { line.temp = temp; renderTray(); }
  }

  function toggleIng(w, ing) {
    const line = tray.find(t => t.w === w);
    if (!line) return;
    const i = line.ing.indexOf(ing);
    if (i >= 0) line.ing.splice(i, 1); else line.ing.push(ing);
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
      if (o.temp && o.temp !== t.temp) {
        add(RANK.temp, t.temp
          ? `${item.zh} 的冷熱錯了：客人說 ${o.temp}（${o.temp === 'hot' ? '熱的' : '冰的'}）`
          : `${item.zh} 還沒選冷熱：客人說 ${o.temp}（${o.temp === 'hot' ? '熱的' : '冰的'}）`);
      }
      const want = [...o.ing].sort(), got = [...t.ing].sort();
      want.filter(x => !got.includes(x)).forEach(x => add(RANK.ing, `${item.zh} 少加了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）`));
      // Two different mistakes, two different lessons: the customer refusing an
      // ingredient is not the same as the child adding one nobody asked for.
      // Saying 「客人說 no X」 for both taught the child to mishear the order.
      got.filter(x => !want.includes(x)).forEach(x => add(RANK.ing, o.dropped.includes(x)
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
    if (orderPlace && trayPlace !== orderPlace) {
      problems.push({
        rank: RANK.place, key: '__place',
        msg: trayPlace
          ? `客人說 ${orderPlace}（${PLACE_ZH[orderPlace]}），你按成${PLACE_ZH[trayPlace]}了`
          : `客人說 ${orderPlace}（${PLACE_ZH[orderPlace]}），你還沒選內用還是外帶`,
      });
    }

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
    if (!tray.length) { flash('托盤是空的！先點菜單做東西給客人。', 'bad'); return; }
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
    if (save.shops > before) {
      GameEngine.recordOrderShop(save.shops);
      flash(`🎉 新店家開張：${ORDER_SHOPS[save.shops - 1].e} ${ORDER_SHOPS[save.shops - 1].name}！`, 'ok');
    }

    els.result.innerHTML =
      `<div class="od-result ok"><strong>😋 客人很滿意！</strong>
        <p class="od-sentence-reveal">${sentence}</p>
        <p>${retried ? `修正後完成 +${Math.floor(cfg.xp / 2)} XP` : `一次做對 +${cfg.xp} XP +${cfg.gem} 💎`}</p></div>`;
    customer++;
    renderOrderBar();
    setTimeout(() => { if (running) nextCustomer(); }, 2200);
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
    const nextShop = ORDER_SHOPS.find(s => save.served < s.unlockAt);
    els.doneBody.innerHTML = `
      <div class="od-done-e">${shop.e}</div>
      <h3>${shop.name} today 打烊囉！</h3>
      <p class="od-done-line">一次做對 <strong>${correctCount} / ${SHIFT_LEN}</strong> 位客人${perfect ? '　🏆 全對！' : ''}</p>
      <p class="od-done-reward">班別獎金 +${gems} 💎</p>
      <p class="od-done-line">累積出餐 <strong>${save.served}</strong> 份　營業中 ${save.shops} / ${ORDER_SHOPS.length} 家店</p>
      ${nextShop
        ? `<p class="od-done-tip">🔒 再出 ${nextShop.unlockAt - save.served} 份餐就能開 ${nextShop.e} ${nextShop.name}！</p>` : ''}
      <div class="od-done-row">
        <button class="od-btn" id="od-again">🔄 再開一班</button>
        <button class="od-btn od-btn-main" id="od-toshops">🏪 換店家</button>
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
    if (orderPlace) {
      const row = document.createElement('div');
      row.className = 'od-place';
      row.innerHTML = `<span class="od-place-label">內用還是外帶？</span>
        <button data-place="for here" class="${trayPlace === 'for here' ? 'on' : ''}">🍽️ for here<small>內用</small></button>
        <button data-place="to go" class="${trayPlace === 'to go' ? 'on' : ''}">🥡 to go<small>外帶</small></button>`;
      row.querySelectorAll('[data-place]').forEach(b =>
        b.addEventListener('click', () => setPlace(b.dataset.place)));
      els.tray.appendChild(row);
    }
    if (!tray.length) {
      els.tray.insertAdjacentHTML('beforeend',
        '<p class="od-tray-empty">點下面的菜單，把客人要的東西做出來 👇</p>');
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
          ${item.temps && hasFeature('temps') ? `<span class="od-size od-temp">
            <button data-temp="hot" class="${t.temp === 'hot' ? 'on' : ''}">🔥 hot 熱</button>
            <button data-temp="iced" class="${t.temp === 'iced' ? 'on' : ''}">🧊 iced 冰</button>
          </span>` : ''}
          <button class="od-line-x" data-act="del">✕</button>
        </div>
        <div class="od-ings">
          ${t.ing.map(x => `<button class="od-ing on" data-ing="${x}">${extraOf(x).e} ${x}<small>${extraOf(x).zh}</small></button>`).join('')}
          ${optional.map(x => `<button class="od-ing" data-ing="${x}">＋ ${extraOf(x).e} ${x}<small>${extraOf(x).zh}</small></button>`).join('')}
        </div>`;

      line.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'plus') bumpQty(t.w, 1);
        else if (a === 'minus') bumpQty(t.w, -1);
        else removeLine(t.w);
      }));
      line.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => setSize(t.w, b.dataset.size)));
      line.querySelectorAll('[data-temp]').forEach(b => b.addEventListener('click', () => setTemp(t.w, b.dataset.temp)));
      line.querySelectorAll('[data-ing]').forEach(b => b.addEventListener('click', () => toggleIng(t.w, b.dataset.ing)));
      els.tray.appendChild(line);
    });
  }

  function flash(msg, kind) {
    els.flash.textContent = msg;
    els.flash.className = 'od-flash show ' + (kind || '');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { els.flash.className = 'od-flash'; }, 3200);
  }

  /* ================= shops ================= */

  function openShops() {
    els.shopSub.textContent = `累積出餐 ${save.served} 份　營業中 ${shopsOpen()} / ${ORDER_SHOPS.length} 家`;
    renderDiffRow(els.diffRow2);
    els.shopList.innerHTML = '';
    // grouped by region, like the wizard's openLevels() groups by chapter — the
    // region heading is where the new sentence pattern gets announced
    ORDER_REGIONS.forEach(r => {
      const shops = ORDER_SHOPS.map((s, i) => ({ s, i })).filter(({ s }) => s.region === r.id);
      if (!shops.length) return;
      const openCount = shops.filter(({ s }) => save.served >= s.unlockAt).length;
      const sec = document.createElement('div');
      sec.className = 'od-region' + (openCount ? '' : ' locked');
      sec.innerHTML = `<h4>${r.e} ${r.name}<small>${openCount} / ${shops.length} 家</small></h4>
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
             <span class="od-shop-meta">${s.menu.length} 種餐點${save.best[s.id] ? `　最佳 ${save.best[s.id]}/${SHIFT_LEN}` : ''}</span>`
          : `<span class="od-shop-e">🔒</span><span class="od-shop-name">${s.name}</span>
             <span class="od-shop-meta">出滿 ${s.unlockAt} 份餐才開張（還差 ${s.unlockAt - save.served}）</span>`;
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
        <h3>🍜 英語餐廳大亂鬥</h3>
        <p>客人會用<strong>一整句英文</strong>跟你點餐。你不用選答案——<strong>直接把餐做出來</strong>！</p>
        <p>「Can I have a hamburger <strong>with cheese</strong>, <strong>no onion</strong>, please?」<br>
           → 做漢堡、加起司、把洋蔥拿掉。</p>
        <p>with（加）、no（不要）、two（兩份）、large（大杯）——每個字都會改變你要做的東西。</p>
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
          <h4>🍽️ 你的托盤</h4>
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
            <h3>🏪 店家</h3><span class="od-panel-sub" id="od-shop-sub"></span>
            <button class="od-close" data-od-close="od-shops">✕</button>
          </div>
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
    return c;
  }

  // Point the module at a shop without disturbing a shift that may be running.
  function withShop(i, diff, fn) {
    const keep = { shop, shopIndex, difficulty, order, sentence, orderPlace };
    shopIndex = i;
    shop = ORDER_SHOPS[i];
    if (diff) difficulty = diff;
    try { return fn(); } finally { ({ shop, shopIndex, difficulty, order, sentence, orderPlace } = keep); }
  }

  // Fill in whatever a test literal left out, the same way makeOrder() would.
  function normalizeLine(i, l) {
    const item = ORDER_SHOPS[i].menu.find(m => m.w === l.w);
    const added = (l.added || []).slice();
    const dropped = (l.dropped || []).slice();
    return {
      w: l.w, qty: l.qty || 1, size: l.size || null, temp: l.temp || null,
      ing: l.ing ? l.ing.slice() : (item.def || []).filter(x => !dropped.includes(x)).concat(added),
      added, dropped,
    };
  }

  const TestHooks = {
    pure: {
      shops: () => ORDER_SHOPS,
      diffs: () => DIFFS,
      // which sentence patterns a shop actually has switched on (2a inheritance)
      features: i => [...featuresOf(ORDER_SHOPS[i])],
      // n generated orders for one (shop, difficulty) — the fuzzing entry point
      sample: (i, diff, n) => withShop(i, diff, () => {
        const out = [];
        for (let k = 0; k < n; k++) {
          const o = makeOrder();     // also sets orderPlace
          const place = orderPlace;
          out.push({ shop: ORDER_SHOPS[i].id, diff, place, sentence: buildSentence(o, place), order: o.map(cloneLine) });
        }
        return out;
      }),
      // one hand-written order, so a specific phrasing can be asserted
      sentenceFor: (i, lines, place) =>
        withShop(i, null, () => buildSentence(lines.map(l => normalizeLine(i, l)), place || null)),
    },

    state: () => ({
      shop: shop && shop.id,
      customer, correctCount, running,
      served: save.served, shops: save.shops,
      difficulty, sentence, orderPlace, trayPlace,
      order: order && order.map(cloneLine),
      tray: tray.map(cloneLine),
    }),
    save: () => JSON.parse(JSON.stringify(save)),
    setDiff: d => { difficulty = d; renderOrderBar(); },
    startShift: i => startShift(i),
    // Replace the customer's order outright — lets a test aim at one branch of
    // checkOrder() instead of waiting for the dice to produce it.
    setOrder: (lines, place) => {
      order = lines.map(l => normalizeLine(shopIndex, l));
      if (place !== undefined) orderPlace = place;
      sentence = buildSentence(order, orderPlace);
      renderAll();
    },
    // Build the tray exactly as the order asks — the "perfect employee" path.
    // Split from autoServe so a test can assert problems() without spending XP.
    autoTray: () => {
      tray = order.map(o => ({
        w: o.w, qty: o.qty,
        size: o.size || (itemOf(o.w).sizes ? 'small' : null),
        temp: o.temp || null,
        ing: o.ing.slice(),
      }));
      trayPlace = orderPlace;
      renderTray();
    },
    autoServe: () => { TestHooks.autoTray(); serve(); },
    add: w => addToTray(w),
    setSize: (w, s) => setSize(w, s),
    setTemp: (w, t) => setTemp(w, t),
    setPlace: p => setPlace(p),
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
    loadSave();
    if (!buildShell()) return;
    renderDiffRow(els.diffRow);
  }

  return { init };
})();
