# Upload Latch 98 Round 3 + Norn release to GitHub

This is a **repository overlay** for https://github.com/MrCrackers420/Bloodline.
Unzip the ZIP *into your existing repository root*, preserving the directory paths.
**Do not delete** repository `game/`, `tools/` or its root `README.md`.

This release merges Latch Round 3 Threads 1–5 and the Norn World Lab integrator's approved application. Details: `latch98/coordination/R3_FINAL_INTEGRATION_REPORT.md`.

From your local clone, after extracting:

```bash
git add latch98/ .github/workflows/pages.yml DEPLOY_LATCH98.md
git commit -m "Merge Latch 98 Round 3 and Norn World Lab update"
git push origin main
```

GitHub Actions publishes Latch 98 at the Pages root and the repo's *current* `game/bloodline.html` separately at `/bloodline/`. The root game source is not overwritten by this archive. A Norn install still requires Postbox → SwarmWire → ISO → Setup.exe.

To regenerate one-file offline build from the repo overlay:

```bash
python latch98/tools/build_standalone.py Latch98-Standalone.html
```

**Note:** The offline Latch standalone bundles its archived Bloodline story copy, whereas the Pages workflow builds the separate Bloodline URL from the newer canonical GitHub `game/bloodline.html`. If desired, rebuild the offline standalone using the canonical story source via `--bloodline game/bloodline.html`.

Package created locally; it has **not been pushed to GitHub**.
