// auth.js – Game Score Tracker

const CLIENT_ID = '290220901695-djbstkkp2989sdsgr8f81atdi7er8p7e.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const FOLDER_NAME = 'Game Score Tracker';
const FILE_NAME   = 'Game Scores';

let spreadsheetId      = null;
let currentUserEmail   = null;
let currentAccessToken = null;

/* ── Helpers ── */
function saveAccessToken(t)  { try { sessionStorage.setItem('gapi_access_token', t); } catch(e){} }
function getSavedAccessToken(){ try { return sessionStorage.getItem('gapi_access_token'); } catch(e){ return null; } }
function clearAccessToken()  { try { sessionStorage.removeItem('gapi_access_token'); } catch(e){} }

function isIOSSafari() {
  return /iP(hone|od|ad)/.test(navigator.userAgent) &&
         /WebKit/.test(navigator.userAgent) &&
         !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
}

function getUserEmailFromToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json).email;
  } catch { return null; }
}

/* ── Wait for a global with timeout ── */
function waitForGlobal(check, timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (check()) { resolve(); return; }
    const start = Date.now();
    const iv = setInterval(() => {
      if (check()) { clearInterval(iv); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(iv); reject(new Error('Timeout waiting for script')); }
    }, 100);
  });
}

/* ── Init gapi client ── */
async function initGapiClient() {
  // Wait for gapi to be available (may not be loaded yet on slow connections)
  await waitForGlobal(() => typeof gapi !== 'undefined', 10000);
  await new Promise((resolve, reject) => {
    if (gapi.client?.drive) { resolve(); return; }
    gapi.load('client', { callback: resolve, onerror: reject, timeout: 8000, ontimeout: () => reject(new Error('gapi.load timeout')) });
  });
  await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
}

