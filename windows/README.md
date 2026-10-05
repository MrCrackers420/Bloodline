# Windows build

An Electron shell around `game/bloodline.html`: a portrait window sized to the screen, offline, Test tools hidden.
Normally built by the `Windows build` workflow (push a tag such as `v0.2.0`). To build by hand:

    mkdir -p www && cp ../game/bloodline.html www/index.html
    npm install
    npm run pack:win        # dist/Bloodline-win32-x64 (runs on Windows; zip it to share)
    npm start               # try it in a window first
