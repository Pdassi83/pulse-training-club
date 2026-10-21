/* Storage is optional; a failed script must never block the site. */
(() => {
  const boot = { show: false, timer: null, failOpen: null, markSeen: null };
  window.__pulseIntroBoot = boot;
  try {
    const key = 'pulse.intro.seen.v2';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Explicit test links replay the intro while retaining reduced-motion support. */
    const replay = /(?:^|[?&])intro=1(?:&|$)/.test(window.location.search);
    let storage = null;
    let seen = false;
    try {
      storage = window.sessionStorage;
      seen = storage.getItem(key) === '1';
    } catch { /* Privacy settings must not silently disable the intro. */ }
    boot.markSeen = () => {
      try { if (storage) storage.setItem(key, '1'); } catch { /* Animation can run without storage. */ }
    };
    if (reduce) { boot.markSeen(); return; }
    if (seen && !replay) return;
    boot.show = true;
    document.documentElement.classList.add('pulse-intro-pending');
    boot.failOpen = () => {
      boot.show = false;
      const root = document.documentElement;
      root.classList.remove('pulse-intro-pending', 'pulse-intro-active');
      const shell = document.getElementById('site-shell');
      const intro = document.getElementById('pulse-intro');
      if (shell) { shell.inert = false; shell.removeAttribute('aria-hidden'); }
      if (intro) { intro.hidden = true; intro.setAttribute('aria-hidden', 'true'); }
    };
    boot.timer = window.setTimeout(boot.failOpen, 4500);
  } catch {
    boot.show = false;
    document.documentElement.classList.remove('pulse-intro-pending');
  }
})();
