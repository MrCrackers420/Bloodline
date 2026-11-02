# Latch 98 Round 3 — My integration plan

**This thread integrates Latch 98, not Norn World Lab.** The separate Norn integrator is the sole owner of Norn World Lab's simulation plan, research and releases. Latch may provide a frozen Norn package, LatchFS interface contract and install/launch validation, but must not revise Norn cognition, movement, biology, social behavior or its inner UI.

## Phase A — maintain the merge boundary (started)

- Define exclusive Latch worker ownership, refresh source hashes and run a hermetic test that rejects edits to `apps/norn-world-lab/**` from every Latch worker. Thread 4 now owns **LatchNet/Postbox**, not Norn simulation.
- Maintain a reproducible single HTML builder and GitHub Pages builder from modular files, with checks for all bundled assets and no mandatory external fetch.
- Keep one canonical `Latch98-Round3-Shared-Base.zip` for every worker; do not force rebasing if a different worker finishes earlier.

## Phase B — accept and validate workers

1. Accept each ZIP independently and run `python tools/parallel_merge.py check --thread <desktop|disk|apps|network|sprite> --zip <file>`.
2. Review scope and any new public APIs, regression evidence, save changes, and licensing of bundled assets. No ZIP may replace the full baseline or include files owned by another team.
3. Apply to a scratch integration copy, not the untouched base. Run fast release gate and targeted tests; reject or patch regressions in *integrator-only* areas.
4. Build and test standalone HTML and modular/GitHub Pages preview, including fullscreen exit, Postbox/torrent/ISO/Setup, saved state and Sprite Studio launch. Communicate exact unverified tests, never infer a pass from successful packaging.

## Phase C — take a completed Norn release, later

- Input from Norn integrator: versioned Norn app package, full standalone Norn HTML or equivalent runnable payload, mergeable diff, experimental results/tests, and compatibility notes.
- Compare its LatchFS adapter and installation hooks with `coordination/R3_NORN_INTERFACE_CONTRACT.md`. Do not overwrite Norn fixes with frozen Step 32 code. If changed bridge APIs require an adapter adjustment, route through the Latch integrator with explicit tests and preserve Norn team's simulation changes.
- Replace only `apps/norn-world-lab/index.html` (and approved Norn-owned assets), update Norn snapshot/version manifest, regenerate standalone/Pages, and test install from clean and persisted disks.
- The Norn team owns what the simulation does; Latch owns how the app is discovered, installed, launched and stored.

## Phase D — distribution

- Produce a tested single-file Latch 98 HTML with all owned games embedded, modular source ZIP, and optional GitHub Pages build. Preserve separate standalone creative apps.
- Do not claim deployment to GitHub `main` until the GitHub write action actually succeeds; prepare upload/merge package otherwise.
- Write a release report with input ZIP SHA-256, patch ownership, tests, intended Norn version, and any unresolved issues.

**My immediate deliverables:** Updated merge ownership and baseline hashes; Norn boundary contract and an executable frozen-source check; reproducible release gate. This does not change gameplay or desktop UI.
