// ============================================================
// SHARED UTILITIES — Expense Tracker
// ============================================================

const CLIENT_ID = '957735552832-u52fo3efk11sgg4pege9jo1650l1vl0a.apps.googleusercontent.com';
const FOLDER_NAME  = 'Expense Tracker';
const FILE_NAME    = 'My Expenses';   // Google Drive file name (never changes)
const SHEET_NAME   = 'Daily Log';     // Tab name inside the spreadsheet
const CAT_SHEET_NAME = 'Categories';
const RECURRING_SHEET         = 'Recurring';
const RECURRING_LOG_SHEET     = 'Recurring Log';
const INSTALLMENTS_SHEET      = 'Installments';
const INSTALLMENTS_LOG_SHEET  = 'Installments Log';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// ── Bank / BNPL providers (used by Installments page) ────
// Add new banks here — all pages share this list via utils.js
const BANK_PROVIDERS = [
  { key: 'AAIB',     name: 'Arab African International Bank',         logo: 'Logos/AAIB.png'     },
  { key: 'AlexBank',     name: 'Bank of Alexandria',         logo: 'Logos/AlexBank.png'     },
  { key: 'BM',     name: 'Banque Misr',         logo: 'Logos/BM.png'     },
  { key: 'CairoBank',     name: 'Banque du Caire',         logo: 'Logos/CairoBank.png'     },
  { key: 'CIB',    name: 'CIB',        logo: 'Logos/CIB.png'    },
  { key: 'Halan',     name: 'Halan',         logo: 'Logos/Halan.png'     },
  { key: 'HSBC',     name: 'HSBC',         logo: 'Logos/HSBC.png'     },
  { key: 'NBE',    name: 'National Bank of Egypt',        logo: 'Logos/NBE.png'    },
  { key: 'QNB',     name: 'QNB',         logo: 'Logos/QNB.png'     },
  { key: 'Sympl',     name: 'Sympl',         logo: 'Logos/Sympl.png'     },
  { key: 'Valu',     name: 'Valu',         logo: 'Logos/Valu.png'     },
  { key: 'Gamaya',     name: 'Gamaya',         logo: 'Logos/Gamaya.png'     },
  { key: 'Borrow',     name: 'Borrow',         logo: 'Logos/Borrow.png'     },
  // Add more banks here
];

// ── Recurring expense categories ─────────────────────────
// Separate from expense categories — these are for subscriptions,
// bills and recurring payments (Recurring page only).
const RECURRING_CATEGORIES = [
  { value: 'Entertainment', icon: '🎬' },
  { value: 'Music',         icon: '🎵' },
  { value: 'Podcasts',      icon: '🎙️' },
  { value: 'Phone Bill',    icon: '📱' },
  { value: 'Rent',          icon: '🏠' },
  { value: 'Transportation',icon: '🚗' },
  { value: 'Digital Tools', icon: '💻' },
  { value: 'Utilities',     icon: '⚡' },
  { value: 'Internet',      icon: '📶' },
  { value: 'Insurance',     icon: '🛡️' },
  { value: 'Other',         icon: '🔄' },
];

// Lookup icon for a recurring category
function getRecurringCategoryIcon(cat) {
  const found = RECURRING_CATEGORIES.find(c => c.value === cat);
  return found ? found.icon : '🔄';
}

// ── Month name helpers ────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function monthName(num) {  // 1-based
  return MONTHS_FULL[(num - 1)] || '';
}

// ── Default Categories ────────────────────────────────────
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

let CATEGORIES = [...DEFAULT_CATEGORIES];

// ── Category sheet helpers ────────────────────────────────
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

async function loadCategoriesFromSheet(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${CAT_SHEET_NAME}!A2:H`,
    });
    const rows = res.result.values || [];
    if (!rows.length) return null;
    const cats = rows.map(parseCatRow).filter(c => !c.hidden);
    CATEGORIES = cats;
    return cats;
  } catch (e) { return null; }
}

async function saveCategoriesToSheet(spreadsheetId, allCats) {
  const rows = allCats.map(catToRow);
  await gapi.client.sheets.spreadsheets.values.clear({ spreadsheetId, range: `${CAT_SHEET_NAME}!A2:H` });
  if (rows.length) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId, range: `${CAT_SHEET_NAME}!A2:H`,
      valueInputOption: 'RAW', resource: { values: rows },
    });
  }
}

async function createCategoriesTab(spreadsheetId) {
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId, resource: { requests: [{ addSheet: { properties: { title: CAT_SHEET_NAME } } }] }
  });
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId, range: `${CAT_SHEET_NAME}!A1:H1`, valueInputOption: 'RAW',
    resource: { values: [['Type','OriginalValue','Name','Icon','BG','Chart','Budget','Hidden']] },
  });
  const defaultRows = DEFAULT_CATEGORIES.map(c => ({
    type: 'default', originalValue: c.value, value: c.value,
    icon: c.icon, bg: c.bg, chart: c.chart, budget: null, hidden: false,
  }));
  await saveCategoriesToSheet(spreadsheetId, defaultRows);
  CATEGORIES = [...DEFAULT_CATEGORIES];
  return defaultRows;
}

async function ensureCategoriesTab(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheets = res.result.sheets || [];
    const exists = sheets.some(s => s.properties.title === CAT_SHEET_NAME);
    if (!exists) return await createCategoriesTab(spreadsheetId);
    const fullRes = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${CAT_SHEET_NAME}!A2:H`
    });
    let rows = (fullRes.result.values || []).map(parseCatRow);
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
function getCategoryIcon(category)   { return getCategoryMeta(category).icon; }
function getCategoryColor(category)  { return getCategoryMeta(category).bg; }
function getChartColor(category)     { return getCategoryMeta(category).chart; }
function getCategoryBudget(category) { const m = getCategoryMeta(category); return m ? (m.budget || null) : null; }

