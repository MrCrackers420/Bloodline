# Latch 98 Round 4 — Thread 4: LatchNet and Postbox UX

**Independent goal:** Make Latch 98's fictional 2003 internet feel browsable, persistent and believable, while keeping the Norn Lab email easy to find without turning the mystery into an auto-install shortcut.

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`. Read shared rules first.

## Current code

- `web/latchnet.js` defines LatchNet browser pages, address routing, fictional sites, Postbox inbox/message content and client rendering.
- `web/latchnet.css` defines the Win98 period styling for these pages.
- Thread 1 owns shell desktop and Start/desktop shortcuts; Thread 2 owns SwarmWire download logic and virtual filesystem. Do not modify either.

## Required work

1. Audit the **real navigation flow** from existing Postbox desktop/Start shortcuts to inbox → private message → `NWLAB03.torrent` attachment. Preserve the current sender/date/identity of the private email; do not duplicate or expose the ISO as a public direct download. Keep the attachment action wired to real SwarmWire integration.
2. Improve back/forward behavior, link state, folder/message navigation, keyboard focus, accessible message-opening controls and responsive phone layout. Fix dead links, incorrectly rewound history, or UI controls without actions.
3. Expand LatchNet only where the extra pages add useful in-world content: archived discussions, software reviews, release notes, little hints or fictional websites relevant to established applications. Do not add obvious instruction popups or break the in-world progression.
4. Ensure existing LatchNet locations (`Postbox`, PixelShelf, news, directory and hidden routes) remain reachable. Use accurate link destinations and avoid hardcoded untrusted external scripts or unsafe HTML interpolation in message content.
5. If persistence requires calling LatchFS, use existing public APIs only; document any additional API for integrator instead of editing `web/filesystem.js`. Avoid adding network dependencies; all pages must work offline.

## Required tests

- Open Postbox from the desktop icon and Start entry on a clean disk and a preexisting saved profile; locate and open the private email without knowing an arbitrary URL.
- Click `NWLAB03.torrent` and verify existing SwarmWire launch, without bypassing its download/ISO/setup flow.
- Navigate multiple sites, use back/forward/reload, click common mail operations, and test focus/keyboard semantics at desktop and phone widths.
- Confirm content is escaped as necessary and no duplicate private messages are inserted on reopen.
- Tests live under `tests/round4/latchnet/**` and should record actual passes/failures.

## Ownership

Only `web/latchnet.js`, `web/latchnet.css`, `tests/round4/latchnet/**`. Do not edit disk, SwarmWire, desktop, Norn, apps, or tools. Cross-app needs go into `RESULTS.md` for integrator.

## Deliverables

`Latch98-R4-Thread-4-Changes.zip`, `RESULTS.md` with site/navigation map and test results, regression tests. Validate with `--thread network`.
