const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, 'dist', name), 'utf8');
const geometry = JSON.parse(fs.readFileSync(path.join(root, 'notes/intro-geometry.json'), 'utf8'));

class Classes {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const on = force === undefined ? !this.contains(name) : force;
    if (on) this.add(name); else this.remove(name);
    return on;
  }
}
class Events {
  constructor() { this.events = new Map(); }
  addEventListener(type, callback) {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.events.get(type)?.delete(callback); }
  fire(type, properties = {}) {
    const event = { type, prevented: false, preventDefault() { this.prevented = true; }, ...properties };
    const results = [...(this.events.get(type) || [])].map(callback => callback(event));
    return { event, results };
  }
}
class Element extends Events {
  constructor(doc, id) {
    super(); this.doc = doc; this.id = id; this.attributes = new Map();
    this.classList = new Classes(); this.dataset = {}; this.hidden = false;
    this.inert = false; this.textContent = ''; this.children = []; this.value = '';
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  contains(el) { return el === this || this.children.includes(el); }
  focus() { this.doc.activeElement = this; }
  select() { this.selected = true; }
  setSelectionRange(a, b) { this.selection = [a, b]; }
  querySelectorAll() { return this.children; }
}
function harness(options = {}) {
  let now = 0;
  let sequence = 0;
  const timers = new Map();
  const frames = new Map();
  const doc = new Events();
  const elements = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id, new Element(doc, id));
    return elements.get(id);
  };
  doc.getElementById = id => options.missing === id ? null : el(id);
  doc.documentElement = el('html');
  doc.body = el('body');
  doc.activeElement = doc.body;
  const intro = el('pulse-intro'); intro.hidden = true;
  intro.setAttribute('aria-hidden', 'true');
  intro.children = [el('intro-skip')];
  const store = options.store || new Map();
  const media = matches => {
    const mq = new Events(); mq.matches = matches;
    mq.addListener = callback => Events.prototype.addEventListener.call(mq, 'change', callback);
    mq.removeListener = callback => Events.prototype.removeEventListener.call(mq, 'change', callback);
    if (options.legacyMedia) { mq.addEventListener = undefined; mq.removeEventListener = undefined; }
    mq.change = value => { mq.matches = value; return mq.fire('change', { matches: value }); };
    return mq;
  };
  const reduced = media(!!options.reduced);
  const desktop = media(true);
  const win = new Events();
  win.scrollY = 0;
  win.isSecureContext = options.secure !== false;
  win.matchMedia = query => query.includes('reduced-motion') ? reduced : desktop;
  win.setTimeout = (fn, delay) => { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; };
  win.clearTimeout = id => timers.delete(id);
  win.requestAnimationFrame = fn => { const id = ++sequence; frames.set(id, fn); return id; };
  win.cancelAnimationFrame = id => frames.delete(id);
  Object.defineProperty(win, 'sessionStorage', { get() {
    if (options.storeGetterThrows) throw new Error('SecurityError');
    return {
      getItem: key => store.get(key) || null,
      setItem: (key, value) => { if (options.storeWriteThrows) throw new Error('QuotaExceededError'); store.set(key, value); }
    };
  }});
  const legs = geometry.points.slice(1).map((point, i) => ({
    a: geometry.points[i], b: point,
    length: Math.hypot(point[0] - geometry.points[i][0], point[1] - geometry.points[i][1])
  }));
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  const at = distance => {
    for (const leg of legs) {
      if (distance <= leg.length) {
        const t = distance / leg.length;
        return { x: leg.a[0] + (leg.b[0] - leg.a[0]) * t, y: leg.a[1] + (leg.b[1] - leg.a[1]) * t };
      }
      distance -= leg.length;
    }
    const last = geometry.points.at(-1); return { x: last[0], y: last[1] };
  };
  el('intro-motion-guide').getTotalLength = () => { if (options.brokenSvg) throw new Error('SVG unsupported'); return total; };
  el('intro-motion-guide').getPointAtLength = distance => options.brokenPoint ? { x: NaN, y: 0 } : at(distance);
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; }
    set src(value) {
      this.source = value;
      if (options.image === 'stalled') return;
      if (options.image === 'error') { this.onerror?.(); return; }
      this.complete = true; this.naturalWidth = 1504; this.onload?.();
    }
  }
  const copied = [];
  const navigator = { clipboard: options.noClipboard ? undefined : {
    writeText: text => { copied.push(text); return options.writeText ? options.writeText(text) : Promise.resolve(); }
  }};
  doc.execCommand = () => options.execCopy !== false;
  const goals = ['run', 'walk', 'bike', 'community'].map(goal => { const node = el('goal-' + goal); node.dataset.goal = goal; node.setAttribute('aria-pressed', String(goal === 'run')); return node; });
  const links = ['run', 'walk', 'bike'].map(goal => { const node = el('link-' + goal); node.dataset.goalLink = goal; return node; });
  const inquiryKeys = [...new Set([...source('index.html').matchAll(/data-inquiry="([^"]+)"/g)].map(match => match[1]))];
  const inquiries = inquiryKeys.map(key => { const node = el('inquiry-' + key); node.dataset.inquiry = key; return node; });
  const nav = el('navigation'); nav.children = [el('nav-link')];
  el('menu-toggle').setAttribute('aria-expanded', 'false');
  const selectors = { '.site-header': 'header', '.menu-toggle': 'menu-toggle', '.navigation': 'navigation' };
  doc.querySelector = selector => selector.startsWith('#') ? el(selector.slice(1)) : el(selectors[selector]);
  doc.querySelectorAll = selector => ({ '[data-goal]': goals, '[data-goal-link]': links, '[data-inquiry]': inquiries }[selector] || []);
  const context = vm.createContext({ window: win, document: doc, Image: FakeImage, navigator, console });
  const run = file => vm.runInContext(source(file), context, { filename: file });
  const tick = milliseconds => {
    const until = now + milliseconds;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = until;
  };
  const frame = timestamp => {
    now = timestamp;
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(timestamp));
  };
  const click = async id => { await Promise.all(el(id).fire('click').results); };
  return { run, el, doc, win, tick, frame, click, reduced, desktop, store, frames, timers, copied, total, at };
}
const show = options => { const h = harness(options); h.run('intro-bootstrap.js'); h.run('intro.js'); return h; };
const assertOpen = h => {
  assert.equal(h.el('pulse-intro').hidden, true);
  assert.equal(h.el('site-shell').inert, false);
  assert.equal(h.el('site-shell').getAttribute('aria-hidden'), null);
  assert.equal(h.doc.documentElement.classList.contains('pulse-intro-pending'), false);
  assert.equal(h.doc.documentElement.classList.contains('pulse-intro-active'), false);
};

