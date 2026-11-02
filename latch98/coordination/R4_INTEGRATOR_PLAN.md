# Latch 98 — Round 4 Integrator Plan

**Owner:** This Latch integrator conversation. Norn World Lab plans/releases belong to the separate Norn integrator.

1. Gather all five `Latch98-R4-Thread-N-Changes.zip` patch outputs and separate test/result notes. No thread may write outside its Round 4 ownership. Do not merge whole-game replacement HTMLs into the application tree.
2. Verify input archive hashes, inspect modified paths, run `tools/parallel_merge.py check`, then apply one by one. All workers start from the same baseline ID `LATCH-R4-2026-11-01-R3-NORN-MERGED`.
3. Review Thread 1's new Game Performance Mode particularly carefully. Ensure the desktop continues to exist behind the game, no fullscreen exit gesture is lost, saved windows survive, and app work is suspended only where the app supports a verifiable safe pause protocol. If an app cannot safely pause, do not claim it did. Distinguish loaded memory from active CPU/GPU work. Validate no global monkeypatching and no interference with Bloodline controls or fullscreen permissions.
4. Integrate any requested cross-owner API changes only here. Avoid modifying app code to accommodate desktop mode unless owners have explicitly documented/tested the protocol. Do not modify `apps/norn-world-lab/index.html` unless a distinct, validated Norn integrator update is supplied.
5. Check `coordination/norn_snapshot.json` remains the frozen source hash. Preserve LatchFS bridge, virtual ISO discovery, browser saves, existing disk migrations, and first-install state. Tests should cover original and updated save snapshots.
6. Run the release gate and browser smoke tests on both modular and standalone outputs. Exercise Bloodline full/windowed and other games (Wilds, Catacombs, Weed Warrior); fresh/old save files; Norn download+install; sprite grid; audio file save/export; Postbox private message and torrent.
7. Generate standalone HTML, modular source ZIP, GitHub Pages staging overlay (preserving GitHub's authoritative `game/bloodline.html`), release notes and evidence/test logs. Do not push to GitHub without explicit request.

**Completion criteria:** A real merged build, clean source ZIP and tests, with clearly qualified performance findings and any known unsupported background suspensions.
