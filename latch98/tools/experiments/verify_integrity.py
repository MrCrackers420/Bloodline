#!/usr/bin/env python3
"""Verify exact Step 32 ancestry, isolated ownership, JS syntax, and patch fidelity."""
import argparse
import hashlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

EXPECTED='38da534fdd76732caddff88539c6310aa07181a451d7bfb53b161752af9f13b1'
OLD='const listeners=ns.filter(n=>Math.abs((n.body?.x??n.x??0)-d.x)<180 && (d.lane==null||n.lane==null||d.lane===n.lane));'
NEW='const listeners=ns.filter(n=>n.body && Number.isFinite(window.NornCore.cxOf(n.body)) &&\n    Math.abs(window.NornCore.cxOf(n.body)-d.x)<180 && (d.lane==null||n.lane==null||d.lane===n.lane));'
SCRIPT_RE=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.S|re.I)

def digest(x):return hashlib.sha256(x).hexdigest()

def check(base_path,upd_path,patch_path):
    base=Path(base_path).read_bytes();updated=Path(upd_path).read_bytes()
    assert digest(base)==EXPECTED,'Wrong base: do not patch a different step'
    a=base.decode('utf8');b=updated.decode('utf8')
    assert a.count(OLD)==1 and b.count(NEW)==1
    assert a.replace(OLD,NEW)==b,'Unexpected modification outside doozer listener predicate'
    scripts_a=SCRIPT_RE.findall(a);scripts_b=SCRIPT_RE.findall(b)
    assert len(scripts_a)==len(scripts_b)==26
    changed=[i for i,(old,new) in enumerate(zip(scripts_a,scripts_b)) if old!=new]
    assert changed==[8],f'Wrong script changed: {changed}'
    for id in ['norn-disk-host','norn-files','norn-physics-wasm','xp-chrome','nwlab-step23-observer-script','step31-hatchery','step32-files-applet']:
        pat=re.compile(r'<script id="'+id+r'">.*?</script>',re.S)
        ma=pat.search(a);mb=pat.search(b)
        assert ma and mb and ma.group()==mb.group(),f'Ownership violation: {id}'
    with tempfile.TemporaryDirectory() as tmp:
        tmp=Path(tmp)
        old=tmp/'Norn_World_Lab_Step32.html';old.write_bytes(base)
        patch=Path(patch_path).resolve()
        subprocess.run(['patch','--batch','--fuzz=0','-p1','-i',str(patch)],cwd=tmp,check=True,capture_output=True,text=True)
        assert old.read_bytes()==updated,'Applying diff does not exactly recreate updated HTML'
        # Check the actual extracted inline scripts using the Node parser.
        for i in [0,1,3,4,8,22,23,24,25]:
            js=tmp/f'script-{i}.js';js.write_text(scripts_b[i]);
            subprocess.run(['node','--check',str(js)],check=True,capture_output=True,text=True)
    print('PASS exact base SHA-256:',EXPECTED)
    print('PASS updated SHA-256:',digest(updated))
    print('PASS context diff applies with fuzz=0; complete source reconstructed byte-for-byte')
    print('PASS ONLY inline language/simulation teaching script 8 changed; 7 integration/host/UI scripts byte-identical')
    print('PASS JS syntax checks for core, host bridge, and relevant applet scripts')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--baseline',required=True)
    p.add_argument('--updated',required=True)
    p.add_argument('--patch',required=True)
    a=p.parse_args()
    check(a.baseline,a.updated,a.patch)

if __name__=='__main__':main()
