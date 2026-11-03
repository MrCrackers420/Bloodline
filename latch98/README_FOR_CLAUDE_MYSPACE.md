# Latch 98 — MySpace.com live-site integration (desktop-only)

This patch is based on the complete Latch 98 **1.18** desktop source (which includes LatchAmp 1.18, Sound Studio corrections, Norn Round 7, and the hybrid media system).

## Merge into `MrCrackers420/Bloodline`

1. Review changes in `latch98/web/latchnet.js` and `latch98/web/desktop.js` against the repository branch. Merge those desktop files carefully if that branch has since changed. Do not overwrite newer unrelated functionality.
2. Keep all fictional `.l98` websites, Postbox→SwarmWire→Norn installation, and all existing game applications unchanged.
3. `myspace.com` is a **real live URL**, not a simulated MySpace service. The LatchNet directory opens it with a normal `https://myspace.com/` link in a new tab; manually entered MySpace addresses and Start-menu shortcuts show a safe outbound handoff inside Latch Browser.
4. On the MySpace handoff page, the user explicitly chooses **Open MySpace.com in browser**. MySpace login stays on its own domain; never fake a login screen or scrape credentials.
5. Apply `tools/test-myspace-live.py` if useful and run relevant project regression checks.
6. This patch intentionally includes **no Android, APK, Gradle, NDK, Cargo compiler updates, or APK builder files**. Do not update the Android port for this small desktop release.
7. Commit to `main` only after review and testing. Nothing has been pushed by ChatGPT.

## Functional scope

- Directory entry for **MySpace.com — Live Website**, visible in the LatchNet index and search.
- Secure external new-tab link with `rel="noopener noreferrer"`.
- Start → Favorites and Start → Programs → Internet entries.
- Latch Browser supports entering `myspace.com`, `www.myspace.com`, and MySpace profile/path URLs, preserving path/search/hash and upgrading HTTP to HTTPS.
- Saved browser Favorites retain MySpace links and reopen the genuine site.
- Does not iframe, proxy, emulate, cache, download, alter or block advertisements from MySpace.

## Tests run

- `python tools/test-myspace-live.py` — PASS
- `python -m unittest discover -s tests/round4/latchnet -p test_browser.py -q` — 9 tests PASS, crawl 38 routes
- `node tools/test-filesystem.cjs` — PASS
- `node tools/test-shortcuts.cjs` — PASS
- `node --check web/latchnet.js` and `node --check web/desktop.js` — PASS
- Standalone HTML rebuilt successfully with `tools/build_standalone.py`; inclusion checks PASS

Actual external sign-in and browsing on MySpace itself were **not tested** on a live user browser.
