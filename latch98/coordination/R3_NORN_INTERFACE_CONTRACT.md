# Latch 98 ⇄ Norn World Lab release contract (Round 3)

**Authority:** The Norn World Lab integrator controls the Norn simulation's roadmap and canonical release. The Latch 98 integrator controls the Latch shell, filesystem, installer and packaging. Do not share write ownership of source files.

## What Norn delivers

- Versioned runnable Norn HTML and a mergeable patch/change log from its own Norn-only baseline, with simulation tests and any necessary assets included.
- Clear statement of compatibility with `window.LatchFS`, preferably the existing public adapter contracts in the frozen Latch Norn app.
- Separate examples/tests for standalone Norn use and for running as an **installed** iframe in Latch 98. Norn must not require Latch to preinstall it automatically.

## How Latch launches it

- Latch hosts the Norn app as a same-origin iframe from `apps/norn-world-lab/index.html` for the modular build, or as an embedded packed iframe document in the single-file HTML.
- The app currently discovers a parent `window.LatchFS` and uses `NornFiles` for compatible Norn save/open dialogs. It hides its own taskbar in `c2desktop` mode. These are *interfaces*, not permission for Latch developers to change Norn simulation internals.
- The shell decides if the virtual package is installed by checking `LatchFS.installedPrograms` / installation record; the app's own presence in the distributable assets does not mean installed for the player.

## What Latch preserves

- Initial virtual disk must NOT mark Norn World Lab installed. Discovery remains: private Postbox Oct 15, 2003 email, `NWLAB03.torrent`, SwarmWire transfer, mounted `NornWorldLab.iso`, `D:\Setup.exe`, completed setup registration. Only then should the desktop/Start installed app appear.
- Reboot, virtual disk backup/restore, ISO eject/reinsert and updates do not erase player data.
- The Norn app can save and load Norn data through shared `LatchFS` and can run separately with its standalone storage.

## Protected files

- `apps/norn-world-lab/**` is **frozen for all five Latch development workers**. Only the Latch integrator may import a published Norn artifact.
- Latch workers must not edit the embedded `norn-disk-host`, `norn-files`, brain, behavior, world geometry, or any portion of the Norn HTML.
- No Norn team may edit `web/desktop*`, `web/filesystem.js`, `web/swarmwire*`, `web/latchnet*`, or GitHub Pages/build scripts. If a new API is needed, provide a specification and compatibility test.

## Acceptance before replacing a frozen Norn build

1. Check the Norn app launches standalone and inside Latch post-install; pre-install launch remains blocked through normal shell UI.
2. Verify actual `window.LatchFS` discoverability in iframe and save/load behavior on a fresh and restored virtual disk.
3. Run existing Norn experiments against the Norn team's newly delivered code, not a silent downgrade to older Step 32. Record the results.
4. Run Latch release gate, first-install browser sequence and offline standalone packing checks.
5. Update `coordination/norn_snapshot.json` only after a release is approved and committed to the Latch integration branch.
