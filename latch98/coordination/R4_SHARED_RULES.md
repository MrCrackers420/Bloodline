# Latch 98 — Round 4 Shared Rules

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`. This is **the final Latch Round 3 release with all five specialist changes and the authorized latest Norn World Lab integration**. Every worker must use `Latch98-Round4-Shared-Base.zip`, not a historical Latch ZIP or GitHub's older clone.

## Boundaries

1. **Norn World Lab is a separate project.** `apps/norn-world-lab/**` is frozen. Do not change Norn simulation, genetics, language, laboratory interface, bundle, or Norn save bridge. Norn updates come only as approved packages from its own integrator and are merged only by the Latch integrator.
2. **Bloodline story mode source is externally authoritative.** Do not change `apps/bloodline/bloodline.html`, any `game/bloodline.html`, or story/gameplay code. No worker changes Wilds, Catacombs, or Weed Warrior code in this round. All four games must remain launchable and available offline in the single-file build.
3. **Latch 98 stays Windows 98-style**, branded Latch, with the existing desktop/window controls. No redesign into a modern app.
4. **Do not defeat the Norn installation mystery.** First use requires Postbox message → `NWLAB03.torrent` → SwarmWire → ISO → `D:\Setup.exe`; clean virtual disks never start with Norn installed. Preserve old saves, existing player files and shortcuts.
5. **Do not change any file outside the ownership list below.** All updates to `tools/`, `coordination/`, root README/build scripts, Rust shell, shared launch wiring and deployment files are integrator-owned unless expressly listed for a thread. If your task needs another owner's file, define an exact small API or integration request in your handoff; do not edit it yourself.
6. Keep offline play functional. Do not load third-party resources from CDNs at runtime. Preserve the embedded `.html` distribution, modular web launch and GitHub Pages paths. Never make a mock control that claims to perform an action it does not actually perform.
7. Avoid timer hacks that monkey-patch `setInterval`, `requestAnimationFrame`, `Date`, `performance.now`, or all iframes globally. Don't pause/suspend apps without an explicit and safe protocol; preserve their state.
8. Do not claim performance, compatibility or reliability gains without measurements or tests. No invented frame-rate, memory, installation or format results.

## Ownership and parallelism

| Worker | Exclusive editable locations | Explicitly excluded |
| --- | --- | --- |
| Thread 1 `desktop` | `web/index.html`, `web/desktop.js`, `web/desktop.css`, `web/standalone_runtime.js`, `web/shell_v07.css`, `web/explorer_v08.css`, `tests/round4/desktop/**` | filesystem, Postbox content, apps, Norn source |
| Thread 2 `disk` | `web/filesystem.js`, `web/swarmwire.js`, `web/swarmwire.css`, `tests/round4/disk/**` | shell UI, Postbox content, Norn source |
| Thread 3 `apps` | `apps/soundstudio/index.html`, `apps/audacity/index.html`, `apps/tests/**`, `tests/round4/audio/**` | other games, Sprite Studio, Norn |
| Thread 4 `network` | `web/latchnet.js`, `web/latchnet.css`, `tests/round4/latchnet/**` | filesystem, SwarmWire protocol, Norn |
| Thread 5 `sprite` | `apps/sprite-studio/**`, `tests/round4/sprite/**` | desktop, installer, audio, game source |
| Latch integrator | all common build scripts, `tools/**`, `coordination/**`, packaging/GitHub workflow, cross-module wiring and final validation | modifies frozen Norn only from separately approved Norn release |

`coordination/OWNERSHIP.json` is machine-enforced by `tools/parallel_merge.py`. A valid patch cannot touch the same file as another thread. New tests belong to your owned test prefix. Coordinate APIs via documented handoffs only.

## Deliverables and integration protocol

- Return **one mergeable ZIP**, containing *only changed or new project-relative UTF-8 files*. No complete copied project tree, no binary assets in automatic patch, no deleted files. Name it `Latch98-R4-Thread-N-Changes.zip`.
- Also return a human-readable `CHANGES.md`/`RESULTS.md` **outside the automatic patch ZIP** (or place copies under the matching owned test folder in the patch) documenting exact modifications, new interfaces, tests run and remaining problems. Give reproducible scripts or test source, not just screenshots.
- Include any additional runnable tests under your owned directories and a summary of **actual passes/failures**, alongside manual browser cases where automation is unavailable.
- Test your patch against an untouched Round 4 baseline; do not use outputs from another thread as your baseline.
- Run `python tools/parallel_merge.py check --thread <desktop|disk|apps|network|sprite> --zip YOUR_PATCH.zip` against the untouched source. The integrator will apply in any order. Don't update `coordination/base_manifest.json` or edit ownership metadata.
- Run relevant Node/Python tests, and if possible Playwright at phone and desktop widths. No internet needed for the completed standalone bundle.
- If needing a changed shared API or build step, add an *integration contract* in your separate handoff. Integrator will implement and retest. Never include unrelated files in the patch.

## Release and regression gates the integrator owns

- `python tools/release_check.py --output <release.html>`
- `python tools/release_check.py --browser` where browser tooling is available
- `python tools/build_pages.py <site-dir>`
- Verify bundled byte integrity and app launch in standalone/modular/GitHub Pages modes.
- Verify Norn source SHA against `coordination/norn_snapshot.json`, protected bridge, Norn first-install path, SwarmWire persistence and existing saves.
- Verify Bloodline full/windowed, Wilds, Catacombs and Weed Warrior with exit/return controls; preserve imported Bloodline game and do not overwrite GitHub story source.
- No GitHub push until user requests it. This round provides patches, then integrator builds a release ZIP.
