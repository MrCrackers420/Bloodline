# Latch 98 Round 3 — Thread 2: Virtual disk and SwarmWire reliability

**Owner ID:** `disk`  
**Owned files:** `web/filesystem.js`, `web/swarmwire.js`, `web/swarmwire.css`  
**Start from:** `Latch98-Round3-Shared-Base.zip` plus the common rules.

## Assignment

Make the virtual disk and fictional 2003 transfer/installation pipeline reliable under interruptions and existing saves. The goal is a *real working simulated installer*, not a Norn autoinstall shortcut.

1. Test fresh boot versus installed browser state, ordinary reload, old virtual disk imports, restore after an interrupted SwarmWire download, and the reinserted ISO → D: installation steps. Find and fix genuine persistence/consistency bugs first.
2. Improve **transactional safety** of filesystem writes. In the existing API, operations can mutate the disk before a failed storage write. Preserve a usable backup and report quota or corruption errors clearly instead of silently claiming success. Do not arbitrarily raise storage limits beyond actual browser constraints.
3. Make disk backup/restore and media changes preserve the SwarmWire progress, installed-program records, user-created folders, and Norn save files together. Maintain case-insensitive paths, read-only CD-ROM semantics, and invalid-path/reparse protection.
4. Improve SwarmWire state messages and interrupted/resumed progress, distinguishing fictional transfer size from actual downloaded bytes; avoid mock statements implying a real BitTorrent transfer. The program should be usable offline once downloaded/bundled.
5. Preserve the **exact shared API** used by applications (`window.LatchFS`, `ready`, `get`, `list`, `write`, `read`, `writeImage`, `sync`, `export`, `importDisk`, `saveNornTorrent`, `downloadNornDisc`, `mountDisc`, `installSoftware`, etc.). If proposing a new API, make it additive and document examples.

## Boundaries

- **No edits to Postbox or LatchNet:** `web/latchnet.js` and `.css` belong to Thread 4. Preserve its existing `NWLAB03.torrent` attachment path and behavior.
- **No edits to Norn Lab** (`apps/norn-world-lab/**`). The Norn integrator owns the simulation and its embedded file adapter. Submit an exact interface request to the Latch integrator if absolutely necessary.
- Do not change desktop launch behavior, Rust host paths, or other app sources.

## Acceptance tests

- Old-disk import → transfer → install → export backup → reload/import → app remains installed; test file content and progress against expected data.
- Tests for disk-full/quota failures, failed import rollback, CD-ROM read-only, invalid paths and interrupted transfer; demonstrate no partial or phantom success.
- Run Node disk/install/media tests; include exact test commands and observations. Verify installed Norn Lab can still see shared `LatchFS` without changing Norn code.

**Deliver:** `Latch98-R3-Thread-2-Changes.zip`, containing only `web/filesystem.js`, `web/swarmwire.js`, `web/swarmwire.css` and no other paths. Put test scripts in the response or request that the integrator add them under `tools/` (tests cannot be patched outside owned files).
