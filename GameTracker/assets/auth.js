// auth.js – Google OAuth for Game Score Tracker

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

async function initGapiClient() {
  await new Promise(resolve => {
    if (gapi.client?.drive) { resolve(); return; }
    gapi.load('client', resolve);
  });
  await gapi.client.init({ apiKey: '', discoveryDocs: DISCOVERY_DOCS });
}

function getUserEmailFromToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json).email;
  } catch { return null; }
}

function saveAccessToken(token) { sessionStorage.setItem('gapi_access_token', token); }
function getSavedAccessToken()  { return sessionStorage.getItem('gapi_access_token'); }
function clearAccessToken()     { sessionStorage.removeItem('gapi_access_token'); }

function isIOSSafari() {
  return /iP(hone|od|ad)/.test(navigator.userAgent) &&
         /WebKit/.test(navigator.userAgent) &&
         !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
}

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

async function ensureGameTabs() {
  const sheets = await gapi.client.sheets.spreadsheets.get({
    spreadsheetId, fields: 'sheets.properties'
  });
  const existingTabs = sheets.result.sheets.map(s => s.properties.title);

  const requiredTabs = [
    'Players', 'Games', 'Teams', 'Sessions',
    'SessionParticipants', 'Rounds_Individual', 'Rounds_Team'
  ];

  for (let tab of requiredTabs) {
    if (!existingTabs.includes(tab)) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: tab } } }] }
      });
    }
  }

  // Note: Teams now includes GameID column
  const headersMap = {
    Players:             ['TimeStamp','PlayerID','PlayerName','Gender','Status','Icon','BG'],
    Games:               ['TimeStamp','GameID','GameName','TotalPlayers','AllowsIndividual','AllowsTeam','PlayersPerTeam'],
    Teams:               ['TimeStamp','TeamID','TeamName','GameID','PlayerIDs','Icon','BG'],
    Sessions:            ['TimeStamp','SessionID','GameID','Date','Type','Status','WinnerID'],
    SessionParticipants: ['TimeStamp','SessionID','ParticipantID','ParticipantType'],
    Rounds_Individual:   ['TimeStamp','RoundID','SessionID','RoundNumber','Player1_ID','Player2_ID','Player3_ID','Player4_ID','Points1','Points2','Points3','Points4','WinnerID'],
    Rounds_Team:         ['TimeStamp','RoundID','SessionID','RoundNumber','TeamA_ID','TeamB_ID','PointsA','PointsB','WinnerTeamID']
  };

  for (let [tab, headers] of Object.entries(headersMap)) {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${tab}!A1:Z1`
    });
    if (!res.result.values || res.result.values.length === 0) {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId, range: `${tab}!A1:Z1`, valueInputOption: 'RAW',
        resource: { values: [headers] }
      });
    }
  }
}

async function onAccessTokenGranted(tokenResponse) {
  if (!tokenResponse.access_token) return;
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

async function initPageAuth(callbacks) {
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

  await initGapiClient();
  const cachedToken = getSavedAccessToken();
  if (cachedToken) {
    currentAccessToken = cachedToken;
    gapi.client.setToken({ access_token: cachedToken });
    try {
      await gapi.client.drive.files.list({ pageSize: 1 });
      if (spreadsheetId) await ensureGameTabs();
      if (callbacks.onReady) callbacks.onReady(spreadsheetId, currentUserEmail, cachedToken);
      return;
    } catch(e) { clearAccessToken(); }
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES,
    callback: async (tokenResponse) => {
      await onAccessTokenGranted(tokenResponse);
      if (callbacks.onReady) callbacks.onReady(spreadsheetId, currentUserEmail, currentAccessToken);
    }
  });

  if (isIOSSafari()) {
    if (callbacks.onNeedTap) callbacks.onNeedTap(() => tokenClient.requestAccessToken());
    else tokenClient.requestAccessToken();
  } else {
    tokenClient.requestAccessToken();
  }
}
