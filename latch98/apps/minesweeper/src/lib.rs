//! Latch 98 Minesweeper: all authoritative game rules are implemented in Rust.
//! The HTML/JS files provide the window contents, input and presentation only.
use std::collections::VecDeque;
use std::fmt::Write as _;
use wasm_bindgen::prelude::*;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Phase { Ready, Playing, Won, Lost }

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Mark { None, Flag, Question }

#[derive(Clone, Copy)]
struct Cell {
    mine: bool,
    adjacent: u8,
    revealed: bool,
    exploded: bool,
    mark: Mark,
}
impl Default for Cell {
    fn default() -> Self {
        Self { mine: false, adjacent: 0, revealed: false, exploded: false, mark: Mark::None }
    }
}

#[wasm_bindgen]
pub struct Minefield {
    width: usize,
    height: usize,
    mines: usize,
    cells: Vec<Cell>,
    phase: Phase,
    flags: usize,
    opened: usize,
    seconds: u32,
    seed: u32,
    marks_enabled: bool,
}

#[wasm_bindgen]
impl Minefield {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, mines: u32, seed: u32) -> Self {
        // A usable field always has at least one non-mine tile.
        let w = width.clamp(2, 100) as usize;
        let h = height.clamp(2, 100) as usize;
        let count = (mines as usize).clamp(1, w * h - 1);
        Self {
            width: w, height: h, mines: count,
            cells: vec![Cell::default(); w * h],
            phase: Phase::Ready, flags: 0, opened: 0, seconds: 0,
            seed: if seed == 0 { 0x9e37_79b9 } else { seed },
            marks_enabled: true,
        }
    }

    pub fn reset(&mut self, seed: u32) {
        self.cells.fill(Cell::default());
        self.phase = Phase::Ready;
        self.flags = 0;
        self.opened = 0;
        self.seconds = 0;
        self.seed = if seed == 0 { 0x9e37_79b9 } else { seed };
    }

    pub fn set_question_marks(&mut self, enabled: bool) {
        self.marks_enabled = enabled;
        if !enabled {
            for cell in &mut self.cells {
                if cell.mark == Mark::Question { cell.mark = Mark::None; }
            }
        }
    }

    pub fn reveal(&mut self, x: u32, y: u32) {
        if !self.in_bounds(x, y) || matches!(self.phase, Phase::Won | Phase::Lost) { return; }
        let idx = self.index(x as usize, y as usize);
        if self.cells[idx].mark == Mark::Flag || self.cells[idx].revealed { return; }
        if self.phase == Phase::Ready {
            self.place_mines(idx);
            self.phase = Phase::Playing;
        }
        self.open_from(idx);
        self.check_win();
    }

    pub fn mark(&mut self, x: u32, y: u32) {
        if !self.in_bounds(x, y) || matches!(self.phase, Phase::Won | Phase::Lost) { return; }
        let idx = self.index(x as usize, y as usize);
        if self.cells[idx].revealed { return; }
        let old = self.cells[idx].mark;
        let next = match old {
            Mark::None => Mark::Flag,
            Mark::Flag if self.marks_enabled => Mark::Question,
            Mark::Flag | Mark::Question => Mark::None,
        };
        if old == Mark::Flag { self.flags -= 1; }
        if next == Mark::Flag { self.flags += 1; }
        self.cells[idx].mark = next;
    }

    /// Uncover surrounding covered cells when enough adjacent tiles are flagged.
    /// An incorrect flag can cause a loss, as in the original game.
    pub fn chord(&mut self, x: u32, y: u32) {
        if !self.in_bounds(x, y) || self.phase != Phase::Playing { return; }
        let idx = self.index(x as usize, y as usize);
        let cell = self.cells[idx];
        if !cell.revealed || cell.adjacent == 0 || cell.mine { return; }
        let neighbours = self.neighbours(idx);
        let marked = neighbours.iter().filter(|&&i| self.cells[i].mark == Mark::Flag).count();
        if marked != cell.adjacent as usize { return; }
        for neighbour in neighbours {
            if self.phase == Phase::Lost { break; }
            if !self.cells[neighbour].revealed && self.cells[neighbour].mark != Mark::Flag {
                self.open_from(neighbour);
            }
        }
        self.check_win();
    }

    pub fn tick(&mut self) {
        if self.phase == Phase::Playing { self.seconds = self.seconds.saturating_add(1).min(999); }
    }

    /// Compact snapshot: 0 covered, 1 flag, 2 question, 3 empty revealed,
    /// 4..11 numbers 1..8, 12 mine, 13 detonated mine, 14 incorrect flag.
    /// status: 0 ready, 1 playing, 2 won, 3 lost.
    pub fn snapshot_json(&self) -> String {
        let state = match self.phase { Phase::Ready => 0, Phase::Playing => 1, Phase::Won => 2, Phase::Lost => 3 };
        let mut s = String::with_capacity(80 + self.cells.len() * 3);
        let remaining = self.mines as i32 - self.flags as i32;
        let _ = write!(s, "{{\"width\":{},\"height\":{},\"mines\":{},\"remaining\":{},\"seconds\":{},\"status\":{},\"marks_enabled\":{},\"cells\":[",
            self.width, self.height, self.mines, remaining, self.seconds, state, self.marks_enabled);
        for (i, cell) in self.cells.iter().enumerate() {
            if i != 0 { s.push(','); }
            let kind = if cell.exploded { 13 }
                else if self.phase == Phase::Lost && cell.mark == Mark::Flag && !cell.mine { 14 }
                else if cell.mark == Mark::Flag { 1 }
                else if cell.revealed && !cell.mine { 3 + cell.adjacent }
                else if self.phase == Phase::Lost && cell.mine { 12 }
                else if cell.mark == Mark::Question { 2 }
                else { 0 };
            let _ = write!(s, "{}", kind);
        }
        s.push_str("]}");
        s
    }
}

