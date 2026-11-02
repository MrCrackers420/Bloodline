# Latch 98 deployment

Latch 98 (LatchAmp 1.10 update) lives in `latch98/`. `.github/workflows/pages.yml` publishes it at the Pages root,
Bloodline's installable web app at `/bloodline/`, the raw game pages at `/game/` and a copy of Latch at `/latch98/`.
The old root Bloodline service worker is replaced by one that unregisters itself; saves (localStorage, per origin) are untouched.

`.github/workflows/android.yml` builds the Android APK (`latch98/android/build_android.sh`) and replaces the APK on the
`latch98-android` GitHub Release. The APK is signed with the fixed key `latch98/android/latch98-debug.keystore`
so new builds install over old ones.

Checks before pushing:

```sh
python latch98/tools/release_check.py
python tools/check_bloodline.py game/bloodline.html
```

Never replace `game/bloodline.html` with the archived copy under `latch98/apps/bloodline/`.
Norn app SHA-256: `3bc36a7992e7d4540a4afc93acbb3d6f2d8e26b639402b998bdb1d10e86b34db`.
