# Latch 98 Round 4 — Thread 5: Sprite Studio, Animation and Flipnote Groundwork

**Independent goal:** Make Sprite Studio a dependable pixel-art/animation tool on touch, mouse and stylus, while investigating genuine Nintendo Flipnote interoperability without misrepresenting formats or licensing.

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`. Read shared rules first.

## Current source

- Editor: `apps/sprite-studio/index.template.html`, `app.js`, `model.js`, `png.js`, `sheet.js`, `style.css`, generated `index.html` and `build.py`.
- Existing work: correctly aligned zoom/checkerboard grid, selection/editing and undo/redo, frame/layer workflows, sprite sheet import/export, offline embedding.
- `apps/sprite-studio/FLIPNOTE_REVIEW.md` explicitly states **native `.ppm` and `.kwz` import/export are not currently implemented**. Do not claim otherwise.
- The optional user-supplied `Flipnote-Toolkit-JS-main.zip` may be attached separately. Its public-domain dedication does not automatically grant redistribution permission for Nintendo keys, assets or samples.

## Required work

1. Find and fix practical drawing/animation regressions: stylus strokes over cell edges, pointer capture when leaving canvas, multi-touch pan/pinch not drawing accidentally, frame/layer copy/merge, selection boundaries, history and rapid undo/redo.
2. Preserve the **grid and checkerboard zoom alignment** exactly, including scroll offsets, device pixel ratio, zoom levels, mobile rotation and canvas resize. Expand automated tests rather than changing grid origin casually.
3. Improve animation ergonomics with real onion-skin/frame preview and truthful playback FPS control where actual footage/frame switching follows the chosen rate. Validate selection/copy between frames and sprite sheet round-trip.
4. Investigate Flipnote `.ppm`/`.kwz` support only using actual library source plus real, legally usable fixtures. Decode correct frame count, timings, palettes and layer compositing; note that Nintendo Flipnote `.ppm` is **not a regular Netpbm PPM**. Do not bundle signing keys or protected Nintendo assets. If no genuine fixtures are available, prioritize robust generic animation editing and describe Flipnote work as **experimental/unimplemented**.
5. Export PNG/sprite sheet/project reliably; don't substitute renamed PNG files for Flipnote containers or silently lose audio/layer metadata without warning. Maintain old `.lss.json` projects and offline embedded editor compatibility. Keep the existing Win98 presentation.
6. The editor owns its complete code and build script; **do not edit the Latch shell, filesystem, Norn or Bloodline**. If requesting a new shell API, specify its exact contract to integrator.

## Required tests

- Draw repeated pixels at 3 or more zoom levels, pan and 2+ DPRs, compare color output to expected coordinates; touch/stylus vs mouse paths.
- Three or more frames, undo/redo across frame switches, layers, copy/paste, onion skin and animate/export/reimport; verify expected dimensions/colors/fps where preserved.
- Previous project fixtures still load and save; corrupt JSON/PNG reject with clear feedback.
- Optional actual `.ppm`/`.kwz` fixture decode if available; assert metadata/color/frame fidelity and publish limitations; **don't mark compatibility as passed without those fixtures**.

## Ownership

Only `apps/sprite-studio/**`, `tests/round4/sprite/**`. Any generated `apps/sprite-studio/index.html` must reflect the source-template changes and be included in the patch. Do not touch `web/desktop.js`, build tools elsewhere, other apps or frozen Norn.

## Deliverables

`Latch98-R4-Thread-5-Changes.zip`, `RESULTS.md` with what actually works and what remains unsupported, fixtures/tests inside owned paths, licensing attribution for any allowed third-party source. Validate with `--thread sprite`.
