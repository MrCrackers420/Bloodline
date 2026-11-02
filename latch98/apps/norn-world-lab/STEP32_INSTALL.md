# Install the Norn Lab Step 32 app in Latch 98

This package contains only the Norn application. It does not rebuild or replace the Latch desktop.

## Modular Latch site

Replace `latch98/apps/norn-world-lab/index.html` with this package's `index.html` (or rename `Norn_World_Lab_Step32.html` to `index.html`). Keep the desktop and `latch98/filesystem.js` unchanged.

The existing Norn launcher loads `apps/norn-world-lab/index.html` in an iframe. The app discovers the parent's `window.LatchFS`, awaits `ready`, and uses its `list`, `get`, `read`, `write`, `writeImage`, `mkdir`, `canonical`, `parent`, `display`, `export`, `error`, and `sync` APIs. Explorer updates use the host's normal `latchfschange` event.

## Single-file desktop

Use the desktop's existing Norn HTML import/replacement control to select `index.html`. Its established sandbox (`allow-scripts allow-same-origin allow-forms allow-pointer-lock`) supports sharing the parent's disk. No extra host script is required. Device downloads are created in the parent document so the child's download restriction does not silently block them.

## Quick verification

1. Launch Norn Lab from Latch 98.
2. Open Hatchery → Save starter tray.
3. The dialog title must say **Save As — Latch 98**.
4. Save, then open My Documents → Norn World Lab → Eggs in Explorer.
5. Restart the app and use Load starter tray to open the file.

If the dialog says **Norn disk**, the app is running standalone or cannot access its parent (for example, a cross-origin iframe). That disk is deliberately separate. Serve the app from the desktop's origin to share its files.

The new Norn Files toolbar button opens saved text reports and clock settings. Other formats load in their originating applets.
