// ============================================================
// SHARED UTILITIES — Expense Tracker
// ============================================================

const CLIENT_ID = '957735552832-u52fo3efk11sgg4pege9jo1650l1vl0a.apps.googleusercontent.com';
const FOLDER_NAME = 'Expense Tracker';
const SHEET_NAME = 'My Expenses';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// ── Categories ────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Car Repairs',   icon: '🚗', bg: '#ffd1d1', chart: '#e57373' },
  { value: 'Cafe',          icon: '☕', bg: '#d4e8d4', chart: '#81c784' },
  { value: 'Clothes',       icon: '👕', bg: '#e8d5b7', chart: '#d4a574' },
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
];

function getCategoryMeta(category) {
  return CATEGORIES.find(c => c.value === category) || { icon: '💰', bg: '#f0f0f0', chart: '#aaa' };
}
function getCategoryIcon(category)  { return getCategoryMeta(category).icon; }
function getCategoryColor(category) { return getCategoryMeta(category).bg; }
function getChartColor(category)    { return getCategoryMeta(category).chart; }

// ── Date helpers ──────────────────────────────────────────
function parseLocalDate(str) {
  // Avoid UTC-offset issues: "2024-04-15" → local midnight
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

// ── ID generator (crypto-safe) ────────────────────────────
function genId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}