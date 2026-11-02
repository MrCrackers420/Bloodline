# Latch 98 Round 5 — shared rules (read before coding)

## Baseline and separation
- Use **only** `Latch98-Round5-Shared-Base-With-Rules.zip` as the starting source; do not start from old R4 or online repositories.
- Baseline ID: `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH`.
- Latch 98 is a fictional Windows-98-style desktop in 2003. Keep the classic window/menu controls, start menu and visual language; do not redesign into a modern app.
- The separate **Norn World Lab integrator** alone owns Norn physiology, cognition, language, terrain, behavior, genetics and embedded Norn UI. Never edit `apps/norn-world-lab/`.
- No modifications to canonical or bundled Bloodline, Wilds, Catacombs or Weed Warrior gameplay sources. All four must still launch from Latch.
- Preserve first-install chain: private Postbox message -> `NWLAB03.torrent` -> SwarmWire -> `NornWorldLab.iso` -> CD-ROM -> `D:\Setup.exe`. A new profile must NOT have Norn installed automatically.
- Never erase or reset saves. Preserve virtual disk export/import, backups, recovery and browser/Rust persistence.

## Immersion is a functional acceptance requirement
- User-visible UI should speak as a real 2003 operating system/application would. No 'simulated', 'mock', 'fictional', 'fake', 'placeholder', 'prototype', 'not real', 'this is only a game', browser storage/HTML/JS/internal implementation disclaimers in dialogs, menus, help, error screens, website content or installer text.
- Prefer period-appropriate status phrases that match **actual behavior**: 'Tracker unavailable', 'Connection failed', 'Not enough space on drive C:', 'This format cannot be opened'.
- Do NOT fake a genuine public internet connection, nonexistent peer counts, successfully sent email, working modem or transfer. Accuracy and immersion coexist: an in-world error can describe a real limitation without exposing implementation trivia.
- Technical details and modern mobile/browser workarounds belong in README / developer notes, not player-facing windows. Never remove necessary permission/security guidance without putting a usable fallback in its place.
- Keep narrative secrets discoverable. Do not add blunt tutorial banners revealing the torrent path, and do not delete/rename the private Postbox message or torrent attachment.
- Include a brief in-game copy audit listing exact strings replaced and screens checked.

## Parallel ownership and handoff
- Thread 1 (`desktop`): only `web/index.html`, `web/desktop.js`, `web/desktop.css`, `web/shell_v07.css`, `web/explorer_v08.css`, `web/standalone_runtime.js` and `tests/round5/desktop/`.
- Thread 2 (`disk`): only `web/filesystem.js`, `web/swarmwire.js`, `web/swarmwire.css` and `tests/round5/disk/`.
- Thread 3 (`apps`): only `apps/soundstudio/index.html`, `apps/audacity/index.html`, `apps/tests/`, `tests/round5/audio/`.
- Thread 4 (`network`): only `web/latchnet.js`, `web/latchnet.css` and `tests/round5/latchnet/`.
- Thread 5 (`sprite`): only `apps/sprite-studio/` and `tests/round5/sprite/`.
- All cross-module wiring, shared build scripts, release gate, manifest, publishing, and Norn handoff are INTEGRATOR-ONLY. Ask integrator via CHANGE_REQUEST.md rather than changing another team's file.
- Ownership and hashes are enforced by `tools/parallel_merge.py`. No binary files, symlink entries, deletes, or overlapping modifications in automated patches. If binary assets are necessary, explain and hand over separately for integrator review.
- Each thread returns a project-relative ZIP with changed files ONLY, plus a changelog and tests **inside owned directories**. Do not return only a monolithic HTML. Sprite Studio must update its `app.js`/template source AND rebuild `index.html`; do not patch the generated file alone.
- Include: what changed, commands executed and results, unresolved issues, file ownership, test proofs, and anything needing integrator action. Do not claim tested if not run.

## Testing
- Start: `python tools/release_check.py`; finish: rerun it plus your focused tests. Do not edit regression expectations just to pass tests.
- Verify both standalone single HTML and modular Latch app behavior where possible, and desktop/phone sizes for interactive UI.
- Record Norn source SHA-256 before/after; must remain unchanged at `a99c92ad18b5a40cb75d7b3d50772b6626fbbd16a7b8f5ac81dedb73398dcc29`.
- No invented benchmarks or unverified claims of a real peer connection, FPS gain, Flipnote format support, or input-device compatibility.
