# Latch 98 Round 5 — Thread 1: Desktop, window lifecycle & period-accurate shell

**Baseline:** `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` from `Latch98-Round5-Shared-Base-With-Rules.zip`.

## Assignment

Own the shell and fullscreen launcher. Main goal: every desktop/window/system message should belong in a 2003 computer interface. Audit Start, Control Panel, Help, program launch errors, background/foreground transitions, window/taskbar controls and the Bloodline missing-program flow. Preserve Game Performance Mode: measure/tally timer wakeups, make nested fullscreen/windowed returns restore focus and keyboard/controller state, and do not double-suspend or accumulate background jobs. Don't claim to pause all other apps or modify their sources. If a performance problem depends on another app, document a cross-team request rather than editing it. Focused tests should cover opening Bloodline fullscreen, exiting through onscreen control and Ctrl+Shift+Esc, reopening another app, and reboot/profile persistence. Preserve accessibility, touch navigation and the existing visible exit button. No new OS theme.


## Mandatory handoff for this thread
1. Read `SHARED_RULES.md` from the shared ZIP first; inspect `coordination/OWNERSHIP.json` and `coordination/base_manifest.json`.
2. Run baseline tests before editing. Record actual bugs and a small reproduction.
3. Work ONLY on assigned paths. Preserve protected applications and Norn checksum.
4. Return a ZIP with changed **project-relative files** (no enclosing extra folders or unrelated baseline files), and a changelog + new regression tests under your owned test directory.
5. Include copy-audit findings (screens inspected and exact replacements), test commands and outcomes, limitations, and integrator requests. The integrator merges patches; don't independently publish a full replacement Latch OS.
