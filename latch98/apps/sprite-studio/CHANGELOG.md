# Thread 5 — Sprite Studio handoff

## Added

- New offline `apps/sprite-studio/index.html` application, built from self-contained local CSS/JS components.
- Genuine RGBA pixel editor with brush, eraser, flood fill, eyedropper, line, rectangles and transparent color; nearest-neighbor zoom, pan, grid and touch/pen gesture handling.
- 24 editable/persistent palette swatches, FG/BG hex alpha editing and swap, with full undo/redo transaction history.
- Independent per-layer/per-frame RGBA cels, visibility, opacity and layer order, frame duplication/deletion/reorder and per-frame timing.
- Real animation preview (loop/no-loop), automatically suspended when hidden, onion skin without altering saved pixels.
- PNG import and byte-exact PNG and sprite-sheet export with JSON frame manifest; versioned native editable `.lss.json` project export/import with validation.
- Optional LatchFS integration for virtual C: project save/open with limits, overwrite confirmation and visible error handling.
- Deterministic model/PNG unit tests and Chromium desktop/phone/iframe integration tests.

## Ownership

Only `apps/sprite-studio/**` is added. Integrator must register `spritestudio` independently. Thread 3 must not modify this new directory. No other thread-owned source was changed.

## Test results (2026-11-01)

- `node tests/model.test.cjs`: **11 passed**.
- `node tests/png.test.cjs`: **passed** (exact RGBA alpha round-trip, checksum validation).
- `python tests/browser.test.py`: **passed** (desktop, mobile, drawing, undo/redo, animation, native project, PNG, sprite sheet, touchscreen/two-finger, LatchFS sandboxed iframe save/open and failure).

## Integrator update — checkerboard/grid synchronization
- Transparency checkerboard now uses one logical pixel per square at every zoom.
- Grid overlay and checkerboard read the exact same `--lss-cell-size` CSS variable; panning and resizing do not desynchronize them.
- Integrated into Latch Start > Programs > Accessories, with the same standalone editor HTML.
- Added browser geometry regression covering zoom, pan, grid toggle, resize and CSS cell alignment.
