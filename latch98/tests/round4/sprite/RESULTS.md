# Latch 98 Round 4 — Sprite Studio test results

Baseline: `LATCH-R4-2026-11-01-R3-NORN-MERGED`. Scope: `apps/sprite-studio/**` and `tests/round4/sprite/**` only. Environment: Node v22.16.0, Python 3.13, Playwright Chromium `/usr/bin/chromium`, no network resources loaded by the self-contained editor.

## Completed checks

| Command (project root) | Outcome | Evidence |
| --- | --- | --- |
| `node apps/sprite-studio/tests/model.test.cjs` | PASS (15 tests) | Existing document model, frames, layers, history and older project fixture |
| `node apps/sprite-studio/tests/png.test.cjs` | PASS | Real RGBA PNG encoder/decoder and checksum |
| `node apps/sprite-studio/tests/sheet.test.cjs` | PASS | Actual PNG+JSON sheet fixture, frame order and timings |
| `python apps/sprite-studio/tests/grid_alignment.test.py` | PASS | Checkerboard/grid/canvas across zooms and 390/1250px viewports |
| `python apps/sprite-studio/tests/browser.test.py` | PASS | Offline browser editing/animation/PNG/sheet/LatchFS stub/mobile touch |
| `python apps/sprite-studio/tests/editing_browser.test.py` | PASS | Selection, frame/layer edits, undo, exported file reimport and DPR 1/1.25/2.5 |
| `node tests/round4/sprite/model_round4.test.cjs` | PASS (6 grouped checks) | Off-canvas clipped strokes, frame clipboard, alpha-safe merge, timing boundaries, many undo/redo cycles, corrupt PNG/JSON and legacy project |
| `python tests/round4/sprite/browser_round4.test.py` | PASS (5 grouped checks) | Synthetic touch/pen and mouse at 1×/1.5×/2.5×/6×/12× on DPR 1 and 2.5; viewport rotation, pan alignment, native mouse pointer capture outside canvas, unexpected capture loss and cancellation, 3-frame + layered frame copy/merge/undo, virtual-clock 10 FPS vs original durations, errors for corrupt imports |
| `python apps/sprite-studio/build.py` | PASS | Embedded `index.html` regenerated from local style, model, PNG, sheet and app code |
| `python tools/parallel_merge.py check --thread sprite --zip <patch>` (untouched baseline) | PASS | Only exclusive owned files; no conflicts; see final handoff summary |

The existing editor and all new tests launch with Playwright `page.set_content` using the rebuilt complete HTML, making no network request. An attempted direct `file://` Chromium navigation returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this environment; **direct local-file navigation was not verified**, and must be smoke-tested in a normal browser by the integrator. Automated stylus events were synthesized; real hardware palm rejection, pressure, pen barrel buttons, and device orientation sensors were not physically tested. Resizing the browser simulated mobile rotation.

## Supported output / limitations

- `.lss.json`: native project with RGBA, layers, palette, frame order, durations and editability; previous v1 fixture loads.
- PNG: current frame composite; RGBA data checked, no editable layer metadata.
- Sprite sheet PNG + `.json`: frame rects/order/durations verified through real export/import; flattening loses editable layers and palette metadata. No audio layers exist in the model.
- Playback: native frame-duration mode or preview-only fixed FPS from 1 to 60. Fixed FPS never silently alters saved/exported durations. Onion-skin ghosts do not leak into exported data.
- Nintendo Flipnote `.ppm` and `.kwz`: **NOT IMPLEMENTED, NOT TESTED**. No authentic permitted fixtures or the optional user-referenced toolkit archive were included; no third-party code, Nintendo signing keys or protected samples were added.

Known constraints: merging layers can be refused for non-100% layer opacity/hidden layers or when 8-bit RGBA rounding would change the displayed result; this is deliberate to prevent silent color changes. Clipboard frame paste is refused after canvas dimensions or layer IDs differ. Browser decoded unusual PNGs can round semitransparent channels as before; editable native project/PNG encoder behavior remains unchanged.
