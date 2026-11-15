/* ===== SkyLoader — the 天空之城 loading screen (pure DOM/CSS, prefix aw-ld) =====
   Loaded BEFORE js/sky-art.js. No WebGL, no canvas, no assets: it must keep moving while the main
   thread is busy building the world, so every moving part is a CSS animation on transform/opacity
   (compositor-driven) and JS only ever moves the progress forward.
   Who reports progress (one monotonic 0..1 number; a stage can never move it backwards):
     sky.js  open(host, mode)      on the 開始冒險 press, before any heavy work (mode: start | resume)
             step(f, label)        build phase: f = 0..1 of initThree() (await it — it yields to the
                                    browser every ~150 ms so the bar and label actually repaint)
             plan(warmAhead)       after the renderer exists: is a staged shader warm-up coming?
             done()                the first REAL world frame has been drawn → 100 %, dissolve
     sky-art.js warm(i, n, name)   one call per warm-up stage (and open(host,'rewarm') after a
                                    context restore); close(true) when the context is lost mid-warm
   To add a build stage: `await L.step(fraction, '標籤…')` inside initThree() at the right point,
   keeping fractions ascending. The loader pays nothing and reads only VOCAB_DATA (word card). */
const SkyLoader = (() => {
  let el = null, fill = null, pctEl = null, labelEl = null, runner = null, isles = null;
  let p = 0, a = 0, b = 0.9, warmFrom = -1, handing = false, lastYield = 0, outT = 0, t0 = 0, lastMark = 0;
  let marks = [], last = null;
  const N_ISLES = 6;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const TIPS = touch => [
    '🦘 跳起來以後，在空中再按一次跳躍＝<b>二段跳</b>！',
    touch ? '💨 按 <b>💨 鈕</b>衝刺，地上、空中都能用，可以飛過大缺口！' : '💨 按 <b>C</b> 衝刺，地上、空中都能用，可以飛過大缺口！',
    '⭐ <b>星星硬幣</b>可以到蛋舖孵 🥚 寵物蛋，邊跑邊撿吧！',
    '🪧 跑酷賽道上的<b>單字門</b>：答對英文才會打開，還能拿 XP 和 💎',
    touch ? '🐾 按 <b>🐾 鈕</b>打開寵物圖鑑，帶夥伴一起冒險' : '🐾 按 <b>P</b> 打開寵物圖鑑，帶夥伴一起冒險',
    touch ? '⚡ 走到發光的任務旁邊，按橘色 <b>⚡ 鈕</b>開始挑戰' : '⚡ 走到發光的任務旁邊，按 <b>E</b> 開始挑戰',
    '🌉 完成任務會蓋出新的<b>空中橋樑</b>，通往更多浮島！',
    '🏠 迷路了？按 <b>🏠</b> 回晨曦之島；按 <b>🎯</b> 把視角轉回來',
    touch ? '👟 搖桿推到底就會<b>奔跑</b>' : '👟 按住 <b>Shift</b> 奔跑，跑得更快！',
    '📜 打開<b>任務日誌</b>，看看下一個任務在哪座島',
  ];
  const TIP_N = 8;    // the CSS cycle (awLdCycle8) is cut for exactly 8 cards
  const WORD_N = 4;   // ... and awLdCycle4 for 4
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  function words() {
    if (typeof VOCAB_DATA === 'undefined' || !VOCAB_DATA.easy) return [];
    // only the "詞 — 說明" glosses (some entries carry a whole sentence with **marks** instead)
    const pool = VOCAB_DATA.easy.filter(v => v && /^[A-Za-z]{3,9}$/.test(v.word) && v.hint && typeof v.zh === 'string' &&
      / — /.test(v.zh) && !/[*_]/.test(v.zh) && v.zh.split(' — ')[0].length <= 6);
    const out = [];
    for (let i = 0; i < 40 && out.length < WORD_N && pool.length; i++) {
      const v = pool[Math.floor(Math.random() * pool.length)];
      if (!out.includes(v)) out.push(v);
    }
    return out.length === WORD_N ? out : [];
  }

  function hero() {
    return '<span class="aw-ld-hero"><span class="aw-ld-hop">' +
      '<i class="hd"><i class="ey"></i><i class="ey r"></i><i class="mo"></i></i>' +
      '<i class="ar"></i><i class="ar r"></i><i class="tr"></i><i class="lg"></i><i class="lg r"></i>' +
      '</span><i class="aw-ld-shadow"></i></span>';
  }
  function build(mode, opt) {
    const title = mode === 'resume' ? '🔧 已自動調整畫質，繼續冒險！' : mode === 'rewarm' ? '🔧 畫面重新整理中…' :
      opt.cont ? '⚔️ 繼續冒險！' : '🌤️ 準備出發！';
    const tips = shuffle(TIPS(!!opt.touch)).slice(0, TIP_N);
    const ws = mode === 'rewarm' ? [] : words();
    const isleHtml = Array.from({ length: N_ISLES }, (_, i) =>
      `<span class="aw-ld-isle${i === N_ISLES - 1 ? ' goal' : ''}" style="--i:${i}"><i class="top"></i><i class="rock"></i>` +
      `<em>${i === N_ISLES - 1 ? '🏰' : '⭐'}</em></span>`).join('');
    const d = document.createElement('div');
    d.className = 'aw-ld' + (reduced() ? ' rm' : '');
    d.setAttribute('role', 'status');
    d.setAttribute('aria-live', 'polite');
    d.innerHTML =
      '<div class="aw-ld-bg" aria-hidden="true"><i class="aw-ld-rays"></i>' +
        '<i class="aw-ld-cl c1"><i></i></i><i class="aw-ld-cl c2"><i></i></i><i class="aw-ld-cl c3"><i></i></i>' +
        '<i class="aw-ld-spark s1">⭐</i><i class="aw-ld-spark s2">✨</i><i class="aw-ld-spark s3">⭐</i><i class="aw-ld-spark s4">✨</i></div>' +
      '<div class="aw-ld-main">' +
        `<div class="aw-ld-title aw-outline-text">${esc(title)}</div>` +
        (opt.dest ? `<div class="aw-ld-dest">📍 目的地：${esc(opt.dest)}</div>` : '') +
        `<div class="aw-ld-track" aria-hidden="true">${isleHtml}<span class="aw-ld-runner">${hero()}<span class="aw-ld-pet">🐣</span></span></div>` +
        '<div class="aw-ld-bar"><span class="aw-ld-fill"><i></i></span><b>0%</b></div>' +
        '<div class="aw-ld-label">打開魔法視窗…</div>' +
        '<div class="aw-ld-cards">' +
          `<div class="aw-ld-tips"><div class="aw-ld-h">💡 小提示</div>${tips.map((t, i) => `<p style="--i:${i}">${t}</p>`).join('')}</div>` +
          (ws.length ? `<div class="aw-ld-words"><div class="aw-ld-h">🔤 小單字</div>${ws.map((v, i) =>
            `<p style="--i:${i}"><span class="e">${esc(v.hint)}</span><span><b>${esc(v.word.toLowerCase())}</b><small>${esc(v.zh.split(' — ')[0])}</small></span></p>`).join('')}</div>` : '') +
        '</div>' +
        '<div class="aw-ld-slow">☁️ 世界比較大，有些裝置要多等一下下，快好了！</div>' +
      '</div>';
    return d;
  }

  function render(label) {
    if (!el) return;
    fill.style.transform = `translateX(${((p - 1) * 100).toFixed(2)}%)`;
    pctEl.textContent = Math.min(p >= 1 ? 100 : 99, Math.floor(p * 100)) + '%';
    if (label && label !== last) { labelEl.textContent = label; last = label; }
    const k = Math.min(N_ISLES - 1, Math.floor(p * (N_ISLES - 1) + 0.001));
    runner.style.setProperty('--k', k);
    for (let i = 0; i < isles.length; i++) isles[i].classList.toggle('on', i <= k);
  }
  function set(v, label) {
    if (v > p) p = Math.min(1, v);
    render(label);
  }
  function mark(name) {
    const t = performance.now();
    marks.push([name, Math.round(t - lastMark)]);
    lastMark = t;
  }

  // ---- API ----
  function open(host, mode, opt) {
    if (el && handing) close();   // a re-warm right after a hand-off
    if (el || !host) return;
    opt = opt || {};
    clearTimeout(outT);
    p = 0; a = 0; b = mode === 'rewarm' ? 0 : 0.9; warmFrom = -1; last = null; handing = false;
    t0 = lastMark = performance.now(); marks = [];
    el = build(mode, opt);
    fill = el.querySelector('.aw-ld-fill');
    pctEl = el.querySelector('.aw-ld-bar b');
    labelEl = el.querySelector('.aw-ld-label');
    runner = el.querySelector('.aw-ld-runner');
    isles = el.querySelectorAll('.aw-ld-isle');
    host.appendChild(el);
    render(mode === 'rewarm' ? '重新點亮世界…' : null);
  }
  function isOpen() { return !!el && !handing; }
  // build phase: f = 0..1 of the world build, `label` = what starts now, `name` (optional) = the
  // stage that just finished (timings for the debug panel). Resolves after yielding to the browser
  // when the last yield was ≥ 150 ms ago, so the label and bar really repaint (more often only adds
  // frames of overhead: the animation itself is CSS and moves without JS).
  function step(f, label, name) {
    if (name) mark(name);
    if (el) set(a + (b - a) * Math.max(0, Math.min(1, f)), label);
    const now = performance.now();
    if (now - lastYield < 150) return Promise.resolve();
    return new Promise(r => setTimeout(() => { lastYield = performance.now(); r(); }, 0));
  }
  // after the renderer exists: a staged warm-up follows → the build only gets the first 55 %
  function plan(warmAhead) { if (warmAhead) b = 0.55; }
  const WARM_TOP = 0.96;
  function warm(i, n, name) {
    if (!el) return;
    if (warmFrom < 0) { warmFrom = p; mark('build'); }
    let label;
    if (i >= n) label = '最後衝刺，馬上出發！';
    else if (/^environment/.test(name)) label = '點亮陽光和天空…';
    else if (/^post/.test(name)) label = '加上閃亮亮的光芒…';
    else label = `把世界塗上顏色… ${i + 1}/${n}`;
    set(warmFrom + (WARM_TOP - warmFrom) * (n ? i / n : 1), label);
  }
  // everything is built (no warm-up, or it just finished): the next frame is the world's first
  function final() {
    if (!el) return;
    if (warmFrom < 0) mark('build');
    set(b, '最後衝刺，馬上出發！');
  }
  // the first real world frame has been drawn: let it reach the screen, show 100 %, dissolve
  function done() {
    if (!isOpen()) return;
    handing = true;
    mark(warmFrom >= 0 ? 'warm+first frame' : 'first frame');
    marks.push(['total', Math.round(performance.now() - t0)]);
    set(1, '出發！');
    const d = el;
    d.classList.add('full');
    requestAnimationFrame(() => {
      outT = setTimeout(() => {
        d.classList.add('out');
        const rm = () => { if (d.parentNode) d.remove(); if (el === d) el = null; };
        d.addEventListener('animationend', e => { if (e.target === d) rm(); });
        outT = setTimeout(rm, 900);
      }, reduced() ? 0 : 220);
    });
  }
  // gone at once (WebGL lost mid-warm: the 🔧 overlay underneath must be seen; init failure)
  function close() {
    clearTimeout(outT);
    handing = false;
    if (el && el.parentNode) el.remove();
    el = null;
  }
  // owner diagnostics line: where the last load spent its time
  function timings() { return marks.length ? marks.map(m => m[0] + ' ' + m[1]).join(' · ') + ' ms' : ''; }

  return { open, isOpen, step, plan, warm, final, done, close, timings };
})();