impl Minefield {
    fn index(&self, x: usize, y: usize) -> usize { y * self.width + x }
    fn in_bounds(&self, x: u32, y: u32) -> bool { (x as usize) < self.width && (y as usize) < self.height }

    fn neighbours(&self, idx: usize) -> Vec<usize> {
        let x = idx % self.width;
        let y = idx / self.width;
        let mut neighbours = Vec::with_capacity(8);
        for dy in -1isize..=1 {
            for dx in -1isize..=1 {
                if dx == 0 && dy == 0 { continue; }
                let nx = x as isize + dx;
                let ny = y as isize + dy;
                if nx >= 0 && ny >= 0 && (nx as usize) < self.width && (ny as usize) < self.height {
                    neighbours.push(self.index(nx as usize, ny as usize));
                }
            }
        }
        neighbours
    }

    fn random(&mut self) -> u32 {
        // Deterministic, fast PRNG; no OS randomness required by WASM.
        self.seed ^= self.seed << 13;
        self.seed ^= self.seed >> 17;
        self.seed ^= self.seed << 5;
        self.seed
    }

    fn place_mines(&mut self, first: usize) {
        // Keep the entire 3x3 opening safe wherever there is room; otherwise
        // guarantee at least that the clicked tile is safe.
        let mut forbidden = vec![false; self.cells.len()];
        forbidden[first] = true;
        for n in self.neighbours(first) { forbidden[n] = true; }
        if self.cells.len() - forbidden.iter().filter(|&&f| f).count() < self.mines {
            forbidden.fill(false);
            forbidden[first] = true;
        }
        let mut candidates: Vec<usize> = (0..self.cells.len()).filter(|&i| !forbidden[i]).collect();
        // Partial Fisher-Yates shuffle: select precisely `mines` unique indices.
        for i in 0..self.mines {
            let swap_with = i + (self.random() as usize % (candidates.len() - i));
            candidates.swap(i, swap_with);
            self.cells[candidates[i]].mine = true;
        }
        for idx in 0..self.cells.len() {
            if self.cells[idx].mine { continue; }
            self.cells[idx].adjacent = self.neighbours(idx).iter().filter(|&&n| self.cells[n].mine).count() as u8;
        }
    }

    fn open_from(&mut self, start: usize) {
        let mut queue = VecDeque::new();
        queue.push_back(start);
        while let Some(idx) = queue.pop_front() {
            if self.cells[idx].revealed || self.cells[idx].mark == Mark::Flag { continue; }
            if self.cells[idx].mine {
                self.cells[idx].revealed = true;
                self.cells[idx].exploded = true;
                self.phase = Phase::Lost;
                return;
            }
            self.cells[idx].mark = Mark::None;
            self.cells[idx].revealed = true;
            self.opened += 1;
            if self.cells[idx].adjacent == 0 {
                for n in self.neighbours(idx) {
                    if !self.cells[n].revealed && self.cells[n].mark != Mark::Flag && !self.cells[n].mine {
                        queue.push_back(n);
                    }
                }
            }
        }
    }

