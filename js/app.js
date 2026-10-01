(() => {
  'use strict';

  // ---------- Config ----------
  const FRAME_COUNT = 8;
  const FRAME_MS = 105;                 // time each of the 8 frames is on screen
  const VIEWBOX = '70 250 490 430';     // crops the empty margin of the 600x600 source art
  const MAX_CHARS = 80;                 // keep in sync with the textarea maxlength in index.html
  const MAX_LINES = 3;
  const MAX_FONT = 22;                  // SVG user units; text shrinks until it fits, never below MIN_FONT
  const MIN_FONT = 10;
  const LINE_HEIGHT = 1.22;
  const PAPER = { angle: -39, sx: 1.3, sy: 1.5, dx: 20, dy: 9 };  // -39deg undoes the strip's diagonal tilt; sx/sy stretch it afterwards
  const TEXT_FILL = { w: 0.78, h: 0.66 };                   // share of the flattened paper the text may use
  const SHARE_LABEL = 'Share this fortune';
  const STORE_KEY = 'fortune:daily';    // { date: 'YYYY-MM-DD' (visitor's local day), id } in localStorage
  const HINT = {
    rest: 'You get one crack a day. Tap the cookie to open today\'s.',
    own: 'That\'s your crack for today. Come back tomorrow for another.',
    newDay: 'It\'s a new day. Tap the cookie to crack today\'s.',
    shared: 'A fortune shared with you. Tap to crack your own (one a day).',
    sharedUsed: 'A fortune shared with you. Tap to see your fortune for today.',
  };
  const EMAIL = 'hello@khoaly.xyz';
  const PARAM = 'c';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const framesEl = $('frames');
  const hint = $('hint');
  const live = $('live');
  const shareBtn = $('share');
  const addBtn = $('add');
  const dialog = $('add-dialog');
  const form = $('add-form');
  const addText = $('add-text');
  const addCount = $('add-count');
  const addCredit = $('add-credit');
  const addStatus = $('add-status');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- State ----------
  let state = 'loading';                // loading | rest | opening | open
  let messages = [];
  let lastId = null;
  let current = null;                   // fortune on screen
  let viewingOwn = false;               // true when the fortune on screen is this visitor's crack for the day
  let memoryDaily = null;               // fallback when localStorage is blocked
  const frames = [];                    // frame wrapper elements, index 0..7
  let paperBox = null;                  // bounding box of the flattened paper, SVG units
  let fortuneText = null;               // <text> element on the last frame

  const setState = (s) => { state = s; document.body.dataset.state = s; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Setup ----------
  async function init() {
    try {
      const [svgs, data] = await Promise.all([
        Promise.all(Array.from({ length: FRAME_COUNT }, (_, i) =>
          fetch(`assets/cookie/frame-0${i + 1}.svg`).then(ok).then((r) => r.text()))),
        fetch('data/messages.json').then(ok).then((r) => r.json()),
      ]);
      messages = data.filter((m) => m && m.id && m.text);
      buildFrames(svgs);
    } catch (err) {
      console.error(err);
      hint.textContent = "The cookie couldn't load. Refresh to try again.";
      return;
    }

    // The fortune is painted in Fraunces; measure only once it's loaded (but don't hang if it never is).
    await Promise.race([
      document.fonts.load('italic 500 16px Fraunces').catch(() => {}),
      wait(1500),
    ]);

    const key = new URLSearchParams(location.search).get(PARAM);
    const linked = key && messages.find((m) => m.id === key);
    const mine = crackedToday();
    if (linked) {
      showOpen(linked, { animate: false });   // a shared link never uses up the visitor's own crack
    } else if (mine) {
      showOpen(mine, { animate: false });     // already cracked today: show it again
    } else {
      if (key) clearUrl();                    // unknown key: drop it
      setState('rest');
      updateHint();
    }
  }

  function ok(res) {
    if (!res.ok) throw new Error(`${res.url}: ${res.status}`);
    return res;
  }

  function buildFrames(svgs) {
    svgs.forEach((markup, i) => {
      const el = document.createElement('div');
      el.className = 'frame';
      el.innerHTML = markup.replace(/<title>[\s\S]*?<\/title>/, '');
      const svg = el.querySelector('svg');
      svg.setAttribute('viewBox', VIEWBOX);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('focusable', 'false');
      framesEl.append(el);
      frames.push(el);
    });
    frames[0].classList.add('is-on');
    prepareLastFrame(frames[FRAME_COUNT - 1]);
  }

  // ---------- Paper + text ----------
  function prepareLastFrame(el) {
    el.classList.add('frame--last');
    const svg = el.querySelector('svg');
    const paper = svg.querySelector('#paper');
    paper.classList.add('paper');

    el.style.setProperty('--paper-angle', `${PAPER.angle}deg`);
    el.style.setProperty('--paper-sx', PAPER.sx);
    el.style.setProperty('--paper-sy', PAPER.sy);
    el.style.setProperty('--paper-dx', `${PAPER.dx}px`);
    el.style.setProperty('--paper-dy', `${PAPER.dy}px`);

    // Measure where the paper ends up once flattened, so the text can be fitted to it.
    const path = paper.querySelector('path');
    const b = path.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const probe = document.createElementNS(SVG_NS, 'g');
    const inner = document.createElementNS(SVG_NS, 'g');
    inner.setAttribute('transform',
      `translate(${cx + PAPER.dx} ${cy + PAPER.dy}) scale(${PAPER.sx} ${PAPER.sy}) rotate(${PAPER.angle}) translate(${-cx} ${-cy})`);
    inner.append(path.cloneNode());
    probe.append(inner);
    svg.append(probe);
    paperBox = probe.getBBox();
    probe.remove();

    fortuneText = document.createElementNS(SVG_NS, 'text');
    fortuneText.setAttribute('class', 'fortune-text');
    svg.append(fortuneText);
  }

  // Greedy word wrap using canvas metrics (font must already be loaded).
  const measureCtx = document.createElement('canvas').getContext('2d');
  function wrap(text, size, maxWidth) {
    measureCtx.font = `italic 500 ${size}px Fraunces, Georgia, serif`;
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (!line || measureCtx.measureText(next).width * 1.03 <= maxWidth) line = next;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function fit(text) {
    const maxW = paperBox.width * TEXT_FILL.w;
    const maxH = paperBox.height * TEXT_FILL.h;
    for (let size = MAX_FONT; size >= MIN_FONT; size -= 0.5) {
      const lines = wrap(text, size, maxW);
      const widest = Math.max(...lines.map((l) => measureCtx.measureText(l).width * 1.03));
      if (lines.length <= MAX_LINES && lines.length * size * LINE_HEIGHT <= maxH && widest <= maxW) {
        return { size, lines };
      }
    }
    // Shouldn't happen for messages within MAX_CHARS; fail soft at the smallest size.
    return { size: MIN_FONT, lines: wrap(text, MIN_FONT, maxW).slice(0, MAX_LINES) };
  }

  function writeFortune(text) {
    const { size, lines } = fit(text);
    const cx = paperBox.x + paperBox.width / 2;
    const cy = paperBox.y + paperBox.height / 2;
    const lh = size * LINE_HEIGHT;
    const top = cy - ((lines.length - 1) * lh) / 2 + size * 0.32;  // 0.32em ≈ visual centring of a baseline
    fortuneText.setAttribute('font-size', size);
    fortuneText.replaceChildren(...lines.map((l, i) => {
      const t = document.createElementNS(SVG_NS, 'tspan');
      t.setAttribute('x', cx);
      t.setAttribute('y', top + i * lh);
      t.textContent = l;
      return t;
    }));
  }

  // ---------- One crack per day (remembered in this browser, resets at the visitor's local midnight) ----------
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function crackedToday() {
    let v = memoryDaily;
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) v = JSON.parse(raw); } catch (_) { /* blocked or corrupt */ }
    return (v && v.date === today() && messages.find((m) => m.id === v.id)) || null;
  }
  function saveDaily(id) {
    memoryDaily = { date: today(), id };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(memoryDaily)); } catch (_) { /* blocked */ }
  }

  function updateHint() {
    if (state === 'rest') {
      hint.textContent = HINT.rest;
      stage.classList.remove('is-locked');
      stage.setAttribute('aria-label', 'Crack open the fortune cookie');
    } else if (state === 'open') {
      const mine = crackedToday();
      const own = viewingOwn && mine && current && mine.id === current.id;
      hint.textContent = own ? HINT.own : viewingOwn ? HINT.newDay : mine ? HINT.sharedUsed : HINT.shared;
      stage.classList.toggle('is-locked', !!own);
      stage.setAttribute('aria-label', own ? 'Your fortune for today' : 'Crack open the fortune cookie');
    } else {
      hint.textContent = '';
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateHint(); });

  // ---------- Frames ----------
  function showFrame(i) {
    frames.forEach((f, n) => f.classList.toggle('is-on', n === i));
  }

  function pick() {
    const buf = new Uint32Array(1);
    let m;
    for (let tries = 0; tries < 5; tries++) {
      crypto.getRandomValues(buf);
      m = messages[buf[0] % messages.length];
      if (m.id !== lastId || messages.length === 1) break;
    }
    return m;
  }

  // ---------- Open / reset ----------
  async function open() {
    if (!messages.length) return;
    const mine = crackedToday();
    if (mine) { showOpen(mine, { animate: false }); return; }   // e.g. cracked in another tab
    const msg = pick();
    saveDaily(msg.id);                      // saved up front so a reload mid-animation can't earn a second crack
    setState('opening');
    updateHint();
    const animate = !reduceMotion.matches;
    if (animate) {
      for (let i = 1; i < FRAME_COUNT; i++) {
        await wait(FRAME_MS);
        showFrame(i);
      }
    }
    showOpen(msg, { animate });
  }

  function showOpen(msg, { animate }) {
    lastId = msg.id;
    current = msg;
    const mine = crackedToday();
    viewingOwn = !!(mine && mine.id === msg.id);
    const last = frames[FRAME_COUNT - 1];
    showFrame(FRAME_COUNT - 1);
    writeFortune(msg.text);
    last.classList.toggle('is-animated', animate);
    // Two rAFs so the un-rotated paper is painted first and the flatten actually transitions.
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => last.classList.add('is-flat')));
    else last.classList.add('is-flat');

    setState('open');
    setUrl(msg.id);
    live.textContent = msg.text;
    updateHint();
    shareBtn.disabled = false;
  }

  function reset() {
    const last = frames[FRAME_COUNT - 1];
    last.classList.remove('is-flat', 'is-animated');
    showFrame(0);
    live.textContent = '';
    clearUrl();
    shareBtn.disabled = true;
    current = null;
    viewingOwn = false;
    setState('rest');
    updateHint();
  }

  stage.addEventListener('click', () => {
    if (state === 'rest') { open(); return; }
    if (state !== 'open') return;
    const mine = crackedToday();
    if (mine && current && mine.id === current.id) return;   // today's crack is spent
    if (mine) showOpen(mine, { animate: false });            // looking at a shared fortune: back to yours
    else reset();                                            // unused crack, or a new day: closed cookie again
  });

  // ---------- URL ----------
  function setUrl(id) {
    try { history.replaceState(null, '', `${location.pathname}?${PARAM}=${encodeURIComponent(id)}`); } catch (_) { /* file:// etc. */ }
  }
  function clearUrl() {
    try { history.replaceState(null, '', location.pathname); } catch (_) { /* ignore */ }
  }

  // ---------- Share ----------
  let copiedTimer;
  function flashShare(label, copied) {
    shareBtn.textContent = label;
    shareBtn.classList.toggle('is-copied', copied);
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      shareBtn.textContent = SHARE_LABEL;
      shareBtn.classList.remove('is-copied');
    }, 2000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.append(ta);
      ta.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
      return done;
    }
  }

  shareBtn.addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fortune Cookie', text: 'I cracked open a fortune cookie. See what it says:', url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;   // user closed the share sheet
      }
    }
    if (await copyText(url)) flashShare('Link copied', true);
    else flashShare("Couldn't copy", false);
  });

  // ---------- Add a fortune (mailto) ----------
  const setStatus = (msg, isError) => {
    addStatus.textContent = msg;
    addStatus.classList.toggle('is-error', !!isError);
  };

  addBtn.addEventListener('click', () => {
    setStatus('');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    addText.focus();
  });
  $('add-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  addText.addEventListener('input', () => { addCount.textContent = addText.value.length; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = addText.value.replace(/\s+/g, ' ').trim();
    if (!text) { setStatus('Write a fortune first.', true); addText.focus(); return; }
    if (text.length > MAX_CHARS) { setStatus(`Keep it to ${MAX_CHARS} characters so it fits on the paper.`, true); return; }

    const credit = addCredit.value.trim();
    const body = [
      'Fortune:', text, '',
      `Credit: ${credit || '(anonymous)'}`, '',
      '(sent from the Fortune Cookie page)',
    ].join('\n');
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent('New fortune suggestion')}&body=${encodeURIComponent(body)}`;
    setStatus('Opening your email app. Just hit send there.');
    window.location.href = href;
  });

  init();
})();
