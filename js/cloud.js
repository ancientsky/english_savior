/* ===== Cloud Save Module =====
   Two-track progress backup:
   1. File export/import — always available, zero setup. Downloads all
      game localStorage keys as one JSON file.
   2. Google Drive sync (appDataFolder) — pure frontend via Google
      Identity Services token client + Drive REST API. Requires the
      site owner to create an OAuth Client ID (see DEPLOYMENT.md) and
      paste it below. When GOOGLE_CLIENT_ID is empty the Drive section
      is hidden and no Google script is ever loaded.
   The GIS script (accounts.google.com/gsi/client) is the one documented
   exception to the "fully self-contained, no external scripts" rule —
   it is lazy-loaded only on the first sign-in click.
*/

const CloudSave = (() => {
  // ===== 站長設定：到 Google Cloud Console 建立 OAuth Client ID 後貼在這裡 =====
  // 設定教學請看 DEPLOYMENT.md 的「Google 雲端同步設定」章節。
  // 空字串 = 隱藏 Google 雲端同步區塊（檔案匯出/匯入仍然可用）。
  const GOOGLE_CLIENT_ID = '';

  const SAVE_KEYS = [
    'english_savior_save',
    'english_savior_empire',
    'english_savior_candy',
    'english_savior_builder',
    'english_savior_tower',
    'english_savior_rpg',
    'sound_enabled',
  ];
  const DRIVE_FILE_NAME = 'english_savior_backup.json';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3';
  const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

  let accessToken = null;   // in-memory only, never persisted
  let tokenClient = null;
  let gisLoaded = false;
  let doFetch = (...args) => fetch(...args); // swappable for tests

  let els = {};

  function init() {
    els = {
      exportBtn: document.getElementById('cloud-export-btn'),
      importBtn: document.getElementById('cloud-import-btn'),
      fileInput: document.getElementById('cloud-file-input'),
      driveSection: document.getElementById('cloud-drive-section'),
      driveHint: document.getElementById('cloud-drive-hint'),
      signinBtn: document.getElementById('cloud-signin-btn'),
      backupBtn: document.getElementById('cloud-backup-btn'),
      restoreBtn: document.getElementById('cloud-restore-btn'),
      status: document.getElementById('cloud-status'),
    };

    els.exportBtn.addEventListener('click', exportFile);
    els.importBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', () => {
      if (els.fileInput.files[0]) importFile(els.fileInput.files[0]);
      els.fileInput.value = '';
    });

    if (!GOOGLE_CLIENT_ID) {
      els.driveSection.style.display = 'none';
      els.driveHint.style.display = 'block';
    } else {
      els.signinBtn.addEventListener('click', signIn);
      els.backupBtn.addEventListener('click', backup);
      els.restoreBtn.addEventListener('click', restore);
    }

    // Test hook: lets automated tests exercise Drive flows without network
    window.__cloudTest = {
      collectPayload,
      applyPayload,
      setToken: t => { accessToken = t; setSignedIn(true); },
      setFetch: fn => { doFetch = fn; },
      backup,
      restore,
      getStatus: () => els.status.textContent,
    };
  }

  function showModal() {
    setStatus(accessToken ? '✅ 已登入 Google' : '');
    document.getElementById('modal-cloud').classList.add('active');
  }

  // ===== Payload =====
  function collectPayload() {
    const keys = {};
    SAVE_KEYS.forEach(k => { keys[k] = localStorage.getItem(k); });
    return { version: 1, savedAt: new Date().toISOString(), keys };
  }

  function payloadLevel(payload) {
    try {
      return JSON.parse(payload.keys.english_savior_save).level || 1;
    } catch {
      return 1;
    }
  }

  function applyPayload(payload) {
    if (!payload || payload.version !== 1 || !payload.keys) {
      GameEngine.showToast('❌ 存檔格式不正確', 'error');
      return false;
    }
    SAVE_KEYS.forEach(k => {
      if (payload.keys[k] !== null && payload.keys[k] !== undefined) {
        localStorage.setItem(k, payload.keys[k]);
      }
    });
    GameEngine.showToast('✅ 存檔已還原，重新載入中…', 'achievement');
    setTimeout(() => location.reload(), 800);
    return true;
  }

  function confirmOverwrite(payload, sourceZh) {
    const cur = GameEngine.getState();
    const when = new Date(payload.savedAt).toLocaleString('zh-TW');
    return confirm(
      `${sourceZh}存檔：${when}（Lv.${payloadLevel(payload)}）\n` +
      `目前本機進度：Lv.${cur.level}\n\n` +
      `確定要用${sourceZh}存檔覆蓋這台裝置的進度嗎？`
    );
  }

  // ===== File export / import =====
  function exportFile() {
    const payload = collectPayload();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `english_savior_備份_${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    GameEngine.showToast('⬇️ 存檔已匯出！', 'achievement');
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload.keys || payload.version !== 1) throw new Error('bad format');
        if (confirmOverwrite(payload, '檔案')) applyPayload(payload);
      } catch {
        GameEngine.showToast('❌ 這不是有效的存檔檔案', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ===== Google Drive (appDataFolder) =====
  function setStatus(msg) {
    if (els.status) els.status.textContent = msg;
  }

  function setSignedIn(on) {
    if (!els.backupBtn) return;
    els.backupBtn.disabled = !on;
    els.restoreBtn.disabled = !on;
    if (on) els.signinBtn.textContent = '🔑 已登入（點我換帳號）';
  }

  function loadGis() {
    return new Promise((resolve, reject) => {
      if (gisLoaded && window.google?.accounts?.oauth2) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => { gisLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('無法載入 Google 登入元件'));
      document.head.appendChild(script);
    });
  }

  async function signIn() {
    setStatus('⏳ 載入 Google 登入中…');
    try {
      await loadGis();
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: resp => {
            if (resp.access_token) {
              accessToken = resp.access_token;
              setSignedIn(true);
              setStatus('✅ 已登入 Google，可以備份或還原了');
            } else {
              setStatus('❌ 登入失敗：' + (resp.error || '未知錯誤'));
            }
          },
        });
      }
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    } catch (e) {
      setStatus('❌ ' + e.message);
    }
  }

  async function driveFetch(url, options = {}, retried = false) {
    const resp = await doFetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
    });
    if (resp.status === 401 && !retried && tokenClient) {
      // token expired — silently request a fresh one, then retry once
      await new Promise(resolve => {
        const prev = tokenClient.callback;
        tokenClient.callback = r => {
          if (r.access_token) accessToken = r.access_token;
          tokenClient.callback = prev;
          resolve();
        };
        tokenClient.requestAccessToken({ prompt: '' });
      });
      return driveFetch(url, options, true);
    }
    return resp;
  }

  async function findDriveFile() {
    const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}'`);
    const resp = await driveFetch(
      `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`);
    if (!resp.ok) throw new Error('Drive 查詢失敗（' + resp.status + '）');
    const data = await resp.json();
    return (data.files && data.files[0]) || null;
  }

  async function backup() {
    if (!accessToken) { setStatus('請先登入 Google'); return; }
    setStatus('⏳ 備份中…');
    try {
      const payload = JSON.stringify(collectPayload());
      const existing = await findDriveFile();
      let resp;
      if (existing) {
        resp = await driveFetch(
          `${DRIVE_UPLOAD}/files/${existing.id}?uploadType=media`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: payload });
      } else {
        const boundary = 'es_backup_boundary';
        const body =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
          JSON.stringify({ name: DRIVE_FILE_NAME, parents: ['appDataFolder'] }) +
          `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
          payload + `\r\n--${boundary}--`;
        resp = await driveFetch(
          `${DRIVE_UPLOAD}/files?uploadType=multipart`,
          { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
      }
      if (!resp.ok) throw new Error('上傳失敗（' + resp.status + '）');
      setStatus(`☁️✅ 備份成功！（${new Date().toLocaleString('zh-TW')}）`);
      GameEngine.showToast('☁️ 進度已備份到你的 Google 雲端', 'achievement');
    } catch (e) {
      setStatus('❌ ' + e.message);
    }
  }

  async function restore() {
    if (!accessToken) { setStatus('請先登入 Google'); return; }
    setStatus('⏳ 讀取雲端存檔中…');
    try {
      const existing = await findDriveFile();
      if (!existing) { setStatus('雲端上還沒有備份，先按「備份到雲端」吧！'); return; }
      const resp = await driveFetch(`${DRIVE_API}/files/${existing.id}?alt=media`);
      if (!resp.ok) throw new Error('下載失敗（' + resp.status + '）');
      const payload = await resp.json();
      if (!payload.keys || payload.version !== 1) throw new Error('雲端存檔格式不正確');
      if (confirmOverwrite(payload, '雲端')) {
        applyPayload(payload);
      } else {
        setStatus('已取消，本機進度保持不變');
      }
    } catch (e) {
      setStatus('❌ ' + e.message);
    }
  }

  return { init, showModal, exportFile, importFile };
})();
