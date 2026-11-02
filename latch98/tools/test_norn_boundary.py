#!/usr/bin/env python3
"""Latch-only frozen Norn source boundary, to be updated only by the Latch integrator."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parent.parent
meta=json.loads((root/'coordination/norn_snapshot.json').read_text())
source=root/meta['path']
raw=source.read_bytes()
assert hashlib.sha256(raw).hexdigest()==meta['sha256'], 'Norn app changed without versioned integrator approval'
text=raw.decode('utf-8')
for token in ('id="norn-disk-host"','id="norn-files"','window.LatchFS','NornFiles','c2desktop'):
    assert token in text, f'Norn interface marker missing: {token}'
for key in ('web/filesystem.js','web/latchnet.js','web/swarmwire.js'):
    assert (root/key).is_file(), f'Latch integration module missing: {key}'
print('Norn boundary: FROZEN SOURCE and host interface markers PASS')