    fn check_win(&mut self) {
        if self.phase != Phase::Playing || self.opened != self.cells.len() - self.mines { return; }
        self.phase = Phase::Won;
        for cell in &mut self.cells {
            if cell.mine && cell.mark != Mark::Flag {
                cell.mark = Mark::Flag;
                self.flags += 1;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn ready(w: u32, h: u32, m: u32) -> Minefield { Minefield::new(w, h, m, 12345) }

    #[test]
    fn first_click_is_safe_and_places_exactly_right_number() {
        let mut g = ready(9, 9, 10);
        g.reveal(4, 4);
        assert!(!g.cells[g.index(4, 4)].mine);
        assert_eq!(g.cells.iter().filter(|c| c.mine).count(), 10);
        assert_eq!(g.phase, Phase::Playing);
        assert_eq!(g.seconds, 0);
    }
    #[test]
    fn first_click_protects_neighbours_when_possible() {
        let mut g = ready(16, 16, 40);
        let center = g.index(8, 8);
        g.reveal(8, 8);
        assert!(!g.cells[center].mine);
        assert!(g.neighbours(center).iter().all(|&i| !g.cells[i].mine));
    }
    #[test]
    fn dense_field_still_protects_opening_cell() {
        let mut g = ready(2, 2, 3);
        g.reveal(0, 0);
        assert!(!g.cells[0].mine);
        assert_eq!(g.phase, Phase::Won);
    }
    #[test]
    fn flags_and_questions_cycle_correctly() {
        let mut g = ready(9, 9, 10);
        g.mark(1, 1); assert_eq!(g.flags, 1);
        g.mark(1, 1); assert_eq!(g.cells[10].mark, Mark::Question); assert_eq!(g.flags, 0);
        g.mark(1, 1); assert_eq!(g.cells[10].mark, Mark::None);
        g.set_question_marks(false);
        g.mark(1, 1); g.mark(1, 1);
        assert_eq!(g.cells[10].mark, Mark::None);
    }
    #[test]
    fn timer_only_moves_during_play() {
        let mut g = ready(9, 9, 10);
        g.tick(); assert_eq!(g.seconds, 0);
        g.reveal(0, 0);
        g.tick(); assert_eq!(g.seconds, 1);
        for _ in 0..1200 { g.tick(); }
        assert_eq!(g.seconds, 999);
    }
    #[test]
    fn clicking_a_mine_causes_loss() {
        let mut g = ready(9, 9, 10);
        g.reveal(0, 0);
        let mine = g.cells.iter().position(|c| c.mine).unwrap();
        g.reveal((mine % 9) as u32, (mine / 9) as u32);
        assert_eq!(g.phase, Phase::Lost);
        assert!(g.cells[mine].exploded);
        let old = g.opened;
        g.reveal(8, 8);
        assert_eq!(g.opened, old);
    }
    #[test]
    fn opening_every_safe_cell_wins() {
        let mut g = ready(9, 9, 10);
        g.reveal(0, 0);
        for idx in 0..81 {
            if !g.cells[idx].mine { g.reveal((idx % 9) as u32, (idx / 9) as u32); }
        }
        assert_eq!(g.phase, Phase::Won);
        assert_eq!(g.flags, 10);
        assert_eq!(g.opened, 71);
    }
    #[test]
    fn correct_chord_opens_surrounding_cells() {
        let mut g = ready(9, 9, 10);
        g.reveal(0, 0);
        let center = (0..81).find(|&i| {
            g.cells[i].revealed && g.cells[i].adjacent > 0 &&
                g.neighbours(i).iter().any(|&n| !g.cells[n].mine && !g.cells[n].revealed)
        }).unwrap();
        let n = g.neighbours(center);
        for &i in &n { if g.cells[i].mine { g.mark((i % 9) as u32, (i / 9) as u32); } }
        let old = g.opened;
        g.chord((center % 9) as u32, (center / 9) as u32);
        assert!(g.opened > old);
    }
    #[test]
    fn reset_preserves_settings_and_clears_board() {
        let mut g = ready(9, 9, 10);
        g.set_question_marks(false);
        g.reveal(0, 0);
        g.reset(555);
        assert_eq!(g.phase, Phase::Ready);
        assert_eq!(g.opened, 0);
        assert_eq!(g.seconds, 0);
        assert!(!g.marks_enabled);
        assert!(g.cells.iter().all(|c| !c.mine && !c.revealed));
    }
    #[test]
    fn same_seed_same_opening_mines() {
        let mut a = ready(16, 16, 40);
        let mut b = ready(16, 16, 40);
        a.reveal(3, 4); b.reveal(3, 4);
        for i in 0..256 { assert_eq!(a.cells[i].mine, b.cells[i].mine); }
    }
}