/* ── Spreadsheet setup ── */
async function findExistingSpreadsheet() {
  const res = await gapi.client.drive.files.list({
    q: `name='${FILE_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    spaces: 'drive', fields: 'files(id)'
  });
  return res.result.files?.[0]?.id || null;
}

async function findExistingFolder() {
  const res = await gapi.client.drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive', fields: 'files(id)'
  });
  return res.result.files?.[0]?.id || null;
}

/* ── ensureGameTabs: only runs once per session, batched ── */
let tabsEnsured = false;
async function ensureGameTabs() {
  if (tabsEnsured) return;  // skip on subsequent page navigations within same session

  const sheetsRes = await gapi.client.sheets.spreadsheets.get({
    spreadsheetId, fields: 'sheets.properties'
  });
  const existingTabs = sheetsRes.result.sheets.map(s => s.properties.title);

  const requiredTabs = ['Players','Games','Teams','Sessions','SessionParticipants','Rounds_Individual','Rounds_Team'];
  const headersMap = {
    Players:             ['TimeStamp','PlayerID','PlayerName','Gender','Status','Icon','BG'],
    Games:               ['TimeStamp','GameID','GameName','TotalPlayers','AllowsIndividual','AllowsTeam','PlayersPerTeam'],
    Teams:               ['TimeStamp','TeamID','TeamName','GameID','PlayerIDs','Icon','BG'],
    Sessions:            ['TimeStamp','SessionID','GameID','Date','Type','Status','WinnerID'],
    SessionParticipants: ['TimeStamp','SessionID','ParticipantID','ParticipantType'],
    Rounds_Individual:   ['TimeStamp','RoundID','SessionID','RoundNumber','Player1_ID','Player2_ID','Player3_ID','Player4_ID','Points1','Points2','Points3','Points4','WinnerID'],
    Rounds_Team:         ['TimeStamp','RoundID','SessionID','RoundNumber','TeamA_ID','TeamB_ID','PointsA','PointsB','WinnerTeamID']
  };

  // Add missing sheets in one batch request
  const missingTabs = requiredTabs.filter(t => !existingTabs.includes(t));
  if (missingTabs.length) {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: missingTabs.map(title => ({ addSheet: { properties: { title } } })) }
    });
  }

  // Check + write headers — only for tabs that existed already (new ones have no rows yet)
  // Batch-read all header rows at once
  const ranges = requiredTabs.map(t => `${t}!A1:Z1`);
  const batchRes = await gapi.client.sheets.spreadsheets.values.batchGet({
    spreadsheetId, ranges
  });
  const valueRanges = batchRes.result.valueRanges || [];

  // Write missing headers one by one (can't batch-write different ranges easily)
  for (let i = 0; i < requiredTabs.length; i++) {
    const tab = requiredTabs[i];
    const vals = valueRanges[i]?.values;
    if (!vals || vals.length === 0) {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId, range: `${tab}!A1:Z1`, valueInputOption: 'RAW',
        resource: { values: [headersMap[tab]] }
      });
    }
  }

  tabsEnsured = true;
}

/* ── Token granted ── */
async function onAccessTokenGranted(tokenResponse) {
  if (!tokenResponse?.access_token) return;
  currentAccessToken = tokenResponse.access_token;
  saveAccessToken(currentAccessToken);
  gapi.client.setToken({ access_token: currentAccessToken });

  let foundId = await findExistingSpreadsheet();
  if (!foundId) {
    let folderId = await findExistingFolder();
    if (!folderId) {
      const folder = await gapi.client.drive.files.create({
        resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id'
      });
      folderId = folder.result.id;
    }
    const sheet = await gapi.client.drive.files.create({
      resource: { name: FILE_NAME, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [folderId] },
      fields: 'id'
    });
    foundId = sheet.result.id;
  }
  spreadsheetId = foundId;
  localStorage.setItem(`spreadsheet_id_${currentUserEmail}`, spreadsheetId);
  await ensureGameTabs();
  if (window.onAuthReady) window.onAuthReady();
}

/* ── Show tap-to-continue overlay for iOS ── */
function showIOSTapOverlay(onTap) {
  // Remove any existing overlay
  const existing = document.getElementById('iosTapOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'iosTapOverlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background: linear-gradient(135deg,#5b5ef4,#8b5cf6);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    padding:32px; text-align:center;
  `;
  overlay.innerHTML = `
    <div style="background:#fff; border-radius:24px; padding:36px 28px; max-width:320px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.2)">
      <div style="font-size:52px; margin-bottom:14px">🎲</div>
      <div style="font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:#14142b; margin-bottom:8px">Score Tracker</div>
      <p style="color:#6e6e8a; font-size:14px; line-height:1.5; margin-bottom:24px">Tap below to sign in with Google and continue.</p>
      <button id="iosTapBtn" style="
        width:100%; padding:14px; background:linear-gradient(135deg,#5b5ef4,#8b5cf6);
        color:#fff; border:none; border-radius:12px;
        font-family:'Sora',sans-serif; font-size:16px; font-weight:700; cursor:pointer;
      ">Continue with Google</button>
      <p style="color:#a8a8c0; font-size:11px; margin-top:16px">Your data is stored in your own Google Drive</p>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('iosTapBtn').addEventListener('click', () => {
    overlay.remove();
    onTap();
  });

  // Also hide the loading overlay if present
  const lo = document.getElementById('loadingOverlay');
  if (lo) lo.style.display = 'none';
}

/* ── Main auth entry point ── */
async function initPageAuth(callbacks) {
  // Wrap everything in a try-catch so errors never leave loading stuck
  try {
    const token = localStorage.getItem('google_token');
    if (!token) {
      if (callbacks.onNeedLogin) callbacks.onNeedLogin();
      return;
    }

    currentUserEmail = getUserEmailFromToken(token);
    if (!currentUserEmail) {
      localStorage.removeItem('google_token');
      if (callbacks.onNeedLogin) callbacks.onNeedLogin();
      return;
    }

    const savedSheetId = localStorage.getItem(`spreadsheet_id_${currentUserEmail}`);
    if (savedSheetId) spreadsheetId = savedSheetId;

    // Wait for google identity services to load
    await waitForGlobal(() => typeof google !== 'undefined' && google.accounts, 10000);
    await initGapiClient();

    // Try cached access token first
    const cachedToken = getSavedAccessToken();
    if (cachedToken) {
      currentAccessToken = cachedToken;
      gapi.client.setToken({ access_token: cachedToken });
      try {
        await gapi.client.drive.files.list({ pageSize: 1 });
        if (spreadsheetId) await ensureGameTabs();
        if (callbacks.onReady) callbacks.onReady(spreadsheetId, currentUserEmail, cachedToken);
        return;
      } catch(e) {
        clearAccessToken();
        // Token expired — fall through to get a new one
      }
    }

    // Need a new access token
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse) => {
        try {
          await onAccessTokenGranted(tokenResponse);
          if (callbacks.onReady) callbacks.onReady(spreadsheetId, currentUserEmail, currentAccessToken);
        } catch(e) {
          console.error('Auth error after token grant:', e);
          if (callbacks.onNeedLogin) callbacks.onNeedLogin();
        }
      }
    });

    if (isIOSSafari()) {
      // iOS Safari blocks popups — show a tap overlay instead
      showIOSTapOverlay(() => tokenClient.requestAccessToken({ prompt: '' }));
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }

  } catch(e) {
    console.error('initPageAuth error:', e);
    // Never leave the user stuck — show login if anything goes wrong
    const lo = document.getElementById('loadingOverlay');
    if (lo) lo.style.display = 'none';
    if (callbacks.onNeedLogin) callbacks.onNeedLogin();
  }
}
