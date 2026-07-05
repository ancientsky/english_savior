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
  SpellingGame.init();
  ListeningGame.init();
  EmpireGame.init();
  CandyGame.init();
  DailyQuests.init();

  // Navigation
  document.querySelectorAll('[data-zone]').forEach(el => {
    el.addEventListener('click', () => {
      const zone = el.dataset.zone;
      switchZone(zone);
      // Update daily quests when visiting
      if (zone === 'daily') DailyQuests.render();
      // Resume the 3D renderer when returning to the empire zone
      if (zone === 'empire') EmpireGame.onShow();
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

  // Game fullscreen buttons (one per game zone)
  document.querySelectorAll('.zone-fs-btn').forEach(btn => {
    btn.addEventListener('click', toggleGameFullscreen);
  });
  // Leaving native fullscreen (Esc / system gesture) also exits maximize mode
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setGameMax(false);
      }
    });
  });
  // Esc exits the CSS-only fallback mode (browsers without the Fullscreen API)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('game-max') &&
        !document.fullscreenElement && !document.webkitFullscreenElement) {
      setGameMax(false);
    }
  });

  // HUD buttons
  document.getElementById('btn-shop').addEventListener('click', GameEngine.showShop);
  document.getElementById('btn-inventory').addEventListener('click', GameEngine.showInventory);
  document.getElementById('btn-achievements').addEventListener('click', GameEngine.showAchievements);
  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('modal-help').classList.add('active');
  });
});

/* ===== Game fullscreen (畫面最大化) =====
   Uses the native Fullscreen API where available (desktop, Android),
   plus a CSS class that hides the HUD/nav so the active game fills the
   viewport. On iPhone Safari (no Fullscreen API for regular elements)
   the CSS mode alone still maximizes the play area. */
function setGameMax(on) {
  document.body.classList.toggle('game-max', on);
  document.querySelectorAll('.zone-fs-btn').forEach(b => {
    b.textContent = on ? '✕' : '⛶';
    b.title = on ? '離開最大化（Esc）' : '遊戲畫面最大化';
  });
  // Let canvas games (spelling runner, empire 3D) recompute their size
  window.dispatchEvent(new Event('resize'));
}

function toggleGameFullscreen() {
  const on = !document.body.classList.contains('game-max');
  if (on) {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch { /* CSS-only fallback below still applies */ }
  } else {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch { /* ignore */ }
  }
  setGameMax(on);
}

function switchZone(zoneId) {
  document.querySelectorAll('.zone').forEach(z => z.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const zone = document.getElementById('zone-' + zoneId);
  if (zone) zone.classList.add('active');

  const tab = document.querySelector(`.nav-tab[data-zone="${zoneId}"]`);
  if (tab) tab.classList.add('active');
}
