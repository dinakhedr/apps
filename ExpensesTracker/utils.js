// ============================================================
// SHARED UTILITIES — Expense Tracker
// ============================================================

const CLIENT_ID = '957735552832-u52fo3efk11sgg4pege9jo1650l1vl0a.apps.googleusercontent.com';
const FOLDER_NAME  = 'Expense Tracker';
const FILE_NAME    = 'My Expenses';   // Google Drive file name (never changes)
const EXPENSES_SHEET = 'Daily Log';    // Daily Expenses 
const CATEGORIES_SHEET = 'Categories';
const RECURRING_SHEET         = 'Recurring';
const RECURRING_LOG_SHEET     = 'Recurring Log';
const INSTALLMENTS_SHEET      = 'Installments';
const INSTALLMENTS_LOG_SHEET  = 'Installments Log';
const INCOME_LOG_SHEET  = 'Income Log';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// ── Bank / BNPL providers (used by Installments page) ────
const BANK_PROVIDERS = [
  { key: 'AAIB',     name: 'Arab African International Bank',         logo: 'Logos/AAIB.png'     },
  { key: 'AlexBank',     name: 'Bank of Alexandria',         logo: 'Logos/AlexBank.png'     },
  { key: 'BM',     name: 'Banque Misr',         logo: 'Logos/BM.png'     },
  { key: 'Borrow',     name: 'Borrow',         logo: 'Logos/Borrow.png'     },
  { key: 'CairoBank',     name: 'Banque du Caire',         logo: 'Logos/CairoBank.png'     },
  { key: 'CIB',    name: 'CIB',        logo: 'Logos/CIB.png'    },
  { key: 'Gamaya',     name: 'Gamaya',         logo: 'Logos/Gamaya.png'     },
  { key: 'Halan',     name: 'Halan',         logo: 'Logos/Halan.png'     },
  { key: 'HSBC',     name: 'HSBC',         logo: 'Logos/HSBC.png'     },
  { key: 'MoneyFellows',     name: 'Money Fellows',         logo: 'Logos/MoneyFellows.png'     },
  { key: 'NBE',    name: 'National Bank of Egypt',        logo: 'Logos/NBE.png'    },
  { key: 'QNB',     name: 'QNB',         logo: 'Logos/QNB.png'     },
  { key: 'Sympl',     name: 'Sympl',         logo: 'Logos/Sympl.png'     },
  { key: 'Valu',     name: 'Valu',         logo: 'Logos/Valu.png'     },
];

// ── Recurring expense categories ─────────────────────────
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

