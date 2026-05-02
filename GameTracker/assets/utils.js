// utils.js – Game Score Tracker

function generateGameId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── Toast helper ──
function showToast(msg, type = 'success') {
  let t = document.getElementById('globalToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'globalToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Bottom nav renderer ──
function renderBottomNav(active) {
  const tabs = [
    { id: 'home',        icon: '🏠', label: 'Home',     href: 'Home.html' },
    { id: 'sessions',    icon: '🎮', label: 'Sessions', href: 'pages/sessions.html' },
    { id: 'leaderboard', icon: '📊', label: 'Leaders',  href: 'pages/leaderboard.html' },
    { id: 'players',     icon: '👥', label: 'Players',  href: 'pages/players-teams.html' },
  ];
  const isPage = window.location.pathname.includes('/pages/');
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  const ul = document.createElement('ul');
  ul.className = 'nav-tabs';
  tabs.forEach(tab => {
    const li = document.createElement('li');
    const href = isPage
      ? (tab.href.startsWith('pages/') ? tab.href.replace('pages/', '') : '../' + tab.href)
      : tab.href;
    li.innerHTML = `<button class="nav-tab${tab.id === active ? ' active' : ''}" onclick="location.href='${href}'">
      <span class="nav-tab-icon">${tab.icon}</span>${tab.label}
    </button>`;
    ul.appendChild(li);
  });
  nav.appendChild(ul);
  document.body.appendChild(nav);
}

/* ══════════════════════════════════════════════════════
   IN-MEMORY CACHE
   TTL: 30s for reads. Invalidated on any write to that tab.
══════════════════════════════════════════════════════ */
const _cache = {};
const CACHE_TTL = 30000; // 30 seconds

function _cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { delete _cache[key]; return null; }
  return entry.data;
}
function _cacheSet(key, data) {
  _cache[key] = { data, ts: Date.now() };
}
function _cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}

/* ══════════════════════════════════════════════════════
   SHEET HELPERS
══════════════════════════════════════════════════════ */
async function getSheetData(sheetName) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');
  const cached = _cacheGet(sheetName);
  if (cached) return cached;

  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetName}!A:Z`
  });
  const rows = res.result.values || [];
  if (rows.length < 2) { _cacheSet(sheetName, []); return []; }
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] !== undefined ? row[i] : '');
    return obj;
  });
  _cacheSet(sheetName, data);
  return data;
}

// Fetch multiple sheets in a single API call
async function batchGetSheets(sheetNames) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');

  // Check which ones are already cached
  const result = {};
  const missing = sheetNames.filter(name => {
    const cached = _cacheGet(name);
    if (cached !== null) { result[name] = cached; return false; }
    return true;
  });

  if (!missing.length) return result;

  const ranges = missing.map(name => `${name}!A:Z`);
  const res = await gapi.client.sheets.spreadsheets.values.batchGet({
    spreadsheetId, ranges
  });
  const valueRanges = res.result.valueRanges || [];

  missing.forEach((name, i) => {
    const rows = valueRanges[i]?.values || [];
    if (rows.length < 2) { result[name] = []; _cacheSet(name, []); return; }
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, j) => obj[h] = row[j] !== undefined ? row[j] : '');
      return obj;
    });
    result[name] = data;
    _cacheSet(name, data);
  });

  return result;
}

async function appendRow(sheetName, rowValues) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    resource: { values: [rowValues] }
  });
  _cacheInvalidate(sheetName);
}

// Update multiple cells in a single batchUpdate (replaces sequential updateCell calls)
async function batchUpdateCells(sheetName, rowIndex, updates) {
  if (!spreadsheetId) return;
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetName}!A1:Z1`
  });
  const headers = res.result.values?.[0] || [];
  const sheetRow = rowIndex + 2; // 0-based data index → 1-based sheet row (skip header)

  const data = Object.entries(updates)
    .map(([col, val]) => {
      const colIndex = headers.indexOf(col);
      if (colIndex === -1) return null;
      const colLetter = String.fromCharCode(65 + colIndex);
      return { range: `${sheetName}!${colLetter}${sheetRow}`, values: [[val]] };
    })
    .filter(Boolean);

  if (!data.length) return;
  await gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: { valueInputOption: 'RAW', data }
  });
  _cacheInvalidate(sheetName);
}

