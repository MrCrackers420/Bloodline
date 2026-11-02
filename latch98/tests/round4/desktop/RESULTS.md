# Latch 98 Round 4, Thread 1 — Fullscreen Game Performance Mode

## Scope and source

Baseline: `LATCH-R4-2026-11-01-R3-NORN-MERGED`, from the supplied Round 4 archive. This patch changes **only** `web/desktop.js`, `web/standalone_runtime.js`, and files under `tests/round4/desktop/`. Nothing under `apps/`, `web/filesystem.js`, `web/swarmwire.js`, `web/latchnet.js`, or shared build tools has been edited.

### Actual behavior

- Starting **fullscreen** Bloodline automatically disables three recurring Latch-owned background shell intervals: desktop controller navigation (120 ms), clock refresh (15 seconds), and screensaver checks (9 seconds). Returning reinstates them once and immediately refreshes the clock. Opening windowed Bloodline, Wilds, Catacombs or Weed Warrior does **not** enter this mode.
- Dormant gamepad-exit polling no longer runs while the game overlay is closed. **During** fullscreen, the standalone or modular exit poll still runs at 130 ms to keep the Back+Start hold usable. The Return button and Ctrl+Shift+Esc remain supported; no game key mapping is rewritten.
- While fullscreen, `latchfschange` still occurs and the filesystem/transfer carries on, but the *Latch shell's* visual desktop/explorer/disk-tray refreshes are deferred and coalesced by key. On return, the current disk state is rendered once. Wallpaper restyling is separately coalesced when a custom wallpaper is selected. User-created files and transferred data are never discarded or postponed by this patch.
- Error recovery: modular iframe `error` returns to desktop with an error dialog; standalone iframe `error` returns to desktop. A stale asynchronous standalone game lookup or import callback cannot re-open the game after a close. Fullscreen starts and stops only one exit poll per owner.
- No visual redesign, no "performance boost" badge or cosmetic setting. Windows, virtual disk, save storage, and iframe contents stay intact on entry/exit.

## Measurement method

