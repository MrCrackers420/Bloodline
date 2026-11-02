# LatchAmp 1.10 — review candidate, not pushed to main

Updated the current locally integrated Latch 98 source from LatchAmp 1.03 to 1.10. No changes were pushed to GitHub.

## New player features

- Real Web Audio three-band equalizer (low shelf / mid peaking / high shelf): Flat, Bass Boost, Voice and Treble Boost presets, or custom -12..+12 dB sliders.
- Local playback speed selector from 0.75× to 2×.
- Persistent, searchable local music queue with per-track mobile-friendly Up and Down reorder controls.
- Distinct repeat Off, All and One modes; shuffle queue avoids immediate repeats and has a Previous-track history.
- JSON playlist metadata export/import. File names, sizes, queue order and EQ state are saved; **audio bytes are never included**. Missing imports are reported, not silently fabricated.
- Save/Load playlist metadata through LatchFS at `C:\My Documents\LatchAmp Playlist.json` when running inside Latch 98. Imported MP3/WAV/etc. remain stored locally in the individual device's browser IndexedDB; cloud sync of the actual audio is not implemented.
- Browser Media Session controls and song title where supported; keyboard shortcuts; inner titlebar hidden when hosted inside a Latch-managed application window.
- Kept official YouTube video iframe visible and YouTube Music external app/browser handoff. Direct `file://` playback still cannot embed YouTube; no unauthorized audio extraction.

## Latch Update integration

- LatchAmp remains **not installed by default**.
- Latch Update now offers `C:\Downloads\LatchAmp-110.setup.exe` and reports installed vs upgrade-available status.
- Existing virtual installation v1.03 (or unversioned legacy) upgrades in place to 1.10, keeping virtual shortcuts, existing files and music storage.
- New installs store the v1.10 installed version in LatchFS. Other applications remain unchanged.
- LatchAmp's actual HTML is part of the standalone/source app bundle; the virtual `.exe` is a Latch shortcut. A native Rust/Android application update is still a separate host release.

## Verification

- Full `python tools/release_check.py` passed, including Norn boundary and source-integrity tests.
- Browser tests using synthetic WAV audio passed with audio playback, queue, EQ, playback speed, import/export, storage adapter persistence, and the visible hosted YouTube iframe. The browser environment prevents localhost/file navigation, so browser storage was stubbed for deterministic tests; native-device playback and real IndexedDB persistence still require device validation.
- Actual Latch 98 one-file browser smoke test passed: optional installation, app launch, upgrading a 1.03 installed record to 1.10, preserving existing virtual disk documents, and Save/Load track list through LatchFS.
- The Rust-backed Android *source/assets* are in the source package but there is **no newly compiled APK**, since Rust/Android build tools are not available here.
- No upload/push to GitHub main was performed.

## How to try

1. Open `Latch98-LatchAmp-v110-Standalone.html`.
2. Launch `Start → Latch Update`, choose **Download Setup**, then **Run Setup** and complete the wizard.
3. Open `Run…` and type `latchamp`, or choose it from the Accessories menu.
4. Import local music and use the search/playlist/EQ controls.

You can also run `LatchAmp-v110-Standalone.html` directly if you want to test the player without Latch 98.

For an existing Git checkout, overlay the contents of `LatchAmp-v110-Patch.zip` inside `latch98/`. The full source archive includes the same files under `latch98/` with unmodified games preserved.