// ── Date helpers ──────────────────────────────────────────
function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(dateString) {
  return parseLocalDate(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDayHeader(dateString) {
  return parseLocalDate(dateString).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
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

function getUserNameFromToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    const payload = JSON.parse(json);
    return payload.name || payload.given_name || (payload.email ? payload.email.split('@')[0] : null);
  } catch { return null; }
}

// ── ID generator ──────────────────────────────────────────
function genId() {
  const key = 'expense_id_counter';
  const next = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, next);
  return next;
}

// ── Access token (sessionStorage) ────────────────────────
function saveAccessToken(token) { sessionStorage.setItem('gapi_access_token', token); }
function getSavedAccessToken()  { return sessionStorage.getItem('gapi_access_token'); }
function clearAccessToken()     { sessionStorage.removeItem('gapi_access_token'); }

// ── iOS Safari detection ──────────────────────────────────
function isIOSSafari() {
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent)
    && /WebKit/.test(navigator.userAgent)
    && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
  return isIOS || window.navigator.standalone === true;
}

// ── GAPI init ─────────────────────────────────────────────
async function initGapiClient() {
  await new Promise(resolve => {
    if (gapi.client?.drive) { resolve(); return; }
    gapi.load('client', resolve);
  });
  await gapi.client.init({ apiKey: '', discoveryDocs: DISCOVERY_DOCS });
}

// ── Toast ─────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) {
    console.warn('Toast element not found');
    return;
  }
  
  // Clear any existing timer
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  
  // Remove any existing show class
  t.classList.remove('show');
  
  // Set the message and type
  t.textContent = msg;
  t.className = `toast ${type}`;
  
  // Force reflow to ensure animation restarts
  void t.offsetHeight;
  
  // Add show class to animate in
  t.classList.add('show');
  
  // Set timer to remove show class after 1 second
  _toastTimer = setTimeout(() => {
    t.classList.remove('show');
    _toastTimer = null;
  }, 1000);
}

// ── Format money ──────────────────────────────────────────
function formatMoney(amount) {
  return `EGP ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Escape HTML ───────────────────────────────────────────
function escapeHtml(str) {
  return (str || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ── Short alphanumeric ID (used by Installments) ─────────
// Different from genId() which is a sequential numeric counter.
// This generates a 6-char random ID suitable for installment records.
function generateShortId(existingIds = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id;
  do {
    id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (existingIds.includes(id));
  return id;
}

// ── Today as YYYY-MM-DD ───────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }

// ── Bottom navigation renderer ────────────────────────────
// Injects the shared bottom nav into any element (default: #bottomNavMount).
// activePage: 'home' | 'expenses' | 'recurring' | 'categories' | 'installments'
const NAV_TABS = [
  { id: 'home',         label: 'Home',         icon: '🏠', href: 'Home.html'         },
  { id: 'expenses',     label: 'Expenses',     icon: '📋', href: 'Expenses.html'     },
  { id: 'recurring',    label: 'Recurring',    icon: '🔄', href: 'Recurring.html'    },
  { id: 'categories',   label: 'Categories',   icon: '⚙️', href: 'Categories.html'   },
  { id: 'installments', label: 'Installments', icon: '📆', href: 'Installments.html' },
];

function renderBottomNav(activePage, mountId = 'bottomNavMount') {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const tabs = NAV_TABS.map(t => {
    const isActive = t.id === activePage;
    const click = isActive ? '' : `onclick="window.location.href='${t.href}'"`;
    return `<button class="nav-tab${isActive ? ' active' : ''}" ${click}>
      <span class="nav-tab-icon">${t.icon}</span>${t.label}
    </button>`;
  }).join('');
  mount.innerHTML = `<nav class="bottom-nav"><div class="nav-tabs">${tabs}</div></nav>`;
}

// ── Logout — clears ALL local cache then redirects ────────
// Call with the page to redirect to after logout (default: Home.html)
function logout(redirectTo = 'Home.html') {
  if (!confirm('Log out?')) return;
  // Always clear base keys
  const keys = ['google_token', 'expense_id_counter'];
  // Clear all user-scoped keys if we know the email
  const email = localStorage.getItem('google_token')
    ? getUserEmailFromToken(localStorage.getItem('google_token'))
    : null;
  if (email) {
    keys.push(
      `drive_setup_${email}`,
      `spreadsheet_id_${email}`,
      `expenses_${email}`,
      `budgets_${email}`,
      `recurring_${email}`,
    );
    // Clear paid tracking keys for all months (scan localStorage)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`paid_${email}_`)) keys.push(k);
    }
  }
  keys.forEach(k => localStorage.removeItem(k));
  window.location.href = redirectTo;
}