// Update an entire row by matching an ID column value — uses batchUpdate for all fields at once
async function updateRowById(sheetName, idCol, idValue, updates) {
  if (!spreadsheetId) return false;
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetName}!A:Z`
  });
  const rows = res.result.values || [];
  if (rows.length < 2) return false;
  const headers = rows[0];
  const idIdx = headers.indexOf(idCol);
  if (idIdx === -1) return false;

  let sheetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === idValue) { sheetRow = i + 1; break; }
  }
  if (sheetRow === -1) return false;

  // Build all updates as one batchUpdate instead of one call per field
  const data = Object.entries(updates)
    .map(([col, val]) => {
      const colIdx = headers.indexOf(col);
      if (colIdx === -1) return null;
      const colLetter = String.fromCharCode(65 + colIdx);
      return { range: `${sheetName}!${colLetter}${sheetRow}`, values: [[val]] };
    })
    .filter(Boolean);

  if (!data.length) return false;
  await gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: { valueInputOption: 'RAW', data }
  });
  _cacheInvalidate(sheetName);
  return true;
}

// Delete a row by matching an ID column value
async function deleteRowById(sheetName, idCol, idValue) {
  if (!spreadsheetId) return false;
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${sheetName}!A:Z`
    });
    const rows = res.result.values || [];
    if (rows.length < 2) return false;
    const headers = rows[0];
    const idIdx = headers.indexOf(idCol);
    if (idIdx === -1) return false;
    let dataRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIdx] === idValue) { dataRowIndex = i; break; }
    }
    if (dataRowIndex === -1) return false;
    const sheetMeta = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId, fields: 'sheets.properties'
    });
    const sheetObj = sheetMeta.result.sheets.find(s => s.properties.title === sheetName);
    if (!sheetObj) return false;
    const sheetId = sheetObj.properties.sheetId;
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: dataRowIndex, endIndex: dataRowIndex + 1 }
          }
        }]
      }
    });
    _cacheInvalidate(sheetName);
    return true;
  } catch (e) { console.error('deleteRowById error:', e); return false; }
}

/* ══════════════════════════════════════════════════════
   DATA LOADERS — all use cache via getSheetData
══════════════════════════════════════════════════════ */
async function loadPlayers()             { return await getSheetData('Players'); }
async function loadGames()               { return await getSheetData('Games'); }
async function loadTeams()               { return await getSheetData('Teams'); }
async function loadSessions()            { return await getSheetData('Sessions'); }
async function loadSessionParticipants() { return await getSheetData('SessionParticipants'); }
async function loadRoundsIndividual()    { return await getSheetData('Rounds_Individual'); }
async function loadRoundsTeam()          { return await getSheetData('Rounds_Team'); }

/* ══════════════════════════════════════════════════════
   WRITE OPERATIONS
   Each invalidates its cache key automatically via appendRow / updateRowById.
══════════════════════════════════════════════════════ */
async function addPlayer(name, gender, status, icon, bg) {
  const playerId = generateGameId();
  await appendRow('Players', [new Date().toISOString(), playerId, name, gender, status, icon||'🧑', bg||'#f3f4f6']);
  return playerId;
}

async function editPlayer(playerId, name, gender, status, icon, bg) {
  return await updateRowById('Players', 'PlayerID', playerId, {
    PlayerName: name, Gender: gender, Status: status,
    Icon: icon || '🧑', BG: bg || '#f3f4f6'
  });
}

async function deletePlayer(playerId) {
  return await deleteRowById('Players', 'PlayerID', playerId);
}

async function addGame(name, totalPlayers, allowsIndividual, allowsTeam, playersPerTeam) {
  const gameId = generateGameId();
  await appendRow('Games', [
    new Date().toISOString(), gameId, name, totalPlayers,
    allowsIndividual ? 'TRUE' : 'FALSE',
    allowsTeam ? 'TRUE' : 'FALSE',
    playersPerTeam || ''
  ]);
  return gameId;
}

