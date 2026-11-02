#!/usr/bin/env python3
"""Publish Latch 98 at Pages root and optionally at /latch98/.
Run after building Bloodline; do not overwrite or modify its source.
"""
from pathlib import Path
import shutil,sys
root=Path(__file__).resolve().parent.parent
site=Path(sys.argv[1] if len(sys.argv)>1 else 'site').resolve()
for dest in (site,site/'latch98'):
    dest.mkdir(parents=True,exist_ok=True)
    for f in (root/'web').iterdir():
        if f.is_file():shutil.copy2(f,dest/f.name)
    shutil.copytree(root/'apps',dest/'apps',dirs_exist_ok=True,ignore=shutil.ignore_patterns('target','*.wasm.tmp','Cargo.lock'))
# Host an existing source game from the repo next to the Latch desktop,
# without making a second copy of it in Latch's application sources.
bloodline=root.parent/'game/bloodline.html'
if bloodline.exists():
    dst=site/'game';dst.mkdir(exist_ok=True,parents=True)
    shutil.copy2(bloodline,dst/'bloodline.html')
else:
    bundled=root/'apps/bloodline/bloodline.html'
    if bundled.exists():
        dst=site/'game';dst.mkdir(exist_ok=True,parents=True)
        shutil.copy2(bundled,dst/'bloodline.html')
    else:
        print('Bloodline source not bundled here; deploy from repo game/bloodline.html')
print('Latch 98 entry:',site/'index.html')
