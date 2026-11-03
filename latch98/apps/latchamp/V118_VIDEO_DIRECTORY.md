# LatchAmp 1.18 — video directory and media playback notes

The video/music homepage is on **YouTube / Music → Video / Music Home**. It presents saved video/playlist links and the last 20 opened YouTube URLs (local browser metadata only). A search without an API key opens the official YouTube search page. A user-entered, restricted YouTube Data API v3 key permits a session-only search of public videos in the LatchAmp gallery. Keys are never saved to the virtual disk or exported.

Video previews use original YouTube thumbnails and titles when the Data API supplies them. The fake Latch branding describes the shell, not the videos. Playback continues to use the official YouTube IFrame API, with normal ads and attribution. Link saving does not save or extract media bytes. Some videos refuse embeds, and local file:// launches may require RUN-LATCH98-HOSTED.bat or opening on the official YouTube site.

Real YouTube Music account playlists, personalized home, YouTube sign-in, comments, purchases and Premium entitlements are not accessible via the embedded player or Android media session. Android port was intentionally not modified in this desktop release.
