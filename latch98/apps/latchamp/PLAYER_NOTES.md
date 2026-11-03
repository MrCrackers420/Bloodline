# LatchAmp 1.11 — optional Latch 98 music player

**Installation:** LatchAmp is bundled as a *downloadable application*, **not preinstalled**. Open **Start → Latch Update**, download `C:\Downloads\LatchAmp-111.setup.exe`, run the Latch Setup wizard, then launch LatchAmp from Start → Programs → Accessories or Run → `latchamp`. Existing virtual installations of version 1.03 can be upgraded in place by downloading and running the 1.11 setup. The virtual installer records an installed-app version and preserves personal files and settings. It is not an external Windows `.exe` and does not install/replace actual files on the host OS; native release updates are separate.

## Local playback features retained from 1.10

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

## New in 1.11 — Android YouTube Music remote

- LatchAmp can display the **real YouTube Music Android app's** current track title, artist, album, duration and playback state, directly from the Android MediaSessionManager (not scraped from the app, not from a music download).
- While the YouTube/Music tab is active, its dedicated buttons and main transport controls send play/pause, previous and next to that **specific** Android app, checking each reported capability before dispatching a command. Local playlist/audio handling stays separate.
- Requires opt-in **Notification Access** to LatchAmp in Android Settings. The NotificationListenerService is a permission anchor only: it doesn't read, store or forward notification text; Android's system permission technically grants broader notification access than LatchAmp uses. The native bridge filters active sessions by the official YouTube Music Android package name. A source app must expose a media session for the current song to appear.
- The standalone HTML/browser version cannot inspect or control the real Android app. It shows a clear explanation instead. YouTube streaming remains in YouTube Music and isn't extracted into an MP3 player.
- No Latch online account, web API, notification scraping, accessibility service or remote server is needed. MediaSession access is local to the tablet, not to YouTube Music running on another device.
- On Android 13+ a sideloaded APK may need the additional *Allow restricted settings* step under Android Settings > Apps > Latch 98 > three-dot menu to grant Notification Access. Only enable this for an APK you trust.

**Test:** `pytest -q tests/test_android_music_bridge.py tests/test_latchamp_v110.py tests/test_latchamp_installer_v110.py tests/test_update_browser.py tests/test_update_and_install.py`. Device test still required for real YouTube Music behavior; no APK binary has been built here.

## New in 1.12 — embedded video + saved links + soundtrack coordination

- Visible official YouTube iframe player (where hosted HTTP/HTTPS and embedding is allowed), with Play/Pause, Stop, Next/Previous, seek and loop video/playlist from LatchAmp. External YouTube Music Android media-session commands remain a separate mode.
- Saved video and playlist links with search, local persistence, rename/delete, import/export and opt-in LatchFS save to C:/My Documents/LatchAmp Links.json. Playlist browsing uses the player-reported video IDs; unavailable titles remain ID labels until playback reveals metadata. No scraping or unofficial audio-only playback.
- Equal-power local-file crossfade (two audio elements through a Web Audio mix), adaptive timing mode based on track length, configurable 1–12-second cap. **Not beat matching or Apple Music AutoMix.** Crossfade does not apply to embedded YouTube or the external YouTube Music app.
- Game audio options via Latch audio wrapper in hosted game frames: duck LatchAmp using the game's WebAudio RMS level; mute all other game output while listening; suppress tagged HTML soundtrack audio or channels registered through `window.LatchSoundtrack.registerGainNode()`. Untagged WebAudio music cannot reliably be separated from game effects without per-game sound-channel integration. Norn World Lab's simulation files are untouched.
- Embedded YouTube is not available in the Android asset WebView yet: its current request firewall intentionally blocks cross-origin player resources because the native JavaScript bridge must remain restricted. The official YouTube Music Android app handoff continues to work.
- No APK compilation performed. The Windows one-click builder and sources are updated for the next device build.
