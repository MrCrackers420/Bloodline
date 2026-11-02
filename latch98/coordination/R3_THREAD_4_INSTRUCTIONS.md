# Latch 98 Round 3 — Thread 4: LatchNet, Postbox and fictional 2003 web

**Owner ID:** `network`  
**Owned files:** `web/latchnet.js`, `web/latchnet.css`  
**Start from:** `Latch98-Round3-Shared-Base.zip` plus common rules.

## Assignment

**This is a new Latch-only assignment, replacing the previous Thread 4 Norn simulation role.** Improve the fictional 2003 internet and its browser/email experience as an interactive part of Latch 98. The Norn integrator alone plans and implements Norn behavior.

1. Audit the LatchNet home page, browser links, Postbox inbox, guestbook and existing narrative pages. Identify broken navigation, unsafe inputs, state-loss or dead links; fix actual defects before adding content.
2. Expand the web with *meaningful, navigable* early-2000s websites: freeware archives, local classifieds, archived forums, game review pages, personal homepages and obsolete links. Every site should offer a reason to explore, not generic placeholder text; preserve the uncanny fictional research mystery without exposing Norn World Lab as a public download.
3. Improve Postbox message discovery and readability; preserve the existing **Oct 15, 2003 private email**, sender and subject, and `NWLAB03.torrent` Save/Open action. Add well-grounded in-world clues, search or folder affordances if beneficial; never auto-launch SwarmWire or install Norn Lab.
4. Keep all user-provided content (guestbook, mail drafts/search, site forms) escaped and safe from HTML injection; sanitize/validate inputs, bound stored data and make persistence graceful under quota failure.
5. Maintain a consistent 2003 setting and the Latch 98/Windows 98 look. Site pages should remain available without internet access or third-party web services.

## Boundaries

- **No changes to virtual disk or SwarmWire**: `web/filesystem.js`, `web/swarmwire.js`, and `web/swarmwire.css` belong to Thread 2. Treat the existing LatchFS API as stable; propose additions to the integrator rather than making cross-file edits.
- **No edits** to `web/desktop*`, `web/index.html`, apps, Norn Lab code, or integration build scripts.
- Keep public sites independent of Norn Lab installation. The only official entry to the hidden software remains the private email's torrent attachment.

## Acceptance tests

- Navigate every new site using the fictional browser's URL/search UI and back/forward; verify link resolution and accessibility.
- Fresh disk: find the original private email, open/save torrent and launch SwarmWire; installed disk: email remains present and Norn software stays installed; do not bypass first-run flow.
- Inputs containing markup, punctuation and overly long text do not inject scripts or crash the browser; test persistence across reload.

**Deliver:** `Latch98-R3-Thread-4-Changes.zip` with ONLY `web/latchnet.js` and/or `.css`, plus a detailed changelog and test descriptions in the response. This thread is **not** authorized to modify any Norn source.
