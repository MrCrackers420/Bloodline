# Latch 98 — Round 4 integrated release (2026-11-02)

## Scope / source

Baseline: `LATCH-R4-2026-11-01-R3-NORN-MERGED`, the provided `Latch98-Round4-Shared-Base-With-Rules.zip`. All five Round 4 patches were checked by `tools/parallel_merge.py` against the same `coordination/base_manifest.json` and merged with zero conflicts. The Norn source was frozen; its SHA-256 is `a99c92ad18b5a40cb75d7b3d50772b6626fbbd16a7b8f5ac81dedb73398dcc29`.

| Thread | Files applied | Change |
|---|---:|---|
| 1 — desktop | 5 | Game Performance Mode pauses three Latch-owned shell jobs and batches hidden desktop refreshes during fullscreen Bloodline; return restores shell timers; no claim to suspend all background apps |
| 2 — disk | 5 | Stale-tab disk-write detection, validation/recovery improvements, single SwarmWire timer and storage-error feedback |
| 3 — audio | 6 | Exact PCM-frame editing, waveform peak envelopes, improved sound-stretch and export/undo behavior |
| 4 — LatchNet | 4 | Postbox email/search/Outbox usability, broader period-appropriate sites and safe HTML output |
| 5 — sprite | 11 | Pointer/touch precision, frame copy/paste, layer merge, timeline playback and history improvements |

Integrator-only adjustments: remove explicit simulation disclaimers and modern storage implementation details from *player-facing* SwarmWire, Postbox, desktop Screen Saver, and disk-error messages. This does **not** introduce real network transfers or change transfer speed/storage behavior. The programmer comments/documentation remain explicit about implementation. More extensive cross-app immersion auditing is suitable for the next development round; Norn application text is reserved for the Norn integrator.

### Automated checks

**PASS:** `python tools/release_check.py` after all merges and wording changes. Includes the full bundled game payload/asset digest check and the original regression suite.

**PASS:** `node tests/round4/desktop/performance.test.cjs` (synthetic VM lifecycle/timer comparison, not a browser FPS benchmark).

**PASS:** `node tests/round4/disk/fault-matrix.test.cjs` (14 fault/recovery groups) and `python tests/round4/disk/swarmwire-browser.test.py`.

**PASS:** `node --test apps/tests/audio-accuracy.test.cjs apps/tests/soundstudio-disk.test.cjs apps/tests/r4-audio-fidelity.test.cjs` (28 tests) and `python tests/round4/audio/browser.py`.

**PASS:** `python tests/round4/latchnet/test_browser.py` (9 tests) and `python tests/round4/latchnet/test_shell.py` (3 tests, including real Postbox attachment path).

**PASS:** `node tests/round4/sprite/model_round4.test.cjs`, `python tests/round4/sprite/browser_round4.test.py`, and `python tools/test-sprite-integration.py` (desktop and phone sizes).

**PASS:** `python tools/test-games-in-one-html.py` with the merged standalone HTML (fullscreen/windowed Bloodline, Wilds/Catacombs/Weed Warrior source packaging, return controls); `python tools/test_norn_boundary.py` (frozen Norn integrity).

**PASS on retry:** `python tools/test-standalone-playwright.py` with the merged standalone. First run reached Norn launch, but the iframe detached during an incidental title inspection; a full retry passed with zero JavaScript errors and confirmed `NornDiskEmbedded === true` after install/reload.

**ENVIRONMENT BLOCKED:** `python tests/round4/desktop/browser_smoke.py` because managed Chromium blocks `http://127.0.0.1` navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`). Its launch/timer/controller behavior passed the deterministic VM tests. Actual FPS gains, GPU/CPU time, physical gamepad, and stylus hardware **were not benchmarked**.

### Compatibility guarantees and limitations

- New Norn World Lab is already present in the baseline; this release does not change its source or LatchFS bridge.
- Fresh profile: Norn remains uninstalled until Postbox message → `NWLAB03.torrent` → SwarmWire archive → ISO mount → `D:\Setup.exe`.
- No Bloodline / Wilds / Catacombs / Weed Warrior gameplay source modifications. The offline bundled Bloodline is the archived Latch copy; the GitHub Pages workflow leaves the repository's canonical `game/bloodline.html` alone and builds the standalone `/bloodline/` route from it.
- Game Performance Mode reduces Latch-shell background wakeups, not arbitrary iframe simulations. Norn, SwarmWire and other apps are not automatically suspended. No measured FPS claim.
- Sprite Studio's actual Nintendo Flipnote `.ppm` / `.kwz` import/export is **not included**; native project, PNG and sheet formats continue working.
- Package includes GitHub deployment overlay, modular source, standalone offline HTML and test notes. It was not pushed to GitHub.
