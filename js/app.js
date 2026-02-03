/* ===== App Init & Navigation ===== */

document.addEventListener('DOMContentLoaded', () => {
  // Load game state
  GameEngine.load();
  GameEngine.recordStreak();
  GameEngine.updateStats();

  // Init modules
  MinecraftGame.init();
  RobloxGame.init();
  YoutubeGame.init();
  DailyQuests.init();

  // Navigation
  document.querySelectorAll('[data-zone]').forEach(el => {
    el.addEventListener('click', () => {
      const zone = el.dataset.zone;
      switchZone(zone);
      // Update daily quests when visiting
      if (zone === 'daily') DailyQuests.render();
    });
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('active');
    });
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // HUD buttons
  document.getElementById('btn-inventory').addEventListener('click', GameEngine.showInventory);
  document.getElementById('btn-achievements').addEventListener('click', GameEngine.showAchievements);
  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('modal-help').classList.add('active');
  });
});

function switchZone(zoneId) {
  document.querySelectorAll('.zone').forEach(z => z.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const zone = document.getElementById('zone-' + zoneId);
  if (zone) zone.classList.add('active');

  const tab = document.querySelector(`.nav-tab[data-zone="${zoneId}"]`);
  if (tab) tab.classList.add('active');
}
