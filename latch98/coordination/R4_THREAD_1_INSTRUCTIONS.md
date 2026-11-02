# Latch 98 Round 4 — Thread 1: Game Performance Mode

**Priority 1 / principal user goal:** When Bloodline is launched fullscreen from Latch 98, reduce unnecessary Latch host activity so it doesn't steal performance from the game. Keep Latch loaded for instant return and preserve the active desktop, windows and saved disk. Make changes demonstrably real and safe, not a “Performance Mode” label that does nothing.

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`, from the Round 4 shared source ZIP. Read `Latch98-Round4-Shared-Rules.md` first.

## Current implementation to inspect

- `web/desktop.js`: `modularGame` manages fullscreen Bloodline in `#l98-modular-game`; `launchBloodlineFull()` hides `el.desktop` but does not suspend all shell timers. `closeFullscreenGame()` restores focus. `launch('bloodline-windowed')` uses a separate window.
- `web/standalone_runtime.js`: `window.LatchBundle.fullscreenGame()`, `.launchBloodlineFull()`, `.closeFullscreenGame()` handle the bundled single-file game, including srcdoc/import/network fallback and the visible Return button.
- `web/index.html`, `web/desktop.css`, `web/shell_v07.css`: desktop/overlay DOM and shell styling.
- `web/desktop.js` and `web/standalone_runtime.js` contain gamepad polling intervals. Preserve Back+Start hold, keyboard Ctrl+Shift+Esc, touch Return control and iframe focus on entry/exit.

## Required work

1. **Measure first.** Create a reproducible baseline that counts shell rendering/scheduling activity and measurable host update work over fixed windows: idle desktop, Bloodline fullscreen, Bloodline windowed, and after returning. Separate the host from actual Bloodline work. Prefer Chromium Performance API, rAF/timer counters scoped to Latch functions, or Playwright instrumentation. Never invent FPS/CPU savings.
2. Implement an **automatic fullscreen Game Performance Mode**, not an intrusive settings redesign. Provide one concise retro 98-style status/setting if needed, but do not remove the quick exit overlay. Limit/skip shell-only tasks while fullscreen game is open, preserve menu/window state, and restore listeners, taskbar updates, timers and focus on return. Do not destroy windows, reload the shell or discard storage.
3. **Background app policy:** distinguish (a) shell activity under Latch's control, (b) iframe activities with an explicit safe `pause`/`resume` protocol, (c) other apps with no safe pause contract. Handle (a), optionally support (b) with acknowledgement and correct state restoration, **never falsely claim (c) is suspended**. Do not send arbitrary undocumented control messages to Norn or mutate its simulation. No page-wide monkeypatch of `requestAnimationFrame`, intervals, clocks, audio contexts, or event listeners.
4. Keep game input, fullscreen permissions, import picker, and return behavior intact. Avoid intercepting the game's keyboard/gamepad events, particularly Back+Start combination. Handle repeated launches, close-before-load, focus change, errors and tab visibility transitions.
5. Account for **windowed Bloodline** and Wilds/Catacombs/Weed Warrior: decide whether Game Performance Mode should remain fullscreen-only or be explicitly user controlled elsewhere. Do not claim automatic suspension for windowed games without implementing/testing it. Preserve every launch path.
6. Add deterministic regression tests under `tests/round4/desktop/` showing shell activity is reduced while fullscreen where applicable, normal after exit, and no changes to Norn/SwarmWire state or Bloodline gameplay source.

## Required test cases

- Single-file local HTML fullscreen launch (embedded Bloodline); close by visible button, Ctrl+Shift+Esc, and gamepad Back+Start when available; refocus and open applications afterwards.
- Modular web fullscreen launch and return; verify selectors and browser history unaffected.
- Bloodline windowed still works and is independently closeable; Wilds and Catacombs launch and respond.
- Simulated background app with cooperative pause/resume *and* one with no pause support: confirm supported suspension only and accurate status/logging. No automatic Norn simulation mutation.
- Repeated launch/exit, full browser visibility change, and unexpected game load failure; no stuck desktop-hidden state or duplicate intervals.
- Report before/after host-activity metrics, measurement method, hardware/browser context if available, and any unsupported suspension areas. If host activity barely changes, say so.

## Ownership

Only `web/index.html`, `web/desktop.js`, `web/desktop.css`, `web/standalone_runtime.js`, `web/shell_v07.css`, `web/explorer_v08.css`, `tests/round4/desktop/**`. Do not edit `apps/**`, `web/filesystem.js`, `web/swarmwire.js`, `web/latchnet.js`, common build/test tools, or protected Norn/Bloodline source.

## Deliverables

`Latch98-R4-Thread-1-Changes.zip` (only changed/new owned source), test code, `RESULTS.md` including measurements, and a concise integrator API handoff for any cross-file build wiring. Test against the **Round 4** source and validate with `python tools/parallel_merge.py check --thread desktop --zip ...`.
