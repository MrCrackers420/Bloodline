# LatchAmp 1.10 — optional Latch 98 music player

**Installation:** LatchAmp is bundled as a *downloadable application*, **not preinstalled**. Open **Start → Latch Update**, download `C:\Downloads\LatchAmp-110.setup.exe`, run the Latch Setup wizard, then launch LatchAmp from Start → Programs → Accessories or Run → `latchamp`. Existing virtual installations of version 1.03 can be upgraded in place by downloading and running the 1.10 setup. The virtual installer records an installed-app version and preserves personal files and settings. It is not an external Windows `.exe` and does not install/replace actual files on the host OS; native release updates are separate.

## New in 1.10

- 3-band Web Audio equalizer (bass, mid, treble) with flat, bass boost, voice and treble presets. A real BiquadFilterNode graph is connected to local audio in supported browsers. Audio remains playable even if Web Audio is unavailable.
- Playback speed: 0.75×, 1×, 1.25×, 1.5×, 2×, on local audio. The browser controls pitch-preservation behavior.
- Searchable, manually reorderable local queue with touch-friendly Up/Down buttons. Order survives restart when browser storage works.
- Repeat Off / All / One; shuffle with a no-immediate-repeat bag, and Back/Previous resume behavior.
- Export and import a track-list JSON containing filenames, sizes, order and settings **but not copyrighted audio blobs**. Imported order matches existing local files by name+size and reports missing files instead of claiming files were transferred.
- When hosted inside a Latch iframe, an optional **Save list to C:** / **Load list from C:** copies the *track-list metadata* to `C:\My Documents\LatchAmp Playlist.json` via the real LatchFS API. Audio blobs remain in device-local IndexedDB; this does not automatically copy your music to another device.
- Media Session metadata/control handlers where browsers expose them; Space and left/right keyboard shortcuts; more compact layout in a Latch-managed window.
- The official visible YouTube embed and YouTube Music external-link handoff are retained; `file://` standalone HTML cannot use the YouTube iframe. No audio ripping, hidden playback, third-party login, or automatic YouTube account access.

## Limitations

- Browser IndexedDB stores local audio, not LatchFS. When Android kills the WebView or a browser tab, playback can stop; true lock-screen background audio on Android needs a native media foreground service.
- YouTube playback requires a supported HTTP(S) origin, network access, and permission for embedding on the video. Opening YouTube Music from the native Android wrapper requires device testing. This project does not simulate an unavailable streaming service.
- The installed app's virtual EXE is a Latch shortcut; its actual HTML source is part of the Latch software build. Upgrading the user's actual installed binary/APK needs a separate update release.

## Tests run

- `pytest -q tests/test_latchamp_v110.py tests/test_latchamp_installer_v110.py tests/test_update_browser.py tests/test_update_and_install.py`
- `python tools/release_check.py --output /mnt/data/Latch98-LatchAmp-v110-Standalone.html`

WebView/Android hardware validation is still required. No repository push is implied by this release.
