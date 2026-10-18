let currentMode = 'U2B'; // U2B: Unicode to Bijoy, B2U: Bijoy to Unicode

const inputArea = document.getElementById('input-text');
const outputArea = document.getElementById('output-text');
const modeDisplay = document.getElementById('mode-display');
const inputLabel = document.getElementById('input-label');
const outputLabel = document.getElementById('output-label');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const inCount = document.getElementById('in-count');
const outCount = document.getElementById('out-count');
const btnU2B = document.getElementById('btn-u2b');
const btnB2U = document.getElementById('btn-b2u');
const inputBadge = document.getElementById('input-badge');
const outputBadge = document.getElementById('output-badge');
const fontHint = document.getElementById('font-hint');

function setMode(mode, swapTextToo = false) {
  currentMode = mode;
  const isU2B = mode === 'U2B';

  if (btnU2B && btnB2U) {
    btnU2B.classList.toggle('active', isU2B);
    btnB2U.classList.toggle('active', !isU2B);
  }
  if (modeDisplay) modeDisplay.innerHTML = `MODE: <strong>${isU2B ? 'UNICODE → BIJOY' : 'BIJOY → UNICODE'}</strong>`;
  if (inputLabel) inputLabel.innerText = isU2B ? 'Unicode Input' : 'Bijoy Input';
  if (outputLabel) outputLabel.innerText = isU2B ? 'Bijoy Output' : 'Unicode Output';
  if (inputBadge) { inputBadge.innerText = isU2B ? 'UNICODE' : 'BIJOY'; inputBadge.className = 'badge ' + (isU2B ? 'u' : 'b'); }
  if (outputBadge) { outputBadge.innerText = isU2B ? 'BIJOY' : 'UNICODE'; outputBadge.className = 'badge ' + (isU2B ? 'b' : 'u'); }

  if (inputArea) {
    inputArea.placeholder = isU2B
      ? 'এখানে ইউনিকোড বাংলা লিখুন বা পেস্ট করুন…'
      : 'এখানে বিজয় (SutonnyMJ) টেক্সট পেস্ট করুন…';
    inputArea.classList.toggle('bijoy-text', !isU2B);
  }
  if (outputArea) outputArea.classList.toggle('bijoy-text', isU2B);
  if (fontHint) fontHint.innerText = isU2B ? 'Bijoy in SutonnyMJ • Unicode in Bangla' : 'Clean Unicode output, press-ready';

  if (swapTextToo) {
    // Swap texts first (no conversion), then convert fresh in the new mode.
    swapTextSilent();
    convert();
  }
  else convert();
}

function toggleMode() {
  setMode(currentMode === 'U2B' ? 'B2U' : 'U2B', true);
}

// Swap input/output WITHOUT converting (same-mode swap must not
// re-convert already-converted text, which would corrupt it).
function swapTextSilent() {
  // Nothing converted yet (e.g. fresh type + instant toggle) — swapping
  // with an empty output would wipe the input, so keep it and just
  // let the caller convert fresh in the new mode.
  if (!outputArea.value) return;
  const t = inputArea.value;
  inputArea.value = outputArea.value;
  outputArea.value = t;
  updateCounts();
}

function swapText() {
  swapTextSilent();
  inputArea.focus();
}

function countStats(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
}

function updateCounts() {
  if (inCount) {
    const s = countStats(inputArea.value);
    inCount.innerHTML = `<b>${s.chars.toLocaleString()}</b> chars • <b>${s.words.toLocaleString()}</b> words`;
  }
  if (outCount) {
    const s = countStats(outputArea.value);
    outCount.innerHTML = `<b>${s.chars.toLocaleString()}</b> chars • <b>${s.words.toLocaleString()}</b> words`;
  }
}

function convert() {
  const text = inputArea.value;
  if (!text.trim()) {
    outputArea.value = '';
    updateCounts();
    return;
  }
  try {
    if (currentMode === 'U2B') {
      outputArea.value = BanglaConverter.unicodeToBijoy(text);
    } else {
      outputArea.value = BanglaConverter.bijoyToUnicode(text);
    }
  } catch (e) {
    console.error(e);
    showToast('Conversion failed — please try again');
    return;
  }
  updateCounts();
}

// Live convert (debounced slightly for big pastes)
let tId = null;
inputArea.addEventListener('input', () => {
  updateCounts();
  clearTimeout(tId);
  tId = setTimeout(convert, 120);
});

// Ctrl+Enter to convert — converter view only (was hijacking the
// shortcut while typing in the Cleaning / Case workspaces).
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const cv = document.getElementById('view-converter');
    if (cv && cv.hasAttribute('hidden')) return;
    e.preventDefault();
    convert();
    showToast('Converted ✓');
  }
});

// Undoable Clear — destructive actions must be recoverable (UX guideline).
// Stashes text before wipe; an "Undo clear" button appears for 8 seconds.
let lastCleared = null;
let undoClearTimer = null;

function stashCleared() {
  if (!inputArea.value && !outputArea.value) return false;
  lastCleared = { input: inputArea.value, output: outputArea.value };
  const b = document.getElementById('undo-clear-btn');
  if (b) {
    b.hidden = false;
    clearTimeout(undoClearTimer);
    undoClearTimer = setTimeout(() => { b.hidden = true; lastCleared = null; }, 8000);
  }
  return true;
}

function undoClear() {
  const b = document.getElementById('undo-clear-btn');
  if (!lastCleared) { showToast('Nothing to restore'); return; }
  inputArea.value = lastCleared.input || '';
  lastCleared = null;
  if (b) b.hidden = true;
  clearTimeout(undoClearTimer);
  convert();
  inputArea.focus();
  showToast('Restored ↩');
}

