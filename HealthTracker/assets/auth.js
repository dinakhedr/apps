// ============================================================
// AUTH.JS — Shared Google OAuth flow for Health Tracker
// ============================================================

/**
 * Lightweight page auth for secondary pages (Routine, Supplements, Dashboard).
 * Does NOT handle full setup wizard — that lives in Home.html.
 */
async function initPageAuth({ onLoadLocal = null, onReady }) {
  const token = localStorage.getItem('google_token');
  if (!token) {
    showToast('❌ Please sign in first', 'error');
    setTimeout(() => window.location.href = 'Home.html', 1500);
    return;
  }

  const email = getUserEmailFromToken(token);
  if (!email) {
    showToast('❌ Session expired — please sign in again', 'error');
    setTimeout(() => window.location.href = 'Home.html', 1500);
    return;
  }

  const spreadsheetId = localStorage.getItem(`spreadsheet_id_${email}`);

  if (typeof onLoadLocal === 'function') {
    onLoadLocal(email, spreadsheetId);
  }

  await initGapiClient();

  const savedToken = getSavedAccessToken();
  if (savedToken) {
    gapi.client.setToken({ access_token: savedToken });
    try {
      await gapi.client.drive.files.list({ q: 'trashed=false', pageSize: 1, fields: 'files(id)' });
      await onReady(spreadsheetId, email, savedToken);
      return;
    } catch (e) {
      clearAccessToken();
    }
  }

  const doTokenRequest = () => {
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: '',
      callback: async (resp) => {
        if (!resp.access_token) {
          showToast('❌ Authentication failed', 'error');
          _authHideLoading();
          return;
        }
        saveAccessToken(resp.access_token);
        gapi.client.setToken({ access_token: resp.access_token });
        await onReady(spreadsheetId, email, resp.access_token);
      }
    }).requestAccessToken();
  };

  if (isIOSSafari()) {
    _authShowIOSTapScreen(doTokenRequest);
  } else {
    doTokenRequest();
  }
}

function _authShowIOSTapScreen(onTap) {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(233,30,140,0.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:32px 24px;text-align:center;max-width:300px;width:100%">
      <div style="font-size:48px;margin-bottom:12px">🧴</div>
      <h2 style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#14142b;margin-bottom:8px">Welcome Back</h2>
      <p style="color:#6e6e8a;font-size:14px;margin-bottom:20px">Tap below to connect to your Google Drive</p>
      <button id="_authTapBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#e91e8c,#f48fb1);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;">
        Connect to Google Drive
      </button>
    </div>`;
  document.getElementById('_authTapBtn').addEventListener('click', () => {
    overlay.innerHTML = `<div style="background:#fff;border-radius:24px;padding:32px 24px;text-align:center"><div style="width:24px;height:24px;border:3px solid #fce4ec;border-top-color:#e91e8c;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px"></div><p style="color:#6e6e8a;font-size:14px">Connecting…</p></div>`;
    onTap();
  });
}

function _authHideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}
