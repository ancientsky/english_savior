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

  const DIFFS = {
    easy:   { label: '簡單', xp: 10, gem: 1, bonus: 10, lines: [1, 1], mods: 0,
              qty: false, size: false, showText: true, replays: 99,
              desc: '一樣東西、不加料，句子看得到' },
    medium: { label: '中等', xp: 14, gem: 1, bonus: 15, lines: [1, 2], mods: 1,
              qty: false, size: true, showText: false, replays: 99,
              desc: '兩樣、會加料或說不要，句子藏起來（可無限重聽）' },
    hard:   { label: '困難', xp: 18, gem: 2, bonus: 20, lines: [2, 3], mods: 3,
              qty: true, size: true, showText: false, replays: 2,
              desc: '最多三樣＋數量＋大小杯，只能重聽 2 次' },
  };

  let els = {};
  let save = { served: 0, shops: 1, shop: 0, best: {}, diff: 'easy' };
  let difficulty = 'easy';

  // ---- current shift ----
  let shop = null, shopIndex = 0;
  let order = null;        // [{ w, qty, size, ing: [] }]
  let sentence = '';
  let tray = [];           // [{ w, qty, size, ing: [] }]
  let customer = 0, correctCount = 0, replaysLeft = 0, retried = false;
  let running = false;

  const CUSTOMERS = ['🧒', '👦', '👧', '🧑', '👩', '👨', '👵', '👴', '🧔', '👱‍♀️'];

  const itemOf = w => shop.menu.find(m => m.w === w);
  const extraOf = w => ORDER_EXTRAS[w] || { zh: w, e: '•' };

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

    return chosen.map(item => {
      // Quantity only where "two ___" is real English (the data marks those)
      const qty = cfg.qty && item.pl && Math.random() < 0.45 ? 2 + rand(2) : 1;
      const size = cfg.size && item.sizes && Math.random() < 0.6 ? pick(['small', 'large']) : null;

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
      return { w: item.w, qty, size, ing, added, dropped };
    });
  }

  function listWords(arr) {
    if (arr.length <= 1) return arr.map(x => x).join('');
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
  }

  const NUM = ['zero', 'one', 'two', 'three', 'four'];

  function lineText(line) {
    const item = itemOf(line.w);
    const size = line.size ? line.size + ' ' : '';
    let head;
    if (line.qty === 1) head = `${item.art || 'a'} ${size}${item.w}`;
    else head = `${NUM[line.qty]} ${size}${item.pl || item.w}`;
    let s = head;
    if (line.added.length) s += ` with ${listWords(line.added)}`;
    if (line.dropped.length) s += `, no ${line.dropped.join(' or ')}`;
    return s;
  }

  // Items are separated by commas with a final "and", because a line can itself
  // contain "with A and B" — joining every line with "and" runs them together.
  function buildSentence(o) {
    const parts = o.map(lineText);
    let body;
    if (parts.length === 1) body = parts[0];
    else if (parts.length === 2) body = `${parts[0]}, and ${parts[1]}`;
    else body = `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
    return `${pick(ORDER_OPENERS)} ${body}, please.`;
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
  }

  function nextCustomer() {
    if (customer >= SHIFT_LEN) { finishShift(); return; }
    order = makeOrder();
    sentence = buildSentence(order);
    tray = [];
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

  function addToTray(w) {
    if (!running) return;
    const item = itemOf(w);
    const line = tray.find(t => t.w === w);
    if (line) line.qty = Math.min(4, line.qty + 1);
    else tray.push({ w, qty: 1, size: item.sizes ? 'small' : null, ing: (item.def || []).slice() });
    renderTray();
  }

  function removeLine(w) { tray = tray.filter(t => t.w !== w); renderTray(); }

  function bumpQty(w, d) {
    const line = tray.find(t => t.w === w);
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) removeLine(w); else renderTray();
  }

  function setSize(w, size) {
    const line = tray.find(t => t.w === w);
    if (line) { line.size = size; renderTray(); }
  }

  function toggleIng(w, ing) {
    const line = tray.find(t => t.w === w);
    if (!line) return;
    const i = line.ing.indexOf(ing);
    if (i >= 0) line.ing.splice(i, 1); else line.ing.push(ing);
    renderTray();
  }

  /* ================= serving ================= */

  // Returns { all, shown }: `all` decides pass/fail, `shown` is what the child
  // reads. Telling a child *what* they misheard is the teaching moment — but a
  // wall of twelve mistakes is a beating, so the two lists are separate.
  function checkOrder() {
    const problems = [];
    order.forEach(o => {
      const t = tray.find(x => x.w === o.w);
      const item = itemOf(o.w);
      if (!t) { problems.push(`少了 ${item.e} ${item.zh}（${o.w}）`); return; }
      if (t.qty !== o.qty) problems.push(`${item.zh} 的數量錯了：要 ${o.qty} 份，你做了 ${t.qty} 份`);
      if ((o.size || null) !== (t.size || null) && o.size) {
        problems.push(`${item.zh} 的大小錯了：要 ${o.size === 'large' ? '大杯 large' : '小杯 small'}`);
      }
      const want = [...o.ing].sort(), got = [...t.ing].sort();
      want.filter(x => !got.includes(x)).forEach(x => problems.push(`${item.zh} 少加了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）`));
      got.filter(x => !want.includes(x)).forEach(x => problems.push(`${item.zh} 多了 ${extraOf(x).e} ${extraOf(x).zh}（${x}）— 客人說 no ${x}`));
    });
    tray.forEach(t => {
      if (!order.find(o => o.w === t.w)) {
        const item = itemOf(t.w);
        problems.push(`多做了 ${item.e} ${item.zh}（${t.w}），客人沒有點`);
      }
    });
    return { all: problems, shown: problems };
  }

  function serve() {
    if (!running) return;
    if (!tray.length) { flash('托盤是空的！先點菜單做東西給客人。', 'bad'); return; }
    const res = checkOrder();
    if (res.all.length) {
      SoundManager.playWrong();
      retried = true;
      els.result.innerHTML =
        `<div class="od-result bad"><strong>😕 客人皺眉了…</strong>
          <ul>${res.shown.map(p => `<li>${p}</li>`).join('')}</ul>
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

    const nextShop = ORDER_SHOPS[shopIndex + 1];
    els.doneBody.innerHTML = `
      <div class="od-done-e">${shop.e}</div>
      <h3>${shop.name} today 打烊囉！</h3>
      <p class="od-done-line">一次做對 <strong>${correctCount} / ${SHIFT_LEN}</strong> 位客人${perfect ? '　🏆 全對！' : ''}</p>
      <p class="od-done-reward">班別獎金 +${gems} 💎</p>
      <p class="od-done-line">累積出餐 <strong>${save.served}</strong> 份　營業中 ${save.shops} / ${ORDER_SHOPS.length} 家店</p>
      ${nextShop && save.served < nextShop.unlockAt
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

  function renderMenu() {
    if (!els.menu) return;
    els.menu.innerHTML = '';
    ['food', 'drink'].forEach(kind => {
      const list = shop.menu.filter(m => m.kind === kind);
      if (!list.length) return;
      const head = document.createElement('div');
      head.className = 'od-menu-head';
      head.textContent = kind === 'food' ? '🍽️ 餐點' : '🥤 飲料';
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
    if (!tray.length) {
      els.tray.innerHTML = '<p class="od-tray-empty">點下面的菜單，把客人要的東西做出來 👇</p>';
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
    ORDER_SHOPS.forEach((s, i) => {
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
      els.shopList.appendChild(b);
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
    root.querySelector('#od-clear').addEventListener('click', () => { tray = []; renderTray(); });
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
    const keep = { shop, shopIndex, difficulty, order, sentence };
    shopIndex = i;
    shop = ORDER_SHOPS[i];
    if (diff) difficulty = diff;
    try { return fn(); } finally { ({ shop, shopIndex, difficulty, order, sentence } = keep); }
  }

  // Fill in whatever a test literal left out, the same way makeOrder() would.
  function normalizeLine(i, l) {
    const item = ORDER_SHOPS[i].menu.find(m => m.w === l.w);
    const added = (l.added || []).slice();
    const dropped = (l.dropped || []).slice();
    return {
      w: l.w, qty: l.qty || 1, size: l.size || null,
      ing: l.ing ? l.ing.slice() : (item.def || []).filter(x => !dropped.includes(x)).concat(added),
      added, dropped,
    };
  }

  const TestHooks = {
    pure: {
      shops: () => ORDER_SHOPS,
      diffs: () => DIFFS,
      // n generated orders for one (shop, difficulty) — the fuzzing entry point
      sample: (i, diff, n) => withShop(i, diff, () => {
        const out = [];
        for (let k = 0; k < n; k++) {
          const o = makeOrder();
          out.push({ shop: ORDER_SHOPS[i].id, diff, sentence: buildSentence(o), order: o.map(cloneLine) });
        }
        return out;
      }),
      // one hand-written order, so a specific phrasing can be asserted
      sentenceFor: (i, lines) => withShop(i, null, () => buildSentence(lines.map(l => normalizeLine(i, l)))),
    },

    state: () => ({
      shop: shop && shop.id,
      customer, correctCount, running,
      served: save.served, shops: save.shops,
      difficulty, sentence,
      order: order && order.map(cloneLine),
      tray: tray.map(cloneLine),
    }),
    save: () => JSON.parse(JSON.stringify(save)),
    setDiff: d => { difficulty = d; renderOrderBar(); },
    startShift: i => startShift(i),
    // Replace the customer's order outright — lets a test aim at one branch of
    // checkOrder() instead of waiting for the dice to produce it.
    setOrder: lines => {
      order = lines.map(l => normalizeLine(shopIndex, l));
      sentence = buildSentence(order);
      renderAll();
    },
    // Build the tray exactly as the order asks — the "perfect employee" path.
    // Split from autoServe so a test can assert problems() without spending XP.
    autoTray: () => {
      tray = order.map(o => ({ w: o.w, qty: o.qty, size: o.size || (itemOf(o.w).sizes ? 'small' : null), ing: o.ing.slice() }));
      renderTray();
    },
    autoServe: () => { TestHooks.autoTray(); serve(); },
    add: w => addToTray(w),
    setSize: (w, s) => setSize(w, s),
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
