# Latch 98 — MySpace in Latch Browser (desktop-only v1.20)

**Repository:** `MrCrackers420/Bloodline`
**Target folder:** `latch98/`
**Prerequisite:** The preceding v1.19 MySpace live-directory change, or a reviewed merge of the replacement `web/latchnet.js` / `web/desktop.js` into the existing desktop branch.

## What changed

- `web/latchnet.js` — Directory, favorites, address bar, and typed MySpace profile URLs now navigate to a genuine web-content pane **within the Latch Browser window**. The site uses a validated HTTPS URL, cross-origin iframe, and restrictive sandbox, never an automatic external tab.
- `web/latchnet.css` — Responsive, video-sized live-site pane, small in-window controls, and embedded-site help strip.
- `web/desktop.js` — Window title reflects MySpace while browsing it; preserves the existing movable/minimizable Latch window and unrelated applications.
- `tools/test-myspace-in-window.py`, `tools/test-myspace-desktop-window.py` — Browser regressions.
- `tools/test-myspace-live.py` — Compatibility alias to updated test; removes outdated assertions that MySpace must open externally.

## How Claude should merge

1. Examine `latch98/web/{latchnet.js,latchnet.css,desktop.js}` for concurrent changes before replacement. The supplied files originate from the v1.19 desktop source and should be merged, not blindly overwrite newer modifications.
2. Apply the browser UI and tests. **Do not edit Norn World Lab, Bloodline, LatchAmp, LatchOS disk format, or any Android/APK source.**
3. Run `python tools/test-myspace-in-window.py`, `python tools/test-myspace-desktop-window.py`, `python tools/test-myspace-live.py`, then `python tools/release_check.py` from `latch98/`.
4. Check Start > Internet > MySpace and the LatchNet directory, favorites, typed `myspace.com/artist/...`, Back/Forward, Retry, window minimize/maximize, and the absence of automatic external tabs.
5. Treat a blocked or blank embedded page as a real upstream browser/security limitation, **not** as proof MySpace content loaded. Test live MySpace in a normal PC with an unrestricted network before claiming real playback or login support.

## Native-browser restriction

The current Rust executable is an HTTP server that opens the desktop HTML in the user's browser. This update makes the live page open in an HTML iframe **inside the Latch window**. It does **not** bypass a remote site's `Content-Security-Policy: frame-ancestors`, `X-Frame-Options`, or third-party cookie restrictions. Browser-side scripts cannot turn this into a top-level native browsing surface. `MYSPACE_NATIVE_WEBVIEW_PLAN.md` sketches the Windows-only native host needed if live MySpace prohibits iframe embedding.

## Scope

This is a **desktop-only** patch. No Android project, APK, Gradle, NDK, or APK compiler files are included. LatchAmp remains optional. No changes are pushed to GitHub by this package.
