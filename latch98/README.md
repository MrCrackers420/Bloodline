> **Round 3 coordination:** See `coordination/R3_README.md`. Norn World Lab simulation is now owned by a separate Norn-only development group. No Latch worker modifies its source.

# Latch 98 — standalone all-games edition (Norn Step 32)

**Current shared source:** Latch 98 Round 2 baseline, based on the merged Threads 1–5 build plus the visible Postbox Mail/Sprite Studio shortcuts. New parallel work instructions: `coordination/ROUND2_SHARED_INSTRUCTIONS.md`.

Open the HTML file in a modern browser; it contains Latch 98's desktop,
websites, email, filesystem, the games below and audio tools. It does not
need a server, a Rust build, or adjoining folders for its bundled apps.

## Included program files

- Bloodline story mode — embedded original `bloodline.html` (Git blob
  `76d513d421c627c7ecf6a2225891e4706d8a3d6c`, matching the inspected
  GitHub repository source), preinstalled with two shortcuts.
- Bloodline: Wilds — standalone WebGL build from the 2026-10-31 archive.
- Bloodline: Catacombs — standalone archived browser edition.
- Weed Warrior — standalone archived browser edition.
- Norn World Lab Step 32 (Thread 4 corrected Doozer hearing locations) — installed only via the in-world torrent/ISO/setup.
- Solitaire — integrated self-contained Klondike.
- Minesweeper — browser JS preview engine (no Rust/WASM required).
- Latch Sound Studio v0.7 — time-stretch build, separate app window.
- Audacity for Latch 98 v2 — separate editor window.

The available Golden Acre farming-game artifacts could not be exported as raw
source into this build, so this release does **not** claim to include it.
Archived versions of side games may lag their ongoing development threads.
All bundled game source is preserved without altering gameplay logic.

## First boot and fullscreen

- Check **Start in fullscreen** on the startup screen (checked by default),
  then click/tap **Power On**. Browsers require a user gesture for fullscreen;
  the computer still boots if the browser refuses fullscreen.
- Use the normal **Bloodline** shortcut for a viewport-filling game without
  Latch chrome. **Bloodline (Windowed)** runs the same bundled story game in
  a movable desktop window.
- From Bloodline fullscreen mode, press `Ctrl+Shift+Esc`, click the small
  top-right return control, or hold gamepad **Select/Back + Start** together
  for more than a second. The game is not restarted when merely minimizing
  the browser window, but switching launch modes opens a new game instance.

## Norn World Lab: the installation sequence is intentionally mandatory

On a **fresh Latch virtual disk**, the Norn World Lab program is *not*
installed, despite its program bytes being bundled into the HTML:

1. Start Latch 98, open **Latch Browser**, then **Postbox WebMail**.
2. Read M. Vale's message **"that program I told you about"**.
3. Open or save the attachment `NWLAB03.torrent`.
4. Use **SwarmWire** to finish downloading `NornWorldLab.iso`.
5. Mount the ISO in CD-ROM `D:` and run `D:\Setup.exe`.
6. Complete the wizard, then run Norn World Lab through Start > Programs > Games.

SwarmWire transfer progress is now stored **inside the same virtual disk**
as the Norn installation and saved Norn files (`latch98.virtual_disk.v1`).
Existing installations can migrate the old `latch98.swarmwire.v1` transfer
record when its associated torrent is present. Exporting or importing the
virtual disk includes transfer progress and installed-program state; a fresh
or unrelated imported disk cannot inherit an old torrent transfer. Reloading
the same page in the same browser/profile preserves this state where browser
storage is available.
Do not clear the browser's site/file storage. File:// storage behavior varies
by browser and can change when the standalone file is moved or renamed.
Export your disk backup through Latch's Explorer tools for important saves.
The `.torrent` and `.iso` are **fictional virtual files**; they do not invoke
real BitTorrent networking or mount a physical disc.

## Build and test

Use `python tools/build_standalone.py output.html` to rebuild the single file
from this source tree. The builder packs the apps as UTF-8 base64 data and
inlines shell CSS/JS; content is decoded only when each app opens.

Run `node tools/test-norn-install.cjs`, `node tools/test-filesystem.cjs`,
`node tools/test-step32-bloodline.cjs`, and the remaining test scripts.
Browser smoke tests in `tools/test-first-run-ui.py` and
`tools/test-games-in-one-html.py` exercise the in-world installation and
app launchers. Local browser navigation can be blocked by sandbox policy;
the tests use Playwright's `set_content` fixture in that environment.

A modular Latch 98 Pages/Rust build is still possible with the independent
app files. `tools/build_pages.py` preserves the GitHub-hosted original
Bloodline source when a `../game/bloodline.html` file is supplied.

## Parallel development and safe merging

This edition includes `coordination/THREADS.md`, `coordination/OWNERSHIP.json`,
`coordination/base_manifest.json`, and `tools/parallel_merge.py` for managing
five independent development threads. Each thread changes only its assigned
paths and returns a ZIP of changed files, not a complete replacement game.

To check or apply a returned patch:

```bash
python tools/parallel_merge.py status
python tools/parallel_merge.py check --thread desktop --zip Thread-1-Changes.zip
python tools/parallel_merge.py apply --thread desktop --zip Thread-1-Changes.zip
python tools/release_check.py
```

The release gate rebuilds the standalone HTML, checks each embedded game
payload byte-for-byte against modular sources, and runs the existing Node
filesystem/install/shortcut tests. Add `--browser` to exercise the more
expensive Playwright smoke tests. If a source file has changed since this
baseline, the merger rejects a second differing patch instead of silently
replacing it. `--thread norn` and `--thread apps` handle the other teams.

## Prior integration history: Threads 1–5 merged

The prior five-thread work and the Postbox/Sprite Studio discoverability fix are
already merged. Round 2 has a **fresh baseline manifest** and unique ownership
for all five threads. Do not use the first-round baseline to check new patches.
Do not replace `apps/norn-world-lab/index.html` with an older full copy;
it includes the tested Doozer teaching-location fix.


### Latch Sprite Studio (integrated)

Open from Start → Programs → Accessories → Latch Sprite Studio, or open `apps/sprite-studio/index.html` by itself in a browser. The standalone editor is a single independent HTML file and supports local `.lss.json` projects, transparent PNGs and sprite sheets. The transparency checkerboard and grid are synchronized to the same pixel size at every zoom; grid visibility is optional. In the Latch-hosted edition, Disk Save/Open uses the virtual C: drive with browser download fallback.
