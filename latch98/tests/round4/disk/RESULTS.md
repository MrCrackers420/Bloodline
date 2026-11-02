# Latch 98 Round 4 — Thread 2: Disk Durability and SwarmWire Recovery

Baseline: `LATCH-R4-2026-11-01-R3-NORN-MERGED`, with only Thread 2-owned files modified.

## Source changes

- `web/filesystem.js`: added an exact-byte localStorage freshness check before each disk commit, preventing a stale tab from knowingly replacing a more recent saved image. Added optional `LatchFS.reloadFromStorage()` to deliberately re-read and validate the saved machine without replacing it with an old in-memory version. Unchanged clean profiles no longer write a new disk revision just by reopening. Existing API signatures and storage keys are unchanged.
- `web/filesystem.js`: more defensive validation of unsafe entry metadata, invalid modification times, negative display sizes, invalid installer/shortcut fields, invalid disk revisions and mounted ISO references. Disk writes now validate the candidate before committing. Export checks importability before labeling its JSON as a backup. Startup migration exceptions fall back to the original image, rather than rejecting `ready` without a usable state. Invalid saves remain blocked, and `recoveryRaw()` preserves original corrupt bytes for manual extraction.
- `web/swarmwire.js`: opening a second UI destroys the prior transfer timer; previously, two instances could both advance the same job. Save-error notices now include the actual failure reason and persisted percentage. The existing 300 ms/1.5% fictional progress simulation is unchanged.
- No `web/swarmwire.css` changes; no Norn code, Postbox content, Rust source, desktop/game host code or shared build tools changed.

## Reproducible fault matrix (actual tests)

| Fault / scenario | Before fix | Patched result |
|---|---|---|
| Fresh profile, no Norn installed | Existing gate passed | Passed |
| Legitimate older profile lacking newer metadata | Existing gate passed | Passed: user files, Character Map, floppy and new system shortcuts preserved |
| Corrupt on-disk JSON at boot | Existing recovery flow | Passed: raw bytes retained, writes blocked, valid backup restores |
| Malformed backup or invalid path/parent/case | Existing validator | Passed: import refused, saved and live disks unchanged |
| Bad metadata (`modified`, `displaySize`, unsafe keys, missing mounted ISO) | **Reproduced:** original validator accepted some bad fields | Passed: import refused without commit |
| Failed localStorage write / small browser quota | Existing rollback behavior | Passed: no phantom files or overwritten user work |
| Disk reaches 2 MiB simulated capacity | Existing limit | Passed: failed final file not visible or saved |
| Two tabs write from stale copies | **Reproduced:** baseline had no storage freshness check | Passed: stale commit refused and explicit reload allows further edits |
| Same revision, different bytes | Baseline lacked check | Passed: stale data refused based on bytes, not revision alone |
| Reopen clean disk | **Reproduced:** baseline unnecessarily incremented revision | Passed: reopen leaves serialized disk unchanged |
| A: write-protected; D: read-only; invalid path | Existing protections | Passed |
| SwarmWire pause, resume, reload | Existing state persistence | Passed in Chromium (saved percentage unchanged) |
| Open two SwarmWire windows | **Reproduced:** baseline created two active timers | Passed: only one transfer timer remains |
| Fail a SwarmWire storage commit | Existing rollback behavior | Passed in Chromium: saved percentage retained, UI stops until explicit resume |
| Reach 100%, mount ISO, run Setup, reload | Existing install path | Passed: no automatic mount/install; installed record remains single |
| Rust host save rejects HTTP 507 | Existing mirror/retry | Passed: local mirror preserved, `sync()` reports error, next successful write syncs |
| Simulated fullscreen flag while SwarmWire remains mounted | Existing timing | Passed: simulated ticks continue; **not** an end-to-end check of Thread 1 fullscreen lifecycle |

## Exact commands and recorded outcomes

Run from the extracted Round 4 source root (with this patch applied):

