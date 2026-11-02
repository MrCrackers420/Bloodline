/**
 * Latch 98 Minesweeper application content. No OS titlebar / start menu here.
 * Call mountMinesweeper(container) from the desktop's window manager, or
 * open index.html in a browser to play the preview immediately.
 */

const PRESETS = Object.freeze({
  beginner: {width: 9, height: 9, mines: 10, label: 'Beginner'},
  intermediate: {width: 16, height: 16, mines: 40, label: 'Intermediate'},
  expert: {width: 30, height: 16, mines: 99, label: 'Expert'}
});
const STORAGE_KEY = 'latch98.minesweeper.best-times.v1';
const RNG_SEED = () => {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
};

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function sevenSegment(number) {
  const chars = number < 0 ? `-${String(Math.abs(number)).padStart(2, '0').slice(-2)}` : String(Math.min(999, number)).padStart(3, '0');
  const segments = [
    'M4 2H16L13 5H7Z', 'M17 3L20 5L19 11L16 13L14 11L15 6Z',
    'M17 14L20 16L19 22L16 24L14 21L15 16Z',
    'M4 23H16L13 26H7Z', 'M2 14L5 16L6 21L4 24L1 22L0 16Z',
    'M2 3L5 6L6 11L4 13L1 11L0 5Z', 'M4 12H16L13 15H7Z'
  ];
  const on = {0:[0,1,2,3,4,5],1:[1,2],2:[0,1,6,4,3],3:[0,1,6,2,3],4:[5,6,1,2],5:[0,5,6,2,3],6:[0,5,6,4,2,3],7:[0,1,2],8:[0,1,2,3,4,5,6],9:[0,1,2,3,5,6],'-':[6]};
  return `<span class="ms-seg" aria-hidden="true">${[...chars].map(c => `<svg viewBox="0 0 21 28" width="17" height="28">${segments.map((d, i) => `<path d="${d}" fill="${on[c]?.includes(i) ? '#f00' : '#3b0707'}"/>`).join('')}</svg>`).join('')}</span>`;
}

function smileSVG(mood) {
  const eyes = mood === 'lost'
    ? '<path d="M8 10l4 4m0-4l-4 4m10-4l4 4m0-4l-4 4" stroke="#111" stroke-width="1.6"/>'
    : mood === 'won'
      ? '<path d="M7 10h7v5H7zM16 10h7v5h-7zM14 12h2" fill="#111" stroke="#111" stroke-width="1"/>'
      : mood === 'scared'
        ? '<circle cx="10" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>'
        : '<rect x="9" y="11" width="2.5" height="3.5"/><rect x="19" y="11" width="2.5" height="3.5"/>';
  const mouth = mood === 'scared'
    ? '<ellipse cx="15" cy="21" rx="3" ry="4" fill="#111"/>'
    : mood === 'lost'
      ? '<path d="M10 23Q15 17 20 23" fill="none" stroke="#111" stroke-width="1.6"/>'
      : '<path d="M8 19Q15 28 22 19" fill="none" stroke="#111" stroke-width="1.6"/>';
  return `<svg class="ms-face-art" viewBox="0 0 30 30" role="img" aria-label="${mood} face"><circle cx="15" cy="15" r="13" fill="#ffff00" stroke="#111" stroke-width="1.5"/>${eyes}${mouth}</svg>`;
}

function mineSVG() {
  return '<svg viewBox="0 0 20 20" class="ms-tile-art" aria-hidden="true"><path stroke="#111" stroke-width="2" d="M10 1v18M1 10h18M4 4l12 12M16 4L4 16"/><rect x="5" y="5" width="10" height="10" fill="#111"/><rect x="7" y="7" width="3" height="3" fill="#fff"/></svg>';
}
function flagSVG() {
  return '<svg viewBox="0 0 20 20" class="ms-tile-art" aria-hidden="true"><path d="M10 3v14" stroke="#000" stroke-width="1.5"/><path d="M10 3L3 6.5L10 10Z" fill="red" stroke="#a00000" stroke-width=".5"/><path d="M5 17h10v2H5z" fill="#111"/></svg>';
}
function cellContents(code) {
  if (code === 1) return flagSVG();
  if (code === 2) return '<span class="ms-question">?</span>';
  if (code === 12 || code === 13) return mineSVG();
  if (code === 14) return `${flagSVG()}<span class="ms-wrong">×</span>`;
  if (code >= 4 && code <= 11) return String(code - 3);
  return '';
}
function cellClass(code) {
  if (code === 0) return 'ms-cell covered';
  if (code === 1) return 'ms-cell covered flagged';
  if (code === 2) return 'ms-cell covered questioned';
  if (code === 13) return 'ms-cell opened exploded';
  if (code === 14) return 'ms-cell covered incorrect';
  if (code === 12) return 'ms-cell opened';
  return `ms-cell opened${code > 3 ? ` n${code - 3}` : ''}`;
}

