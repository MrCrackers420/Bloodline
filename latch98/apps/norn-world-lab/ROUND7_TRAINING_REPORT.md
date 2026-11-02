# Norn World Lab — Round 7 motor-training experiment

**Source:** Round 6 integrated standalone, SHA-256 recorded in `release-meta.json`. The Round 7 application adds two *optional* learned gait presets but does not alter existing training, attention, decision, biology, or Hand mechanics.

## What actually ran

- Actual NornCore world `tick(true)` Drill learning (including physical movement, real motor-network actor/critic updates, and practice-food acquisition).
- Two independent adult beginners started with fresh locomotion brains (seeds **4213** and **8128**). Each completed **3,000 real core ticks / 300 simulated seconds**. Seed 4213 ate **19** and seed 8128 ate **18** practice-food portions. Both motor weight sets changed.
- Seed 8128 then continued **6,000 additional ticks / 600 simulated seconds** starting from its saved 3,000-step gait. Total *cumulative motor practice* = **9,000 ticks / 900 simulated seconds**, with the second phase in a newly initialized practice world. This is *not* a claim that one original animal had a continuous 900-second autobiographical history.
- Exported locomotion only (`brain`, gait-specific rhythm tune). Language, trust, social bonds, autobiographical experience and subjective state were not copied into eggs.

## Holdout results

Four previously unseen evaluation seeds: **1301, 2903, 5219, 8191**. The environment used actual 260-tick / 26-second Drill trials with the same initial location, ground setting, and seed for each arm. Motor learning continued during evaluation, as it does normally in Drill. This is short-horizon performance, not long-term skill or general obstacle navigation. No special hand-guidance, scripted winning poses, or artificial velocity impulses were applied.

| Gait | Mean travel speed (px/s) | Mean eaten | Invalid body geometry |
|---|---:|---:|---|
| Plain untrained | 26.87 | 1.50 | None |
| Game's existing trained `quad` | 63.78 | 3.75 | None |
| New 4213, 300 s practice | 35.95 | 3.00 | None |
| New 8128, 300 s practice | 44.67 | 2.50 | None |
| New 8128, 900 s cumulative practice | **49.87** | **3.00** | None |

The extended 8128 motor profile beat the untrained control for measured speed on all four holdout seeds, and its average travel speed increased from 44.67 to 49.87 px/s relative to the original 300-second 8128 profile. However, the built-in `quad` preset remained faster on average. In the 900-second comparison, the additional gait was faster than the `quad` preset on 2 of 4 seeds, slower on 2. This is *not* evidence it is a universally superior gait.

**Different measurement:** the `speed` statistic in the raw outputs represents the game's own progress measurement, while `actualAverageTravelSpeed` is absolute measured body displacement accumulated across ticks. This report compares the latter, which is not equivalent to sustained goal-directed velocity.

## Deliverable behavior

- Egg Maker has two additional **optional** gaits: `r7practice8128` (15-minute motor practice) and `r7practice4213` (5-minute practice).
- Existing default gait selection, previous learning, and all Norn/non-Norn features remain as before.
- Both learned motor profiles are also individual JSON files for the game's gait-loader interface.
- The newest trained profile starts a newborn's motor brain at age 9,000. Browser hatch test confirmed separate initial Hand trust **0.1**, not inherited from the trainer.

## Verification

- `python source/tools/check_source.py --candidate ...`: 27 JS scripts syntax-checked, protected `norn-disk-host` and `norn-files` preserved byte-for-byte.
- `node test_training_release.js`: both optional gaits load, age progresses during actual physics ticks, all body points remain finite, and a custom-gait egg hatches.
- `python browser_training_smoke.py`: 5/5 checks, Chromium boots real UI and hatches trained-gait egg, no JS errors.
- See `training-results.json`, `extended-results.json`, `run.log`, and `extended.log` for individual seed results and actual command progression.

## Limitations

The training improves a narrow observable motor metric, not emotional intelligence or generalized reasoning. Trials were limited to four holdout seeds and 26 seconds each. No claims are made about stairs, high skyways, pain-free stability over hours, natural-language understanding, long-term caregiving, or better social relationships. There was no full multi-day living-world run, no external real microphone test, and no actual Latch installation test. A standalone browser boot was confirmed with `set_content`; local `file://` persistence was not checked.
