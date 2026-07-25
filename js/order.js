/* ===== 英語餐廳大亂鬥 Module (order) — placeholder =====
   Wiring only: zone/nav/hub/engine hooks land in this commit so the whole
   site still loads cleanly. The game itself lands in a later commit.
*/

const OrderGame = (() => {
  function init() {
    const root = document.getElementById('od-root');
    if (root) root.innerHTML = '<p class="od-soon">準備中…</p>';
  }

  return { init };
})();