function clearInput() {
  const had = stashCleared();
  inputArea.value = '';
  outputArea.value = '';
  inputArea.focus();
  updateCounts();
  if (had) showToast('Cleared — Undo available ✓');
}

function clearAll() {
  const had = stashCleared();
  inputArea.value = '';
  outputArea.value = '';
  updateCounts();
  inputArea.focus();
  if (had) showToast('Cleared — Undo available ✓');
}

async function pasteInput() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) { showToast('Clipboard is empty'); return; }
    inputArea.value = text;
    convert();
    showToast('Pasted ✓');
  } catch (err) {
    inputArea.focus();
    showToast('Press Ctrl+V to paste');
  }
}

async function copyOutput() {
  if (!outputArea.value) { showToast('Nothing to copy'); return; }
  try {
    await navigator.clipboard.writeText(outputArea.value);
    showToast('Copied to clipboard ✓');
  } catch (e) {
    // fallback
    outputArea.select();
    document.execCommand('copy');
    showToast('Copied ✓');
  }
}

function downloadOutput() {
  if (!outputArea.value) { showToast('Nothing to download'); return; }
  const ext = currentMode === 'U2B' ? 'bijoy' : 'unicode';
  const blob = new Blob([outputArea.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bangla-${ext}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  showToast('Downloaded .txt ✓');
}

let toastTimer = null;
function showToast(msg) {
  if (toastMsg) toastMsg.innerText = msg;
  else if (toast) toast.innerText = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// Theme: manual override + Auto (follow phone / OS color scheme).
// Storage: 'bijoy-theme' = explicit 'dark'/'light', 'bijoy-theme-auto' = '1'.
const themeMedia = (window.matchMedia)
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function systemTheme() {
  return (themeMedia && themeMedia.matches) ? 'dark' : 'light';
}

function isThemeAuto() {
  try { return localStorage.getItem('bijoy-theme-auto') === '1'; }
  catch (e) { return false; }
}

function savedTheme() {
  try { return localStorage.getItem('bijoy-theme'); } catch (e) { return null; }
}

// Paint only (no persistence) — shared by manual + auto paths.
function paintTheme(theme, auto) {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  const moon = document.getElementById('theme-icon-moon');
  const sun = document.getElementById('theme-icon-sun');
  const autoIc = document.getElementById('theme-icon-auto');
  if (moon) moon.style.display = (!auto && isDark) ? 'block' : 'none';
  if (sun) sun.style.display = (!auto && !isDark) ? 'block' : 'none';
  if (autoIc) autoIc.style.display = auto ? 'block' : 'none';
  const tBtn = document.getElementById('theme-btn');
  if (tBtn) {
    tBtn.title = auto
      ? ('Auto theme • now ' + theme + ' (tap for manual)')
      : (isDark ? 'Dark — tap for light' : 'Light — tap for dark');
    tBtn.setAttribute('aria-label', tBtn.title);
  }
  const aBtn = document.getElementById('theme-auto-btn');
  if (aBtn) {
    aBtn.setAttribute('aria-pressed', auto ? 'true' : 'false');
    aBtn.classList.toggle('auto-on', !!auto);
  }
}

// Back-compat: explicit theme + persist (used by toggle).
function applyTheme(theme) {
  try {
    localStorage.setItem('bijoy-theme', theme);
    localStorage.removeItem('bijoy-theme-auto');
  } catch (e) {}
  paintTheme(theme, false);
}

// Manual toggle — disables Auto and remembers the choice.
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(next === 'dark' ? 'Dark theme ✓ (Auto off)' : 'Light theme ✓ (Auto off)');
}

// Auto mode — forget manual choice, follow the phone/OS live.
function enableAutoTheme(silent) {
  try {
    localStorage.setItem('bijoy-theme-auto', '1');
    localStorage.removeItem('bijoy-theme');
  } catch (e) {}
  paintTheme(systemTheme(), true);
  if (!silent) showToast('Auto theme ON — follows phone ✓');
}

// OS theme changed (e.g. sunset / Control Centre) → follow if in Auto
// or if the user never picked a theme manually.
if (themeMedia) {
  const onSystemChange = () => {
    if (isThemeAuto() || !savedTheme()) paintTheme(systemTheme(), true);
  };
  if (themeMedia.addEventListener) themeMedia.addEventListener('change', onSystemChange);
  else if (themeMedia.addListener) themeMedia.addListener(onSystemChange);
}

// Full display / focus mode — CSS-only layout (no Fullscreen API, so Esc
// never leaves the page stuck in a hidden-hero state).
function toggleFullDisplay() {
  const on = document.body.classList.toggle('full-display');
  const btn2 = document.getElementById('full-btn2');
  if (btn2) btn2.innerHTML = on ? '✕ Exit full' : '⛶ Full display';
  showToast(on ? 'Full display ON — press F to exit' : 'Full display OFF');
}

// Keyboard: F = full display (in addition to Ctrl+Enter convert).
// Never trigger while the user is typing in any field.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && t.closest && t.closest('textarea, input, select, [contenteditable]')) return;
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleFullDisplay();
  }
});

(function init() {
  // Fresh users (or Auto mode) follow the phone/OS theme live;
  // manual choice is respected once the user taps the theme button.
  const s = savedTheme();
  if (isThemeAuto() || !s) enableAutoTheme(true);
  else paintTheme(s === 'light' ? 'light' : 'dark', false);
  setMode('U2B');
  updateCounts();
})();