function loadBest() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return Object.fromEntries(Object.keys(PRESETS).map(k => [k, data[k] && Number.isFinite(data[k].time) ? data[k] : null]));
  } catch { return {beginner: null, intermediate: null, expert: null}; }
}
function saveBest(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage disabled */ }
}

let stylesheetAdded = false;
function installCSS() {
  if (stylesheetAdded || document.querySelector('link[data-latch-mines-css]')) return;
  stylesheetAdded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-latch-mines-css', '');
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.append(link);
}

async function engineConstructor() {
  try {
    const wasm = await import('../pkg/latch98_minesweeper.js');
    await wasm.default();
    return {Constructor: wasm.Minefield, backend: 'Rust / WebAssembly'};
  } catch (e) {
    // The no-build preview keeps the game playable in a browser. A production
    // Latch 98 installation should build the Rust crate and include pkg/.
    const {Minefield} = await import('./engine-fallback.js');
    return {Constructor: Minefield, backend: 'JavaScript preview (build Rust WASM to enable)'};
  }
}

/** @returns {Promise<{newGame: Function, getState: Function, destroy: Function, backend: string}>} */
export async function mountMinesweeper(container, options = {}) {
  if (!(container instanceof Element)) throw new Error('A DOM container is required');
  installCSS();
  const {Constructor, backend} = await engineConstructor();
  const app = document.createElement('section');
  app.className = 'ms-app';
  app.tabIndex = 0;
  app.setAttribute('role', 'application');
  app.setAttribute('aria-label', 'Latch 98 Minesweeper');
  app.innerHTML = `
    <div class="ms-menu-bar">
      <button type="button" class="ms-menu-label" data-menu="game" aria-haspopup="true" aria-expanded="false">Game</button>
      <button type="button" class="ms-menu-label" data-menu="help" aria-haspopup="true" aria-expanded="false">Help</button>
      <div class="ms-popup" data-popup="game" hidden>
        <button type="button" data-action="new">New <span class="ms-shortcut">F2</span></button>
        <div class="ms-rule"></div>
        <button type="button" data-action="difficulty" data-value="beginner"><span class="ms-check"></span>Beginner</button>
        <button type="button" data-action="difficulty" data-value="intermediate"><span class="ms-check"></span>Intermediate</button>
        <button type="button" data-action="difficulty" data-value="expert"><span class="ms-check"></span>Expert</button>
        <button type="button" data-action="custom"><span class="ms-check" data-custom-check></span>Custom...</button>
        <div class="ms-rule"></div>
        <button type="button" data-action="marks"><span class="ms-check" data-marks-check></span>Marks (?)</button>
        <div class="ms-rule"></div>
        <button type="button" data-action="scores">Best Times...</button>
      </div>
      <div class="ms-popup ms-help-popup" data-popup="help" hidden>
        <button type="button" data-action="instructions">How to Play</button>
        <div class="ms-rule"></div>
        <button type="button" data-action="about">About Minesweeper</button>
      </div>
    </div>
    <div class="ms-panel-scroll">
      <div class="ms-inset-area">
        <div class="ms-score-panel">
          <div class="ms-counter" data-counter="mines" aria-label="Mines remaining">${sevenSegment(10)}</div>
          <button type="button" class="ms-smile" title="New game (F2)" aria-label="New game" data-action="new">${smileSVG('happy')}</button>
          <div class="ms-counter" data-counter="timer" aria-label="Elapsed seconds">${sevenSegment(0)}</div>
        </div>
        <div class="ms-board-recess"><div class="ms-board" role="grid" aria-label="Minesweeper field"></div></div>
      </div>
    </div>
    <div class="ms-touch-controls" aria-label="Touch input mode">
      <span>Tap:</span><button type="button" data-touch="reveal" aria-pressed="true">Reveal</button><button type="button" data-touch="flag" aria-pressed="false">Flag</button>
      <span class="ms-longpress-hint">Hold a square to flag it</span>
    </div>
    <span class="ms-sr-only ms-announcement" aria-live="polite"></span>
    <div class="ms-modal-backdrop" hidden><div class="ms-dialog" role="dialog" aria-modal="true" aria-labelledby="ms-dialog-heading"></div></div>`;
  container.replaceChildren(app);

  let difficulty = 'beginner';
  let config = {...PRESETS.beginner};
  let marksEnabled = true;
  let game = null;
  let state = null;
  let touchMode = 'reveal';
  let menuOpen = '';
  let pointerHeld = false;
  let longPressTimer = null;
  let suppressClicksUntil = 0;
  let pressStart = null;
  let startedAt = null;
  let clock = null;
  let destroyed = false;
  const best = loadBest();
  const board = app.querySelector('.ms-board');
  const face = app.querySelector('.ms-smile');
  const modalBackdrop = app.querySelector('.ms-modal-backdrop');
  const dialog = app.querySelector('.ms-dialog');
  const announcement = app.querySelector('.ms-announcement');
  const counters = {mines: app.querySelector('[data-counter="mines"]'), timer: app.querySelector('[data-counter="timer"]')};
  let previousCells = [], previousW = -1, previousH = -1;
  let prevRemaining = undefined, prevSeconds = undefined, prevStatus = -1;

  const getState = () => JSON.parse(game.snapshot_json());
  function paintFace(mood) {
    if (face.dataset.mood !== mood) { face.dataset.mood = mood; face.innerHTML = smileSVG(mood); }
  }
  function render() {
    if (destroyed || !game) return;
    const next = getState();
    const oldStatus = state?.status ?? 0;
    state = next;
    if (next.width !== previousW || next.height !== previousH) {
      previousW = next.width; previousH = next.height;
      board.style.setProperty('--cols', String(next.width));
      board.setAttribute('aria-rowcount', String(next.height));
      board.setAttribute('aria-colcount', String(next.width));
      board.replaceChildren(...next.cells.map((_, i) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.setAttribute('role', 'gridcell');
        tile.className = 'ms-cell covered';
        tile.dataset.index = String(i);
        tile.tabIndex = i === 0 ? 0 : -1;
        return tile;
      }));
      previousCells = new Array(next.cells.length).fill(-1);
      // Give the desktop host a chance to size its window when field size changes.
      app.dispatchEvent(new CustomEvent('latch98:content-resize', {bubbles: true, detail: {width: next.width, height: next.height}}));
    }
    const tiles = board.children;
    next.cells.forEach((kind, i) => {
      if (previousCells[i] === kind) return;
      previousCells[i] = kind;
      const tile = tiles[i];
      tile.className = cellClass(kind);
      tile.innerHTML = cellContents(kind);
      tile.setAttribute('aria-label', `${Math.floor(i / next.width) + 1}, ${i % next.width + 1}: ${kind === 0 ? 'covered' : kind === 1 ? 'flagged' : kind === 2 ? 'questioned' : kind === 3 ? 'empty' : kind > 3 && kind <= 11 ? kind - 3 + ' nearby mines' : kind === 14 ? 'wrong flag' : 'mine'}`);
    });
    if (prevRemaining !== next.remaining) {
      counters.mines.innerHTML = sevenSegment(next.remaining);
      counters.mines.setAttribute('aria-label', `${next.remaining} mines remaining`);
      prevRemaining = next.remaining;
    }
    if (prevSeconds !== next.seconds) {
      counters.timer.innerHTML = sevenSegment(next.seconds);
      counters.timer.setAttribute('aria-label', `${next.seconds} seconds`);
      prevSeconds = next.seconds;
    }
    if (!pointerHeld) paintFace(next.status === 3 ? 'lost' : next.status === 2 ? 'won' : 'happy');
    if (oldStatus === 0 && next.status === 1) startedAt = Date.now();
    if (oldStatus !== next.status && next.status === 2) {
      announcement.textContent = 'You won!';
      if (difficulty !== 'custom' && (!best[difficulty] || next.seconds < best[difficulty].time)) bestTimeDialog(next.seconds);
    }
    if (oldStatus !== next.status && next.status === 3) announcement.textContent = 'You hit a mine. Game over.';
  }
  function startNew(nextConfig = config, nextDifficulty = difficulty) {
    config = {...nextConfig};
    difficulty = nextDifficulty;
    if (game?.free) game.free();
    game = new Constructor(config.width, config.height, config.mines, RNG_SEED());
    game.set_question_marks(marksEnabled);
    state = null;
    previousW = -1; previousH = -1;
    previousCells = [];
    prevRemaining = undefined; prevSeconds = undefined; prevStatus = -1;
    pointerHeld = false;
    startedAt = null;
    announcement.textContent = '';
    closeMenu();
    render();
  }
  function takeAction(type, index) {
    if (!game || !state) return;
    const x = index % state.width, y = Math.floor(index / state.width);
    if (type === 'mark') game.mark(x, y);
    else if (type === 'chord') game.chord(x, y);
    else game.reveal(x, y);
    render();
  }
  function closeMenu() {
    menuOpen = '';
    for (const popup of app.querySelectorAll('.ms-popup')) popup.hidden = true;
    for (const label of app.querySelectorAll('.ms-menu-label')) {
      label.classList.remove('active'); label.setAttribute('aria-expanded', 'false');
    }
  }
  function openMenu(name) {
    if (menuOpen === name) { closeMenu(); return; }
    closeMenu(); menuOpen = name;
    const popup = app.querySelector(`[data-popup="${name}"]`);
    if (popup) popup.hidden = false;
    const label = app.querySelector(`[data-menu="${name}"]`);
    if (label) { label.classList.add('active'); label.setAttribute('aria-expanded', 'true'); }
    app.querySelectorAll('[data-action="difficulty"]').forEach(node => {
      node.querySelector('.ms-check').textContent = node.dataset.value === difficulty ? '✓' : '';
    });
    app.querySelector('[data-custom-check]').textContent = difficulty === 'custom' ? '✓' : '';
    app.querySelector('[data-marks-check]').textContent = marksEnabled ? '✓' : '';
  }
  function openDialog(title, content, actions) {
    closeMenu();
    dialog.innerHTML = `<div class="ms-dialog-title" id="ms-dialog-heading">${escapeHTML(title)}<button type="button" class="ms-dialog-x" aria-label="Close dialog" data-dialog-close>×</button></div><div class="ms-dialog-body">${content}</div><div class="ms-dialog-actions">${actions}</div>`;
    modalBackdrop.hidden = false;
    dialog.querySelector('[data-dialog-close]').addEventListener('click', closeDialog);
    dialog.querySelector('[autofocus]')?.focus();
  }
  function closeDialog() { modalBackdrop.hidden = true; dialog.innerHTML = ''; app.focus({preventScroll: true}); }
  function customDialog() {
    openDialog('Custom Field', `<form id="ms-custom-form" class="ms-custom-form">
      <label>Height: <input type="number" name="height" min="2" max="24" value="${config.height}" required></label>
      <label>Width: <input type="number" name="width" min="2" max="60" value="${config.width}" required></label>
      <label>Mines: <input type="number" name="mines" min="1" max="999" value="${config.mines}" required></label>
    </form>`, '<button type="submit" form="ms-custom-form" class="ms-default-button">OK</button><button type="button" data-cancel>Cancel</button>');
    dialog.querySelector('[data-cancel]').addEventListener('click', closeDialog);
    dialog.querySelector('#ms-custom-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const w = Math.min(60, Math.max(2, Number(fd.get('width')))), h = Math.min(24, Math.max(2, Number(fd.get('height'))));
      const m = Math.max(1, Math.min(w * h - 1, Number(fd.get('mines'))));
      closeDialog();
      startNew({width:w, height:h, mines:m, label:'Custom'}, 'custom');
    });
  }
  function scoresDialog() {
    const rows = Object.entries(PRESETS).map(([id, cfg]) => `<tr><td>${cfg.label}:</td><td>${best[id] ? `${best[id].time} sec.` : '999 sec.'}</td><td>${escapeHTML(best[id]?.name || 'Anonymous')}</td></tr>`).join('');
    openDialog('Fastest Mine Sweepers', `<table class="ms-best-times">${rows}</table>`, '<button type="button" data-reset-scores>Reset Scores</button><button type="button" data-cancel class="ms-default-button">OK</button>');
    dialog.querySelector('[data-cancel]').addEventListener('click', closeDialog);
    dialog.querySelector('[data-reset-scores]').addEventListener('click', () => {
      for (const level of Object.keys(PRESETS)) best[level] = null;
      saveBest(best); scoresDialog();
    });
  }
  function bestTimeDialog(time) {
    openDialog('New Best Time!', `<p>You cleared the ${escapeHTML(PRESETS[difficulty].label)} field in <b>${time} seconds</b>!</p><form id="ms-name-form"><label>Your name: <input type="text" name="name" maxlength="24" value="Player" autofocus required></label></form>`, '<button type="submit" form="ms-name-form" class="ms-default-button">OK</button>');
    dialog.querySelector('#ms-name-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = String(new FormData(e.currentTarget).get('name') || 'Player').trim().slice(0, 24) || 'Player';
      best[difficulty] = {time, name};
      saveBest(best); closeDialog();
    });
  }
  function helpDialog() {
    openDialog('How to Play', `<p>Find every mine without uncovering one. The number on a square tells you how many mines touch it (including diagonals).</p>
      <p><b>Mouse:</b> Left-click to reveal. Right-click to flag. Double-click or middle-click a number to uncover nearby squares when the correct number of flags is placed.</p>
      <p><b>Touch:</b> Tap to reveal, hold to flag, or switch to Flag mode below the board. Tap a revealed number to chord.</p>
      <p><b>Shortcut:</b> F2 starts a new game. The clock starts on your first reveal.</p>`, '<button type="button" data-cancel class="ms-default-button">OK</button>');
    dialog.querySelector('[data-cancel]').addEventListener('click', closeDialog);
  }
  function aboutDialog() {
    openDialog('About Minesweeper', '<div class="ms-about"><div class="ms-about-icon">' + mineSVG() + '</div><div><b>Latch 98 Minesweeper</b><p>A classic mine-clearing puzzle for Latch 98.</p><p>Game rules: Rust. Interface: HTML/CSS.</p></div></div>', '<button type="button" data-cancel class="ms-default-button">OK</button>');
    dialog.querySelector('[data-cancel]').addEventListener('click', closeDialog);
  }

  function clickOnApp(e) {
    const menu = e.target.closest('[data-menu]');
    if (menu) { openMenu(menu.dataset.menu); return; }
    const action = e.target.closest('[data-action]');
    if (action) {
      const type = action.dataset.action;
      if (type === 'new') startNew();
      else if (type === 'difficulty') startNew(PRESETS[action.dataset.value], action.dataset.value);
      else if (type === 'custom') customDialog();
      else if (type === 'scores') scoresDialog();
      else if (type === 'instructions') helpDialog();
      else if (type === 'about') aboutDialog();
      else if (type === 'marks') { marksEnabled = !marksEnabled; game.set_question_marks(marksEnabled); closeMenu(); render(); }
      return;
    }
    const mode = e.target.closest('[data-touch]');
    if (mode) {
      touchMode = mode.dataset.touch;
      app.querySelectorAll('[data-touch]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.touch === touchMode)));
      return;
    }
    const tile = e.target.closest('.ms-cell');
    if (tile && board.contains(tile) && modalBackdrop.hidden && Date.now() >= suppressClicksUntil) {
      const idx = Number(tile.dataset.index);
      if (state.cells[idx] >= 3 && state.cells[idx] <= 11) takeAction('chord', idx);
      else takeAction(touchMode === 'flag' ? 'mark' : 'reveal', idx);
    } else if (!tile && !menu && !action && menuOpen && !e.target.closest('.ms-popup')) closeMenu();
  }
  app.addEventListener('click', clickOnApp);
  app.addEventListener('contextmenu', e => {
    const tile = e.target.closest('.ms-cell');
    if (tile) {
      e.preventDefault();
      if (Date.now() >= suppressClicksUntil && modalBackdrop.hidden) takeAction('mark', Number(tile.dataset.index));
    }
  });
  app.addEventListener('auxclick', e => {
    const tile = e.target.closest('.ms-cell');
    if (tile && e.button === 1) { e.preventDefault(); takeAction('chord', Number(tile.dataset.index)); }
  });
  app.addEventListener('pointerdown', e => {
    const tile = e.target.closest('.ms-cell');
    if (!tile || !modalBackdrop.hidden) return;
    pressStart = {x:e.clientX, y:e.clientY};
    if (e.button === 0) { pointerHeld = true; if (state?.status < 2) paintFace('scared'); }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        suppressClicksUntil = Date.now() + 800;
        pointerHeld = false;
        takeAction('mark', Number(tile.dataset.index));
        if (navigator.vibrate) navigator.vibrate(20);
      }, 500);
    }
  });
  app.addEventListener('pointermove', e => {
    if (pressStart && (Math.abs(e.clientX - pressStart.x) > 12 || Math.abs(e.clientY - pressStart.y) > 12)) {
      clearTimeout(longPressTimer); pressStart = null;
    }
  });
  function clearPress() {
    clearTimeout(longPressTimer);
    longPressTimer = null; pointerHeld = false; pressStart = null;
    if (state) paintFace(state.status === 3 ? 'lost' : state.status === 2 ? 'won' : 'happy');
  }
  app.addEventListener('pointerup', clearPress);
  app.addEventListener('pointercancel', clearPress);
  app.addEventListener('pointerleave', clearPress);
  app.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!modalBackdrop.hidden) closeDialog(); else closeMenu(); return; }
    if (e.key === 'F2' && modalBackdrop.hidden) { e.preventDefault(); startNew(); }
    if (e.key.toLowerCase() === 'f' && modalBackdrop.hidden && document.activeElement?.classList.contains('ms-cell')) {
      e.preventDefault(); takeAction('mark', Number(document.activeElement.dataset.index));
    }
    if (e.key.startsWith('Arrow') && modalBackdrop.hidden && document.activeElement?.classList.contains('ms-cell')) {
      e.preventDefault();
      const current = Number(document.activeElement.dataset.index);
      const offsets = {ArrowUp: -state.width, ArrowDown: state.width, ArrowLeft: -1, ArrowRight: 1};
      const delta = offsets[e.key];
      if (delta === undefined) return;
      const target = Math.max(0, Math.min(state.cells.length - 1, current + delta));
      if ((delta === -1 && current % state.width === 0) || (delta === 1 && current % state.width === state.width - 1)) return;
      const targetTile = board.children[target];
      document.activeElement.tabIndex = -1;
      targetTile.tabIndex = 0;
      targetTile.focus();
    }
  });
  const outsideClick = e => { if (menuOpen && !app.contains(e.target)) closeMenu(); };
  document.addEventListener('pointerdown', outsideClick);
  const tickClock = () => {
    if (destroyed || !game || !state || state.status !== 1 || !startedAt) return;
    const target = Math.min(999, Math.floor((Date.now() - startedAt) / 1000));
    let updated = false;
    for (let t = state.seconds; t < target; t++) { game.tick(); updated = true; }
    if (updated) render();
  };
  clock = setInterval(tickClock, 250);
  startNew();
  const api = {
    backend,
    newGame: (level = 'beginner') => {
      if (level === 'custom') startNew(config, 'custom');
      else startNew(PRESETS[level] || PRESETS.beginner, level in PRESETS ? level : 'beginner');
    },
    getState: () => ({...getState(), difficulty, backend}),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(longPressTimer);
      clearInterval(clock);
      document.removeEventListener('pointerdown', outsideClick);
      game?.free?.();
      if (container.contains(app)) app.remove();
    }
  };
  options.onReady?.(api);
  return api;
}
