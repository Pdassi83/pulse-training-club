/* Fail open: an unavailable store or a failed script must never block the site. */
(() => {
  const boot = { show: false, timer: null, failOpen: null, markSeen: null };
  window.__pulseIntroBoot = boot;
  try {
    /* The repaired intro gets its own session flag; failed loads remain retryable. */
    const key = 'pulse.intro.seen.v2';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const storage = window.sessionStorage;
    const seen = storage.getItem(key) === '1';
    storage.setItem(key, seen || reduce ? '1' : '0');
    if (seen || reduce) return;
    boot.markSeen = () => {
      try { storage.setItem(key, '1'); } catch { /* Keep the page available. */ }
    };
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
