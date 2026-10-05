# Bloodline

A browser card battler: ONE self-contained file, `game/bloodline.html` (HTML, CSS and a single script, no network calls).
It is shared with friends only, as an installable web app (GitHub Pages) and a Windows zip. Saves are in localStorage.

## Layout
- `game/bloodline.html`: the whole game. The source of truth for every platform.
- `tools/build_web.py`: turns the game into the web app (manifest, offline service worker, update banner, icons).
- `tools/check_bloodline.py`: sanity checks (syntax, loads with several saved states, optional fight run).
- `windows/`: the Electron shell for the Windows build.
- `.github/workflows/`: `pages.yml` (web app, on every change to `game/`) and `windows.yml` (Windows zip, on a `v*` tag).

## Releasing
When asked to "release" or given a new `bloodline.html`:
1. Replace `game/bloodline.html` with the new file. Do not edit game logic unless asked.
2. Run the checks (below). Stop and report if they fail.
3. Commit ("Release: what changed") and push to `main`. The Pages workflow publishes the web app in about a minute; players
   get a "new version is ready" banner and keep their saves.
4. For a Windows build, push a tag: `git tag v0.2.0 && git push --tags`. The workflow attaches `Bloodline-windows-x64.zip` to a Release.
After pushing, watch the workflow run and report its result and the live address.

## Checks
    pip install playwright pillow && playwright install chromium     (once; Node.js is also needed)
    python tools/check_bloodline.py game/bloodline.html
    python tools/check_bloodline.py game/bloodline.html --fight 9    (also plays 15 s of that challenger)

## Rules
- Never rename the repository or change the Pages address: saves belong to the address, and a new address loses them.
- Keep the game a single file with no network calls and no external assets.
- Never commit `node_modules/`, `dist/`, `site/` or `windows/www/`.
- The game's Test tools are hidden by the shells (`window.BLOODLINE.release`); do not remove them from the file.
