# Latch 98 Round 5 — first integration/immersion checkpoint (2026-11-02)

This is an **in-house polish checkpoint** based on the completed Round 4 merge, **before** assigning/receiving the new five Round 5 worker patches.

## Concrete changes

- Bloodline's missing-program screen no longer describes HTML, GitHub, or browser storage; uses period-styled program-file, archive retrieval and server options. Underlying file selector, remote retrieval and hosted fallback behavior are **unchanged**.
- Restore Disk Image confirmation warns that it replaces the computer's files/settings, rather than describing a 'virtual disk'. The underlying restore operation is unchanged.
- Audacity audio-input error/help copy no longer lists localhost, HTTPS, Rust launcher, or distribution disclaimers. Recording support and technical permission requirements did not change.
- Sound Studio's tooltips, microphone status/help, vocal synth description, disk-full warning, sound decode errors and general help have period-appropriate wording. Existing recording/permission workarounds remain usable as Phone recorder / Load sound. Browser-specific troubleshooting remains necessary in external docs.
- Sprite Studio's drive-C save/error texts no longer call the storage virtual. Both modular `app.js` and the rebuilt self-contained `index.html` were changed identically.
- New `tools/immersion_audit.py` enforces specific regression phrases; added to the normal `release_check.py` gate.
- New isolated Round 5 ownership map, baseline digest manifest, root `SHARED_RULES.md`, five instructions and integrator plan.

## Checks run

- `python tools/release_check.py --output Latch98-Round5-Immersion-Polished-Standalone.html` **PASS**: bundled game digests; first-run Norn installer safeguards; modular/core Node checks; file-owner merge test; Norn boundary SHA; Sprite Studio tests; existing audio integrity.
- `node --test apps/tests/audio-accuracy.test.cjs apps/tests/soundstudio-disk.test.cjs apps/tests/r4-audio-fidelity.test.cjs` **PASS** (28 tests).
- `python apps/sprite-studio/tests/grid_alignment.test.py` **PASS** (9 zoom levels at desktop & phone widths).
- `python tools/test-sprite-integration.py` **PASS** (desktop/phone Latch launch and editing).
- Playwright in-memory UI checks using installed system Chromium **PASS**: Bloodline missing-file screen displays revised buttons; Sound Studio loads with revised guidance; Sprite Studio starts.
- New phrase regression `python tools/immersion_audit.py` **PASS**. This checks six files, not every possible UI state.
- Frozen Norn source SHA-256 **unchanged**: `a99c92ad18b5a40cb75d7b3d50772b6626fbbd16a7b8f5ac81dedb73398dcc29`.

## Limitations / integrity boundary

No Round 5 specialist patches have been delivered yet. This is an initial polish release, not a complete immersion audit. Additional developer-language strings, particularly generated errors, may remain and are explicitly assigned to future workers. Technical reality: SwarmWire does **not** download from external BitTorrent peers; the archive is local and packaged. Missing remote Bloodline resources may still fail when disconnected. Native Rust and physical controller/stylus latency were not benchmarked in this pass.

GitHub overlay preserves the repository's canonical `game/`, `tools/`, and root `README.md`; it only supplies `latch98/`, `.github/workflows/pages.yml`, and deployment instructions. It has not been pushed to GitHub.