```sh
node tests/round4/disk/fault-matrix.test.cjs
# PASS: 14 disk fault matrix groups

python tests/round4/disk/swarmwire-browser.test.py
# PASS: SwarmWire Chromium offline UI — pause/resume/reload, single timer, quota rollback, fullscreen flag, ISO/Setup, reload installation

node tools/test-filesystem.cjs
node tools/test-media-install.cjs
node tools/test-norn-install.cjs
node tools/test-shortcuts.cjs
node tools/test-language-migration.cjs
node apps/norn-world-lab/tests/test-thread2-disk.cjs
# All six existing tests passed

python tools/release_check.py
# Release gate: PASS
```

Baseline reproduction (with the *unpatched* baseline as working directory):

```sh
node ../r4_disk_work/tests/round4/disk/fault-matrix.test.cjs
# FAIL as expected: malformed backup metadata accepted

LATCH_DISK_TEST_ROOT=/mnt/data/r4_disk_original python ../r4_disk_work/tests/round4/disk/swarmwire-browser.test.py
# FAIL as expected: duplicate SwarmWire timer (`__timers.size == 1` assertion)
```

The extended `python tools/release_check.py --browser` was also attempted. Its `test-standalone-playwright.py` completed with zero page errors and persisted Norn install, but the following comprehensive `test-games-in-one-html.py` exceeded the available execution window; no full browser gate pass is claimed.

## Compatibility and migration

- No storage-key change. JSON disk version remains `1` and SwarmWire version remains `1`. Older snapshots lacking `modified` timestamps continue to load. On valid old snapshots, existing migration routines still create missing system shortcuts and media metadata without clearing user folders, ISO images, installed programs or the original torrent path.
- `LatchFS.reloadFromStorage(): boolean` is **additive**. Suggested usage after a stale-tab error: export user work if needed, then call `LatchFS.reloadFromStorage()` and retry. It validates first and never takes unsaved data from another tab automatically.
- No automatic Norn installation. UI path remains private Postbox attachment → simulated transfer → ISO → mount → `D:\Setup.exe`. Historical direct `downloadNornDisc()` callers are preserved for existing API compatibility, not exposed as a player-facing skip.
- Do not treat `sync()` of Rust host or localStorage as physical-disk atomic transactions; localStorage `setItem()` is atomic per item but two tabs can still race between read and write. Rust host POST failure leaves a browser mirror, and `sync()` signals failure. The browser may throttle a hidden UI timer and closed SwarmWire windows do not continue background downloads.

## Known gaps and host handoff

- `localStorage` has no compare-and-swap primitive. Exact-byte preflight detects *known stale* windows but does not guarantee correctness under a simultaneous read/write interleaving; true cross-tab serialization needs a coordinated lock/leader or stronger storage backend. No such claim is made here.
- Corrupt/oversized primary snapshots are preserved untouched, not automatically surgically repaired. Recovery requires an external valid backup; `recoveryRaw()` exposes corrupt bytes for support/recovery. There is no new redundant on-device secondary snapshot that could double browser quota use.
- JSON object members with **identical textual keys** are deduplicated by JavaScript's built-in `JSON.parse`, as before. Different-case/canonical-path duplicate files are rejected; this patch does not implement an independent duplicate-key JSON tokenizer.
- If the Thread 1 fullscreen host destroys the SwarmWire window, its timer stops until SwarmWire is reopened and Start / Resume selected. If continuous background transfers are needed while an app is unmounted, the integrator should arrange to keep a single SwarmWire instance mounted (or commission a dedicated host-owned scheduler). This Thread did not touch desktop code or introduce an unapproved background timer.
- The isolated Chromium test runs with an in-memory localStorage stub and intentionally invoked timer callbacks because browser navigation is blocked in this execution environment; the original full desktop browser install test independently passed in the extended-gate run. The fullscreen *flag* is not a substitute for an integrated fullscreen host test.
