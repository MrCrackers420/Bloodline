#!/usr/bin/env python3
"""Signed, transactional updater for Latch 98 *source assets*.

This CLI is invoked on the host OS while Latch is closed. It does not change
virtual C: disks, Steam data, or Norn World Lab/Bloodline gameplay files.
It also cannot silently install Android APKs or replace an in-use Rust binary.

Requires: pip install cryptography

Commands:
  keygen --private signing-key.pem --public trusted.pub
  pack --root PATH --version 1.0.0 --private signing-key.pem --output release.l98update --files web/index.html web/desktop.js
  install --root PATH --public trusted.pub --package release.l98update
  recover --root PATH
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile
import zipfile

MAX_FILE=25*1024*1024
MAX_PACKAGE=90*1024*1024
ALLOW=("web/", "apps/", "tools/", "src/")
DENY=("apps/bloodline/", "apps/norn-world-lab/", "tools/latch_update.py")
JOURNAL='.latch-update-transaction.json'


def crypto():
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
    except ImportError as e:
        raise SystemExit('Install the trusted signing dependency with: python -m pip install cryptography') from e
    return serialization,Ed25519PrivateKey,Ed25519PublicKey


def safe_name(name: str) -> str:
    if not isinstance(name,str) or '\\' in name or '\x00' in name or ':' in name or name.startswith('/') or name.endswith('/'):
        raise ValueError('Invalid update path')
    parts=PurePosixPath(name).parts
    if not parts or any(part in ('.','..','') for part in name.split('/')):
        raise ValueError('Unsafe update path')
    if not any(name.startswith(p) for p in ALLOW) or any(name.startswith(p) for p in DENY):
        raise ValueError('Update cannot change this path: '+name)
    return name


def rooted_path(root: Path, rel: str) -> Path:
    rel=safe_name(rel);path=root.joinpath(*PurePosixPath(rel).parts)
    cursor=path
    while cursor != root:
        if cursor.is_symlink():raise ValueError('Refusing symlink in update path: '+rel)
        cursor=cursor.parent
    return path


def hash_bytes(raw: bytes) -> str:return hashlib.sha256(raw).hexdigest()

def manifest_bytes(m):return json.dumps(m,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode('utf-8')


def keygen(args):
    serialization,Key,_=crypto()
    private=Path(args.private);public=Path(args.public)
    if private.exists() or public.exists():raise ValueError('Key file already exists')
    key=Key.generate()
    raw_private=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
    private.write_bytes(raw_private)
    try:private.chmod(0o600)
    except OSError:pass
    public.write_bytes(key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw))
    print('Created private key:',private,'and public key:',public,'(keep private key out of the repository)')


def pack(args):
    serialization,_,_=crypto()
    root=Path(args.root).resolve()
    files={}
    for rel in args.files:
        rel=safe_name(rel)
        src=rooted_path(root,rel)
        content=src.read_bytes()
        if len(content)>MAX_FILE:raise ValueError('Update file exceeds limit: '+rel)
        files[rel]=content
    if not files:raise ValueError('No update files')
    if sum(map(len,files.values()))>MAX_PACKAGE:raise ValueError('Update package too large')
    key=serialization.load_pem_private_key(Path(args.private).read_bytes(),password=None)
    manifest={'format':'latch98-update-v1','version':args.version,'files':{p:{'sha256':hash_bytes(v),'size':len(v)} for p,v in sorted(files.items())}}
    message=manifest_bytes(manifest)
    signature=key.sign(message)
    with zipfile.ZipFile(args.output,'w',compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json',message)
        z.writestr('manifest.sig',signature)
        for rel,raw in files.items():z.writestr('payload/'+rel,raw)
    print('Signed release',args.version, 'created:', args.output)


def recover(root:Path):
    journal=root/JOURNAL
    if not journal.exists():return False
    record=json.loads(journal.read_text(encoding='utf-8'))
    base=root/'.latch-update-backups'/record['id']
    for rel,existed in record['files'].items():
        target=rooted_path(root,rel)
        if existed:
            saved=rooted_path(base,rel)
            if not saved.is_file():raise ValueError('Recovery backup is missing: '+rel)
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(saved,target)
        else:
            target.unlink(missing_ok=True)
    journal.unlink()
    print('Restored previous release after interrupted update')
    return True


def install(args):
    serialization,_,Pub=crypto()
    root=Path(args.root).resolve();root.mkdir(parents=True,exist_ok=True)
    recover(root)
    package=Path(args.package)
    if package.stat().st_size>MAX_PACKAGE:raise ValueError('Update archive is too large')
    public=Pub.from_public_bytes(Path(args.public).read_bytes())
    with zipfile.ZipFile(package) as z:
        if len(z.infolist())>250:raise ValueError('Too many entries in update')
        if len(set(z.namelist()))!=len(z.namelist()):raise ValueError('Duplicate entries in update')
        raw_manifest=z.read('manifest.json');sig=z.read('manifest.sig')
        if len(raw_manifest)>1_000_000:raise ValueError('Manifest too large')
        public.verify(sig,raw_manifest)
        m=json.loads(raw_manifest)
        if m.get('format')!='latch98-update-v1' or not isinstance(m.get('version'),str) or len(m['version'])>50 or not isinstance(m.get('files'),dict):raise ValueError('Invalid manifest')
        if manifest_bytes(m)!=raw_manifest:raise ValueError('Update manifest is not canonical')
        if not m['files']:raise ValueError('Update has no payload')
        expected={'manifest.json','manifest.sig',*(('payload/'+p) for p in m['files'])}
        if set(z.namelist())!=expected:raise ValueError('Unexpected files in update archive')
        changes={};total=0
        for rel,details in m['files'].items():
            target=rooted_path(root,rel)
            info=z.getinfo('payload/'+rel)
            total+=info.file_size
            if info.file_size>MAX_FILE or total>MAX_PACKAGE:raise ValueError('Update exceeds size limit')
            if (info.external_attr>>16)&0o170000==0o120000:raise ValueError('Links are not allowed')
            content=z.read(info)
            if len(content)!=details['size'] or hash_bytes(content)!=details['sha256']:raise ValueError('Update file hash does not match: '+rel)
            changes[rel]=(target,content)
    # Never mutate project state until signature, paths and checksums are fully verified.
    update_id=hash_bytes(raw_manifest)[:16]
    backup=root/'.latch-update-backups'/update_id
    backup.mkdir(parents=True,exist_ok=True)
    present={}
    for rel,(target,_) in changes.items():
        present[rel]=target.exists()
        if target.exists():
            out=rooted_path(backup,rel);out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,out)
    journal=root/JOURNAL
    journal.write_text(json.dumps({'id':update_id,'files':present},sort_keys=True),encoding='utf-8')
    try:
        for rel,(target,content) in changes.items():
            target.parent.mkdir(parents=True,exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent,prefix='.l98new_',delete=False) as f:
                f.write(content);f.flush();os.fsync(f.fileno());tmp=Path(f.name)
            os.replace(tmp,target)
        journal.unlink()
    except BaseException:
        recover(root)
        raise
    print('Installed signed Latch 98 release:',m['version'],'(restart host to reload assets)')
    print('Backup retained at:',backup)


def main():
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    x=sub.add_parser('keygen');x.add_argument('--private',required=True);x.add_argument('--public',required=True)
    x=sub.add_parser('pack');x.add_argument('--root',required=True);x.add_argument('--version',required=True);x.add_argument('--private',required=True);x.add_argument('--output',required=True);x.add_argument('--files',required=True,nargs='+')
    x=sub.add_parser('install');x.add_argument('--root',required=True);x.add_argument('--public',required=True);x.add_argument('--package',required=True)
    x=sub.add_parser('recover');x.add_argument('--root',required=True)
    args=p.parse_args()
    if args.command=='keygen':keygen(args)
    elif args.command=='pack':pack(args)
    elif args.command=='install':install(args)
    else:recover(Path(args.root).resolve())
if __name__=='__main__':main()
