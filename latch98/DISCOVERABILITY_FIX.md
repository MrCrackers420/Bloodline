# Latch 98 — Postbox and Sprite Studio access fix

This is a focused usability update on top of the **Threads 1–5 merged source**.

## What changed

- `web/index.html`: adds always-visible desktop icons for **Postbox Mail** and **Sprite Studio**, with matching direct entries at the top of the Start menu. Adds a classic mail icon.
- `web/desktop.js`: aliases `mail`, `email`, `inbox`, and `postbox` in Start > Run to open Postbox.
- `web/filesystem.js`: adds the Sprite Studio Accessories shortcut to brand-new and **existing** virtual disks, without duplicating the desktop icon or touching installed Norn software.

## Using the apps

1. Power On. Open **Postbox Mail** on the desktop (or Start > Postbox Mail).
2. Click the October 15, 2003 letter titled **that program I told you about** from `m.vale@relay.l98`.
3. Use its `NWLAB03.torrent` attachment, open it with SwarmWire, complete the virtual ISO download, mount the CD-ROM (D:), and run Setup.exe. Norn World Lab is *not* preinstalled or automatically unlocked.
4. Open **Sprite Studio** from the desktop or Start > Sprite Studio. It also remains under Programs > Accessories.

Everything runs in the single HTML without internet access. The virtual disk and installation records are retained by the original storage mechanism.

## Verification

- Headless Chromium (1150px and 390px): both desktop icons and Start entries visible, Postbox inbox loads, the secret email and torrent attachment open, SwarmWire receives the torrent, and Sprite Studio runs in its own window.
- JavaScript errors: none in those browser tests.
- Full release gate: PASS, including Norn installation, SwarmWire persistence, Bloodline bundling, and Sprite Studio grid/model/PNG checks.

## Rebuild

```sh
python tools/build_standalone.py ../Latch98-Postbox-and-Sprite-Studio-Easy-Access.html
python tools/release_check.py
```

No changes to the Norn simulation, game story code, or private email wording.
