#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"
python3 prepare_assets.py "$ROOT"
rustup target add aarch64-linux-android
cargo install cargo-ndk --locked || true
mkdir -p app/src/main/jniLibs
(cd rust && cargo ndk -t arm64-v8a -o ../app/src/main/jniLibs build --release)
if [[ -x ./gradlew ]]; then ./gradlew assembleDebug; else gradle assembleDebug; fi
printf 'APK: %s\n' "$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
