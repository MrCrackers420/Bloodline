@echo off
cd /d "%~dp0"
where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust/Cargo is needed to launch the Rust host.
  echo Install from https://rustup.rs/ and run this file again.
  echo Or open web\index.html for an HTML-only demo.
  pause
  exit /b 1
)
cargo run --release
pause