async function editGame(gameId, name, totalPlayers, allowsIndividual, allowsTeam, playersPerTeam) {
  return await updateRowById('Games', 'GameID', gameId, {
    GameName: name, TotalPlayers: totalPlayers,
    AllowsIndividual: allowsIndividual ? 'TRUE' : 'FALSE',
    AllowsTeam: allowsTeam ? 'TRUE' : 'FALSE',
    PlayersPerTeam: playersPerTeam || ''
  });
}

async function deleteGame(gameId) {
  return await deleteRowById('Games', 'GameID', gameId);
}

async function addTeam(gameId, teamName, playerIds, icon, bg) {
  const teamId = generateGameId();
  await appendRow('Teams', [new Date().toISOString(), teamId, teamName, gameId, playerIds.join(','), icon||'🏅', bg||'#fef3c7']);
  return teamId;
}

async function editTeam(teamId, teamName, icon, bg) {
  return await updateRowById('Teams', 'TeamID', teamId, {
    TeamName: teamName, Icon: icon || '🏅', BG: bg || '#fef3c7'
  });
}

async function deleteTeam(teamId) {
  return await deleteRowById('Teams', 'TeamID', teamId);
}

async function addSession(gameId, date, type) {
  const sessionId = generateGameId();
  await appendRow('Sessions', [new Date().toISOString(), sessionId, gameId, date, type, 'Active', '']);
  return sessionId;
}

async function addSessionParticipants(sessionId, participantIds, type) {
  const participantType = type === 'Individual' ? 'Player' : 'Team';
  await appendRow('SessionParticipants', [
    new Date().toISOString(), sessionId, participantIds.join(','), participantType
  ]);
}

async function addRoundIndividual(sessionId, roundNumber, players, points) {
  const roundId = generateGameId();
  await appendRow('Rounds_Individual', [
    new Date().toISOString(), roundId, sessionId, roundNumber,
    players[0]||'', players[1]||'', players[2]||'', players[3]||'',
    points[0]||0, points[1]||0, points[2]||0, points[3]||0, ''
  ]);
}

async function addRoundTeam(sessionId, roundNumber, teamA, teamB, pointsA, pointsB) {
  const roundId = generateGameId();
  await appendRow('Rounds_Team', [
    new Date().toISOString(), roundId, sessionId, roundNumber,
    teamA, teamB, pointsA, pointsB, ''
  ]);
}

// closeSession: single batchUpdate for Status + WinnerID, no redundant sheet reads
async function closeSession(sessionId) {
  // Fetch what we need in parallel
  const [sessions, participants] = await Promise.all([
    loadSessions(),
    loadSessionParticipants()
  ]);

  const session = sessions.find(s => s.SessionID === sessionId);
  if (!session) throw new Error('Session not found');
  const rowIndex = sessions.findIndex(s => s.SessionID === sessionId);

  const partRow = participants.find(p => p.SessionID === sessionId);
  const participantIds = partRow
    ? partRow.ParticipantID.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const totals = {};
  participantIds.forEach(id => totals[id] = 0);

  if (session.Type === 'Individual') {
    const rounds = await loadRoundsIndividual();
    rounds.filter(r => r.SessionID === sessionId).forEach(r => {
      for (let i = 1; i <= 4; i++) {
        const pid = r[`Player${i}_ID`];
        if (pid && totals[pid] !== undefined) totals[pid] += parseFloat(r[`Points${i}`] || 0);
      }
    });
  } else {
    const rounds = await loadRoundsTeam();
    rounds.filter(r => r.SessionID === sessionId).forEach(r => {
      if (totals[r.TeamA_ID] !== undefined) totals[r.TeamA_ID] += parseFloat(r.PointsA || 0);
      if (totals[r.TeamB_ID] !== undefined) totals[r.TeamB_ID] += parseFloat(r.PointsB || 0);
    });
  }

  const minScore = Math.min(...Object.values(totals));
  const winners  = Object.keys(totals).filter(id => totals[id] === minScore);
  const winnerId = winners.length === 1 ? winners[0] : '';

  // Single batchUpdate for both Status and WinnerID
  await batchUpdateCells('Sessions', rowIndex, { Status: 'Closed', WinnerID: winnerId });

  return { totals, winnerId };
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}