The Chromium binary in this execution environment is subject to managed policies `URLBlocklist=["*"]` and `FullscreenAllowed=false`; even `data:`, `file:` and `http://localhost` navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`. **Real Chromium timing / CPU / FPS results could therefore not be obtained.** No FPS or wattage gains are claimed.

For a reproducible comparison, `performance.test.cjs --measure-only` loads the **real** baseline or patched JavaScript in separate Node.js VM realms with a small fake browser surface. Virtual timers run for **exactly 3,000 ms per phase**; all top-level `setInterval` callback invocations are counted, and `latchfschange` events are supplied explicitly. The iframe's internal Bloodline timers **are not counted**. The VM records callback volume and host DOM-refresh attempts, **not CPU-time savings or browser paint cost**. `window.LatchGamePerformance.stats()` also exposes per-shell-job invocation counts and real `performance.now()`-based callback duration when run in a browser, without globally modifying clocks.

| Launch type | Phase (3,000 ms) | Baseline top-level interval calls | Patched calls | Explanation |
|---|---|---:|---:|---|
| Modular | Desktop idle | 48 | 25 | Dormant fullscreen exit poll removed |
| Modular | Bloodline fullscreen | 48 | 23 | 0 shell jobs; 23 necessary exit polls |
| Modular | Bloodline windowed | 48 | 25 | Normal shell jobs run; no forced background pause |
| Modular | Returned to desktop | 49 | 25 | Shell jobs restored, no leaked exit poll |
| Single-file | Desktop idle | 71 | 25 | Two dormant exit polls avoided |
| Single-file | Bloodline fullscreen | 71 | 23 | 0 shell jobs; one exit poll retained |
| Single-file | Bloodline windowed | 71 | 25 | Shell runs normally |
| Single-file | Returned to desktop | 72 | 25 | Normal shell restored |

**Hidden-shell DOM work test:** 14 successive virtual disk change events during fullscreen previously caused 14 desktop icon refresh attempts. After the patch they cause **0** while hidden and **1** once on return. There is no loss of disk events or persistent state, because only UI repaint work is deferred. If no background disk activity is occurring, the practical runtime gain can be very small despite reduced wakeups.

## Background application policy

1. **Shell-controlled tasks:** Only the three identified shell intervals and shell display-refresh work are paused/deferred automatically.
2. **Opt-in cooperative applications:** A *future* app may explicitly call `window.LatchGamePerformance.registerCooperativeApp(id,{pause,resume})` from its own integration layer. `pause({reason:'bloodline-fullscreen'})` must return `true` or `{paused:true}` (or resolve to either) as a positive acknowledgement. Only acknowledged pauses are reported as paused and later resumed. Calling `unregister()` returned by registration removes the app; a delayed positive pause acknowledgement after closing still causes resume. The cooperative registry is **not** used for any bundled app in this patch.
3. **Non-cooperative iframes:** Norn, SwarmWire, LatchNet, standalone games, arbitrary iframes, and other apps are **not** claimed to be suspended. SwarmWire's independent 300 ms transfer interval keeps its existing logic; Norn's simulation is not sent control messages. Browser throttling of a hidden iframe is browser-defined, not guaranteed by the shell.

`window.LatchGamePerformance.stats()` reports `active`, `owners`, `transitions`, deferred shell refresh keys, shell job counts/scheduled flags/durations and **only registered** cooperative app states. `enter` and `exit` are internal launcher integration hooks using distinct owner tokens (`modular-bloodline`, `standalone-bloodline`). An integrator need not edit shared build scripts: the existing standalone builder inlines both changed JS files.

## Verification and reproducibility

Commands, from the project root:

```bash
node --check web/desktop.js
node --check web/standalone_runtime.js
node tests/round4/desktop/performance.test.cjs
node tests/round4/desktop/performance.test.cjs --measure-only
node tests/round4/desktop/performance.test.cjs --measure-only --standalone
# To compare a separately extracted pristine Round 4 baseline:
node tests/round4/desktop/performance.test.cjs --measure-only --root /path/to/untouched/R4
node tests/round4/desktop/performance.test.cjs --measure-only --root /path/to/untouched/R4 --standalone
python tools/release_check.py --output /tmp/latch98-r4-release-check.html
python tools/parallel_merge.py check --thread desktop --zip /path/to/Latch98-R4-Thread-1-Changes.zip
```

Also included `tests/round4/desktop/browser_smoke.py` for a future unrestricted Chromium host (`python tests/round4/desktop/browser_smoke.py`). It tests the actual modular DOM, fullscreen/windowed paths, keyboard exit, touch-sized Return, cooperative protocol and per-interval wall-clock metrics. **It was not possible to execute here** due to managed URL blocking. Therefore real touch/gamepad hardware behavior, real Bloodline rendering performance and full fullscreen permissions remain **unverified**. VM gamepad tests simulate the controller values using the existing source and confirm the hold logic.

Results from this session:

- JavaScript syntax checks: **PASS**.
- Deterministic Node VM tests: **PASS** (modular, standalone, restart/return, keyboard and visible-button dispatch, controller hold, synthetic cooperative ACK/no ACK, no automatic Norn suspension, hidden desktop refresh batching, windowed Bloodline and Wilds/Catacombs/Weed Warrior launch selection, unexpected frame errors and standalone close-before-async-load).
- `python tools/release_check.py --output ...`: **PASS**, including required embedded game payload digests and existing project Node regression suite.
- Browser smoke via Chromium: **BLOCKED BY ADMINISTRATOR POLICY** (not a pass).
- `parallel_merge.py check`: see separate validation log at delivery time.

## Limitations / integrator handoff

The patch makes no promise that a hidden Norn iframe or any unregistered application stops computing. Cooperative app pausing needs an explicit safe app-side opt-in in another team's authorized changes, not an invented iframe `postMessage` convention. Repeated `latchfschange` notifications from SwarmWire may still update **SwarmWire's own hidden UI** and persist each progress step; that app's scheduling belongs to another worker. Actual FPS, graphics/GPU use and CPU time need repeatable profiling on an unrestricted machine. The integrator should run browser smoke on both modular and freshly bundled standalone HTML before publishing.