// ── Default EXPENSE Categories (type: 'expense') ──────────
const DEFAULT_EXPENSE_CATEGORIES = [
  { value: 'Car Repairs',   icon: '🚗', bg: '#ffd1d1', chart: '#e57373', catKind: 'expense' },
  { value: 'Cafe',          icon: '☕', bg: '#d4e8d4', chart: '#81c784', catKind: 'expense' },
  { value: 'Charity',       icon: '🏥', bg: '#e0f2fe', chart: '#38bdf8', catKind: 'expense' },
  { value: 'Shopping',      icon: '🛍️', bg: '#e8d5b7', chart: '#d4a574', catKind: 'expense' },
  { value: 'Entertainment', icon: '🎬', bg: '#d4b8ff', chart: '#b39ddb', catKind: 'expense' },
  { value: 'Electronics',   icon: '📱', bg: '#d4e8ff', chart: '#7986cb', catKind: 'expense' },
  { value: 'Games',         icon: '🎮', bg: '#d4b8ff', chart: '#b39ddb', catKind: 'expense' },
  { value: 'Gym',           icon: '🏋️', bg: '#ffe5b4', chart: '#f4c542', catKind: 'expense' },
  { value: 'Health',        icon: '💊', bg: '#ffccd9', chart: '#f48fb1', catKind: 'expense' },
  { value: 'Home Repairs',  icon: '🛠️', bg: '#ffd1d1', chart: '#e57373', catKind: 'expense' },
  { value: 'Internet',      icon: '📶', bg: '#cce0ff', chart: '#4fc3f7', catKind: 'expense' },
  { value: 'Personal Care', icon: '🧴', bg: '#ffccd9', chart: '#f48fb1', catKind: 'expense' },
  { value: 'Pets',          icon: '🐾', bg: '#e8d5b7', chart: '#d4a574', catKind: 'expense' },
  { value: 'Petrol',        icon: '⛽', bg: '#ffd1d1', chart: '#e57373', catKind: 'expense' },
  { value: 'Ride Hailing',  icon: '🚕', bg: '#ffe5b4', chart: '#f4c542', catKind: 'expense' },
  { value: 'Smoking',       icon: '🚬', bg: '#e0e0e0', chart: '#9e9e9e', catKind: 'expense' },
  { value: 'Subscriptions', icon: '💻', bg: '#cce7ff', chart: '#64b5f6', catKind: 'expense' },
  { value: 'Supermarket',   icon: '🛒', bg: '#ffe0b5', chart: '#ffb74d', catKind: 'expense' },
  { value: 'Travel',        icon: '✈️', bg: '#d4e8ff', chart: '#4fc3f7', catKind: 'expense' },
  { value: 'Utilities',     icon: '⚡', bg: '#ffe5b4', chart: '#f4c542', catKind: 'expense' },
];

// ── Default INCOME Categories (type: 'income') ────────────
const DEFAULT_INCOME_CATEGORIES = [
  { value: 'Salary',        icon: '💵', bg: '#d1fae5', chart: '#34d399', catKind: 'income' },
  { value: 'Commission',    icon: '📊', bg: '#ede9fe', chart: '#a78bfa', catKind: 'income' },
  { value: 'Overtime',      icon: '⏰', bg: '#fef3c7', chart: '#fbbf24', catKind: 'income' },
  { value: 'Freelance',     icon: '💻', bg: '#dbeafe', chart: '#60a5fa', catKind: 'income' },
  { value: 'Rental Income', icon: '🏠', bg: '#fce7f3', chart: '#f472b6', catKind: 'income' },
  { value: 'Bank Interest', icon: '🏦', bg: '#e0e7ff', chart: '#818cf8', catKind: 'income' },
];

// Combine all default categories
const DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

// Global CATEGORIES array (will be populated from sheet)
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
    catKind:       r[8] === 'income' ? 'income' : 'expense',  // NEW: category type
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
    cat.catKind || 'expense',  // NEW: save category type
  ];
}

