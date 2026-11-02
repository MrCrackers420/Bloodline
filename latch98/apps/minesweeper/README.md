# Latch 98 Minesweeper

A standalone **Minesweeper program for the Latch 98 desktop**. It deliberately
**does not** include a desktop, taskbar, Start menu, or Windows-style outer title bar.
Your Latch 98 window manager should supply those things.

## What is included

- `src/lib.rs`: **Rust** game engine exported to browser WebAssembly with `wasm-bindgen`.
- `web/index.html`: standalone program contents (can be hosted in a Latch 98 window).
- `web/app.js`: HTML UI, menu controls, input translation and WebAssembly loading.
- `web/style.css`: classic Windows 98-style Minesweeper appearance.
- `web/engine-fallback.js`: small JS preview implementation for opening and testing the HTML **before** WebAssembly is compiled. Once the Rust build exists, `app.js` automatically uses Rust instead.
- `tools/build.sh` / `tools/build.ps1`: build helpers.

## Run the Rust version

1. Install the [Rust toolchain](https://rustup.rs/) and `wasm-pack` (`cargo install wasm-pack`).
2. From the repository root run:

   ```bash
   wasm-pack build --target web --release --out-dir pkg
   ```

3. Serve the project root over HTTP. For example:

   ```bash
   python -m http.server 8000
   ```

4. Visit `http://localhost:8000/web/` in a browser. The game loads the Rust-generated
   `pkg/latch98_minesweeper.js` + WASM automatically when they exist.

If you skip the build, the HTML is still playable via the JavaScript **preview**
engine; that is **not** the Rust runtime. `wasm-pack` output is not included in this
ZIP because this environment has no Rust toolchain.

## Inject into the existing Latch 98 desktop

**Simplest:** open `web/index.html` in a Latch 98-managed program window or iframe.
The window manager owns the outer title bar, resize/close buttons and Start menu.
Minesweeper doesn't render any of those.

**Direct mounting (no iframe):** from the desktop program loader:

```js
import { mountMinesweeper } from './minesweeper/web/app.js';
const mines = await mountMinesweeper(contentElement);
// Example integration: mines.newGame('expert');
// Window closes: mines.destroy();
```

The desktop's HTML loader must support ES modules. `app.js` injects its scoped
CSS automatically. The mount function returns `{ backend, newGame, getState,
destroy }`. It fires a `latch98:content-resize` DOM event (detail:
`{width, height}` in **tiles**) whenever the field size changes. It doesn't
close the parent window itself: use the Latch 98 window manager's existing close
control and call `destroy()` on teardown.

Move the whole project folder together so `web/` and `pkg/` remain adjacent.

## Controls

- **Left click / tap:** reveal square. **Right click / hold:** flag / question / clear.
- **Click an exposed number:** chord, opening all adjacent covered squares if
  the number of adjacent flags is correct. Middle click works too.
- **Touchscreen:** dedicated Reveal / Flag mode selector under the field.
- **F2:** new game. **F** while keyboard-focused on a cell: mark it. **Arrow keys**:
  move cell focus.
- Game menu: New, Beginner (9×9 / 10), Intermediate (16×16 / 40), Expert
  (30×16 / 99), Custom, question marks, and local best times.
- First reveal is safe; when space allows, the first revealed cell's eight
  neighbors are also safe. Timer starts on the first reveal and stops on a win/loss.

## Rust engine API

```rust
Minefield::new(width, height, mines, seed)
.reset(seed)
.set_question_marks(bool)
.reveal(x, y)
.mark(x, y)
.chord(x, y)
.tick()
.snapshot_json() -> String
```

`status`: `0=ready`, `1=playing`, `2=won`, `3=lost`. Cell codes:
`0=covered`, `1=flag`, `2=question`, `3=empty revealed`, `4..11=number 1..8`,
`12=mine`, `13=detonated mine`, `14=incorrect flag`.

Native Rust unit tests: `cargo test`.

## Notes

- All game rule logic lives in Rust when built and enabled; JS only translates
  user input, paints the board, and schedules timer ticks.
- Works on phones with a suitable browser. On very small screens Expert board
  scrolls horizontally rather than shrinking tiles to an unplayable size.
- No external images, fonts or hosted libraries are needed.
- Best times live locally in the browser's `localStorage`, if available.
- This is an application component. It does not itself inject code into another
  running process: the Latch 98 desktop must load it through its normal app API.

## One-file HTML preview

`latch98-minesweeper-preview.html` can be opened directly, including on a phone,
without a local HTTP server or Rust build. It uses the JavaScript **preview**
rules, not the Rust engine. Use `web/index.html` with the built `pkg/` for the
Rust-powered Latch 98 desktop program.
