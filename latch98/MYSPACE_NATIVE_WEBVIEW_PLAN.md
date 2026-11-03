# Design note: a genuine in-Latch native browser for blocked websites

The v1.20 MySpace window uses an HTML iframe and obeys the website's own frame restrictions. This is a working Latch UI integration, but not a native browser engine.

If MySpace refuses iframe embedding, a future **Windows desktop release** can add a native Latch 98 shell, using Windows WebView2 or a Rust `wry` wrapper:

1. Create a trusted Latch 98 UI surface as one WebView and a separate **untrusted web-content** surface for MySpace. The MySpace WebView must navigate **top-level** to `https://myspace.com`, rather than nesting the website in an HTML iframe.
2. The host receives only the Latch Browser pane's geometry, focus, visibility, and validated navigation request; it resizes and clips the second WebView over that region. Keep the window title bar, Start menu, and other Latch UI outside the remote surface.
3. Synchronize the native view with Latch minimize/maximize/drag/z-order. Route Back/Forward/Reload through native WebView history, not the simulation-only LatchNet history.
4. Store external website cookies in a separately partitioned browser profile. Never expose LatchFS, desktop IPC, Rust disk APIs, local host paths, game save data, or privileged script bridges to the MySpace surface.
5. Respect MySpace's actual network and sign-in requirements. Do not proxy or strip security headers just to make an iframe work. Support URL display and explicit user authorization for redirects to other domains.
6. Package and test only when preparing the next major Windows native-shell release. This is **not** an Android/APK change.

**Status:** Design only; no WebView2/wry host has been implemented or compiled in this patch. The current Rust app is an HTTP server, not a native desktop shell.
