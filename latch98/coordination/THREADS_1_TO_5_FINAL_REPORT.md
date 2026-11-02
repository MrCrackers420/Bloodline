# Latch 98 — Five-thread integrated release

## Inputs and merges

- Started from `Latch98-Threads1-4-Merged-Checkpoint.zip` (Norn simulation, SwarmWire/file persistence, desktop, and apps already merged).
- Applied `Thread-5-Sprite-Studio-Changes.zip` with `tools/parallel_merge.py check --thread sprite` and `apply --thread sprite`: **13 new app-owned files**, zero conflicts/overlaps.
- Preserved existing Norn World Lab Step32 first-run Postbox → SwarmWire → ISO → Setup flow, Bloodline fullscreen/windowed launcher and visible Return to Latch 98 control, and all original bundled apps.

## Sprite Studio grid repair

The original transparency checkerboard used an absolute `20px` repeating pattern, while the line grid used the drawing zoom (`2px` through `32px`). At zoom other than 10px per logical pixel, visual background squares did not match sprite pixels.

**Fix:** The checkerboard now renders a square exactly one sprite pixel across, using `background-size: 2 * var(--lss-cell-size)`, and both the checkerboard and line grid use the same `--lss-cell-size`, dynamically set from the editor's zoom. Origins are both `(0, 0)` relative to the exact canvas wrapper. The overlay stays atop the sprite and follows pan/zoom. Grid toggle hides the lines only, not the transparency background. Other editor behavior (layers, native format, PNG, animation) is unchanged.

## Latch integration

- `apps/sprite-studio/index.html` is an independent one-file pixel editor; no network, runtime dependencies or installation needed to open it outside Latch 98.
- Registered as **Start → Programs → Accessories → Latch Sprite Studio**, and in the Run dialog as `spritestudio` or `sprite`.
- Opens in a regular resizable Latch application window. Uses the **same** embedded HTML inside the Latch standalone build and the real `apps/sprite-studio/index.html` file in modular/Pages builds.
- Supports local project, PNG and sprite sheet downloads; its Disk Save/Open buttons use the parent virtual filesystem when hosted in Latch.

## Flipnote Toolkit examination

- The provided `Flipnote-Toolkit-JS-main.zip` is the *flipnote-tools-js* project (v1.0.2 in `package.json`), with reading/writing `.ppm` and `.kwz`, drawing tools, animation export and repair utilities.
- Its `LICENSE` uses **The Unlicense**, but its README explicitly says **Nintendo signing keys included in the package are NOT public-domain**. Optional dependency licenses also remain separate.
- **No toolkit code or signing keys were embedded in this release.** The grid fix does not depend on Flipnote file formats. Future support for `.ppm` / `.kwz` files would require carefully scoped format conversion and tests for Sprite Studio's 256×256 / 120-frame document limits; it should not replace the editor's native `.lss.json` format.

## Validation

Passing:
- `python tools/parallel_merge.py check --thread sprite --zip Thread-5-Sprite-Studio-Changes.zip` before apply.
- `node apps/sprite-studio/tests/model.test.cjs` (11 test groups).
- `node apps/sprite-studio/tests/png.test.cjs`.
- `python apps/sprite-studio/tests/browser.test.py` (desktop, phone touch, drawing, animation, round-trip import/export, LatchFS stub).
- `python apps/sprite-studio/tests/grid_alignment.test.py` (checkerboard screenshot checker parity, exact CSS geometry at zoom 2,3,4,6,8,12,16,24,32, desktop 1250 and phone 390, grid toggle, pan).
- `python tools/release_check.py --output ...` (all original disk, installer, migration, Norn, Bloodline, save, game-bundling, and merge tests, plus Sprite tests).
- `python tools/test-sprite-integration.py` (boot actual standalone Latch; Start → Programs → Accessories; editor loads and draws at 1200px/390px, with no script errors; test-only in-memory localStorage workaround because this environment blocks fake test URLs).
- `LATCH98_TEST_HTML=... python tools/test-games-in-one-html.py` (fullscreen Bloodline, exit/reenter, windowed and side-app windows, zero script errors).
- `python tools/build_pages.py ...` (Pages output includes root and `apps/sprite-studio/index.html`).

## Packaging

- **Latch98-Threads1-5-Final-Standalone.html** — all games in one HTML; Norn installation remains required on first boot.
- **Latch-Sprite-Studio-Grid-Fixed.html** — separate standalone sprite editor.
- **Latch98-Threads1-5-Merged-Source.zip** — complete modular project, source, tests and notes.
- **Latch98-Threads1-5-Pages-Preview.zip** — static hosted output (not deployed).

GitHub was **not pushed** because previous attempts returned integration permission errors. No Rust compilation was performed in this environment.
