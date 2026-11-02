# Latch 98 integration checkpoint — Threads 1, 2, 3 and 4

**Status:** Threads 1–4 merged and tested. **Thread 5 (Sprite Studio) pending.**

## Exact patch origins

- Base: `Latch98-Parallel-Base-With-Exit-Button.zip`, referenced unchanged by `coordination/base_manifest.json`.
- Threads 1+3: already merged in `Latch98-Threads1-and-3-Merged-Checkpoint.zip`. Source hashes and test records are in `coordination/MERGE_1_3_REPORT.md`.
- Thread 2: `Thread-2-Changes.zip`; validated and merged using `tools/parallel_merge.py`; updated `web/filesystem.js`, `web/swarmwire.js` and added two regression tests under `apps/norn-world-lab/tests/`. No desktop or simulation modifications.
- Thread 4: `Thread-4-Norn-Simulation-Patch.zip`; exactly one two-line replacement in the Doozer listener expression inside `apps/norn-world-lab/index.html`. Original Norn Step32 SHA256 `38da534fdd76732caddff88539c6310aa07181a451d7bfb53b161752af9f13b1`; merged SHA256 `ca0483c20d48bc396f380502eabaf4f6d5e99de952f250ca9a022652a384dd33`. Both Norn/Latch filesystem bridge scripts remain unchanged.

## Changes to behavior and persistence

- SwarmWire transfer progress now belongs to the exported Latch virtual disk rather than a second localStorage key; old transfer state migrates when appropriate. Saved downloads, mounted CD, and installed Norn app survive backup, reload, and restore. A fresh disk still starts without Norn installed. The ISO/torrent remain simulated in-world files, not physical discs or BitTorrent downloads.
- Norn Doozer audible range now uses finite `NornCore.cxOf(n.body)` rather than an absent `body.x`/`n.x` fallback to world x=0. The 180 px listener range, lane filter, word curriculum, grammar, learning rules, and host filesystem adapter remain unchanged.
- All existing Thread 1 UI/fullscreen and Thread 3 app improvements are preserved.

## Tests executed

- Source-ownership and baseline-hash merge preflight: PASS for Thread 2.
- Thread 4 `verify_integrity.py`: PASS; patch applies with `--fuzz=0` and matches byte-for-byte merged HTML.
- `python tools/release_check.py --output ...`: PASS; verified 8 packed game/media assets, standalone source generation and existing Node filesystem/installer, shortcuts and merge-protection tests.
- `node apps/norn-world-lab/tests/test-thread2-disk.cjs`: PASS for fresh install, download completion gating, reload, backup/restore, legacy migration, deleted torrent, and Rust mirror recovery.
- `python apps/norn-world-lab/tests/test-thread2-browser.py <standalone>`: PASS on retry; one earlier run had a reload timing race in the browser test, not reproduced in the following run or Node persistence test.
- Same Thread 2 browser suite with `--modular`: PASS (private email → SwarmWire download/resume → D: disc → Setup → shared Norn disk).
- Thread 4 `doozer_spatial_experiment.py`: PASS on a fresh rerun (32 replicates × 3 spatial conditions × 2 source variants). Real vocabulary increases only for nearby listeners in the corrected simulation; distant listeners do not learn spuriously. Recorded results live under `tools/experiments/`.

## Boundaries and unresolved tests

- Thread 5 has not submitted code. No Sprite Studio or launch shortcut is included yet.
- Do not rewrite `coordination/base_manifest.json`, replace a full Norn HTML file, or reset player save data.
- GitHub publish was not performed; earlier API writes were forbidden (HTTP 403).
- Rust host compilation was not verified because `cargo`/`rustc` were not installed.
- GitHub Pages deployment smoke remains to be verified on a permitted hosted origin.

## Rebuild / rerun

```sh
python tools/release_check.py --output Latch98-Threads1-4-Merged-Standalone.html
node apps/norn-world-lab/tests/test-thread2-disk.cjs
python apps/norn-world-lab/tests/test-thread2-browser.py Latch98-Threads1-4-Merged-Standalone.html
python apps/norn-world-lab/tests/test-thread2-browser.py Latch98-Threads1-4-Merged-Standalone.html --modular
python tools/experiments/doozer_spatial_experiment.py --baseline tools/experiments/fixtures/step32_unmodified_control.html --updated apps/norn-world-lab/index.html --out tools/experiments/doozer_results.json
```
