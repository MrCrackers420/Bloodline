$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
if (-not (Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
    throw 'Install Rust from https://rustup.rs/ and then run: cargo install wasm-pack'
}
wasm-pack build --target web --release --out-dir pkg
Write-Host 'Rust/WASM generated in pkg/. Open web/index.html through a local web server.'
