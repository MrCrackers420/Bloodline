# Latch 98 Round 3 — Thread 3: Real audio editing and game polish

**Owner ID:** `apps`  
**Owned directories:** `apps/**`, **except** `apps/bloodline/**`, `apps/norn-world-lab/**`, and `apps/sprite-studio/**`.  
**Start from:** `Latch98-Round3-Shared-Base.zip` plus common rules.

## Assignment

Prioritize making **Latch Sound Studio and Audacity useful as standalone creative tools**, not just as Latch decorations. Investigate current wave-editor architecture before making changes.

1. Reproduce and fix the most important problems in recording/importing WAV or supported media, waveform zoom/selection, exact splice boundaries, loop playback and exporting. Measure sample/frame accuracy rather than estimating cuts with percentage sliders.
2. Implement or correct **speed/pitch** versus **time stretching** as distinct controls. If high-quality offline stretch is too expensive or unavailable, implement a clearly labeled functional method with documented artifacts; do not pretend a speed slider does stretching. Verify duration and pitch effects on test audio.
3. Make undo/redo and project persistence reliable. A saved project should reopen with clip positions, speed/stretch, loop regions and edit history where supported. If the host virtual disk cannot hold a large audio file, offer a real device export/import path rather than claiming it saved to LatchFS.
4. Verify accessibility of touch/stylus/mouse interactions, chord capability for instruments, metronome and multitrack/loop synchronization. Fix measurable timing bugs before adding new instruments.
5. Regression-test existing Solitaire and Minesweeper; patch only real defects. Keep side games separate and avoid importing old Bloodline variants into story mode.

## Boundaries

- No changes to `web/**`, `tools/**`, `src/**`, `apps/bloodline/**`, `apps/norn-world-lab/**`, or `apps/sprite-studio/**`.
- Keep existing standalone HTML apps independently runnable and offline. New app UI in `apps/` must be part of its independent source; request Start/desktop shortcut changes from integrator rather than editing desktop code.
- Avoid copyrighted sample packs, music playback of third-party compositions, and third-party assets without license clearance.

## Acceptance tests

- Open → edit → save → close → load → export a small reference WAV. Compare sample counts / duration of clipped and stretched output to expected values.
- Multiple loop playback and interruption tests; check no stuck audio or phantom recording permission. Capture known issues with particular browser/media types.
- Existing Minesweeper/Solitaire tests pass; actual browser/manual application tests reported with evidence.

**Deliver:** `Latch98-R3-Thread-3-Changes.zip` containing only owned `apps/**` paths; include changelog and runnable tests in `apps/tests/` or per-app tests.
