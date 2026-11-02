# Latch 98 — local integration result (2026-11-02)

This folder is the **actual patched modular source**, not just instructions. The patch was applied using `python tools/apply_latch_update.py /mnt/data/latch98-work`.

## What changed

- Adds Start > Latch Update, a retro-style program catalog with a `Download Setup` action creating `C:\Downloads\LatchAmp-103.setup.exe` on the virtual filesystem.
- LatchAmp remains **not installed** until Setup is completed. It can then be opened through Start > Programs > Accessories, Run, and Add/Remove Programs. It plays local audio and offers YouTube Music external handoff/visible embedded player where supported.
- Adds `tools/latch_update.py`, a signed release package CLI (verified Ed25519 signatures, hashes, allowlisted paths and rollback/recovery). Updating the **real** Rust/Android binary is a command-line host operation, not a silent automatic in-app update.
- Adds Android WebView project with a native Rust JNI disk-persistence bridge, build scripts and GitHub Actions build workflow file in `android/` and root `.github/workflows` of the source archive. Android is *not* a port of the desktop HTTP host, and Apollo/Artemis, cloud sync and native background music are not yet implemented.
- The application uses the approved Norn World Lab R4 release (SHA-256 `3bc36a7992e7d4540a4afc93acbb3d6f2d8e26b639402b998bdb1d10e86b34db`), from the Norn integrator, without touching simulation contents. Updated the Norn regression test to assert the new physical-ear, occlusion-aware hearing behavior instead of the obsolete Round 3 exact source string.

## Commands executed and results

```
python tools/apply_latch_update.py /mnt/data/latch98-work   # PASS
python tools/build_standalone.py /mnt/data/Latch98-Updated-Standalone.html  # PASS
python tools/release_check.py --output /mnt/data/Latch98-Updated-Standalone.html # PASS
python -m pytest -q tests/test_update_and_install.py tests/test_update_browser.py # 6 passed
node --check web/desktop.js && node --check web/filesystem.js && node --check web/latch-update.js # PASS
python /mnt/data/latchamp_smoke.py # PASS: boot, optional app, setup and run
LATCH98_TEST_HTML=/mnt/data/Latch98-Updated-Standalone.html python tools/test-games-in-one-html.py # PASS
bash android/build_android.sh # BLOCKED: rustup not installed (Cargo, Android SDK/NDK and Gradle also unavailable).
```

## Limitations

- GitHub app permits reads but rejected both Git blob creation and the normal Contents write API with HTTP 403 (`Resource not accessible by integration`). This work **was not pushed** to `MrCrackers420/Bloodline`.
- No compiled APK was produced and no Android device validation was possible. The Android folder is build source and includes a workflow for a configured GitHub Actions runner. On Android, external links open separately, and untrusted external pages/subresources are blocked in its WebView to avoid exposing the Rust disk bridge.
- The full source was reconstructed from the accessible `Latch98-Round5-Shared-Base-With-Rules.zip` and integrated with the approved Norn R4 app. The specific original Rust/desktop source file blob hashes match those on GitHub at the time of inspection; source was not cloned through Git because this container cannot resolve github.com. For later changes, apply the patch-only overlay to a newer checkout instead of replacing it wholesale.

## Build an APK on a machine with required tools

Requires JDK 17, Android SDK platform 35, build-tools 35.0.0, NDK 27.2.12479018, Rust with aarch64-linux-android and cargo-ndk, and Gradle 8.9.

```
cd latch98
bash android/build_android.sh
# Expected if toolchain works: android/app/build/outputs/apk/debug/app-debug.apk
```

Unsigned/Android debug APKs require device installation approval. Steam games cannot execute locally on Android and the Apollo/Artemis streaming integration is not included.
