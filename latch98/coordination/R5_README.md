# Latch 98 Round 5 — five independent worker threads

Release baseline: `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` (Round 4 all threads + unchanged Norn Lab update + integrator copy polish).

**Give each new worker:** `Latch98-Round5-Shared-Base-With-Rules.zip` + their own `Latch98-Round5-Thread-N-Instructions.md`. `SHARED_RULES.md` is at the ZIP root; a second identical copy is under `coordination/`.

Round 5 goal: complete a **2003 immersion/copy audit**, plus tested improvements in each worker's assigned application area. There is no separate Norn simulation work in this team; completed Norn releases still come from the Norn-only integrator.

Assignments: 1 Desktop/performance; 2 disk/SwarmWire; 3 audio apps; 4 LatchNet/Postbox; 5 Sprite Studio.

Integrator receives five focused patch ZIPs; checks `python tools/parallel_merge.py check --thread desktop|disk|apps|network|sprite --zip PATH`; applies them in owned areas; tests; packages standalone, GitHub overlay and modular source. The integrator handles any cross-area requests, checks the Norn hash, and never overwrites canonical GitHub Bloodline story source.

Start by running `python tools/release_check.py`. Use `python tools/immersion_audit.py` to check the known player-facing language leaks; do **not** treat a passing phrase check as proof every screen was reviewed.
