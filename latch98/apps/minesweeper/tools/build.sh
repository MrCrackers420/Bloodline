#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v wasm-pack >/dev/null 2>&1; then
  echo 'wasm-pack is required. Install Rust from https://rustup.rs/ then: cargo install wasm-pack' >&2
  exit 1
fi
wasm-pack build --target web --release --out-dir pkg
printf '\nRust/WASM generated in pkg/. Host web/index.html or mount web/app.js inside Latch 98.\n'
