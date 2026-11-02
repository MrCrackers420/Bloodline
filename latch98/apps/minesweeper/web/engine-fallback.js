/**
 * Zero-build preview adapter. This mirrors src/lib.rs so index.html stays
 * immediately playable before the Rust WASM is built. Once pkg/ exists,
 * app.js automatically selects the authoritative Rust implementation.
 */
export class Minefield {
  constructor(width, height, mines, seed) {
    this.width = Math.max(2, Math.min(100, width | 0));
    this.height = Math.max(2, Math.min(100, height | 0));
    this.mines = Math.max(1, Math.min(this.width * this.height - 1, mines | 0));
    this.marksEnabled = true;
    this.reset(seed);
  }
  reset(seed) {
    this.seed = (seed >>> 0) || 0x9e3779b9;
    this.cells = Array.from({length: this.width * this.height}, () => ({mine: false, adj: 0, revealed: false, exploded: false, mark: 0}));
    this.status = 0;
    this.flags = 0;
    this.opened = 0;
    this.seconds = 0;
  }
  set_question_marks(value) {
    this.marksEnabled = !!value;
    if (!this.marksEnabled) this.cells.forEach(c => { if (c.mark === 2) c.mark = 0; });
  }
  rnd() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed;
  }
  neighbors(index) {
    const x = index % this.width, y = Math.floor(index / this.width), found = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      let xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < this.width && yy < this.height) found.push(yy * this.width + xx);
    }
    return found;
  }
  placeMines(first) {
    let forbidden = new Set([first, ...this.neighbors(first)]);
    if (this.cells.length - forbidden.size < this.mines) forbidden = new Set([first]);
    const options = this.cells.map((_, i) => i).filter(i => !forbidden.has(i));
    for (let i = 0; i < this.mines; i++) {
      const at = i + this.rnd() % (options.length - i);
      [options[i], options[at]] = [options[at], options[i]];
      this.cells[options[i]].mine = true;
    }
    this.cells.forEach((cell, i) => { if (!cell.mine) cell.adj = this.neighbors(i).filter(j => this.cells[j].mine).length; });
  }
  openFrom(start) {
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head], cell = this.cells[index];
      if (cell.revealed || cell.mark === 1) continue;
      if (cell.mine) {
        cell.exploded = true;
        cell.revealed = true;
        this.status = 3;
        return;
      }
      cell.mark = 0;
      cell.revealed = true;
      this.opened++;
      if (!cell.adj) this.neighbors(index).forEach(j => {
        const n = this.cells[j];
        if (!n.revealed && n.mark !== 1 && !n.mine) queue.push(j);
      });
    }
  }
  checkWin() {
    if (this.status !== 1 || this.opened !== this.cells.length - this.mines) return;
    this.status = 2;
    this.cells.forEach(cell => { if (cell.mine && cell.mark !== 1) { cell.mark = 1; this.flags++; } });
  }
  reveal(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || this.status > 1) return;
    const index = y * this.width + x, cell = this.cells[index];
    if (cell.revealed || cell.mark === 1) return;
    if (this.status === 0) { this.placeMines(index); this.status = 1; }
    this.openFrom(index);
    this.checkWin();
  }
  mark(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || this.status > 1) return;
    const cell = this.cells[y * this.width + x];
    if (cell.revealed) return;
    const previous = cell.mark;
    cell.mark = previous === 0 ? 1 : previous === 1 && this.marksEnabled ? 2 : 0;
    if (previous === 1) this.flags--;
    if (cell.mark === 1) this.flags++;
  }
  chord(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || this.status !== 1) return;
    const index = y * this.width + x, cell = this.cells[index];
    if (!cell.revealed || !cell.adj || cell.mine) return;
    const nearby = this.neighbors(index);
    if (nearby.filter(i => this.cells[i].mark === 1).length !== cell.adj) return;
    for (const i of nearby) {
      if (this.status === 3) break;
      if (!this.cells[i].revealed && this.cells[i].mark !== 1) this.openFrom(i);
    }
    this.checkWin();
  }
  tick() { if (this.status === 1) this.seconds = Math.min(999, this.seconds + 1); }
  snapshot_json() {
    const cells = this.cells.map(cell => cell.exploded ? 13
      : this.status === 3 && cell.mark === 1 && !cell.mine ? 14
      : cell.mark === 1 ? 1
      : cell.revealed && !cell.mine ? 3 + cell.adj
      : this.status === 3 && cell.mine ? 12
      : cell.mark === 2 ? 2 : 0);
    return JSON.stringify({width: this.width, height: this.height, mines: this.mines,
      remaining: this.mines - this.flags, seconds: this.seconds,
      status: this.status, marks_enabled: this.marksEnabled, cells});
  }
  free() { /* Rust WASM compatibility */ }
}
