// ============================================================
// SHARED UTILITIES — Expense Tracker
// ============================================================

const CLIENT_ID = '957735552832-u52fo3efk11sgg4pege9jo1650l1vl0a.apps.googleusercontent.com';
const FOLDER_NAME = 'Expense Tracker';
const SHEET_NAME = 'My Expenses';
const CAT_SHEET_NAME = 'Categories';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// ── Default Categories (fallback only) ────────────────────
const DEFAULT_CATEGORIES = [
  { value: 'Car Repairs',   icon: '🚗', bg: '#ffd1d1', chart: '#e57373' },
  { value: 'Cafe',          icon: '☕', bg: '#d4e8d4', chart: '#81c784' },
  { value: 'Shopping',      icon: '🛍️', bg: '#e8d5b7', chart: '#d4a574' },
  { value: 'Entertainment', icon: '🎬', bg: '#d4b8ff', chart: '#b39ddb' },
  { value: 'Electronics',   icon: '📱', bg: '#d4e8ff', chart: '#7986cb' },
  { value: 'Games',         icon: '🎮', bg: '#d4b8ff', chart: '#b39ddb' },
  { value: 'Gym',           icon: '🏋️', bg: '#ffe5b4', chart: '#f4c542' },
  { value: 'Health',        icon: '💊', bg: '#ffccd9', chart: '#f48fb1' },
  { value: 'Home Repairs',  icon: '🛠️', bg: '#ffd1d1', chart: '#e57373' },
  { value: 'Internet',      icon: '📶', bg: '#cce0ff', chart: '#4fc3f7' },
  { value: 'Personal Care', icon: '🧴', bg: '#ffccd9', chart: '#f48fb1' },
  { value: 'Pets',          icon: '🐾', bg: '#e8d5b7', chart: '#d4a574' },
  { value: 'Petrol',        icon: '⛽', bg: '#ffd1d1', chart: '#e57373' },
  { value: 'Ride Hailing',  icon: '🚕', bg: '#ffe5b4', chart: '#f4c542' },
  { value: 'Smoking',       icon: '🚬', bg: '#e0e0e0', chart: '#9e9e9e' },
  { value: 'Subscriptions', icon: '💻', bg: '#cce7ff', chart: '#64b5f6' },
  { value: 'Supermarket',   icon: '🛒', bg: '#ffe0b5', chart: '#ffb74d' },
  { value: 'Travel',        icon: '✈️', bg: '#d4e8ff', chart: '#4fc3f7' },
  { value: 'Utilities',     icon: '⚡', bg: '#ffe5b4', chart: '#f4c542' },
  { value: 'Rent',          icon: '🏠', bg: '#cce0ff', chart: '#7986cb' },
  { value: 'Installments',  icon: '🔄', bg: '#d4e8d4', chart: '#81c784' },
];

// ── Active categories (loaded from sheet, falls back to defaults) ──
// This is populated by loadCategoriesFromSheet() called on each page load.
// Pages call CATEGORIES / getCategoryMeta() after that resolves.
let CATEGORIES = [...DEFAULT_CATEGORIES];

// Parse a Categories sheet row → category object
// Row format: Type | OriginalValue | Name | Icon | BG | Chart | Budget | Hidden
function parseCatRow(r) {
  return {
    type:          r[0] || 'default',
    originalValue: r[1] || '',
    value:         r[2] || r[1] || '',
    icon:          r[3] || '💰',
    bg:            r[4] || '#f0f0f0',
    chart:         r[5] || '#aaa',
    budget:        r[6] ? parseFloat(r[6]) : null,
    hidden:        r[7] === 'true',
  };
}

// Serialize a category object → sheet row
function catToRow(cat) {
  return [
    cat.type          || 'default',
    cat.originalValue || cat.value,
    cat.value,
    cat.icon,
    cat.bg,
    cat.chart,
    cat.budget  || '',
    cat.hidden  ? 'true' : 'false',
  ];
}

