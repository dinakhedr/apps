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
    { id: 'home',        icon: '🏠', label: 'Home',       href: 'Home.html' },
    { id: 'sessions',    icon: '🎮', label: 'Sessions',   href: 'pages/sessions.html' },
    { id: 'leaderboard', icon: '📊', label: 'Leaders',    href: 'pages/leaderboard.html' },
    { id: 'players',     icon: '👥', label: 'Players',    href: 'pages/players-teams.html' },
  ];
  // Resolve hrefs relative to current page
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

// ── Sheet helpers ──
async function getSheetData(sheetName) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetName}!A:Z`
  });
  const rows = res.result.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i] !== undefined ? row[i] : '');
    return obj;
  });
}

async function appendRow(sheetName, rowValues) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    resource: { values: [rowValues] }
  });
}

async function updateCell(sheetName, rowIndex, colName, value) {
  if (!spreadsheetId) return;
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetName}!A:Z`
  });
  const rows = res.result.values || [];
  if (rows.length < 2) return;
  const headers = rows[0];
  const colIndex = headers.indexOf(colName);
  if (colIndex === -1) return;
  const sheetRow = rowIndex + 2;
  const colLetter = String.fromCharCode(65 + colIndex);
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${colLetter}${sheetRow}`,
    valueInputOption: 'RAW',
    resource: { values: [[value]] }
  });
}

// Update an entire row by matching an ID column value
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

  let sheetRow = -1;  // 1‑based row number in Sheets
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === idValue) {
      sheetRow = i + 1;   // rows array is 0‑based → add 1 to get sheet row
      break;
    }
  }
  if (sheetRow === -1) return false;

  for (const [col, val] of Object.entries(updates)) {
    const colIdx = headers.indexOf(col);
    if (colIdx === -1) continue;
    const colLetter = String.fromCharCode(65 + colIdx);
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${colLetter}${sheetRow}`,   // exactly the right row
      valueInputOption: 'RAW',
      resource: { values: [[val]] }
    });
  }
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
    // Get the sheet's numeric ID
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
    return true;
  } catch (e) { console.error('deleteRowById error:', e); return false; }
}

// ── Data loaders ──
async function loadPlayers()             { return await getSheetData('Players'); }
async function loadGames()               { return await getSheetData('Games'); }
async function loadTeams()               { return await getSheetData('Teams'); }
async function loadSessions()            { return await getSheetData('Sessions'); }
async function loadSessionParticipants() { return await getSheetData('SessionParticipants'); }
async function loadRoundsIndividual()    { return await getSheetData('Rounds_Individual'); }
async function loadRoundsTeam()          { return await getSheetData('Rounds_Team'); }

// ── Add operations ──
async function addPlayer(name, gender, status, icon, bg) {
  const playerId = generateGameId();
  await appendRow('Players', [new Date().toISOString(), playerId, name, gender, status, icon||'🧑', bg||'#f3f4f6']);
  return playerId;
}

async function editPlayer(playerId, name, gender, status, icon, bg) {
  return await updateRowById('Players', 'PlayerID', playerId, {
    PlayerName: name,
    Gender: gender,
    Status: status,
    Icon: icon || '🧑',
    BG: bg || '#f3f4f6'
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
    GameName: name,
    TotalPlayers: totalPlayers,
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
  // Teams sheet: TimeStamp, TeamID, TeamName, GameID, PlayerIDs, Icon, BG
  await appendRow('Teams', [new Date().toISOString(), teamId, teamName, gameId, playerIds.join(','), icon||'🏅', bg||'#fef3c7']);
  return teamId;
}

async function editTeam(teamId, teamName, icon, bg) {
  return await updateRowById('Teams', 'TeamID', teamId, {
    TeamName: teamName,
    Icon: icon || '🏅',
    BG: bg || '#fef3c7'
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
  for (let pid of participantIds) {
    await appendRow('SessionParticipants', [new Date().toISOString(), sessionId, pid, participantType]);
  }
}

async function addRoundIndividual(sessionId, roundNumber, players, points) {
  const roundId = generateGameId();
  await appendRow('Rounds_Individual', [
    new Date().toISOString(), roundId, sessionId, roundNumber,
    players[0] || '', players[1] || '', players[2] || '', players[3] || '',
    points[0] || 0, points[1] || 0, points[2] || 0, points[3] || 0,
    ''
  ]);
}

async function addRoundTeam(sessionId, roundNumber, teamA, teamB, pointsA, pointsB) {
  const roundId = generateGameId();
  await appendRow('Rounds_Team', [
    new Date().toISOString(), roundId, sessionId, roundNumber,
    teamA, teamB, pointsA, pointsB, ''
  ]);
}

async function closeSession(sessionId) {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.SessionID === sessionId);
  if (!session) throw new Error('Session not found');
  const rowIndex = sessions.findIndex(s => s.SessionID === sessionId);
  let totals = {};
  if (session.Type === 'Individual') {
    const rounds = await loadRoundsIndividual();
    const participants = (await loadSessionParticipants()).filter(p => p.SessionID === sessionId);
    for (let p of participants) totals[p.ParticipantID] = 0;
    for (let r of rounds.filter(r => r.SessionID === sessionId)) {
      for (let i = 1; i <= 4; i++) {
        let pid = r[`Player${i}_ID`];
        if (pid && totals[pid] !== undefined) totals[pid] += parseFloat(r[`Points${i}`] || 0);
      }
    }
  } else {
    const rounds = await loadRoundsTeam();
    const participants = (await loadSessionParticipants()).filter(p => p.SessionID === sessionId);
    for (let p of participants) totals[p.ParticipantID] = 0;
    for (let r of rounds.filter(r => r.SessionID === sessionId)) {
      totals[r.TeamA_ID] = (totals[r.TeamA_ID] || 0) + parseFloat(r.PointsA || 0);
      totals[r.TeamB_ID] = (totals[r.TeamB_ID] || 0) + parseFloat(r.PointsB || 0);
    }
  }
  const minScore = Math.min(...Object.values(totals));
  const winners = Object.keys(totals).filter(id => totals[id] === minScore);
  const winnerId = winners.length === 1 ? winners[0] : '';
  await updateCell('Sessions', rowIndex, 'WinnerID', winnerId);
  await updateCell('Sessions', rowIndex, 'Status', 'Closed');
  return { totals, winnerId };
}

// ── Helpers ──
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}
