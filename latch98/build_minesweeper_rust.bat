@echo off
cd /d "%~dp0apps\minesweeper"
where wasm-pack >nul 2>nul
if errorlevel 1 (
  echo Rust/WASM compiler is required to enable the real Rust game engine.
  echo Install Rust from https://rustup.rs/
  echo Then run: cargo install wasm-pack
  echo The desktop is still playable with the built-in JS fallback in the meantime.
  pause
  exit /b 1
)
wasm-pack build --target web --release --out-dir pkg
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Minesweeper compiled to Rust WebAssembly. Now launch Latch 98.
pause
