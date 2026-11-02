# Norn World Lab Round 4 → Latch 98 Round 5 integration

- Input: `NornWorldLab-Round4-Latch-App.zip` (app-only handoff).
- Replaced only `apps/norn-world-lab/index.html` in the Latch application tree.
- Approved new app SHA-256: `3bc36a7992e7d4540a4afc93acbb3d6f2d8e26b639402b998bdb1d10e86b34db`.
- `norn-disk-host` and `norn-files` embedded scripts are byte-for-byte identical to the previous Latch app version.
- No Latch desktop, filesystem, Postbox, SwarmWire or installer code changes.
- Existing first-run Postbox torrent → SwarmWire → ISO → Setup flow must remain in effect.
- **This is an integrator release branch**: existing Round 5 specialist threads should continue developing against their original shared baseline. Integrate their patches against that baseline and then preserve the approved Norn R4 app update.
- App features: Handspeak and optional tone analysis; improved shadows/labels/earth sampling; lower nursery ditch and elevated orchard; physical passing strategies; Birth & Lineage applet.
- Handoff known limitations: upper orchard reachability inconsistent; physical passing probabilistic; real microphone devices not tested; lineage reload persistence uncertain. See upstream MERGE_REPORT.md.
