# Latch Sprite Studio — Thread 5 application

An offline, editable, pixel-art and sprite-animation editor for original Latch 98 projects. **All source changes are confined to `apps/sprite-studio/**`.** No shared desktop, app registrations, Norn code, Bloodline code, or root tooling was changed.

## Launch

Open `apps/sprite-studio/index.html` directly in a recent browser, including as a local `file://` HTML document. It contains **all** production CSS and JavaScript inline and makes **no** network requests or dependency loads. For Latch integration, open the same HTML as a resizable ordinary framed desktop application. Do not add another taskbar/title bar inside it.

## Grid and transparency background

The checkerboard is now **aligned to sprite pixels**, rather than using a fixed 20px screen pattern. Each transparency square covers one image pixel at the current zoom, and the grid lines share that same pixel origin. This works when resizing, zooming, panning or drawing on transparent pixels. Turn the Grid checkbox off to hide only grid lines, not the transparent-pixel checkerboard.

## Edit and animate

- **Tools:** Pencil (`B`), eraser (`E`), contiguous bucket (`G`), composite eyedropper (`I`), line (`L`), rectangle (`R`), filled rectangle (`U`), pan (`H`). Click tool buttons on phones. Draw with mouse, pen, or one touch; right-mouse draws background color; middle mouse, Space+drag or Pan tool scrolls the drawing surface. Two touches cancel a pending brush stroke and activate pan/pinch-zoom without painting. Short one-finger drags paint the whole path on lift; a resting finger is ignored while a stylus is drawing. Captured pointers can leave the canvas without losing a completed stroke.
- **Canvas:** New / Canvas Size allows 1–256 px width and height, with common sizes 16, 32 and 64. Canvas Size keeps top-left contents and crops overflow. Zoom +/- and the selector operate on sharp nearest-neighbor pixels (1×, 1.5×, 2×, 2.5×, 3×, 4×, 5× and larger up to 32×). The drawing canvas, transparent checkerboard, grid and selection overlay share one pixel origin at fractional zoom and high-DPI. The Grid and Onion Skin checkboxes affect only display, not stored artwork.
- **Colors:** Foreground and background RGB pickers and 8-digit hex RGBA fields. `#RRGGBB` assumes fully opaque; `#RRGGBBAA` sets alpha. FG alpha slider is 0–255. Click any of 24 palette swatches to select; edit FG then **Set Swatch** to persist the chosen color in this project. Swap switches FG/BG.
- **Selection:** Select (`S`) draws a rectangular pixel-cell selection. Drag inside the outlined region to move pixels in the current frame/layer; the operation is one undoable transaction. **All, Copy, Cut, Paste, Flip ↔/↕, None** operate on exact RGBA cells; internal Copy/Paste works across animation frames. Transparent pixel RGB channels are preserved. `Ctrl+A/C/X/V` are editing shortcuts when not typing in a field. Selected regions do not alter other cels.
- **Layers:** Each frame has its own independent image cel for each named global layer. Add/delete, rename, order above/below, show/hide, and set layer opacity. Rendering uses straight-alpha source-over compositing. Eraser makes pixels transparent. The four **Move cel** arrow buttons shift the active layer by exactly one pixel in the active frame; enable **All frames** to shift that layer consistently through the whole animation. Cropped off-canvas pixels can be recovered with Undo. Selecting the layer row changes the editing target. **Merge Down** combines the selected layer with the one immediately below across *all* frames; to guarantee color fidelity both must be visible at 100% opacity. The merge is rejected without modifying the project if 8-bit alpha rounding would change any rendered pixel. Original layers remain recoverable with Undo after a successful merge.
- **Frames:** Add blank, duplicate, delete, move left/right; change frame duration (20–60,000 ms). **Copy Frame** captures all current layer cels and the duration; **Paste Frame** replaces the selected frame if canvas size and layer IDs still match. Play/Pause uses the individual frame durations unless **Fixed FPS (preview)** is checked. The FPS input (1–60) changes actual playback frame switching, but not project/sprite-sheet timing; uncheck to hear/see the original per-frame rhythm (there are no audio tracks in Sprite Studio). Loop is optional. Playback pauses when the page becomes hidden. Onion Skin shows adjacent frames faintly; never writes them into cels.
- **History:** Undo (`Ctrl+Z`), redo (`Ctrl+Y` / `Ctrl+Shift+Z`). Each stroke, layer/frame operation or setting change is one transaction. Undo snapshots are bounded by a 48 MiB dynamic memory budget (2–40 entries).

## Import, save and export

