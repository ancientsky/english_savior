/* ===== Daily Quests Module ===== */

const DailyQuests = (() => {
  function init() {
    render();
  }

  function render() {
    const list = document.getElementById('daily-list');
    list.innerHTML = '';
    const state = GameEngine.getState();

    let allDone = true;
    DAILY_QUESTS.forEach(quest => {
      const progress = state[quest.key] || 0;
      const done = progress >= quest.target;
      if (!done) allDone = false;

      const item = document.createElement('div');
      item.className = 'daily-item' + (done ? ' done' : '');
      item.innerHTML = `
        <span class="daily-check">${done ? '✅' : '⬜'}</span>
        <div class="daily-info">
          <h4>${quest.icon} ${quest.name}</h4>
          <p>${quest.desc}（${Math.min(progress, quest.target)} / ${quest.target}）</p>
        </div>
        <span class="daily-reward">+10 XP</span>
      `;
      list.appendChild(item);
    });

    const bonus = document.getElementById('daily-bonus');
    if (allDone) {
      bonus.innerHTML = `<h3>🎁 全部完成！</h3><p style="color:var(--green)">恭喜你完成今天的所有任務！明天再來挑戰吧！</p>`;
    }
  }

  return { init, render };
})();
