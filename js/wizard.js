/* ===== Word Wizard Module (單字魔法師) — placeholder =====
   Wiring only: zone/nav/hub/engine hooks land in this commit so the whole
   site still loads cleanly. The canvas game itself lands in the next commit.
*/

const WizardGame = (() => {
  function init() {
    const root = document.getElementById('wz-root');
    if (root) root.innerHTML = '<p class="wz-soon">🪄 魔法書正在準備中…</p>';
  }

  function onShow() { /* canvas loop resumes here once the game lands */ }

  return { init, onShow };
})();
