# Latch 98 — Round 5 baseline (immersion polish)

**Starting point for the next five independent development threads:** Round 4 merged release, approved Norn World Lab version unchanged, plus the integrator's first player-facing immersion-copy repairs. Read `SHARED_RULES.md` and `coordination/R5_README.md` for assignments. This is **not** the result of five Round 5 patches; those have not been developed or merged yet.

**Automated copy regression:** `python tools/immersion_audit.py`. Source-level checks prevent known out-of-world phrases from returning; a full human inspection is still required.

---

# Latch 98 — Round 4 merged release

**Latest release:** November 2, 2026. All five Round 4 Latch development patches are merged on the approved Norn World Lab release. See `coordination/R4_FINAL_INTEGRATION_REPORT.md` for the change list, test results, and limitations.

Latch 98 is a Windows-98-style desktop and application collection. Open the generated standalone HTML in a browser to run everything from one file, or publish the modular `web/` and `apps/` tree. A Rust host is optional; browsers run the bundled preview engines without a native build.

## Included applications

- Bloodline in fullscreen and movable windowed modes, with a visible **Return to Latch 98** control.
- Bloodline Wilds, Catacombs and Weed Warrior.
- Norn World Lab (the approved multi-specialist simulation update, kept frozen in this integration).
- Minesweeper, Solitaire, Sound Studio, Audacity, and Sprite Studio.
- Postbox WebMail, LatchNet, SwarmWire, Explorer, Notepad and other Latch system tools.

## First boot and Norn installation

The initial profile has no Norn World Lab installation. Use the desktop **Postbox Mail** shortcut or Latch Browser to find M. Vale's email titled **“that program I told you about.”** Open `NWLAB03.torrent` in SwarmWire, complete its download, mount `NornWorldLab.iso`, and run `D:\Setup.exe`. Norn Lab is then available in Start → Programs → Games. Virtual files, install state, and transfer progress persist together in the Latch file system. Export disk backups for important save data.

SwarmWire's 186.4 MB archive and disc are in-world representations, **not external BitTorrent transfers**. This technical note belongs in documentation, not inside the application. The release also removes misleading UI text like “simulated offline” without changing the transfer behavior.

## Performance Mode

Fullscreen Bloodline automatically suspends three recurring desktop shell tasks and defers certain hidden window refreshes. Returning to Latch restores those tasks and window state. Background Norn and SwarmWire execution is **not** globally suspended. FPS benefits depend on workload and device; they have not been benchmarked on physical hardware.

## Build and validation

```bash
python tools/build_standalone.py Latch98-Standalone.html
python tools/release_check.py --output Latch98-Standalone.html
node tests/round4/desktop/performance.test.cjs
node tests/round4/disk/fault-matrix.test.cjs
python tests/round4/latchnet/test_shell.py
python tools/test_norn_boundary.py
```

Round 4 automated tests are in `tests/round4/` and `apps/tests/`. Tests requiring direct localhost or file navigation can be blocked by managed browser policies; others operate with in-memory HTML.

GitHub repository overlay deployment is described in `DEPLOY_LATCH98.md` in the separate GitHub-ready ZIP. Preserve the existing repository's `game/bloodline.html`, `tools/`, and root `README.md` when extracting the overlay.

## Development boundaries

Norn simulation development is owned by its **separate Norn integrator**. This Latch release must not change `apps/norn-world-lab/index.html`. Bloodline gameplay source remains owned by its own development line. The Round 4 ownership map, original baseline manifest, and safe patch merging utilities are preserved in `coordination/` and `tools/`. **Do not treat the Round 4 baseline manifest as a fresh Round 5 baseline.** Refresh hashes and ownership before commissioning a new parallel development round.