- **Download Project (`Ctrl+S`):** an editable lossless `.lss.json` containing the dimensions, palette, global layers (name, opacity, visibility), ordered animation frames (duration and independently stored RGBA cels) and native version identifier. Open via **Open… → Editable** or Ctrl+O. Files are validated before replacement; malformed files report errors and don't replace the active project.
- **Import PNG:** **Open… → PNG**. Imports one PNG as a new single-layer/single-frame editable project using its original dimensions. For common noninterlaced PNG types, the built-in CRC-verifying decoder preserves 8-bit RGBA pixel values exactly, even partially transparent RGB. Unusual formats (such as interlaced PNG) fall back to the browser decoder; color components may then round in semitransparent pixels.
- **PNG:** exports an alpha-preserving current-frame composite, never overwriting editable source layers. **Sprite Sheet:** exports a single row/grid PNG (at most 8 columns, row-major frame order) and a `.json` manifest with each frame index, source rectangle and millisecond duration. The PNG encoder writes exact RGBA byte values without browser canvas premultiplication artifacts. **Import Sheet…** requires *both* the PNG and matching JSON manifest produced by Sprite Studio. It validates the file geometry, region indices and timings before replacing the project; it restores the original frame order, per-frame duration and per-pixel RGBA. Sheet imports reconstruct one flattened layer, so original editable layer separation and custom palettes are not recoverable from sheet files. The export status now explicitly warns about flattened layers and points to `.lss.json` for full project fidelity. Use `.lss.json` for full project fidelity.
- **Latch disk:** **Disk Save…** / **Disk Open…** discover `window.parent.LatchFS` (or `window.LatchFS`) safely and await its `ready` Promise. Save only in `C:/MY DOCUMENTS/SPRITE STUDIO/` using `mkdir`, `get`, `list`, `write`, `read`, `sync` and `error` from the public API. User confirms overwrites. Disk text files are limited to 130,000 characters and entire disk to about 2 MiB. Preflight failures tell you to **Download Project** instead. Standalone local HTML works even without LatchFS, using browser downloads and file picker as the reliable storage path. No hidden autosaves are required.

### Native `.lss.json` schema

`format: "latch-sprite-studio"`, `version: 1`, `name`, `width`, `height`, `palette: ["#RRGGBBAA", ...]`, `layers: [{id,name,visible,opacity}]`, `frames: [{duration,cels: [base64RGBAImage, ...]}]`, `nextId`. Pixels are raw row-major unpremultiplied 8-bit RGBA bytes, encoded in base64. Cell indices correspond to the global layer indices. Dimensions are capped at 256×256, 16 layers, 120 frames, and 24 MiB total raw project pixel data.

### Sprite sheet manifest

`format: "latch-sprite-sheet"`, `version: 1`, `name`, `width`, `height`, `columns`, `frames: [{index,x,y,width,height,duration}]`. Index is original animation frame order, zero based; units are pixels and milliseconds.

## Build from component sources

Runtime requires **only** `index.html`. To change the editor, modify `model.js`, `png.js`, `app.js`, `style.css`, or `index.template.html` and rebuild:

```bash
python apps/sprite-studio/build.py
```

This changes only `apps/sprite-studio/index.html`; the build script is internal to the app. No downloads, package managers, external fonts, images or scripts.

## Tests

From `apps/sprite-studio/`:

```bash
node tests/model.test.cjs
node tests/png.test.cjs
node tests/sheet.test.cjs
python tests/grid_alignment.test.py
python tests/browser.test.py
python tests/editing_browser.test.py
# Also from the repository root:
node tests/round4/sprite/model_round4.test.cjs
python tests/round4/sprite/browser_round4.test.py
```

The browser suite needs Python Playwright, Pillow, and Chromium at `/usr/bin/chromium`. It loads the exact single-file HTML with `set_content` instead of HTTP, because the test environment blocks navigation even to `file://` paths. The test creates no server and makes no network requests. It checks desktop and 390-pixel phone layouts, actual drawing/touch, two-finger gesture cancellation, animation progression, PNG/sheet dimensions and alpha bytes, editable project round-trip, and save/open/error behavior through a stub `LatchFS` in a sandboxed iframe.

## Integration request (integrator only)

- **App ID:** `spritestudio`
- **Name:** `Latch Sprite Studio`
- **Entrypoint:** `apps/sprite-studio/index.html`
- **Start menu:** `Programs > Accessories > Sprite Studio` (or Graphics if already present)
- **Desktop shortcut:** optional
- **Default Latch window:** `1024×700`, minimum `480×320`; resizable and vertically scrollable on mobile
- **Single-file standalone package key:** `spritestudio`
- **Filesystem:** optional parent `LatchFS` or same-window `LatchFS`; browser-only file fallback

The integrator must separately edit shell registration, root standalone bundler, and ownership metadata after merging. Do not bundle Norn World Lab or Bloodline as part of this app; preserve their existing installation behavior.

## Known limitations

- Only rectangular selections are supported (no freeform/lasso); horizontal and vertical flips are supported but 90° rotation, indexed palette mode, animation tags and tilemaps are deferred. Moved pixels beyond the canvas edge are cropped (Undo recovers them).
- **Flipnote Studio `.ppm` and `.kwz` are not supported**. The separately referenced `Flipnote-Toolkit-JS-main.zip` and actual validation fixtures were also absent from this Round 4 upload; PNGs are never disguised as Flipnotes. See `FLIPNOTE_REVIEW.md` for detailed compatibility, licensing, and missing-asset considerations.
- The PNG fallback for uncommon formats uses browser canvas and may round some transparent color channels. Native projects and built-in PNG export do not.
- The 2 MiB Latch virtual disk is small; high-resolution/multi-frame `.lss.json` files can exceed its limits. Download Project is always available; LatchFS never owns your only copy.
- This is a 2D editor, not a layered vector graphics or 3D model application.
