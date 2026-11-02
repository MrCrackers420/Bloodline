# Latch 98 Round 3 — five specialist threads + Norn World Lab integrated

**Status:** All 5 Latch patches merged into one Round 3 baseline with no owner conflicts. Authorized Norn release integrated into exactly `apps/norn-world-lab/index.html`. The two protected Norn/LatchFS script elements (`norn-disk-host` and `norn-files`) were compared to the original baseline and found **byte-identical**. Norn simulation was not edited by the Latch integrator.

## Included

- **Thread 1**: desktop window, launch, standalone runtime behavior.
- **Thread 2**: Latch virtual filesystem, SwarmWire and transfer styling.
- **Thread 3**: Sound Studio, Audacity, precision audio, disk save validation.
- **Thread 4**: LatchNet and Postbox websites, email presentation, fictional internet content.
- **Thread 5**: Sprite Studio tools and sprite-sheet support, preserving pixel/grid alignment.
- **Norn World Lab**: Norn integrator release SHA-256 `a99c92ad18b5a40cb75d7b3d50772b6626fbbd16a7b8f5ac81dedb73398dcc29`; attention, structured language, terrain motor learning, liver glycogen handling and witnessed-aggression recognition.

## Validation performed

- `tools/parallel_merge.py check/apply` all five thread ZIPs **PASS** (31 changed files across threads, no conflict).
- `tools/release_check.py` **PASS**: packed payload-byte integrity, Node filesystem/install/shortcut/simulation checks, frozen Norn boundary, Sprite Studio model/PNG/grid, new Round 3 audio and sprite-sheet tests.
- Browser test `tools/test-standalone-playwright.py` **PASS**: first boot, ISO install/persistence, Norn iframe and host bridge; no reported page errors.
- Browser test `tools/test-games-in-one-html.py` **PASS**: Bloodline fullscreen and return, windowed app and other game launch smoke; no reported page errors.
- Browser test `tools/test-first-run-ui.py` **PASS**: private Postbox email → SwarmWire torrent → completed ISO → mounted disc → Setup.exe → installed Norn Lab; the test selector was updated for the Thread 4 inbox redesign.
- Browser test `apps/tests/thread3-browser.py` **PASS**: Audacity audio editing/undo/export and Sound Studio audio input/export/loop playback.
- Browser test `apps/sprite-studio/tests/editing_browser.test.py` **PASS**: select, undo/redo, sprite sheet reimport, onion skin, zoom/DPR grid alignment.
- `tools/build_pages.py` **PASS**: generated site root and `/latch98/` with Sprite Studio and Bloodline source.
- Native Rust application was **not compiled** in this environment.
- The standalone HTML uses the archived bundled Bloodline source. The Pages workflow preserves and builds the authoritative `game/bloodline.html` from the repository for its separate `/bloodline/` URL.

## Input archives

- `Latch98-R3-Thread-1-Changes.zip`: SHA256 `e5c2b1f116aa30dc2825ad5ddfec8bf83378cf0c346de4da4560454ca994b078`
- `Latch98-R3-Thread-2-Changes.zip`: SHA256 `ae02c2ae81135512ecf7961d6d407c937216e8a66b77941a55e61a6dc99bceb2`
- `Latch98-R3-Thread-3-Changes.zip`: SHA256 `32795367c932e4532abc230758498952fc999c9c7381819253c434df7d80c5b2`
- `Latch98-R3-Thread-4-Changes.zip`: SHA256 `9a56e1c59e035978f9f32beacd3af82684d570e51e85957b5e4097dca596a201`
- `Latch98-R3-Thread-5-Changes.zip`: SHA256 `9e3e2193e0664e0a660b73e661c9e9f9513266df75cec23fcb60dbd044cae17d`
- `NornWorldLab-Latch98-App.zip`: SHA256 `1e97fb714300db52a833b37ae0c09cf8922043cffc544c572e2f654420a94f39`

## SHA256 of built one-file release

`2b98543cb190e3aebda234423f9d7079be1fbf21914d9f2cb875ab5027344930`

## GitHub deployment

The GitHub-ready ZIP is a **repository overlay**: unzip into the root of `MrCrackers420/Bloodline`. It contains `latch98/` and `.github/workflows/pages.yml`, plus `DEPLOY_LATCH98.md`. It does **not** remove or replace `game/`, root `tools/`, or the repository README. GitHub has **not** been updated by this packaging step.

The first-run Norn Lab discovery and installation sequence remains Postbox → SwarmWire → ISO → Setup.exe; Norn is not installed on a clean virtual disk.
