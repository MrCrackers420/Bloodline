# Latch 98 Round 3 — Thread 5: Sprite Studio, animation and Flipnote compatibility

**Owner ID:** `sprite`  
**Owned files:** `apps/sprite-studio/**`  
**Start from:** `Latch98-Round3-Shared-Base.zip` plus common rules. Also inspect the provided `Flipnote-Toolkit-JS-main.zip` where appropriate.

## Assignment

Make Sprite Studio a genuinely useful standalone pixel editor/animator, preserving the recently corrected canvas/pixel-grid alignment on all displays.

1. Test **grid/checkerboard alignment** with noninteger zoom factors, touch gestures, pan origin, high-DPI screens, canvas resizing and scrolling. Grid, drawing cells and transparency checkerboard must be synchronized and anchored to the same pixel coordinates; no decorative grid that diverges from the canvas.
2. Improve editing workflow: precise selection and transforms, movable layers, frame timing, onion skin and undo/redo across frames. Prioritize regressions and correctness over feature count.
3. Implement robust import/export of project format, transparent PNG and sprite sheets. Confirm saved/reloaded animation retains frame order, palettes, transparency and timing.
4. Evaluate the user-supplied **Flipnote Toolkit JS** for real `.ppm` and `.kwz` import/export. Start with a read-only, standards-correct importer if full roundtrip is not feasible. Do not simply rename a PNG to `.ppm` or `.kwz`, and do not claim unsupported formats work. Include fixture-based validation and explain color/audio/format losses.
5. Review third-party licenses carefully. The toolkit's Unlicense dedication does **not** automatically cover any Nintendo signing keys that may be distributed with it. Never bundle keys, proprietary samples or copyrighted assets. Keep the released editor usable offline even if Flipnote features are disabled.

## Boundaries

- Change only `apps/sprite-studio/**`; no edits to Latch desktop, Postbox, virtual disk, other games, Norn World Lab or build system.
- Keep Sprite Studio independently openable as HTML and via the current Latch launcher. If binary assets or signing-key exceptions conflict with the automatic UTF-8 patch merge, document a separate clearly licensed resource request to the integrator.
- Keep project data backward compatible and test import of prior Sprite Studio projects.

## Acceptance tests

- Automated pixel-coordinate alignment tests at 1x, 2x, 5x, noninteger zoom and high devicePixelRatio; pointer/touch on canvas should paint the intended cell.
- Existing Sprite Studio model, PNG and browser tests pass; add selection/frame tests and at least one real fixture for each newly claimed animation format.
- Standalone editor loads with no network and exported assets import back successfully.

**Deliver:** `Latch98-R3-Thread-5-Changes.zip`, changed owned files only, with tests and changelog. Do not replace the full Latch 98 standalone file.
