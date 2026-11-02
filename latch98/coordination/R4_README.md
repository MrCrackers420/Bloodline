# Latch 98 — Round 4 (five fresh parallel assignments)

This is the next development round **after** Latch Round 3 plus the independently integrated Norn World Lab release. **All five threads use the same shared ZIP** and all five return patches to the Latch integrator. Round 4 changes are **instructions only**; these features are not yet implemented.

## Main goal

Reduce the work Latch 98 does behind Bloodline when Bloodline is running fullscreen, while preserving quick, reliable return to the desktop and restoring the previous windows/saves. The current modular launcher is in `web/desktop.js` (`modularGame`), and the single-file fullscreen launcher is in `web/standalone_runtime.js` (`LatchBundle`). The desktop is hidden but loaded; background timers/app iframes may continue. Actual GPU/CPU savings require measurement, not assumptions.

## Assignments

1. **Thread 1:** Measurable Game Performance Mode for fullscreen Bloodline, host idle/suspension strategy and transparent restoration.
2. **Thread 2:** Virtual disk durability, backup/import and SwarmWire recovery, as an independent reliability workstream.
3. **Thread 3:** Sound Studio/Audacity accuracy and offline editing/export reliability, without shell or game changes.
4. **Thread 4:** LatchNet and Postbox findability/deep-link flow and plausible 2003-era content; preserve original private torrent and hints.
5. **Thread 5:** Sprite Studio input/animation editing and *honest* Flipnote import groundwork, without adding counterfeit `.ppm`/`.kwz` support.

The two project teams remain independent: **Norn Lab integrator controls the Norn game; Latch integrator controls the Latch OS**. No Norn engineering goes to these Latch workers. The latest approved Norn build is included solely as a frozen embedded app.

## Files to upload to each fresh chat

- `Latch98-Round4-Shared-Base.zip`
- `Latch98-Round4-Shared-Rules.md`
- That thread's `Latch98-Round4-Thread-N-Instructions.md`
- For Thread 5 only, optionally the user-supplied `Flipnote-Toolkit-JS-main.zip`, if available. Its presence does not alone authorize bundled proprietary keys or Nintendo content.

Do not tell workers to use a historical Round 3 shared baseline or the GitHub main repository as their base. This shared ZIP was created from `Latch98-Round3-AllThreads-Norn-Merged-Source.zip` with new Round 4 ownership and regenerated baseline hashes.
