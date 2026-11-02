# Latch 98 Round 5 — Thread 2: SwarmWire and real-feeling disk workflows

**Baseline:** `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` from `Latch98-Round5-Shared-Base-With-Rules.zip`.

## Assignment

Own LatchFS persistence, CD/ISO state, SwarmWire and their copy. Main goal: make save, restore, transfer and media errors feel like authentic 2003 OS/network utilities while remaining truthful. Audit every visible progress state, tracker/status message, file/disk warning, backup/restore prompt, and installer-facing FS error. Improve at least one real recovery edge case based on a reproducible fault-injection test: stale tab, partial transfer, quota failure, interrupted sync, corrupted import or double-window transfer. Do NOT fake connections to outside peers, fabricate dynamic peer counts, silently alter transfer data/speed, or replace the mandatory Norn installation chain. Keep Norn simulation/bridge opaque. Verify recoveries after reload, no double progress ticks, disk export/import and saved data on failure.


## Mandatory handoff for this thread
1. Read `SHARED_RULES.md` from the shared ZIP first; inspect `coordination/OWNERSHIP.json` and `coordination/base_manifest.json`.
2. Run baseline tests before editing. Record actual bugs and a small reproduction.
3. Work ONLY on assigned paths. Preserve protected applications and Norn checksum.
4. Return a ZIP with changed **project-relative files** (no enclosing extra folders or unrelated baseline files), and a changelog + new regression tests under your owned test directory.
5. Include copy-audit findings (screens inspected and exact replacements), test commands and outcomes, limitations, and integrator requests. The integrator merges patches; don't independently publish a full replacement Latch OS.
