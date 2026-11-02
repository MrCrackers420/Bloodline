# Latch 98 Round 5 — Thread 3: Sound Studio, Audacity & believable creative software

**Baseline:** `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` from `Latch98-Round5-Shared-Base-With-Rules.zip`.

## Assignment

Own only Sound Studio, Audacity and their audio tests. Main goal: deliver realistic, period-appropriate project/edit/export workflows without breaking accurate audio features. Audit every user-facing tip, help dialog, error message, import/export state, and microphone problem text for out-of-world references (HTML, JS, Chrome, Android, web browsers, prototypes). Keep error messages actionable; document modern browser-specific fixes in developer notes in your owned tests folder. Implement one genuine usability/production upgrade: e.g. resizable precision region with snapping, recoverable edit history, meaningful clip labeling, or project-import validation (choose after inspecting code). Test sample-frame correctness, time stretch pitch preservation vs tape speed, WAV export, save/reload, multi-touch keyboard, and microphone denial (simulated via tests). Never claim support for a codec that wasn't tested.


## Mandatory handoff for this thread
1. Read `SHARED_RULES.md` from the shared ZIP first; inspect `coordination/OWNERSHIP.json` and `coordination/base_manifest.json`.
2. Run baseline tests before editing. Record actual bugs and a small reproduction.
3. Work ONLY on assigned paths. Preserve protected applications and Norn checksum.
4. Return a ZIP with changed **project-relative files** (no enclosing extra folders or unrelated baseline files), and a changelog + new regression tests under your owned test directory.
5. Include copy-audit findings (screens inspected and exact replacements), test commands and outcomes, limitations, and integrator requests. The integrator merges patches; don't independently publish a full replacement Latch OS.
