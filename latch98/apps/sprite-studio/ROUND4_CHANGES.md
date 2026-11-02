# Latch 98 Round 4 — Thread 5 Sprite Studio

Owner: `sprite`. Base: `LATCH-R4-2026-11-01-R3-NORN-MERGED`.
No edits to shell, LatchFS, Norn World Lab, Bloodline, game bundles, common build tools or other owners.

## Implemented

- Clipped captured-pointer paint lines to actual image coordinates before rasterization. A stylus leaving the canvas no longer triggers a huge off-image Bresenham loop. Regular on-image Bresenham remains unchanged.
- Preserved short one-finger touch drag paths that finish before the 75 ms gesture disambiguation delay, and replayed the initial pending segment when a longer touch stroke activates.
- Sampled coalesced pen movements, ignored incidental finger contacts while pen drawing/selection is active, and prevented 2-finger gestures from committing canceled touch paint.
- Unexpected pointer capture loss now commits the completed portion of a stroke; deliberate `pointercancel` still rolls back the active stroke. One drag remains a single undo operation.
- Added **Copy Frame / Paste Frame** (all layers + duration) across existing frames. Snapshot data is owned, not aliased; paste rejects incompatible canvas/layer arrangements without altering the project.
- Added **Merge Down** across every animation frame with an atomic, pixel-exact composite verification. Requires both layers visible at 100% opacity; aborts if 8-bit alpha rounding would alter any displayed pixel.
- Added **Fixed FPS (preview)** toggle and editable 1–60 FPS rate. When checked, actual preview frame switching uses selected FPS. Unchecked uses the saved per-frame millisecond timing. The preview FPS is explicitly non-destructive and does **not** rewrite exported frame durations.
- Removed the preview's artificial 30 ms repaint gate. Maintained onion-skin display as preview-only and existing composite/export isolation.
- Fixed mobile timeline frame strip overlapping the next panel when new controls wrap; kept original Win98 presentation.
- Added a visible sprite-sheet export warning that layers/palette are flattened; `.lss.json` remains the lossless editable format.
- Regenerated **self-contained** `apps/sprite-studio/index.html` from app-local source and `build.py`.

## Tests and formats

Test commands, exact results, environment limitations and unsupported formats are in `tests/round4/sprite/RESULTS.md`. New tests are `tests/round4/sprite/model_round4.test.cjs` and `tests/round4/sprite/browser_round4.test.py`.

No Flipnote `.ppm` or `.kwz` reader/writer has been added: neither the optional toolkit archive nor authentic licensed reference fixture files were supplied. See `FLIPNOTE_REVIEW.md`. No signing keys, samples, third-party runtime sources or assets were bundled.

## Integrator

Unpack `Latch98-R4-Thread-5-Changes.zip` at the project root. It contains only owned changed/new UTF-8 files. No shell changes or registration API changes requested. `apps/sprite-studio/index.html` is already regenerated and is the offline entrypoint. `python tools/parallel_merge.py check --thread sprite --zip <patch.zip>` runs against an untouched Round 4 baseline.
