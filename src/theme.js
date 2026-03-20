// ─── Theme utilities ──────────────────────────────────────────────────────────
// Module-level Map cache (Vercel js-cache-storage pattern).
// Zero repeated localStorage reads — cached after first call.
// Used by main.jsx (init) and App.jsx (toggle button).

const _cache = new Map();
const THEME_KEY = 'cc-theme';
const THEME_EXPLICIT_KEY = 'cc-theme-explicit-v2';

export function getTheme() {
  if (_cache.has('t')) return _cache.get('t');
  try {
    const explicit = localStorage.getItem(THEME_EXPLICIT_KEY);
    const s = explicit ? localStorage.getItem(THEME_KEY) : null;
    const v = (s === 'dark' || s === 'light') ? s : 'light';
    _cache.set('t', v);
    return v;
  } catch { return 'light'; }
}

export function setTheme(v) {
  _cache.set('t', v);
  document.documentElement.setAttribute('data-theme', v);
  try {
    localStorage.setItem(THEME_KEY, v);
    localStorage.setItem(THEME_EXPLICIT_KEY, '1');
  } catch { /* private mode */ }
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Cross-tab sync
try {
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY || e.key === THEME_EXPLICIT_KEY) _cache.delete('t');
  });
} catch { /* SSR guard */ }
