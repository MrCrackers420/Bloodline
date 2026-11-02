# Latch 98 Round 4 — Thread 2: Virtual Disk Durability and Transfer Recovery

**Independent goal:** Make Latch 98's virtual drive resilient to damaged/older saves, interrupted writes, browser storage failures, bad backup files and paused/restarted SwarmWire transfers. This task is independent of Thread 1's Game Performance Mode.

**Baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED`. Read shared rules first.

## Current code and constraints

- `web/filesystem.js` owns `window.LatchFS`, in-browser virtual C:/A:/D: drives, migrations, backups, installation records, disk capacity and `ensureSystem()`. It has a staged/async persistence path, removable disks and installed programs.
- `web/swarmwire.js` and `.css` own the torrent handoff, simulated transfer persistence, and resume/pause UI. `NWLAB03.torrent` is a fictionally discoverable download, not a real Internet torrent.
- Norn is a separately maintained app. Its filesystem bridge must remain unchanged, and no clean disk may auto-install Norn Lab.
- Postbox message bodies and LatchNet site content belong to Thread 4; don't change those.

## Required work

1. Build a reproducible **fault matrix** for empty storage, pre-Round-3 data, partially corrupted disk snapshots, quota errors, interrupted/simultaneous saves, malformed import/backups, duplicate filenames and rolled-back writes. Inspect the real serializer, validators and migration path before deciding fixes.
2. Improve atomicity/recovery where meaningful: avoid overwriting the last known good data on validation failure, report clear errors, and preserve the ability to restore/backup valid state. Never silently wipe real user saves or imply a backup is restorable unless round-trip tested.
3. Harden backup import/export with size/syntax/type/path validation and defensive handling of invalid or hostile file metadata. Ensure legitimate old snapshots migrate without losing existing folder contents, games, media mounts or installed-app flags.
4. Test SwarmWire pause, resume, refresh and process interruption with deterministic transfer state. No progress jump/loss except intentional migration behavior; avoid race conditions around Pause vs a final in-flight tick. Downloads do not complete or mount ISOs magically.
5. Keep filesystem operations and transfer behavior functional while Bloodline fullscreen is running. If Thread 1 needs a lightweight host contract, document the API; **do not alter Thread 1 files or pause transfers silently**.
6. Preserve `D:\Setup.exe` and the strict Postbox → SwarmWire → ISO → installation path. Ensure no duplicated install/menu entries or accidental removal of Norn from existing installations.

## Required tests

- Fresh browser profile and imported old profile; invalid backup rejects safely; valid backup round trip preserves named files and modified timestamps where promised.
- Inject storage failures (e.g. quota/write rejection) and verify in-memory/last-good data consistency; don't claim atomicity beyond what the browser platform permits.
- 2 or more conflicting writes, simultaneous file ops if supported, full disk, mounted readonly media, path traversal/invalid names.
- Pause/resume/refresh an interrupted `NWLAB03` transfer, ISO mount and Setup. Rerun without clearing Latch storage.
- Include deterministic Node tests under `tests/round4/disk/` and documented browser cases.

## Ownership

`web/filesystem.js`, `web/swarmwire.js`, `web/swarmwire.css`, `tests/round4/disk/**` only. No edits to `web/desktop.js`, `web/latchnet.js`, app HTML, or tools/coordination. If UI hooks are needed, describe them for the integrator.

## Deliverables

`Latch98-R4-Thread-2-Changes.zip`, tests, `RESULTS.md` with actual failure reproductions and fixed/unfixed items, migration and backward-compatibility notes. Validate the patch with `--thread disk`.
