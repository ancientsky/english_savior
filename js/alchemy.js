/* ===== 單字鍊金術 Module (alchemy) — placeholder =====
   Wiring only: zone/nav/hub/engine hooks land in this commit so the whole
   site still loads cleanly. The game itself lands in a later commit.
*/

const AlchemyGame = (() => {
  function init() {
    const root = document.getElementById('al-root');
    if (root) root.innerHTML = '<p class="al-soon">準備中…</p>';
  }

  return { init };
})();
