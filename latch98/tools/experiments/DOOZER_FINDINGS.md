# Thread 4 — Doozer teacher spatial-perception fix

## Scope and hypothesis

**Baseline:** byte-exact Norn World Lab Step 32, SHA-256 `38da534fdd76732caddff88539c6310aa07181a451d7bfb53b161752af9f13b1`.

**Observed source defect:** The real `socialStep()` loop in the in-game Language Lab determines Doozer listeners using:

```js
Math.abs((n.body?.x ?? n.x ?? 0) - d.x) < 180
```

Norn physics bodies expose points in `n.body.p` but no `n.body.x`; standard Norn state also has no `n.x`. The fallback therefore returns **0** for a Norn anywhere on the map. Doozers near x=0 teach Norns who are physically far away, while teachers near real Norns elsewhere teach nobody. This affects the **actual `hear()` vocabulary-learning path**, not merely an explanatory display.

**Hypothesis:** Using the public simulation coordinate helper `NornCore.cxOf(n.body)` should restrict hearing to Norns genuinely within 180 world pixels of the Doozer, allowing genuine vocabulary acquisition when the teacher is nearby and preventing remote learning without a physical encounter.

## Intervention

In `socialStep`, read the actor's x position from the established physics body API rather than the nonexistent `body.x` field. Require a valid body/finite position; preserve the previous 180 px hearing range, lane restrictions, Doozer word sampler, learning strengths, vocabulary and speech understanding. No new predefined Norn dialogue or behaviors, and no changes to genetic inheritance.

## Reproducible controlled experiments

Program: `tests/doozer_spatial_experiment.py`. Results: `tests/results.json` (**192 trial rows total**, 96 unchanged and 96 updated). The experiment executes both real Step 32 HTML builds in headless Chromium using the real `NornCore` and Language Lab. The test-only instrumentation exposes `socialStep()` so each world is advanced through the same deterministic teaching opportunities; no production test hooks are shipped in the updated HTML.

- **Seeds:** 101 through 132 inclusive, 32 independent replications for each condition, per build.
- **Norn positions:** A = x800, B = x1600, C = x2400. Actual core `cxOf(body)` was verified; raw results show `body.x` is null for all three.
- **Conditions:** one Doozer placed at x1600 (beside B), x100 (near world origin, far from all Norns), or x4500 (far from everyone and from origin).
- **Controlled timing:** five scheduled teaching opportunities per trial, at world t=1, 11, 21, 31, 41 seconds relative to the start of its isolated time window. One deterministic Math.random stream per seed; each world has no locomotion or secondary teachers during the isolated hearing experiment. This isolates hearing rather than movement.
- **Primary measures:** real learned-word strengths via `window.nornLanguageDebug.vocabulary(name)` before/after the five teaching events. **`heard` means a measured, positive vocabulary-strength change**, not an inferred spoken thought. Teacher's intention to speak is distinguished from the actual per-Norn learning outcome.

| Teacher location | Control: trials with learned word (A/B/C) | Updated: trials with learned word (A/B/C) | Mean cumulative word-strength gain (control → updated, A/B/C) |
|---|---:|---:|---|
| x1600, beside B | 0 / 0 / 0 | 0 / 32 / 0 | 0/0/0 → 0/22.49/0 |
| x100, no Norn nearby | 32 / 32 / 32 | 0 / 0 / 0 | 22.49/22.49/22.49 → 0/0/0 |
| x4500, no Norn nearby | 0 / 0 / 0 | 0 / 0 / 0 | 0/0/0 → 0/0/0 |

**Interpretation:** The controlled results support the positional bug hypothesis. Before the change, an out-of-range teacher at x100 erroneously causes learning in all three distant Norns; the actual nearby teacher at x1600 fails to teach B. After the change, only B learns at x1600. The control x4500 demonstrates that this does not simply force all Doozers to teach everyone.

These are engineered isolation conditions rather than full ecological/long-term learning outcomes. No claim is made about whether a Norn later understands grammatical sentences or develops social trust from hearing a Doozer; only the measured hearing/association outcome is established.

## Regression checks

- **Integrity:** `tests/verify_integrity.py` checks exact baseline checksum, proves only the one Doozer listener expression changed, verifies unified diff applies without fuzz and recreates the updated HTML byte-for-byte; verifies bridge and desktop scripts are unchanged, and runs `node --check` on core and applet scripts. **Passed.**
- **Browser bootstrap and rendering:** Chromium loaded the updated Step 32 app with no page exceptions. The standard "Create loving family" control produced **Bram, Mira, Pip**; world time advanced from 0 to 0.6 in the smoke window, with a visible canvas, recorded draw timestamp, no reported render error, and WASM status `ready`. A browser screenshot is in `tests/updated_browser_smoke.png`. Same smoke checks passed on unchanged control.
- **Grammar compatibility:** Both `Bram no slap Pip` and `No slap Pip, Bram` still resolve to a prohibition for actor Bram, predicate slap, object Pip, polarity -1, confidence 0.94 in both builds.
- **Save/open compatibility:** The **unchanged** `NornFiles` adapter opened its actual Save As and Open dialogs and successfully round-tripped JSON via an in-memory mock implementing the documented LatchFS host methods. Exact `norn-disk-host` and `norn-files` contents are byte-identical to Step 32. This checks adapter behavior, **not** a complete Latch installer/virtual-disk persistence cycle.
- **Save migration:** No schema, paths, save format or state serialization changed; no migration is required. Existing learned vocabulary remains unchanged until a future Doozer event.
- **Rust consistency:** The provided source embeds a Rust/WASM physics component, but the modification is exclusively in JS speech-hearing selection. The binary and physics binding were not changed. The new position is read using the same JS core `cxOf` helper already exposed to the host.

## Risks, limits and next tests

Doozers still use a simple horizontal 180 px tutoring radius. This patch does **not** introduce auditory occlusion through soil/booth walls, noise response, speech comprehension, attention switching or memory inheritance. A separate follow-up should evaluate occlusion and distraction only with controlled traces and without conflating auditory range with physical reachability. In full play, moving Doozers and Norns will cross the hearing radius dynamically; the controlled test purposely held those positions fixed. LatchFS persistence still needs to be tested under the latest actual Latch host after the integrator's three-way merge.

**Conclusion:** This is a narrowly targeted, evidenced simulation correction that enables actual nearby-learning encounters and removes false distant lessons without modifying the desktop, file bridge, genome, locomotion, story or language grammar.
