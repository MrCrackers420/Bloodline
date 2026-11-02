# Latch 98 Integration Checkpoint — Threads 1 and 3

**Status:** Threads 1 and 3 merged; Threads 2, 4 and 5 still developing independently.

## Merge provenance

- Immutable reference: `Latch98-Parallel-Base-With-Exit-Button.zip`.
- Applied `Thread-1-Changes.zip` using `python tools/parallel_merge.py apply --thread desktop --zip ...`.
- Applied `Thread-3-Changes.zip` using `python tools/parallel_merge.py apply --thread apps --zip ...`.
- Both patches passed ownership, original-base hash and file-conflict preflight.
- `coordination/base_manifest.json` stays tied to the ORIGINAL shared baseline; do not rewrite it to this checkpoint until outstanding original-base patches are merged.
- Thread 5's `apps/sprite-studio/` reservation is included in `coordination/OWNERSHIP.json` and the merge checker tests.

## Changes

**Thread 1 — Desktop:** In-page modular/fullscreen Bloodline host with visible close control, Ctrl+Shift+Esc and controller hold, window/taskbar navigation, mobile window-width fixes and Start-menu keyboard navigation. Only `web/index.html`, `web/desktop.css` and `web/desktop.js` changed.

**Thread 3 — Applications:** Minesweeper manual flag touch mode, Solitaire moves and win-state hints, Audacity project-load safeguards, Sound Studio disk chunk cleanup, and independent regression/browser app smoke tests. Only `apps/**` (excluding Bloodline, Norn and Sprite Studio) changed.

**Integrator:** Updated Thread 5 ownership carve-out; made the hermetic merge test use a temporary fixture baseline, avoiding a false positive when testing an already-merged checkout. Did not weaken production conflict checking.

## Tested

- `node --test apps/solitaire/tests/engine.test.cjs apps/tests/soundstudio-disk.test.cjs`: PASS.
- `python tools/release_check.py --output ...`: PASS (game-content integrity + filesystem, removable media, Norn installation/persistence, shortcuts, migration, modular file paths, Bloodline launch checks, merge protections).
- `python apps/tests/iframe_smoke.py --chromium /usr/bin/chromium`: PASS for Solitaire, Minesweeper, Sound Studio, Audacity, Weed Warrior, Catacombs, and Wilds; no errors/remote requests.
- `LATCH98_TEST_HTML=... python tools/test-games-in-one-html.py`: PASS for embedded Bloodline fullscreen, on-screen close, Ctrl+Shift+Esc, windowed Bloodline, and other bundled games.
- `LATCH98_TEST_HTML=... python tools/test-first-run-ui.py`: PASS from private email through SwarmWire, disc mount, installation wizard, and installed record.
- `tools/test-standalone-playwright.py`: INCONCLUSIVE; exceeded environment timeout after separate installation test passed; saved-state reload is independently covered by Node tests.
- `python tools/build_pages.py <output>`: generated static Pages layout. A browser-hosted smoke check could not execute because the test environment blocks localhost HTTP navigation.
- Rust host compilation not tested (Rust compiler unavailable).

## Later merges

1. Keep Threads 2, 4 and 5 on their existing assigned baseline. Do not ask them to rebase mid-task.
2. Validate their returned ZIPs through `tools/parallel_merge.py check` against this checkpoint.
3. For Thread 4's Norn simulation, prefer a narrowly scoped source patch. If Thread 2 has changed `apps/norn-world-lab/index.html`, perform a manual line-level merge of ONLY the Norn behavior changes and retest shared disk integration. Never overwrite Thread 2's Norn file-adapter changes wholesale.
4. Apply Thread 5 only under `apps/sprite-studio/**`, then add desktop registration and single-file bundling in an integrator-owned patch.
5. Rebuild standalone; rerun `release_check.py`, app smoke tests, and first-run installer checks.

The checkpoint and built HTML are local artifacts; **no changes have been pushed to GitHub**.