async function loadCategoriesFromSheet(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${CATEGORIES_SHEET}!A2:I`,
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
  await gapi.client.sheets.spreadsheets.values.clear({ spreadsheetId, range: `${CATEGORIES_SHEET}!A2:I` });
  if (rows.length) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId, range: `${CATEGORIES_SHEET}!A2:I`,
      valueInputOption: 'RAW', resource: { values: rows },
    });
  }
}

async function createCategoriesTab(spreadsheetId) {
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId, resource: { requests: [{ addSheet: { properties: { title: CATEGORIES_SHEET } } }] }
  });
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId, range: `${CATEGORIES_SHEET}!A1:I1`, valueInputOption: 'RAW',
    resource: { values: [['Type','OriginalValue','Name','Icon','BG','Chart','Budget','Hidden','Kind']] },
  });
  const defaultRows = DEFAULT_CATEGORIES.map(c => ({
    type: 'default', 
    originalValue: c.value, 
    value: c.value,
    icon: c.icon, 
    bg: c.bg, 
    chart: c.chart, 
    budget: null, 
    hidden: false,
    catKind: c.catKind,
  }));
  await saveCategoriesToSheet(spreadsheetId, defaultRows);
  CATEGORIES = [...DEFAULT_CATEGORIES];
  return defaultRows;
}

async function ensureCategoriesTab(spreadsheetId) {
  try {
    const res = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheets = res.result.sheets || [];
    const exists = sheets.some(s => s.properties.title === CATEGORIES_SHEET);
    if (!exists) return await createCategoriesTab(spreadsheetId);
    
    const fullRes = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${CATEGORIES_SHEET}!A2:I`
    });
    let rows = (fullRes.result.values || []).map(parseCatRow);
    
    // Check for missing default categories (both expense and income)
    const existingOriginals = new Set(rows.map(r => r.originalValue));
    const newDefaults = DEFAULT_CATEGORIES.filter(d => !existingOriginals.has(d.value));
    
    if (newDefaults.length) {
      const newRows = newDefaults.map(c => ({
        type: 'default', 
        originalValue: c.value, 
        value: c.value,
        icon: c.icon, 
        bg: c.bg, 
        chart: c.chart, 
        budget: null, 
        hidden: false,
        catKind: c.catKind,
      }));
      rows = [...rows, ...newRows];
      await saveCategoriesToSheet(spreadsheetId, rows);
    }
    
    CATEGORIES = rows.filter(c => !c.hidden);
    return rows;
  } catch(e) {
    console.error('ensureCategoriesTab error', e);
    CATEGORIES = [...DEFAULT_CATEGORIES];
    return DEFAULT_CATEGORIES.map(c => ({ 
      ...c, 
      type: 'default', 
      originalValue: c.value,
      catKind: c.catKind 
    }));
  }
}

// ── Category lookup helpers (returns full metadata) ──────
function getCategoryMeta(category) {
  const found = CATEGORIES.find(c => c.value === category || c.originalValue === category);
  if (found) return found;
  // Fallback to defaults
  const defaultCat = DEFAULT_CATEGORIES.find(c => c.value === category);
  if (defaultCat) return defaultCat;
  return { icon: '💰', bg: '#f0f0f0', chart: '#aaa', catKind: 'expense' };
}

function getCategoryIcon(category)   { return getCategoryMeta(category).icon; }
function getCategoryColor(category)  { return getCategoryMeta(category).bg; }
function getChartColor(category)     { return getCategoryMeta(category).chart; }
function getCategoryBudget(category) { const m = getCategoryMeta(category); return m ? (m.budget || null) : null; }
function getCategoryKind(category)   { return getCategoryMeta(category).catKind || 'expense'; }

// ── Filter categories by type ─────────────────────────────
function getExpenseCategories() {
  return CATEGORIES.filter(c => c.catKind === 'expense' && !c.hidden);
}

function getIncomeCategories() {
  return CATEGORIES.filter(c => c.catKind === 'income' && !c.hidden);
}

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

// ── ID generator for expenses and incomes ────
function genExpenseId() {
  const key = 'expense_id_counter';
  const next = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, next);
  return next;
}

function genIncomeId() {
  const key = 'income_id_counter';
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
  
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  
  t.classList.remove('show');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetHeight;
  t.classList.add('show');
  
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
const NAV_TABS = [
  { id: 'home',         label: 'Home',         icon: '🏠', href: 'Home.html'         },
  { id: 'expenses',     label: 'Expenses',     icon: '📋', href: 'Expenses.html'     },
  { id: 'recurring',    label: 'Recurring',    icon: '🔄', href: 'Recurring.html'    },
  { id: 'installments', label: 'Installments', icon: '📆', href: 'Installments.html' },
  { id: 'settings',   label: 'Settings',   icon: '⚙️', href: 'Settings.html'   },
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
function logout(redirectTo = 'Home.html') {
  if (!confirm('Log out?')) return;
  const keys = ['google_token', 'expense_id_counter'];
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
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`paid_${email}_`)) keys.push(k);
    }
  }
  keys.forEach(k => localStorage.removeItem(k));
  window.location.href = redirectTo;
}
