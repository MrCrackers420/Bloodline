# Norn World Lab — Round 4 Integration Report

**Release:** `NWLAB-R4-INTEGRATED-2026-11-02`  
**Canonical base:** `83c2caa0217cca353448671adab1d10b391c4914dd2487e40523a0f96251cb35` (unchanged)  
**Merged Norn HTML:** `3bc36a7992e7d4540a4afc93acbb3d6f2d8e26b639402b998bdb1d10e86b34db`  
**Integration order:** Threads 1, 2, 3, 4, 5.  
**Scope:** Norn World Lab application only. Not a Latch 98 desktop release.

## Patch provenance / reproducibility

All five original handoffs contain `changes.patch` relative to the same immutable baseline. Applied sequentially with `patch --batch -p1`, without failed hunks, rejected hunks, or manual rewrite. Some hunks required ordinary line-number offsets because prior patches added lines; patch context matched. Rebuilding the integrated 69,745-byte `changes.patch` against an independent untouched baseline reproduced the merged HTML byte-for-byte.

`python tools/check_source.py`: **PASS_STATIC_ONLY**; 27 inline JavaScript scripts; both `norn-disk-host` and `norn-files` unchanged byte-for-byte. Baseline hash held constant.

## Accepted changes and evidence

| Specialist | Accepted Norn-only change | Independent integrator checks |
|---|---|---|
| Thread 1 | Opt-in persistent Handspeak session controls, separate default-Off voice-tone analyzer, learnable `grapes` vocabulary and food-specific spoken commands | Actual Chromium real-game/mock microphone suite: all 28 checks passed; 10/10 tested seeds bound visible grape goal; 2/2 extended trials consumed three portions; original baseline negative control remained unresolved for `eat grapes` |
| Thread 2 | Shadow support at Norn-specific physical height, vertically correct label anchors, world-locked earth sampling | Real Chromium Canvas suite: 55/55 paused stable frames and 55/55 family frames (identical checksums), six camera round trips, no reported failures |
| Thread 3 | Lower nursery ditch, connected elevated skyway/orchard with ordinary terrain collision, increased crop capacity | Geometry tests passed; combined autonomous trial (10 seeds each novice/quad) saw 10/10 novice and 10/10 quad enter lower passage; 6/10 novice and 9/10 quad reach lower-east target. Upper orchard: 0/10 novice and 4/10 quad reach; all trials 26 s maximum upper, 17 s lower |
| Thread 4 | Non-lift physical passing methods (bay, crouched step, queue/backtrack), observed physical crossing credit and learned outcomes | Integrated 9-scenario smoke: crossing credited for `bay/bay`, `bay/step`, and `meadow/step`; controls `bay/queue`, `meadow/queue`, `upper/queue` did not cross; upper `bay/step` attempts also failed in this short test. Specialist reported 2/10 hollow and 7/10 meadow physical reversals, with adverse falls in hollow |
| Thread 5 | Actual-world Birth & Lineage Applet, truthful provenance metadata (including unknowns), reopens and exports via existing NornFiles | Actual core/egg/breeding regression 165/165; mutation suite detects 15 expected core failures; mock desktop DOM 28/28; integrator additionally opened applet in full game and saw live egg data refresh |

## Cross-system and browser verification

- `node tests/cube_visibility_regression.js`: PASS — moving solid-cube occlusion on 8 matched seeds.
- `node tests/cube_occlusion_social.js`: PASS — social witnessing respects physical cube and terrain occlusion.
- `node tests/passing_properties.js`: PASS (tests refer to real physical collisions and event credits).
- `node tests/round4_terrain_geometry.js`: PASS.
- `node tests/birth_lineage_core.js`: PASS, 165/165; `python tests/birth_lineage_mutation.py` detected broken hatch metadata.
- `python tests/round4_fast_suite.py`: PASS, 28 checks with real inline game under Chromium, mocked recognition/recording permission and synthetic acoustic signals.
- `python tests/render_round4.py --source apps/norn-world-lab/index.html`: PASS; no renderer regression failures.
- `python tests/birth_lineage_dom.py`: PASS, 28/28 in isolated mock-desktop DOM.
- `python qa/browser_interaction.py`: PASS full merged Chromium app startup, Hatchery open/create/hatch 1 Norn, in-memory virtual disk round trip, no page errors.
- `python qa/full_round4_ui.py`: PASS full merged Chromium UI registration/open/live egg refresh for Birth & Lineage; Handspeak endpoints coexist; no page errors.
- `python qa/embedded_bridge.py`: PASS simulated Latch parent bridge (window.NornDiskEmbedded, window.LatchFS reference, NornFiles available). This is **not** testing the actual Latch desktop.
- `node tests/passing_integration.js`: 9 controlled cross-geometry scenarios; pass and non-pass logged in `data/passing-smoke.json`.
- `node tests/round4_autonomous_routes.js --scene lower-east --age adult --steps 170 ...` and `--scene skyway-up --age adult --steps 260 ...`: 20 matched specimens each, complete outputs in `data/combined-*.json`, `.csv`, and traces.

## Known limitations and unresolved defects

**Navigation:** The lower ditch is traversable; high orchard is **not reliably reachable** (4/10 trained, 0/10 novice in limited 26-s trials); the skyway uses the right-hand branch of a lift whose older topology only represents one upper neighbor. Passing strategies are probabilistic and fail in some physical situations; hollows caused falls in the specialist tests. Nothing teleports Norns to guarantee success, and no unobserved pass receives credit.

**Handspeak:** Real hardware microphones, real background OS recognition, Android, diverse accents and acoustics were not tested. SpeechRecognition may use a browser/cloud service and can be suspended; optional local tone detection is a fictional/game convention **not** a validated aggression detector. It's Off by default. An untrained Norn still has to learn *eat* and *grapes*. Food-goal binding does not assure physical completion; carried food remains a known limitation.

**Lineage:** Birth metadata can be lost after world reload; protected `.nwegg` v1 intentionally unchanged. Departed records retain at most 32 entries; a requested seed-based clone may not be genetically identical for modified/bred offspring. Reports explicitly disclose this. Long-term lifespan, full persistent virtual-disk save, standalone `file://` boot and actual Latch install not verified.

**Inherited bugs/not included:** Earlier smart `both` dual-gait preset remains broken/unverified. Planned limb-snare contact-clamping overhaul; touch-driven flinching rather than external throwing; infant Hand grasp and finite-force release are **not** implemented in this Round 4 merge. They require a separate physics pass and safety testing. File-based objects hidden in mail/encrypted archives are only an architectural proposal; no Latch host, mail, or virtual filesystem modifications were made.

**Browser persistence:** The Chromium full-game test via `page.set_content` ran in an originless frame. In-memory LatchFS read/write passed, but localStorage reported access denied; persistence therefore remains **NOT VERIFIED**, not a regression demonstrated by a normal browser origin.

## Consuming the release

The standalone HTML may be opened directly by a user in a browser. The app-only Latch ZIP contains `apps/norn-world-lab/index.html` and release notes and is intended for the separate Latch integrator; it does **not** install/modify the shell, installer or existing installation gate.

The Source-and-Tests ZIP includes baseline, merged working source, unified patch, each original handoff with raw evidence, QA logs, scripts and outputs. To reproduce: extract, run `python tools/check_source.py`, and execute individual tests listed above. Because all sources are actual inlined JS plus test fixture loaders, desktop and mobile results must be verified independently on target devices before describing them as production-tested.
