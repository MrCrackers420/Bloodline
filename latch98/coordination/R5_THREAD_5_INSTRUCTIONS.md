# Latch 98 Round 5 — Thread 5: Sprite Studio editing, animation & format interchange

**Baseline:** `LATCH-R5-2026-11-02-R4-IMMERSION-POLISH` from `Latch98-Round5-Shared-Base-With-Rules.zip`.

## Assignment

Own Sprite Studio only. Main goal: make the existing pixel animation editor feel finished and reliably save real artwork. Audit toolbar/dialog status/help for developer or simulation language, especially drive-C save errors. Preserve zoom-aligned transparency checkerboard/grid across all nine zoom levels and phone/pointer inputs. Implement one genuine animation-editing upgrade (selection transform, frame manipulation, palette operations, improved onion-skin controls, etc.) with undo/redo and imported-project compatibility. Explore Flipnote `.ppm`/`.kwz` import only if you can implement a demonstrably correct, validated parser and fixture tests; otherwise provide honest research and an isolated experimental parser, not a fake success button. Source includes review of Flipnote Toolkit; avoid Nintendo signing keys or bundled copyrighted assets. Update modular `app.js` and template, rebuild generated `index.html`, test PNG/sheet export, project round-trip and 390px touch canvas.


## Mandatory handoff for this thread
1. Read `SHARED_RULES.md` from the shared ZIP first; inspect `coordination/OWNERSHIP.json` and `coordination/base_manifest.json`.
2. Run baseline tests before editing. Record actual bugs and a small reproduction.
3. Work ONLY on assigned paths. Preserve protected applications and Norn checksum.
4. Return a ZIP with changed **project-relative files** (no enclosing extra folders or unrelated baseline files), and a changelog + new regression tests under your owned test directory.
5. Include copy-audit findings (screens inspected and exact replacements), test commands and outcomes, limitations, and integrator requests. The integrator merges patches; don't independently publish a full replacement Latch OS.
