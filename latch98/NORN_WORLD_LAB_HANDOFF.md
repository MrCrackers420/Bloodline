# Norn World Lab / Latch 98 handoff — approved Round 7 trained release

The user-authorized app-only release `NornWorldLab-Round7-Latch-App.zip` from
`NornWorldLab-Round7-Trained-Complete.zip` is integrated **unchanged** at
`apps/norn-world-lab/index.html`.

SHA-256: `b265f776c999309d78783506420baf4b3a66d362310ae2fabeb8db35a9d30d96`.

New Egg Maker options: `Practice walker — 15 min (experimental)` (`r7practice8128`)
and `Practice walker — 5 min (experimental)` (`r7practice4213`). These are
optional motor-only presets, not default gait changes. The built-in quadruped
was faster on average in the reported short trials. No language/social lessons,
trust, relationships, or autobiographical memory are inheritable.

The pre-existing Postbox → SwarmWire → ISO → Setup.exe installation flow remains
mandatory and is not bypassed. The standalone Latch build includes the application
as a **packed resource**, but it does not mark it installed until Setup is run.
Latch handles the desktop; the Norn game runs in its own framed window.

Source ownership: this integration replaces only the approved application file;
future Latch changes must not silently edit its simulation. The immutable SHA-256
is recorded in `coordination/norn_snapshot.json` and checked by
`tools/test_norn_boundary.py`.
