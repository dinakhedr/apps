// ============================================================
// AUTH.JS — Shared Google OAuth flow
// Usage: call initPageAuth({ onReady, onLoadLocal? })
//   onLoadLocal(email)  — optional, called immediately with cached data
//   onReady(spreadsheetId, email, accessToken) — called when Drive is ready
// ============================================================

/**
 * Lightweight page auth for secondary pages (Expenses, Recurring,
 * Categories, Installments).  Does NOT handle the full setup wizard
 * (folder creation, first-run screens) — that lives in Home.html.
 *
 * Flow:
 *  1. Read google_token from localStorage → extract email.
 *  2. If no token → show toast and redirect to Home.html.
 *  3. Call onLoadLocal(email) so the page can render cached data immediately.
 *  4. Init GAPI client.
 *  5. Try the saved sessionStorage access-token first (silent, fast).
 *  6. On iOS Safari, show a tap-to-continue overlay (required by browser policy).
 *  7. Otherwise, request a new token silently (no popup if already granted).
 *  8. When a valid token is obtained, call onReady(...).
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

  // Let the page render local data immediately
  if (typeof onLoadLocal === 'function') {
    onLoadLocal(email, spreadsheetId);
  }

  await initGapiClient();

  // ── Try cached access token first (no popup) ─────────────
  const savedToken = getSavedAccessToken();
  if (savedToken) {
    gapi.client.setToken({ access_token: savedToken });
    try {
      // Quick validation — a failed call means the token expired
      await gapi.client.drive.files.list({ q: 'trashed=false', pageSize: 1, fields: 'files(id)' });
      await onReady(spreadsheetId, email, savedToken);
      return;
    } catch (e) {
      clearAccessToken();  // expired — fall through to re-auth
    }
  }

  // ── Build the token request callback ─────────────────────
  const doTokenRequest = () => {
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: '',   // '' = no consent popup if already granted
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

  // ── iOS Safari needs a direct user tap to request tokens ─
  if (isIOSSafari()) {
    _authShowIOSTapScreen(doTokenRequest);
  } else {
    doTokenRequest();
  }
}

// ── iOS tap-to-continue overlay ───────────────────────────
// Looks for a #loadingOverlay element (Recurring/Installments style)
// or falls back to creating a minimal overlay.
function _authShowIOSTapScreen(onTap) {
  let overlay = document.getElementById('loadingOverlay');
  let created = false;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(91,94,244,0.96);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;';
    document.body.appendChild(overlay);
    created = true;
  }
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:32px 24px;text-align:center;max-width:300px;width:100%">
      <div style="font-size:48px;margin-bottom:12px">💰</div>
      <h2 style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#14142b;margin-bottom:8px">Welcome Back</h2>
      <p style="color:#6e6e8a;font-size:14px;margin-bottom:20px">Tap below to connect to your Google Drive</p>
      <button id="_authTapBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#5b5ef4,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;">
        Connect to Google Drive
      </button>
    </div>`;
  document.getElementById('_authTapBtn').addEventListener('click', () => {
    overlay.innerHTML = `<div style="background:#fff;border-radius:24px;padding:32px 24px;text-align:center"><div style="width:24px;height:24px;border:3px solid #ededff;border-top-color:#5b5ef4;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px"></div><p style="color:#6e6e8a;font-size:14px">Connecting…</p></div>`;
    onTap();
  });
}

function _authHideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}
