# Latch 98 Round 3 / Thread 3 — applications changes

**Owner:** `apps` · **Baseline:** `LATCH-R3-2026-11-01`

This patch changes only `apps/audacity/index.html`, `apps/soundstudio/index.html` and tests/docs in `apps/`. It does **not** touch the desktop, LatchFS implementation, Norn World Lab, story Bloodline, Sprite Studio or the distribution bundle. Both audio apps remain self-contained offline HTML files with existing Windows/Latch 98 styling.

## Audacity (original Latch edition)

- Added an **Exact Selection Frames** dialog using inclusive start/exclusive end frame indices of the selected track. Cut/copy/delete/trim/statistics/effects now share the same integer-rounded selection bounds instead of disagreeing by a sample at fractional selections. Trim offset follows the actual first kept sample.
- Added distinct **Change Speed and Pitch** (tape resampling) and **Change Tempo** (approximate pitch-preserving WSOLA) effects for full tracks or selected ranges. Both are *destructive and undoable*, not slider-only playback illusions. Stereo stretching shares grain alignment. The output frame count is `round(input frames / speed)`. WSOLA is limited to 40 seconds per effect invocation to avoid freezing low-power devices; under 768 input frames, a simple interpolation fallback changes pitch. WSOLA can smear transients, choruses and phase-sensitive material; it is not a mastering-grade algorithm.
- Added **Loop selection** playback from one mixed WebAudio buffer with native `.loop=true`. Playback/stop/pause and the cursor operate on the loop region without rescheduling at a JS animation frame boundary. Full-project WAV export still ignores the preview loop and exports the arrangement.
- Introduced `.l98aud` project **version 2**, storing full PCM plus at most 15 undo and redo snapshots with track offsets/gain/pan/mute/selection and loop flag. The loader still accepts version 1 projects. Loading validates all history states before touching the active project; saves are device downloads rather than unverified LatchFS writes. Project files can be large; saving is capped at 320 MiB and does not silently drop an undo history.
- Improved recording-permission failure cleanup, extended blob-download revocation, and wrapped the project bar on small touch screens.

## Latch Sound Studio

- Source trim/crop selections now snap to integer PCM frame boundaries. The saved unprocessed forward clip WAV is cached across speed/reverse re-renders to avoid repeated 16-bit quantization of untouched audio.
- Kept the existing **tape-speed** (pitch changes) and WSOLA **time-stretch** (pitch approximately preserved) modes distinct, including their device WAV export. Verified the nominal pitch and exact output frame counts against synthesized sine waves at 0.5× and 2×.
- Fixed arrangement and metronome **loop seam**: the next pass is prepared ahead of time and scheduled at the exact previous pass end in the AudioContext clock, rather than at the next `requestAnimationFrame` callback. Stop and pagehide disconnect active and already-scheduled audio buses. Background throttling can still cause late recovery when the tab is suspended; no claim of gapless recovery from browser suspension.
- Made virtual-disk **split-song replacements stage new chunks in an alternate A/B directory**, sync those chunks, then switch the manifest. If staging fails, preserve the old manifest/chunks and remove incomplete staging. Retired old chunk directories are cleaned only after the successful manifest change. Legacy `.data` manifests remain readable, and split file paths/counts are checked on read/delete. This deliberately demands enough free space for both versions when replacing a large song; on insufficient space, download the complete Project JSON to your device before deleting anything.
- Browser standalone cabinet writes now resolve on **IndexedDB transaction completion**, not request success. Failed asynchronous project imports attempt rollback to the previous in-memory song and note history.
- `.l98s` and downloaded JSON projects now include up to 10 recent arrangement undo and redo snapshots. Existing projects without history still load. Auto-recovery storage quota failures display an export warning instead of being silently swallowed.

## Games

No changes to Solitaire or Minesweeper were justified by the regression tests. No old Bloodline variants were imported.

## Tests executed

Run from project root:

```bash
node --test apps/tests/audio-accuracy.test.cjs apps/tests/soundstudio-disk.test.cjs apps/solitaire/tests/engine.test.cjs
node apps/minesweeper/tools/test-preview.mjs
python apps/tests/thread3-browser.py
```

All listed commands passed on this worker environment with Node 22 and Chromium using Playwright's `set_content()` to load each self-contained HTML app. Automated browser flows include WAV decode, frame-exact selection, 16-bit export (sample counts), pitch/tempo manipulation, project save/reopen/undo, corrupt-file rollback, instrument two-key chords, multiple one-second arrangement loops and stop/metronome interruption. Audio pitch tests measure zero crossings near a 440 Hz reference, allowing a 45 Hz tolerance for approximate WSOLA; frame-count tests use exact integers.

### Known limitations / manual checks

- The test container's Chromium administrator policy blocks `file://` and `localhost` navigations, so Playwright loaded the standalone HTML as document content; direct on-device offline opening remains **not verified** in this environment. No app requires a CDN or account.
- Microphone hardware access and permissions, Android stylus pressure, MP4/MOV audio extraction and codec coverage require tests on actual user devices. Sample Lab's video extraction uses browser-supported media codecs and may require realtime capture; unsupported media is reported rather than silently imported.
- `cargo` was unavailable, so the Rust Minesweeper suite could not be run here. The existing six-case JS fallback rules test and Solitaire engine tests passed.
- App-level LatchFS replacement tests use a bounded virtual-disk double, not a full Rust shell build. Integrator should validate against its production filesystem after merge.
