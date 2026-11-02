# Deploy Latch 98 Round 5 + Norn World Lab Round 4

This is a **repository overlay**, not a replacement repository. Extract into the existing `MrCrackers420/Bloodline` repo root. Preserve `game/`, original `tools/`, and the repository root `README.md`: they hold the authoritative Bloodline story source and the existing Bloodline web publisher.

The Latch application copy is in `latch98/`. The `.github/workflows/pages.yml` entry publishes Latch at the Pages root and the repository's main Bloodline source at `/bloodline/`. Never replace `game/bloodline.html` with the older archived copy under `latch98/apps/bloodline/`.

```sh
python latch98/tools/release_check.py
git status --short
git add latch98 .github/workflows/pages.yml DEPLOY_LATCH98.md
git commit -m "Integrate Norn World Lab Round 4 into Latch 98"
git push origin main
```

Verify GitHub Actions Pages deploy, then test the first-run Postbox → SwarmWire → virtual ISO → Setup.exe installation flow. Existing user saves remain untouched. The five Latch Round 5 specialist patches are not included.

Norn app SHA-256: `3bc36a7992e7d4540a4afc93acbb3d6f2d8e26b639402b998bdb1d10e86b34db`.
