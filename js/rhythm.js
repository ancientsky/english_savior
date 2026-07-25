/* ===== 英語節奏星 Module (rhythm) — placeholder =====
   Wiring only: zone/nav/hub/engine hooks land in this commit so the whole
   site still loads cleanly. The game itself lands in a later commit.
*/

const RhythmGame = (() => {
  function init() {
    const root = document.getElementById('rh-root');
    if (root) root.innerHTML = '<p class="rh-soon">準備中…</p>';
  }

  function onShow() { /* canvas loop resumes here once the game lands */ }

  return { init, onShow };
})();
