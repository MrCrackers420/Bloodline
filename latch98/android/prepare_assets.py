#!/usr/bin/env python3
"""Build installable APK web assets from a *patched* Latch 98 checkout."""
from pathlib import Path
import argparse,shutil
p=argparse.ArgumentParser();p.add_argument('latchroot',type=Path);a=p.parse_args()
root=a.latchroot.resolve();dest=Path(__file__).resolve().parent/'app/src/main/assets'
for src in ['web','apps']:
    if not (root/src).is_dir():raise SystemExit(f'Missing Latch 98 source: {root/src}')
    shutil.copytree(root/src,dest/src,dirs_exist_ok=True,ignore=shutil.ignore_patterns('target','*.pyc','.git','node_modules'))
for required in ['web/index.html','web/latch-update.js','apps/latchamp/index.html','apps/norn-world-lab/index.html']:
    if not (dest/required).is_file():raise SystemExit('Missing bundled asset: '+required)
print('Prepared Android HTML + app assets:',dest)
