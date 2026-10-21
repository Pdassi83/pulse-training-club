(() => {
  'use strict';
  const boot = window.__pulseIntroBoot;
  if (!boot || !boot.show) return;

  const intro = document.getElementById('pulse-intro');
  const shell = document.getElementById('site-shell');
  const skip = document.getElementById('intro-skip');
  const guide = document.getElementById('intro-motion-guide');
  const point = document.getElementById('intro-point');
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION = 2750;
  const FADE_DURATION = 350;
  let state = 'waiting';
  let frame = null;
  let fadeTimer = null;
  let startedAt = null;
  let length = 0;
  let preload;

  const detach = () => {
    document.removeEventListener('keydown', onKey);
    if (reduced.removeEventListener) reduced.removeEventListener('change', onReduced);
    else if (reduced.removeListener) reduced.removeListener(onReduced);
    if (preload) { preload.onload = null; preload.onerror = null; }
  };
  const cleanup = () => {
    if (state === 'done') return;
    state = 'done';
    window.clearTimeout(fadeTimer);
    window.clearTimeout(boot.timer);
    if (frame !== null) window.cancelAnimationFrame(frame);
    const shouldFocus = intro && intro.contains(document.activeElement);
    boot.failOpen();
    detach();
    if (shouldFocus) {
      const main = document.getElementById('conteudo');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }
  };
  const finish = immediate => {
    if (state === 'done') return;
    if (immediate) { cleanup(); return; }
    if (state === 'exiting') return;
    state = 'exiting';
    if (frame !== null) window.cancelAnimationFrame(frame);
    root.classList.remove('pulse-intro-pending');
    shell.inert = false;
    shell.removeAttribute('aria-hidden');
    intro.classList.add('is-exiting');
    if (intro.contains(document.activeElement)) {
      const main = document.getElementById('conteudo');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }
    intro.setAttribute('aria-hidden', 'true');
    /* A timeout also handles browsers that do not emit transitionend. */
    fadeTimer = window.setTimeout(cleanup, FADE_DURATION);
  };
  const onKey = event => {
    if (event.key === 'Escape') { event.preventDefault(); boot.markSeen(); finish(true); }
    if (event.key === 'Tab' && state !== 'done' && state !== 'exiting') {
      event.preventDefault();
      skip.focus({ preventScroll: true });
    }
  };
  const onReduced = event => { if (event.matches) { boot.markSeen(); finish(true); } };
  const draw = timestamp => {
    if (state !== 'running') return;
    if (startedAt === null) startedAt = timestamp;
    const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / DURATION));
    try {
      const position = guide.getPointAtLength(length * progress);
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error('Invalid point');
      point.setAttribute('transform', `translate(${position.x} ${position.y})`);
      if (progress >= 1) finish(false);
      else frame = window.requestAnimationFrame(draw);
    } catch { finish(true); }
  };
  const start = () => {
    if (state !== 'waiting') return;
    if (reduced.matches) { finish(true); return; }
    try {
      length = guide.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) throw new Error('Invalid motion guide');
      const initialPoint = guide.getPointAtLength(0);
      if (!Number.isFinite(initialPoint.x) || !Number.isFinite(initialPoint.y)) throw new Error('Invalid point');
      point.setAttribute('transform', `translate(${initialPoint.x} ${initialPoint.y})`);
      state = 'running';
      boot.markSeen();
      point.removeAttribute('visibility');
      frame = window.requestAnimationFrame(draw);
    } catch { finish(true); }
  };

  if (!intro || !shell || !skip || !guide || !point || reduced.matches) {
    boot.failOpen();
    window.clearTimeout(boot.timer);
    return;
  }

  /* The bootstrap watchdog also performs complete cleanup if loading stalls. */
  window.clearTimeout(boot.timer);
  boot.timer = window.setTimeout(() => finish(true), 4500);
  intro.hidden = false;
  intro.setAttribute('aria-hidden', 'false');
  shell.inert = true;
  shell.setAttribute('aria-hidden', 'true');
  root.classList.add('pulse-intro-active');
  skip.addEventListener('click', () => { boot.markSeen(); finish(true); });
  document.addEventListener('keydown', onKey);
  if (reduced.addEventListener) reduced.addEventListener('change', onReduced);
  else if (reduced.addListener) reduced.addListener(onReduced);
  skip.focus({ preventScroll: true });

  preload = new Image();
  preload.onload = start;
  preload.onerror = () => finish(true);
  preload.src = 'assets/pulse-symbol-original.jpg';
  if (preload.complete && preload.naturalWidth > 0) start();
})();
