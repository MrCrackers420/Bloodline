# Latch 98 Round 5 — Thread 4: LatchNet, Postbox and 2003-world continuity

**Baseline:** `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` from `Latch98-Round5-Shared-Base-With-Rules.zip`.

## Assignment

Own LatchNet renderer and styles. Main goal: make the fictional 2003 intranet and its archives, search, mail, forum and freeware catalog internally coherent. Audit EVERY rendered website, link, tooltip, message status, 'send' behavior and 404 page for immersion-breaking disclaimers or modern web terminology. Keep private Norn invitation in Postbox, attachment `NWLAB03.torrent`, and original route into SwarmWire intact; do not add a reveal-all tutorial. Fix at least one genuine navigation/history/search/mail problem discovered during tests. Locally saved Outbox messages must not be described as externally delivered. Validate link reachability, back/forward, search, 2003 timeline consistency, HTML escaping of user posts and both desktop/mobile browser views.


## Mandatory handoff for this thread
1. Read `SHARED_RULES.md` from the shared ZIP first; inspect `coordination/OWNERSHIP.json` and `coordination/base_manifest.json`.
2. Run baseline tests before editing. Record actual bugs and a small reproduction.
3. Work ONLY on assigned paths. Preserve protected applications and Norn checksum.
4. Return a ZIP with changed **project-relative files** (no enclosing extra folders or unrelated baseline files), and a changelog + new regression tests under your owned test directory.
5. Include copy-audit findings (screens inspected and exact replacements), test commands and outcomes, limitations, and integrator requests. The integrator merges patches; don't independently publish a full replacement Latch OS.
