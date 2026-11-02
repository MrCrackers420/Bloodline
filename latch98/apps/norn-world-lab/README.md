# Norn World Lab — external game drop-in

Place the other thread's **standalone Norn World Lab** game here as `index.html`, along with all its assets and dependencies.

Do **not** add another Start menu, taskbar, or fake operating system inside it. Latch handles the window frame and taskbar, and embeds the app after installation.

Expected player flow:

1. Postbox -> open message "that program I told you about" -> save `NWLAB03.torrent`.
2. Double-click `.torrent` in C:\Downloads -> SwarmWire -> Start; the transfer creates `NornWorldLab.iso` in virtual C:\Downloads.
3. Double-click `.iso` to mount virtual CD-ROM D: -> run `D:\Setup.exe` -> complete installer.
4. Launch **Start > Programs > Games > Norn World Lab**.
5. Latch shows loading screen and then serves `apps/norn-world-lab/index.html` inside a Latch window.

When game files have not yet been added, Latch reports that the program files could not be found. This is not a playable Norn game build.

**Implementation contract:** Game should be a self-contained browser/WebAssembly app, use paths relative to this folder, and fit inside the window iframe. Latch's fictional in-world disc image is *not* a true optical ISO file and is not a real BitTorrent download; it is a virtual-disk package manifest. For a single standalone HTML file in the standalone Latch edition, the player can select it via the "Locate program" control after installing.
