// ─── Theme utilities ──────────────────────────────────────────────────────────
// Module-level Map cache (Vercel js-cache-storage pattern).
// Zero repeated localStorage reads — cached after first call.
// Used by main.jsx (init) and App.jsx (toggle button).

const _cache = new Map();

export function getTheme() {
  if (_cache.has('t')) return _cache.get('t');
  try {
    const s = localStorage.getItem('cc-theme');
    const v = (s === 'dark' || s === 'light')
      ? s
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    _cache.set('t', v);
    return v;
  } catch { return 'dark'; }
}

export function setTheme(v) {
  _cache.set('t', v);
  document.documentElement.setAttribute('data-theme', v);
  try { localStorage.setItem('cc-theme', v); } catch { /* private mode */ }
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Cross-tab sync
try {
  window.addEventListener('storage', (e) => {
    if (e.key === 'cc-theme') _cache.delete('t');
  });
} catch { /* SSR guard */ }
