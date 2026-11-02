# Latch 98 — Round 3 parallel development

Five fresh Latch 98 specialist workstreams, plus **one Latch-only integrator**. Norn World Lab's five specialist threads and its separate Norn-only integrator independently control all Norn simulation plans and files. This is NOT a Norn simulation project.

**Use `coordination/R3_SHARED_RULES.md` and exactly one `coordination/R3_THREAD_X_INSTRUCTIONS.md` per Latch worker.** The integrator's own plan is `coordination/R3_INTEGRATOR_PLAN.md`, and the Norn intake interface is `coordination/R3_NORN_INTERFACE_CONTRACT.md`. All patches start from the same `LATCH-R3-2026-11-01` source snapshot. Do not use older Round 2 instructions.

| Thread | ID | Exclusive area |
|---|---|---|
| 1 | `desktop` | Desktop, taskbar, windowing, fullscreen UX |
| 2 | `disk` | Virtual disk, SwarmWire, installer persistence |
| 3 | `apps` | Audio creative suite and other non-Norn non-Sprite games |
| 4 | `network` | Fictional LatchNet and Postbox pages |
| 5 | `sprite` | Standalone Sprite Studio and Flipnote import |
| Latch integrator | `integrator` | Merge, test, release, Norn artifact intake |

**No Latch worker may modify `apps/norn-world-lab/**`.** Norn simulation updates are accepted only as completed tested releases through the Norn integrator. Frozen Norn byte integrity is checked by `python tools/test_norn_boundary.py`.

## Smoke commands

```sh
python tools/parallel_merge.py status
python tools/test_parallel_merge.py
python tools/test_norn_boundary.py
python tools/release_check.py
```

All apps are included in Latch's standalone release from the modular source using `python tools/build_standalone.py`. The live player still must discover/install Norn World Lab through the original Postbox → SwarmWire → virtual CD → Setup sequence.