// Load categories from sheet tab; returns array of active category objects
async function loadCategoriesFromSheet(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CAT_SHEET_NAME}!A2:H`,
    });
    const rows = res.result.values || [];
    if (!rows.length) return null; // sheet exists but empty — seed it
    const cats = rows.map(parseCatRow).filter(c => !c.hidden);
    CATEGORIES = cats;
    return cats;
  } catch (e) {
    // Sheet tab may not exist yet
    return null;
  }
}

// Write entire categories list to the sheet tab (full overwrite)
async function saveCategoriesToSheet(spreadsheetId, allCats) {
  // allCats includes hidden ones so user can toggle them back
  const rows = allCats.map(catToRow);
  // Clear then write
  await gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${CAT_SHEET_NAME}!A2:H`,
  });
  if (rows.length) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CAT_SHEET_NAME}!A2:H`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });
  }
}

// Create the Categories sheet tab with headers + default data
async function createCategoriesTab(spreadsheetId) {
  // Add new sheet tab
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        addSheet: { properties: { title: CAT_SHEET_NAME } }
      }]
    }
  });
  // Write header
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CAT_SHEET_NAME}!A1:H1`,
    valueInputOption: 'RAW',
    resource: { values: [['Type','OriginalValue','Name','Icon','BG','Chart','Budget','Hidden']] },
  });
  // Seed with defaults
  const defaultRows = DEFAULT_CATEGORIES.map(c => ({
    type: 'default', originalValue: c.value, value: c.value,
    icon: c.icon, bg: c.bg, chart: c.chart, budget: null, hidden: false,
  }));
  await saveCategoriesToSheet(spreadsheetId, defaultRows);
  CATEGORIES = [...DEFAULT_CATEGORIES];
  return defaultRows;
}

// Ensure Categories tab exists; create + seed if not. Returns full cat list (including hidden).
async function ensureCategoriesTab(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheets = res.result.sheets || [];
    const exists = sheets.some(s => s.properties.title === CAT_SHEET_NAME);
    if (!exists) {
      return await createCategoriesTab(spreadsheetId);
    }
    // Tab exists — load all rows including hidden
    const fullRes = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${CAT_SHEET_NAME}!A2:H`
    });
    let rows = (fullRes.result.values || []).map(parseCatRow);

    // Merge any new defaults that don't exist in the sheet yet
    const existingOriginals = new Set(rows.map(r => r.originalValue));
    const newDefaults = DEFAULT_CATEGORIES.filter(d => !existingOriginals.has(d.value));
    if (newDefaults.length) {
      const newRows = newDefaults.map(c => ({
        type: 'default', originalValue: c.value, value: c.value,
        icon: c.icon, bg: c.bg, chart: c.chart, budget: null, hidden: false,
      }));
      rows = [...rows, ...newRows];
      await saveCategoriesToSheet(spreadsheetId, rows);
    }

    CATEGORIES = rows.filter(c => !c.hidden);
    return rows;
  } catch(e) {
    console.error('ensureCategoriesTab error', e);
    CATEGORIES = [...DEFAULT_CATEGORIES];
    return DEFAULT_CATEGORIES.map(c => ({ ...c, type:'default', originalValue:c.value }));
  }
}

function getCategoryMeta(category) {
  return CATEGORIES.find(c => c.value === category || c.originalValue === category)
    || DEFAULT_CATEGORIES.find(c => c.value === category)
    || { icon: '💰', bg: '#f0f0f0', chart: '#aaa' };
}
function getCategoryIcon(category)  { return getCategoryMeta(category).icon; }
function getCategoryColor(category) { return getCategoryMeta(category).bg; }
function getChartColor(category)    { return getCategoryMeta(category).chart; }
function getCategoryBudget(category) {
  const m = getCategoryMeta(category);
  return m ? (m.budget || null) : null;
}

// ── Date helpers ──────────────────────────────────────────
function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateString) {
  const d = parseLocalDate(dateString);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDayHeader(dateString) {
  const d = parseLocalDate(dateString);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Token helpers ─────────────────────────────────────────
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

// ── ID generator (incremental, collision-safe) ────────────
function genId() {
  const key = 'expense_id_counter';
  const next = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, next);
  return next;
}
