// ============================================================
// UTILS.JS — Health Tracker shared helpers
// ============================================================

// ── Month / Date helpers ───────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const DAYS_SHORT = {
  'Sunday':'Sun','Monday':'Mon','Tuesday':'Tue',
  'Wednesday':'Wed','Thursday':'Thu','Friday':'Fri','Saturday':'Sat'
};

function monthName(num) { return MONTHS_FULL[(num - 1)] || ''; }
function todayStr()     { return new Date().toISOString().split('T')[0]; }

function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateForDisplay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateISO(d) { return d.toISOString().split('T')[0]; }

/**
 * Returns today's weekday name, e.g. "Saturday"
 */
function getTodayWeekday(date) {
  return WEEKDAYS[(date || new Date()).getDay()];
}

/**
 * Format a days string for compact display (list views).
 * "Sunday,Monday,...Saturday" → "Daily"
 * "Monday,Tuesday,Wednesday,Thursday,Friday" → "Weekdays"
 * "Monday,Wednesday,Friday" → "Mon, Wed, Fri"
 * Always returns days in Sun→Sat order regardless of stored order.
 */
function formatDays(daysStr) {
  const days = daysStr ? daysStr.split(',').map(d => d.trim()).filter(Boolean) : [];
  if (days.length === 0) return '—';
  if (days.length === 7) return 'Daily';
  const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  if (days.length === 5 && weekdays.every(d => days.includes(d))) return 'Weekdays';
  return WEEKDAYS.filter(d => days.includes(d)).map(d => DAYS_SHORT[d]).join(', ');
}

// ── Money ──────────────────────────────────────────────────
function formatMoney(amount) {
  return `EGP ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── HTML escaping ──────────────────────────────────────────
function escapeHtml(str) {
  return (str || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

// ── Brand helpers ──────────────────────────────────────────
function getBrandIcon(brandIdentifier) {
  const brand = BRANDS.find(b => b.id === brandIdentifier || b.name === brandIdentifier);
  if (brand && brand.logo) {
    return `<img src="../logos/${brand.logo}" alt="${brand.name}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`;
  }
  return '🧴';
}

function getBrandNameFromId(brandId) {
  const brand = BRANDS.find(b => b.id === brandId);
  return brand ? brand.name : brandId;
}

function getBrandIdFromName(brandName) {
  const brand = BRANDS.find(b => b.name === brandName);
  return brand ? brand.id : brandName;
}

// ── Token helpers ──────────────────────────────────────────
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

// ── Access token ───────────────────────────────────────────
function saveAccessToken(token) { sessionStorage.setItem('gapi_access_token', token); }
function getSavedAccessToken()  { return sessionStorage.getItem('gapi_access_token'); }
function clearAccessToken()     { sessionStorage.removeItem('gapi_access_token'); }

// ── iOS Safari detection ───────────────────────────────────
function isIOSSafari() {
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent)
    && /WebKit/.test(navigator.userAgent)
    && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
  return isIOS || window.navigator.standalone === true;
}

// ── GAPI init ──────────────────────────────────────────────
async function initGapiClient() {
  await new Promise(resolve => {
    if (gapi.client?.drive) { resolve(); return; }
    gapi.load('client', resolve);
  });
  await gapi.client.init({ apiKey: '', discoveryDocs: DISCOVERY_DOCS });
}

// ── Toast ──────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  t.classList.remove('show');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetHeight;
  t.classList.add('show');
  _toastTimer = setTimeout(() => { t.classList.remove('show'); _toastTimer = null; }, 1800);
}

// ── Bottom navigation ──────────────────────────────────────
const NAV_TABS = [
  { id: 'home',        label: 'Home',        icon: '🏠', href: 'Home.html'        },
  { id: 'routine',     label: 'Routine',      icon: '🧴', href: 'Routine.html'     },
  { id: 'supplements', label: 'Supplements',  icon: '💊', href: 'Supplements.html' },
  { id: 'dashboard',   label: 'Dashboard',    icon: '📊', href: 'Dashboard.html'   },
  { id: 'settings',    label: 'Settings',     icon: '⚙️', href: 'Settings.html'    }
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

// ── Logout ─────────────────────────────────────────────────
function logout(redirectTo = 'Home.html') {
  if (!confirm('Log out?')) return;
  const keys = ['google_token'];
  const token = localStorage.getItem('google_token');
  const email = token ? getUserEmailFromToken(token) : null;
  if (email) {
    keys.push(
      `drive_setup_${email}`, `spreadsheet_id_${email}`,
      `products_${email}`, `assignments_${email}`,
      `supplements_${email}`, `suppAssignments_${email}`
    );
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(`routine_log_${email}_`) || k.startsWith(`supp_log_${email}_`))) keys.push(k);
    }
  }
  clearAccessToken();
  keys.forEach(k => localStorage.removeItem(k));
  window.location.href = redirectTo;
}

// ── Sync strip ─────────────────────────────────────────────
function setSyncStrip(msg, warn) {
  const el = document.getElementById('syncStatus');
  if (el) { el.textContent = msg; el.className = warn ? 'sync-strip warn' : 'sync-strip'; }
}

