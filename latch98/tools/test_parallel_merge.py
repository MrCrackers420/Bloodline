#!/usr/bin/env python3
"""Hermetic tests of path ownership and conflict protection."""
import io, json, hashlib
from pathlib import Path
import shutil, subprocess, sys, tempfile, zipfile

ORIGIN=Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='l98-merge-test-') as temp:
    root=Path(temp)
    for f in ['tools/parallel_merge.py','coordination/OWNERSHIP.json','coordination/base_manifest.json']:
        dst=root/f;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ORIGIN/f,dst)
    baseline=(ORIGIN/'coordination/base_manifest.json')
    m=json.loads(baseline.read_text())
    # Hermetic fixture: the integration checkout may have merged approved patches.
    # The copy in this test becomes its own baseline so this test verifies merge
    # semantics rather than requiring an unchanged integration working tree.
    for f in ['web/index.html','web/filesystem.js','web/latchnet.js','web/swarmwire.js']:
        dst=root/f;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ORIGIN/f,dst)
        m['files'][f]=hashlib.sha256(dst.read_bytes()).hexdigest()
    (root/'coordination/base_manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    merge=root/'tools/parallel_merge.py'
    def patch(name,data):
        out=root/(hashlib.sha256(name.encode()+data).hexdigest()[:12]+'.zip')
        with zipfile.ZipFile(out,'w') as z:z.writestr(name,data)
        return out
    def cmd(mode,thread,archive,success):
        r=subprocess.run([sys.executable,str(merge),mode,'--thread',thread,'--zip',str(archive)],capture_output=True,text=True)
        if (r.returncode==0)!=success:
            raise AssertionError(f'Unexpected {mode} status: {r.returncode}\n{r.stdout}\n{r.stderr}')
        return r
    old=(root/'web/index.html').read_bytes()
    valid=patch('web/index.html',old+b'\n<!-- safe patch -->\n')
    cmd('check','desktop',valid,True)
    assert (root/'web/index.html').read_bytes()==old,'check mode must be read-only'
    cmd('apply','desktop',valid,True)
    assert (root/'web/index.html').read_bytes()!=old
    cmd('apply','desktop',valid,True) # repeated patch is harmless
    cmd('apply','disk',valid,False) # wrong owner
    competing=patch('web/index.html',old+b'\n<!-- overlapping patch -->\n')
    cmd('apply','desktop',competing,False) # actual merge conflict
    assert (root/'web/index.html').read_bytes().endswith(b'<!-- safe patch -->\n')
    traversal=patch('../evil.txt',b'not allowed')
    cmd('apply','desktop',traversal,False)
    missing=patch('apps/norn-world-lab/new.txt',b'new')
    cmd('apply','desktop',missing,False)
    for owner in ['desktop','disk','apps','network','sprite']:
        cmd('apply',owner,missing,False) # Norn World Lab now belongs to its *separate* integrator
    assert not (root/'apps/norn-world-lab/new.txt').exists()
    # The sprite editor is a strict carve-out of Thread 3's apps/** scope.
    sprite=patch('apps/sprite-studio/round2-test.txt',b'Round 3 Sprite Studio')
    cmd('check','apps',sprite,False)
    cmd('check','sprite',sprite,True)
    cmd('apply','sprite',sprite,True)
    cmd('check','sprite',sprite,True) # idempotent
    not_sprite=patch('apps/soundstudio/pwn.html',b'not allowed')
    cmd('check','sprite',not_sprite,False)
    # Postbox/LatchNet belong to network, whereas virtual disk/SwarmWire belong to disk.
    mail=patch('web/latchnet.js',b'// inbox update')
    cmd('check','disk',mail,False)
    cmd('check','network',mail,True)
    virtual=patch('web/swarmwire.js',b'// transfer update')
    cmd('check','network',virtual,False)
    cmd('check','disk',virtual,True)
    print('Round 3 parallel merge protections and Norn boundary: PASS')