test('first visit displays the intro, isolates the page, and focuses the skip control', () => {
  const h = show(); assert.equal(h.el('pulse-intro').hidden, false);
  assert.equal(h.el('site-shell').inert, true);
  assert.equal(h.el('site-shell').getAttribute('aria-hidden'), 'true');
  assert.equal(h.doc.activeElement, h.el('intro-skip'));
  assert.equal(h.frames.size, 1, 'cached image plus load callback cannot start two animations');
});
test('the point moves by distance along the measured original line', () => {
  const h = show(); h.frame(0);
  assert.equal(h.el('intro-point').getAttribute('transform'), 'translate(143 813)');
  h.frame(1375);
  const point = h.at(h.total / 2);
  assert.equal(h.el('intro-point').getAttribute('transform'), `translate(${point.x} ${point.y})`);
});
test('natural completion reveals the homepage, fades for 350 ms, and removes the overlay at 3.1 s', () => {
  const h = show(); h.frame(0); h.frame(2750);
  assert.equal(h.el('pulse-intro').classList.contains('is-exiting'), true);
  assert.equal(h.el('pulse-intro').hidden, false);
  assert.equal(h.el('site-shell').inert, false);
  assert.equal(h.doc.activeElement, h.el('conteudo'));
  h.tick(349); assert.equal(h.el('pulse-intro').hidden, false);
  h.tick(1); assertOpen(h); assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
});
test('skip works immediately, even while the logo is still loading', async () => {
  const h = show({ image: 'stalled' }); await h.click('intro-skip'); assertOpen(h);
  assert.equal(h.doc.activeElement, h.el('conteudo'));
});
test('skip cancels an animation already in progress', async () => {
  const h = show(); h.frame(0); h.frame(400); await h.click('intro-skip');
  assertOpen(h); assert.equal(h.frames.size, 0); h.tick(5000); assertOpen(h);
});
test('Escape skips the intro and Tab stays in the dialog until it closes', () => {
  const h = show();
  const tab = h.doc.fire('keydown', { key: 'Tab', shiftKey: true }); assert.equal(tab.event.prevented, true);
  const esc = h.doc.fire('keydown', { key: 'Escape' }); assert.equal(esc.event.prevented, true); assertOpen(h);
  assert.equal(h.doc.fire('keydown', { key: 'Tab' }).event.prevented, false);
});
test('a second page load in the same session does not replay the intro', () => {
  const first = show(); const next = show({ store: first.store }); assertOpen(next); assert.equal(next.frames.size, 0);
});
test('reduced-motion users see the homepage immediately and are marked as seen', () => {
  const h = show({ reduced: true }); assertOpen(h); assert.equal(h.store.get('pulse.intro.seen.v2'), '1');
});
test('the repaired intro plays once even if the previous broken release set its session flag', () => {
  const store = new Map([['pulse.intro.seen.v1', '1']]);
  const first = show({ store }); assert.equal(first.el('pulse-intro').hidden, false);
  assert.equal(store.get('pulse.intro.seen.v2'), '1');
  assertOpen(show({ store }));
});
test('a failed symbol load does not consume the intro for the session', () => {
  const first = show({ image: 'error' }); assertOpen(first);
  assert.notEqual(first.store.get('pulse.intro.seen.v2'), '1');
  const retry = show({ store: first.store }); assert.equal(retry.el('pulse-intro').hidden, false);
});
test('explicitly skipping a still loading intro prevents replay for the session', async () => {
  const first = show({ image: 'stalled' }); await first.click('intro-skip');
  assertOpen(show({ store: first.store }));
});
test('enabling reduced motion during the animation ends it immediately', () => {
  const h = show(); h.frame(0); h.reduced.change(true); assertOpen(h); assert.equal(h.frames.size, 0);
});
test('legacy MediaQueryList listeners also support a reduced-motion change', () => {
  const h = show({ legacyMedia: true }); h.reduced.change(true); assertOpen(h);
});
test('reduced motion during the fade also clears its remaining timer', () => {
  const h = show(); h.frame(0); h.frame(2750); h.reduced.change(true); assertOpen(h); assert.equal(h.timers.size, 0);
});
test('a denied sessionStorage getter leaves the homepage available', () => assertOpen(show({ storeGetterThrows: true })));
test('a denied sessionStorage write leaves the homepage available', () => assertOpen(show({ storeWriteThrows: true })));
test('a failed logo load leaves the homepage available', () => assertOpen(show({ image: 'error' })));
test('a missing SVG measurement API leaves the homepage available', () => assertOpen(show({ brokenSvg: true })));
test('invalid SVG coordinates cannot block the site', () => assertOpen(show({ brokenPoint: true })));
test('an indefinitely loading logo is released by the watchdog', () => { const h = show({ image: 'stalled' }); h.tick(4500); assertOpen(h); });
test('a failed deferred script cannot hide the page or start the intro late', () => {
  const h = harness(); h.run('intro-bootstrap.js'); h.tick(4500); assertOpen(h);
  h.run('intro.js'); assertOpen(h); assert.equal(h.frames.size, 0);
});
test('a missing intro element cannot hide or lock the homepage', () => assertOpen(show({ missing: 'intro-motion-guide' })));
test('a delayed animation frame reaches the endpoint without overshooting', () => {
  const h = show(); h.frame(0); h.frame(4000);
  const endpoint = h.at(h.total);
  assert.equal(h.el('intro-point').getAttribute('transform'), `translate(${endpoint.x} ${endpoint.y})`);
  h.tick(350); assertOpen(h);
});