// ── Status toggle UI ───────────────────────────────────────
/**
 * Wire up a status toggle button.
 * @param {string} toggleId  - element ID of the toggle div
 * @param {string} inputId   - element ID of the hidden input
 */
function initStatusToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input  = document.getElementById(inputId);
  if (!toggle || !input) return;
  toggle.addEventListener('click', () => {
    const isActive = toggle.classList.contains('active');
    toggle.classList.toggle('active', !isActive);
    toggle.classList.toggle('inactive', isActive);
    input.value = isActive ? 'Inactive' : 'Active';
  });
}

/**
 * Set a status toggle to a given value without re-wiring the listener.
 */
function setStatusToggle(toggleId, inputId, status) {
  const toggle = document.getElementById(toggleId);
  const input  = document.getElementById(inputId);
  if (!toggle || !input) return;
  const isActive = status === 'Active';
  toggle.classList.toggle('active', isActive);
  toggle.classList.toggle('inactive', !isActive);
  input.value = status;
}

// ── Modal open / close ────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Time sorter (for supplement slots) ────────────────────
function getTimeValue(timeStr) {
  if (!timeStr) return 9999;
  const lower = timeStr.toLowerCase().trim();
  if (lower === 'bedtime')   return 23;
  if (lower === 'morning')   return 8;
  if (lower === 'afternoon') return 13;
  if (lower === 'evening')   return 18;
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return hour + minute / 60;
  }
  return 9999;
}

// ── Day checkbox helpers ───────────────────────────────────
function renderDayCheckboxes(containerId, selectedDaysStr = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selectedSet = new Set(selectedDaysStr.split(',').map(s => s.trim()).filter(Boolean));
  container.innerHTML = WEEKDAYS.map(day => {
    const checked = selectedSet.has(day) ? 'checked' : '';
    return `<label>
      <input type="checkbox" value="${day}" ${checked}>
      <span>${day}</span>
    </label>`;
  }).join('');
}

function getSelectedDays(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  const selected = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
  if (selected.length === 0) return '';
  return WEEKDAYS.filter(d => selected.includes(d)).join(',');
}

function selectAllDays(containerId) {
  document.getElementById(containerId)?.querySelectorAll('input').forEach(cb => cb.checked = true);
}

function unselectAllDays(containerId) {
  document.getElementById(containerId)?.querySelectorAll('input').forEach(cb => cb.checked = false);
}

// ── Use-for checkbox helpers ───────────────────────────────
function renderUseForCheckboxesGeneric(containerId, optionsArray, selectedStr = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selectedSet = new Set(selectedStr.split(',').map(s => s.trim()).filter(Boolean));
  container.innerHTML = optionsArray.map(option => {
    const checked = selectedSet.has(option) ? 'checked' : '';
    return `<label>
      <input type="checkbox" value="${escapeHtml(option)}" ${checked}>
      <span>${escapeHtml(option)}</span>
    </label>`;
  }).join('');
}

function getSelectedUseForGeneric(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  return Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value).join(',');
}

// Skincare alias (uses USE_FOR_OPTIONS from config.js)
function renderUseForCheckboxes(selectedStr) {
  renderUseForCheckboxesGeneric('useForCheckboxes', USE_FOR_OPTIONS, selectedStr);
}
function getSelectedUseFor() {
  return getSelectedUseForGeneric('useForCheckboxes');
}

// ── UserSettings sheet ─────────────────────────────────────
const USER_SETTINGS_SHEET = 'UserSettings';

async function ensureUserSettingsSheet(spreadsheetId) {
  try {
    const meta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.result.sheets.some(s => s.properties.title === USER_SETTINGS_SHEET);
    if (!exists) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: USER_SETTINGS_SHEET } } }] }
      });
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId, range: `${USER_SETTINGS_SHEET}!A1:B1`,
        valueInputOption: 'RAW', resource: { values: [['Key', 'Value']] }
      });
    }
  } catch (e) { console.warn('ensureUserSettingsSheet', e); }
}

async function getUserSetting(spreadsheetId, key, defaultValue = null) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${USER_SETTINGS_SHEET}!A2:B`
    });
    const rows = res.result.values || [];
    const row = rows.find(r => r[0] === key);
    return row ? row[1] : defaultValue;
  } catch (e) { return defaultValue; }
}

async function setUserSetting(spreadsheetId, key, value) {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId, range: `${USER_SETTINGS_SHEET}!A2:B`
    });
    const rows = res.result.values || [];
    const existingIndex = rows.findIndex(r => r[0] === key);
    if (existingIndex !== -1) {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${USER_SETTINGS_SHEET}!A${existingIndex + 2}:B${existingIndex + 2}`,
        valueInputOption: 'RAW', resource: { values: [[key, value]] }
      });
    } else {
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId, range: `${USER_SETTINGS_SHEET}!A2:B`,
        valueInputOption: 'RAW', resource: { values: [[key, value]] }
      });
    }
  } catch (e) { console.warn('setUserSetting', e); }
}
