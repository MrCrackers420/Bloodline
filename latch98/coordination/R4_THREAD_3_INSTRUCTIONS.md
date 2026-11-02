# Latch 98 Round 4 — Thread 3: Sound Studio and Audacity Editing Reliability

**Independent goal:** Improve the existing music-production experience, emphasizing genuine editing and reproducible audio output. Thread 1 owns game performance; this thread must avoid touching the Latch desktop or other game launchers.

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`. Read shared rules first.

## Existing source

- `apps/soundstudio/index.html` is a standalone Win98-style music environment with Stylophone-like controls, recording/import, waveform editing, timelines and true time stretching added in earlier rounds.
- `apps/audacity/index.html` is the independent wave editor; previous tests cover undo/export and precision changes.
- `apps/tests/audio-accuracy.test.cjs`, `apps/tests/soundstudio-disk.test.cjs`, `apps/tests/thread3-browser.py` exist; extend rather than replacing proven behavior.

## Required work

1. Inspect actual waveform, timeline cursor, playback/recording, sample slicing, non-destructive histories and time-stretch implementations. Select high-value user-visible bugs based on reproductions, not cosmetic controls.
2. Improve **time-accurate selection and editing**: zoom/pan, cut/copy/paste, trim, splice boundaries, reverse, fades and repeat/undo fidelity. Use real sample indices and channel-aware edits; do not fake editing by merely changing wave illustrations.
3. Improve time-stretch behavior at varied rates, sample rates and channel counts. Distinguish **time stretching without pitch shift** from speed/pitch playback effects; label their controls accurately and document unavoidable artifacts.
4. Verify WAV export and project saving/reopening produce nonempty, decodable, expected audio, not silent or header-only files. Preserve mono/stereo and sample-rate semantics when possible. Validate MP4/MOV audio extraction gracefully where browser decoding support differs—never promise unsupported codecs work universally.
5. Preserve multi-touch/stylus and independent offline HTML use, original Win98 appearance, keyboard shortcuts, old project formats, LatchFS save integration if already supported, metronome and loops.
6. No third-party copyrighted audio clips or sampled commercial sounds. Use synthetic or self-generated audio fixtures for tests. Do not make gratuitous rewrites of unrelated game code.

## Required tests

- Select, splice at sub-second positions, undo, redo, and verify exact sample data expected from original audio.
- Multi-channel WAV import/export and repeated load/save; tests for silence, clipping, NaNs, duration and header correctness.
- A long enough clip to exercise editing UI performance and waveform decimation without truncation.
- Tempo-locked loop and metronome replay after stop/reset, time stretching at 0.5× and 1.5×, and any known loss conditions.
- Browser smoke tests of both standalone editors and via Latch if possible; do not rely on microphone permissions for every test.

## Ownership

Only `apps/soundstudio/index.html`, `apps/audacity/index.html`, `apps/tests/**`, `tests/round4/audio/**`. Do not edit Bloodline, Wilds, Catacombs, Weed Warrior, Solitaire, Minesweeper, Sprite Studio, Norn, or web shell/network/filesystem code.

## Deliverables

`Latch98-R4-Thread-3-Changes.zip`, actual reproducible audio tests with fixtures generated in code, `RESULTS.md` including audio fidelity measurements and codec limitations. Validate with `--thread apps`.