test('goal changes retain one selected goal and prepare the corresponding message', async () => {
  const h = harness(); h.run('script.js'); await h.click('goal-bike');
  assert.match(h.el('message-text').textContent, /bicicleta/);
  assert.equal(h.el('goal-bike').getAttribute('aria-pressed'), 'true');
  assert.equal(h.el('goal-run').getAttribute('aria-pressed'), 'false');
});
test('all six product categories prepare individual inquiries and return to goals cleanly', async () => {
  const h = harness(); h.run('script.js');
  for (const [key, word] of [['sweat', 'hoodie'], ['tshirt', 't-shirts'], ['tank', 'alças'], ['longsleeve', 'manga comprida'], ['cap', 'bonés'], ['triathlon', 'triatlo']]) {
    await h.click('inquiry-' + key); assert.ok(h.el('message-text').textContent.includes(word));
    assert.equal(h.el('goal-run').getAttribute('aria-pressed'), 'false');
  }
  await h.click('goal-run'); assert.match(h.el('message-text').textContent, /corrida/);
  assert.equal(h.el('goal-run').getAttribute('aria-pressed'), 'true');
});
test('the partnership contact prepares a partnership message that can be copied', async () => {
  const h = harness(); h.run('script.js'); await h.click('inquiry-partner'); await h.click('copy-message');
  assert.match(h.copied[0], /ser vosso parceiro/);
  assert.equal(h.el('copy-label').textContent, 'Mensagem copiada ✓');
});
test('the existing menu closes on navigation and Escape', async () => {
  const h = harness(); h.run('script.js'); await h.click('menu-toggle');
  assert.equal(h.el('navigation').classList.contains('is-open'), true);
  await h.click('nav-link'); assert.equal(h.el('navigation').classList.contains('is-open'), false);
  await h.click('menu-toggle'); h.doc.fire('keydown', { key: 'Escape' });
  assert.equal(h.doc.body.classList.contains('menu-open'), false);
});
test('legacy media-query listeners do not prevent site interactions', async () => {
  const h = harness({ legacyMedia: true }); h.run('script.js'); await h.click('goal-walk');
  assert.match(h.el('message-text').textContent, /caminhadas/);
});
test('copy falls back to selected text and preserves the manual route when both copy APIs are denied', async () => {
  const h = harness({ noClipboard: true, execCopy: false }); h.run('script.js'); await h.click('inquiry-tank'); await h.click('copy-message');
  assert.equal(h.el('copy-fallback').hidden, false);
  assert.match(h.el('copy-fallback').value, /alças/);
  assert.match(h.el('message-status').textContent, /Seleciona e copia/);
});
test('an asynchronous copy cannot claim that a newer inquiry was copied', async () => {
  let resolveCopy;
  const h = harness({ writeText: () => new Promise(resolve => { resolveCopy = resolve; }) });
  h.run('script.js'); await h.click('goal-run');
  const pending = h.click('copy-message'); await h.click('inquiry-partner'); resolveCopy(); await pending;
  assert.match(h.el('message-status').textContent, /mensagem anterior/);
  assert.equal(h.el('copy-label').textContent, 'Copiar mensagem atual');
});
