/* ===== Word Alchemy Module (單字鍊金術) =====
   Little-Alchemy-style word building: drop two word PARTS into the cauldron and
   they fuse into a real English word. The subject being taught is morphology —
   learn `un-` once and you own a dozen words, which is the highest-leverage
   thing an elementary student can carry into 國中 English.

   Every recipe is pure concatenation (enforced by the data validator), so what
   a child sees on screen IS the rule, with no silent spelling exceptions.

   Save: localStorage `english_savior_alchemy`
     { found: [word], done: [chapterId], challenge: { chapterId: bestCorrect } }
*/

const AlchemyGame = (() => {
  const SAVE_KEY = 'english_savior_alchemy';

  const DISCOVER_XP = 12, DISCOVER_GEM = 1;
  const CHALLENGE_XP = 15, CHALLENGE_GEM = 1;
  const CHALLENGE_N = 5, CHALLENGE_SEC = 25;

  // Chapter clear reward, by how deep the chapter is (matches Candy/Tower tiers)
  function chapterReward(i) {
    if (i < 3) return { xp: 30, gems: 5 };
    if (i < 6) return { xp: 45, gems: 8 };
    return { xp: 60, gems: 11 };
  }

  let els = {};
  let save = { found: [], done: [], challenge: {} };

  // ---- current chapter ----
  let chapter = null, chapterIndex = -1;
  let shelf = [];            // part ids available in this chapter
  let slots = [null, null];  // the two cauldron slots
  let busy = false;

  // ---- challenge mode ----
  let challenge = null;      // { queue, idx, correct, timer, deadline }

  const partById = id => ALCHEMY_PARTS.find(p => p.id === id);

  /* ================= save ================= */

  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && typeof d === 'object') {
        save = {
          found: Array.isArray(d.found) ? d.found : [],
          done: Array.isArray(d.done) ? d.done : [],
          challenge: d.challenge && typeof d.challenge === 'object' ? d.challenge : {},
        };
      }
    } catch { /* first run */ }
  }

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota */ }
  }

  function recipesOf(chId) { return ALCHEMY_RECIPES.filter(r => r.ch === chId); }
  function foundIn(chId) { return recipesOf(chId).filter(r => save.found.includes(r.w)).length; }
  function isUnlocked(i) { return i === 0 || save.done.includes(ALCHEMY_CHAPTERS[i - 1].id); }

  // The literal rule, spelled out from the two parts — this is the payload
  function explain(r) {
    const A = partById(r.a), B = partById(r.b);
    return `${A.text}（${A.zh}）＋ ${B.text}（${B.zh}）＝ ${r.w}（${r.zh}）`;
  }

  /* ================= chapter play ================= */

  function openChapter(i) {
    chapterIndex = i;
    chapter = ALCHEMY_CHAPTERS[i];
    const rs = recipesOf(chapter.id);
    const ids = [];
    rs.forEach(r => { if (!ids.includes(r.a)) ids.push(r.a); if (!ids.includes(r.b)) ids.push(r.b); });
    // group by type so the shelf reads as 字首 / 字根 / 字尾
    const order = { prefix: 0, root: 1, suffix: 2 };
    shelf = ids.sort((x, y) => {
      const a = partById(x), b = partById(y);
      return order[a.type] - order[b.type] || a.text.localeCompare(b.text);
    });
    slots = [null, null];
    busy = false;

    els.chapters.classList.remove('open');
    els.done.classList.remove('open');
    els.start.style.display = 'none';
    els.lab.style.display = '';
    els.rule.innerHTML = `<span class="al-rule-e">${chapter.e}</span><div><strong>${chapter.name}</strong><p>${chapter.rule}</p></div>`;
    renderAll();
  }

  function renderAll() {
    renderTargets();
    renderShelf();
    renderCauldron();
    renderHUD();
  }

  function renderHUD() {
    if (!chapter) {
      els.hud.textContent = `⚗️ 已合成 ${save.found.length} / ${ALCHEMY_RECIPES.length} 個單字`;
      return;
    }
    els.hud.textContent = `${chapter.e} ${chapter.name}　${foundIn(chapter.id)} / ${recipesOf(chapter.id).length}`;
  }

  function renderTargets() {
    els.targets.innerHTML = '';
    recipesOf(chapter.id).forEach(r => {
      const got = save.found.includes(r.w);
      const card = document.createElement('button');
      card.className = 'al-target' + (got ? ' got' : '');
      card.innerHTML = got
        ? `<span class="al-target-e">${r.e}</span>
           <span class="al-target-w">${r.w}</span>
           <span class="al-target-zh">${r.zh}</span>`
        : `<span class="al-target-e">❔</span>
           <span class="al-target-w">???</span>
           <span class="al-target-zh">${r.zh}</span>`;
      card.title = got ? explain(r) : `還沒合成：${r.zh}`;
      if (got) card.addEventListener('click', () => {
        if (typeof TTSManager !== 'undefined') TTSManager.speak(r.w);
        flash(explain(r), 'ok');
      });
      els.targets.appendChild(card);
    });
  }

  function renderShelf() {
    els.shelf.innerHTML = '';
    let lastType = null;
    shelf.forEach(id => {
      const p = partById(id);
      if (p.type !== lastType) {
        lastType = p.type;
        const h = document.createElement('div');
        h.className = 'al-shelf-head';
        h.textContent = p.type === 'prefix' ? '字首 prefix' : p.type === 'suffix' ? '字尾 suffix' : '字根 root';
        els.shelf.appendChild(h);
      }
      const b = document.createElement('button');
      b.className = `al-part al-${p.type}` + (slots.includes(id) ? ' picked' : '');
      b.innerHTML = `<span class="al-part-e">${p.e}</span><span class="al-part-t">${p.text}</span><span class="al-part-zh">${p.zh}</span>`;
      b.addEventListener('click', () => pick(id));
      els.shelf.appendChild(b);
    });
  }

  function renderCauldron() {
    [0, 1].forEach(i => {
      const el = els.slot[i];
      const id = slots[i];
      if (!id) {
        el.className = 'al-slot empty';
        el.innerHTML = `<span class="al-slot-hint">${i === 0 ? '第一個零件' : '第二個零件'}</span>`;
        el.onclick = null;
        return;
      }
      const p = partById(id);
      el.className = `al-slot filled al-${p.type}`;
      el.innerHTML = `<span class="al-part-e">${p.e}</span><span class="al-part-t">${p.text}</span><span class="al-part-zh">${p.zh}</span>`;
      el.onclick = () => { slots[i] = null; renderShelf(); renderCauldron(); };
    });
    els.preview.textContent = slots[0] && slots[1]
      ? partById(slots[0]).text + partById(slots[1]).text
      : (slots[0] ? partById(slots[0]).text + '…' : '');
  }

  function pick(id) {
    if (busy) return;
    if (challenge) { pickChallenge(id); return; }
    if (slots[0] === id) { slots[0] = null; renderShelf(); renderCauldron(); return; }
    if (slots[1] === id) { slots[1] = null; renderShelf(); renderCauldron(); return; }
    if (!slots[0]) slots[0] = id;
    else if (!slots[1]) slots[1] = id;
    else { slots = [slots[1], id]; }
    renderShelf();
    renderCauldron();
    if (slots[0] && slots[1]) { busy = true; setTimeout(brew, 420); }
  }

  function brew() {
    const [a, b] = slots;
    const r = ALCHEMY_RECIPES.find(x => x.a === a && x.b === b);
    if (!r) {
      const bad = partById(a).text + partById(b).text;
      SoundManager.playWrong();
      puff();
      flash(`💨「${bad}」不是一個英文單字，換個組合再試試！`, 'bad');
      slots = [null, null];
      busy = false;
      renderShelf();
      renderCauldron();
      return;
    }

    const isNew = !save.found.includes(r.w);
    if (isNew) {
      save.found.push(r.w);
      persist();
      GameEngine.addXP(DISCOVER_XP);
      GameEngine.addGems(DISCOVER_GEM);
      GameEngine.recordAlchemyWord();
    }
    SoundManager.playCorrect();
    if (typeof TTSManager !== 'undefined') TTSManager.speak(r.w);
    showFusion(r, isNew);

    slots = [null, null];
    busy = false;
    renderAll();

    // chapter done?
    if (chapter && foundIn(chapter.id) === recipesOf(chapter.id).length) {
      setTimeout(() => finishChapter(), 1400);
    }
  }

  function showFusion(r, isNew) {
    els.fusion.innerHTML = `
      <span class="al-fusion-e">${r.e}</span>
      <div class="al-fusion-body">
        <div class="al-fusion-w">${r.w}</div>
        <div class="al-fusion-zh">${r.zh}</div>
        <div class="al-fusion-ex">${explain(r)}</div>
      </div>
      <span class="al-fusion-tag">${isNew ? `✨ 新單字！+${DISCOVER_XP} XP +${DISCOVER_GEM} 💎` : '已經合成過了'}</span>`;
    els.fusion.classList.add('show');
    clearTimeout(showFusion._t);
    showFusion._t = setTimeout(() => els.fusion.classList.remove('show'), 3400);
  }

  function finishChapter() {
    const done = save.done.includes(chapter.id);
    const reward = chapterReward(chapterIndex);
    if (!done) {
      save.done.push(chapter.id);
      persist();
      GameEngine.addXP(reward.xp);
      GameEngine.addGems(reward.gems);
    }
    SoundManager.playQuestComplete();
    const last = chapterIndex >= ALCHEMY_CHAPTERS.length - 1;
    els.doneBody.innerHTML = `
      <div class="al-done-e">${chapter.e}</div>
      <h3>${chapter.name} 全部合成完畢！</h3>
      <p class="al-done-rule">${chapter.rule}</p>
      <p class="al-done-reward">${done ? '（這一章之前就完成過了）' : `+${reward.xp} XP　+${reward.gems} 💎`}</p>
      <div class="al-done-row">
        <button class="al-btn" id="al-dex2">📔 鍊金圖鑑</button>
        <button class="al-btn" id="al-chal">⏱️ 限時挑戰</button>
        ${last ? '' : '<button class="al-btn al-btn-main" id="al-next">➡️ 下一章</button>'}
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#al-dex2').addEventListener('click', () => { els.done.classList.remove('open'); openDex(); });
    els.doneBody.querySelector('#al-chal').addEventListener('click', () => { els.done.classList.remove('open'); startChallenge(); });
    const next = els.doneBody.querySelector('#al-next');
    if (next) next.addEventListener('click', () => openChapter(chapterIndex + 1));
  }

  /* ================= challenge mode ================= */

  function startChallenge() {
    const pool = recipesOf(chapter.id).slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    challenge = { queue: pool.slice(0, CHALLENGE_N), idx: 0, correct: 0, deadline: 0, timer: null };
    slots = [null, null];
    els.lab.classList.add('challenge');
    nextChallenge();
  }

  function nextChallenge() {
    if (challenge.idx >= challenge.queue.length) { endChallenge(); return; }
    const r = challenge.queue[challenge.idx];
    slots = [null, null];
    challenge.deadline = Date.now() + CHALLENGE_SEC * 1000;
    els.chalBar.style.display = '';
    els.chalBar.innerHTML = `
      <span class="al-chal-q">${r.e} <strong>${r.zh}</strong> — 拼出這個字！</span>
      <span class="al-chal-progress">${challenge.idx + 1} / ${challenge.queue.length}　答對 ${challenge.correct}</span>
      <span class="al-chal-time" id="al-chal-time">${CHALLENGE_SEC}s</span>
      <button class="al-btn al-btn-ghost" id="al-chal-quit">離開挑戰</button>`;
    els.chalBar.querySelector('#al-chal-quit').addEventListener('click', endChallenge);
    renderShelf();
    renderCauldron();
    clearInterval(challenge.timer);
    challenge.timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((challenge.deadline - Date.now()) / 1000));
      const el = document.getElementById('al-chal-time');
      if (el) el.textContent = left + 's';
      if (left <= 0) {
        clearInterval(challenge.timer);
        flash(`⏰ 時間到！答案是 ${r.w}`, 'bad');
        challenge.idx++;
        setTimeout(nextChallenge, 1200);
      }
    }, 200);
  }

  function pickChallenge(id) {
    if (slots[0] === id) { slots[0] = null; renderShelf(); renderCauldron(); return; }
    if (slots[1] === id) { slots[1] = null; renderShelf(); renderCauldron(); return; }
    if (!slots[0]) slots[0] = id;
    else if (!slots[1]) slots[1] = id;
    else slots = [slots[1], id];
    renderShelf();
    renderCauldron();
    if (!slots[0] || !slots[1]) return;

    const r = challenge.queue[challenge.idx];
    const guess = partById(slots[0]).text + partById(slots[1]).text;
    clearInterval(challenge.timer);
    if (guess === r.w) {
      challenge.correct++;
      GameEngine.addXP(CHALLENGE_XP);
      GameEngine.addGems(CHALLENGE_GEM);
      SoundManager.playCorrect();
      if (typeof TTSManager !== 'undefined') TTSManager.speak(r.w);
      flash(`✅ ${r.w} — ${explain(r)}`, 'ok');
    } else {
      SoundManager.playWrong();
      flash(`❌「${guess}」不對，正確答案是 ${r.w}`, 'bad');
    }
    challenge.idx++;
    slots = [null, null];
    setTimeout(nextChallenge, 1400);
  }

  function endChallenge() {
    if (!challenge) return;
    clearInterval(challenge.timer);
    const score = challenge.correct;
    const best = save.challenge[chapter.id] || 0;
    if (score > best) { save.challenge[chapter.id] = score; persist(); }
    flash(`⏱️ 限時挑戰結束：答對 ${score} / ${challenge.queue.length}${score > best ? '（新紀錄！）' : ''}`, 'ok');
    challenge = null;
    slots = [null, null];
    els.lab.classList.remove('challenge');
    els.chalBar.style.display = 'none';
    renderAll();
  }

  /* ================= overlays ================= */

  function openChapters() {
    els.chList.innerHTML = '';
    ALCHEMY_CHAPTERS.forEach((c, i) => {
      const open = isUnlocked(i);
      const n = foundIn(c.id), total = recipesOf(c.id).length;
      const btn = document.createElement('button');
      btn.className = 'al-ch' + (open ? '' : ' locked') + (save.done.includes(c.id) ? ' done' : '');
      btn.disabled = !open;
      btn.innerHTML = open
        ? `<span class="al-ch-e">${c.e}</span>
           <span class="al-ch-name">${i + 1}. ${c.name}</span>
           <span class="al-ch-progress">${n} / ${total}${save.challenge[c.id] ? `　⏱️ ${save.challenge[c.id]}/${CHALLENGE_N}` : ''}</span>`
        : `<span class="al-ch-e">🔒</span><span class="al-ch-name">???</span>
           <span class="al-ch-progress">先完成上一章</span>`;
      if (open) btn.addEventListener('click', () => openChapter(i));
      els.chList.appendChild(btn);
    });
    els.chSub.textContent = `已合成 ${save.found.length} / ${ALCHEMY_RECIPES.length} 個單字`;
    els.chapters.classList.add('open');
  }

  function openDex() {
    els.dexBody.innerHTML = '';
    ALCHEMY_CHAPTERS.forEach(c => {
      const rs = recipesOf(c.id);
      const got = rs.filter(r => save.found.includes(r.w));
      const sec = document.createElement('div');
      sec.className = 'al-dex-sec';
      sec.innerHTML = `<h4>${c.e} ${c.name}　<span>${got.length} / ${rs.length}</span></h4>`;
      const grid = document.createElement('div');
      grid.className = 'al-dex-grid';
      rs.forEach(r => {
        const has = save.found.includes(r.w);
        const card = document.createElement('button');
        card.className = 'al-dex-card' + (has ? '' : ' locked');
        card.innerHTML = has
          ? `<span class="al-dex-e">${r.e}</span><span class="al-dex-w">${r.w}</span>
             <span class="al-dex-zh">${r.zh}</span><span class="al-dex-ex">${partById(r.a).text} + ${partById(r.b).text}</span>`
          : `<span class="al-dex-e">❔</span><span class="al-dex-w">???</span>
             <span class="al-dex-zh">${r.zh}</span><span class="al-dex-ex"></span>`;
        if (has) card.addEventListener('click', () => TTSManager.speak(r.w));
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      els.dexBody.appendChild(sec);
    });
    els.dexSub.textContent = `${save.found.length} / ${ALCHEMY_RECIPES.length}`;
    els.dex.classList.add('open');
  }

  /* ================= small effects ================= */

  function flash(msg, kind) {
    els.flash.textContent = msg;
    els.flash.className = 'al-flash show ' + (kind || '');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { els.flash.className = 'al-flash'; }, 3000);
  }

  function puff() {
    els.cauldron.classList.remove('puff');
    void els.cauldron.offsetWidth;
    els.cauldron.classList.add('puff');
    setTimeout(() => els.cauldron.classList.remove('puff'), 500);
  }

  /* ================= shell ================= */

  function buildShell() {
    const root = document.getElementById('al-root');
    if (!root) return false;
    root.innerHTML = `
      <div class="al-topbar">
        <span class="al-chip" id="al-hud">—</span>
        <div class="al-actions">
          <button class="al-btn al-btn-main" id="al-ch-btn">📚 章節</button>
          <button class="al-btn" id="al-dex-btn">📔 圖鑑</button>
        </div>
      </div>

      <div class="al-screen" id="al-start">
        <h3>🔤 單字鍊金術</h3>
        <p>英文單字是<strong>拼出來的</strong>！把「字首」「字根」「字尾」丟進坩堝，就會合成一個全新的單字。</p>
        <p><strong>un</strong>（不）＋ <strong>happy</strong>（快樂的）＝ <strong>unhappy</strong>（不快樂的）</p>
        <p>學會一個字首，等於一次多會十幾個字——這是升國中最划算的一招。</p>
        <button class="al-btn al-btn-main al-btn-big" id="al-start-btn">📚 打開章節</button>
      </div>

      <div class="al-lab" id="al-lab" style="display:none">
        <div class="al-rule" id="al-rule"></div>
        <div class="al-chal-bar" id="al-chal-bar" style="display:none"></div>

        <div class="al-work">
          <div class="al-cauldron" id="al-cauldron">
            <div class="al-slots">
              <div class="al-slot empty" id="al-slot0"></div>
              <span class="al-plus">＋</span>
              <div class="al-slot empty" id="al-slot1"></div>
              <span class="al-eq">＝</span>
              <div class="al-preview" id="al-preview"></div>
            </div>
            <div class="al-pot">⚗️</div>
            <div class="al-fusion" id="al-fusion"></div>
          </div>
          <div class="al-targets" id="al-targets"></div>
        </div>

        <div class="al-flash" id="al-flash"></div>
        <div class="al-shelf" id="al-shelf"></div>
      </div>

      <div class="al-overlay" id="al-chapters">
        <div class="al-panel">
          <div class="al-panel-head">
            <h3>📚 章節</h3><span class="al-panel-sub" id="al-ch-sub"></span>
            <button class="al-close" data-al-close="al-chapters">✕</button>
          </div>
          <div class="al-ch-list" id="al-ch-list"></div>
        </div>
      </div>

      <div class="al-overlay" id="al-dex">
        <div class="al-panel">
          <div class="al-panel-head">
            <h3>📔 鍊金圖鑑</h3><span class="al-panel-sub" id="al-dex-sub"></span>
            <button class="al-close" data-al-close="al-dex">✕</button>
          </div>
          <div class="al-dex-body" id="al-dex-body"></div>
        </div>
      </div>

      <div class="al-overlay" id="al-done">
        <div class="al-panel al-panel-narrow">
          <div class="al-done-body" id="al-done-body"></div>
        </div>
      </div>
    `;

    els = {
      root,
      hud: root.querySelector('#al-hud'),
      start: root.querySelector('#al-start'),
      lab: root.querySelector('#al-lab'),
      rule: root.querySelector('#al-rule'),
      chalBar: root.querySelector('#al-chal-bar'),
      cauldron: root.querySelector('#al-cauldron'),
      slot: [root.querySelector('#al-slot0'), root.querySelector('#al-slot1')],
      preview: root.querySelector('#al-preview'),
      fusion: root.querySelector('#al-fusion'),
      targets: root.querySelector('#al-targets'),
      shelf: root.querySelector('#al-shelf'),
      flash: root.querySelector('#al-flash'),
      chapters: root.querySelector('#al-chapters'),
      chList: root.querySelector('#al-ch-list'),
      chSub: root.querySelector('#al-ch-sub'),
      dex: root.querySelector('#al-dex'),
      dexBody: root.querySelector('#al-dex-body'),
      dexSub: root.querySelector('#al-dex-sub'),
      done: root.querySelector('#al-done'),
      doneBody: root.querySelector('#al-done-body'),
    };

    root.querySelectorAll('[data-al-close]').forEach(b => {
      b.addEventListener('click', () => root.querySelector('#' + b.dataset.alClose).classList.remove('open'));
    });
    root.querySelectorAll('.al-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });
    root.querySelector('#al-start-btn').addEventListener('click', openChapters);
    root.querySelector('#al-ch-btn').addEventListener('click', openChapters);
    root.querySelector('#al-dex-btn').addEventListener('click', openDex);
    return true;
  }

  /* ================= lifecycle ================= */

  function init() {
    loadSave();
    if (!buildShell()) return;
    renderHUD();

    window.__alchemyTest = {
      state: () => ({
        chapter: chapter && chapter.id,
        shelf: shelf.length,
        slots: slots.slice(),
        found: save.found.length,
        done: save.done.slice(),
        inChallenge: !!challenge,
      }),
      openChapter: i => openChapter(i),
      // Combine two parts by id, exactly as tapping them would
      combine: (a, b) => { slots = [a, b]; brew(); },
      pick: id => pick(id),
      startChallenge: () => startChallenge(),
      challengeAnswer: () => (challenge ? challenge.queue[challenge.idx] : null),
      save: () => JSON.parse(JSON.stringify(save)),
    };
  }

  return { init };
})();
