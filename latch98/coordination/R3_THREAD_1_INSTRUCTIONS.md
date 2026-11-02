# Latch 98 Round 3 — Thread 1: Desktop and window experience

**Owner ID:** `desktop`  
**Owned files:** `web/index.html`, `web/desktop.js`, `web/desktop.css`, `web/shell_v07.css`, `web/explorer_v08.css`, `web/standalone_runtime.js`  
**Start from:** `Latch98-Round3-Shared-Base.zip` plus `coordination/R3_SHARED_RULES.md`.

## Assignment

Make Latch 98 feel like a coherent keyboard/mouse/touch/controller-friendly 1998 computer instead of a set of overlapping web views. **Focus on robust window/taskbar state and discoverable launching.** Do not modernize the visual language or replace it with card-style UI.

1. Audit existing window activation, minimization, maximization, resize and drag. Reproduce at least two real defects before making code changes (e.g., focus lost after closing a modal, windows stranded after viewport changes, overlapping Start submenus, taskbar not restoring a minimized app, duplicate game windows).
2. Fix the highest-impact issues with persistent, bounded window geometry; any saved layout must clamp to the screen after changing orientation/resolution and must not cover critical controls permanently. Avoid hijacking touch scrolling inside child applications.
3. Improve keyboard interactions: reliable focus return after closing a window/dialog; Start menu Arrow/Enter/Escape; accessible window/taskbar titles; documented shortcuts; test `Alt+Tab`, `Alt+F4`, and the Bloodline Return control, leaving the fullscreen game with input focus.
4. Maintain obvious **Postbox Mail** and **Sprite Studio** desktop and Start entries, even when the user's virtual disk was created before these shortcuts existed. Do not auto-install Norn Lab.
5. When useful, add a short first-boot desktop Help explanation for the already-hidden Norn installation mystery without giving away/shortcutting the actual email or directly opening the torrent.

## Boundaries

- No edits to `web/filesystem.js`, `web/swarmwire*`, `web/latchnet*`, `apps/**`, `tools/**`, Rust host or Norn World Lab. Propose an integrator API for anything cross-owned.
- Windowed Bloodline and fullscreen Bloodline must remain distinguishable; fullscreen must fully hide Latch shell and retain always-visible Return to Latch control, escape via keyboard and controller, and functional touch exit.
- If you add an application menu item, it may only target an existing launcher already supported by the baseline. New app integration is integrator-owned.

## Acceptance tests

- Browser test desktop (>=1100 px), tablet/phone (~390 px), landscape and an in-session resize: open 3 windows, minimize/restore, drag partially offscreen, reboot/reload, verify recovery.
- Verify both Bloodline launch modes, Postbox and Sprite Studio shortcuts; no regressions in first-run Norn installation.
- Include screenshots or automated DOM geometry/assertions of fixed defects, not simply static mock-ups.

**Deliver:** `Latch98-R3-Thread-1-Changes.zip` with ONLY owned files, test findings, and any cross-team integration requests in the message. Do not include a newly built 7MB standalone HTML.
