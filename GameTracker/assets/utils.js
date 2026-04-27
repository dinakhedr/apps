// utils.js – Game Score Tracker (no CLIENT_ID here)

function generateGameId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function getSheetData(sheetName) {
  if (!spreadsheetId) throw new Error('No spreadsheet connected');
  const range = `${sheetName}!A:Z`;
  const res = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.result.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
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
  const range = `${sheetName}!A:Z`;
  const res = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
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

// Data loaders
async function loadPlayers() { return await getSheetData('Players'); }
async function loadGames() { return await getSheetData('Games'); }
async function loadTeams() { return await getSheetData('Teams'); }
async function loadSessions() { return await getSheetData('Sessions'); }
async function loadSessionParticipants() { return await getSheetData('SessionParticipants'); }
async function loadRoundsIndividual() { return await getSheetData('Rounds_Individual'); }
async function loadRoundsTeam() { return await getSheetData('Rounds_Team'); }

// Add operations
async function addPlayer(name, gender) {
  const playerId = generateGameId();
  const timestamp = new Date().toISOString();
  await appendRow('Players', [timestamp, playerId, name, gender, 'Active']);
  return playerId;
}

async function addGame(name, totalPlayers, allowsIndividual, allowsTeam, playersPerTeam) {
  const gameId = generateGameId();
  const timestamp = new Date().toISOString();
  await appendRow('Games', [timestamp, gameId, name, totalPlayers, allowsIndividual, allowsTeam, playersPerTeam || null]);
  return gameId;
}

async function addTeam(gameId, teamName, playerIds) {
  const teamId = generateGameId();
  const timestamp = new Date().toISOString();
  await appendRow('Teams', [timestamp, teamId, teamName, playerIds.join(','), 'Active']);
  return teamId;
}

async function addSession(gameId, date, type) {
  const sessionId = generateGameId();
  const timestamp = new Date().toISOString();
  await appendRow('Sessions', [timestamp, sessionId, gameId, date, type, 'Active', null]);
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
  const timestamp = new Date().toISOString();
  const row = [
    timestamp, roundId, sessionId, roundNumber,
    players[0] || null, players[1] || null, players[2] || null, players[3] || null,
    points[0] || 0, points[1] || 0, points[2] || 0, points[3] || 0,
    null
  ];
  await appendRow('Rounds_Individual', row);
}

async function addRoundTeam(sessionId, roundNumber, teamA, teamB, pointsA, pointsB) {
  const roundId = generateGameId();
  const timestamp = new Date().toISOString();
  await appendRow('Rounds_Team', [timestamp, roundId, sessionId, roundNumber, teamA, teamB, pointsA, pointsB, null]);
}

async function closeSession(sessionId) {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.SessionID === sessionId);
  if (!session) throw new Error('Session not found');
  const rowIndex = sessions.findIndex(s => s.SessionID === sessionId);
  if (session.Type === 'Individual') {
    const rounds = await loadRoundsIndividual();
    const sessionRounds = rounds.filter(r => r.SessionID === sessionId);
    const participants = (await loadSessionParticipants()).filter(p => p.SessionID === sessionId);
    let totals = {};
    for (let p of participants) totals[p.ParticipantID] = 0;
    for (let r of sessionRounds) {
      for (let i=1; i<=4; i++) {
        let pid = r[`Player${i}_ID`];
        if (pid && totals[pid] !== undefined) totals[pid] += parseFloat(r[`Points${i}`] || 0);
      }
    }
    let minScore = Math.min(...Object.values(totals));
    let winners = Object.keys(totals).filter(pid => totals[pid] === minScore);
    let winnerId = winners.length === 1 ? winners[0] : null;
    await updateCell('Sessions', rowIndex, 'WinnerID', winnerId);
    await updateCell('Sessions', rowIndex, 'Status', 'Closed');
  } else {
    const rounds = await loadRoundsTeam();
    const sessionRounds = rounds.filter(r => r.SessionID === sessionId);
    const participants = (await loadSessionParticipants()).filter(p => p.SessionID === sessionId);
    let totals = {};
    for (let p of participants) totals[p.ParticipantID] = 0;
    for (let r of sessionRounds) {
      totals[r.TeamA_ID] = (totals[r.TeamA_ID] || 0) + parseFloat(r.PointsA || 0);
      totals[r.TeamB_ID] = (totals[r.TeamB_ID] || 0) + parseFloat(r.PointsB || 0);
    }
    let minScore = Math.min(...Object.values(totals));
    let winners = Object.keys(totals).filter(tid => totals[tid] === minScore);
    let winnerId = winners.length === 1 ? winners[0] : null;
    await updateCell('Sessions', rowIndex, 'WinnerID', winnerId);
    await updateCell('Sessions', rowIndex, 'Status', 'Closed');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function formatMoney(amount) {
  return `EGP ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
