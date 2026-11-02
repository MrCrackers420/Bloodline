#!/bin/sh
set -eu
cd "$(dirname "$0")/apps/minesweeper"
exec wasm-pack build --target web --release --out-dir pkg
