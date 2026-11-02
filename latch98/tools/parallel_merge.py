#!/usr/bin/env python3
"""Validate and safely merge independently-owned Latch 98 thread patches.

Patch ZIP layout: project-relative paths, only files changed from baseline.
No deletes and no filesystem symlinks. Merges are blocked if the local file
has diverged from the recorded base snapshot, which prevents silent overwrites.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OWNERS = json.loads((ROOT / 'coordination/OWNERSHIP.json').read_text())['threads']
BASE = json.loads((ROOT / 'coordination/base_manifest.json').read_text())['files']
MAX_SIZE = 40 * 1024 * 1024
MAX_FILES = 100


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def owns(thread: str, path: str) -> bool:
    o = OWNERS[thread]
    if any(path.startswith(x) for x in o.get('excludes', [])):
        return False
    return path in o.get('files', []) or any(path.startswith(x) for x in o.get('directories', []))


def extract_patch(archive: Path) -> dict[str, bytes]:
    changes = {}
    count = 0
    total = 0
    with zipfile.ZipFile(archive) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            count += 1
            if count > MAX_FILES:
                raise ValueError('Too many files in patch')
            # An entry with unix symlink bits is always rejected.
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Symlink entries are not allowed')
            posix = PurePosixPath(info.filename)
            if (posix.is_absolute() or '\\' in info.filename or ':' in info.filename or
                    any(part in ('.', '..') for part in info.filename.split('/'))):
                raise ValueError(f'Unsafe patch path: {info.filename}')
            parts = posix.parts
            if parts and parts[0] == 'Latch98-Standalone-Source':
                parts = parts[1:]
            if not parts:
                raise ValueError('Patch must contain project-relative files')
            path = '/'.join(parts)
            if path in changes:
                raise ValueError(f'Duplicate patch path: {path}')
            if info.file_size > MAX_SIZE:
                raise ValueError(f'Patch file too large: {path}')
            total += info.file_size
            if total > MAX_SIZE:
                raise ValueError('Patch exceeds total size limit')
            raw = z.read(info)
            # Source files in our project are all UTF-8; binary files can be
            # handled in a reviewed integrator patch, not an automatic merge.
            try:
                raw.decode('utf-8')
            except UnicodeDecodeError:
                raise ValueError(f'Patch contains binary file: {path}')
            changes[path] = raw
    if not changes:
        raise ValueError('Patch ZIP is empty')
    return changes


def validate(thread: str, changes: dict[str, bytes]) -> tuple[list[str], list[str]]:
    updates = []
    unchanged = []
    for path, raw in changes.items():
        if not owns(thread, path):
            raise ValueError(f'{thread} does not own {path}')
        target = ROOT / path
        if target.is_symlink() or any(parent.is_symlink() for parent in target.parents if parent != ROOT and ROOT in parent.parents):
            raise ValueError(f'Refusing symbolic-link target: {path}')
        current = target.read_bytes() if target.is_file() else None
        if current == raw:
            unchanged.append(path)
            continue
        base_hash = BASE.get(path)
        if base_hash is None:
            if target.exists():
                raise ValueError(f'New file already exists: {path}')
        elif current is None or digest(current) != base_hash:
            raise ValueError(f'Conflict: {path} has been changed since baseline (no overwrite)')
        updates.append(path)
    return updates, unchanged


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['check', 'apply', 'status'])
    parser.add_argument('--thread', choices=list(OWNERS))
    parser.add_argument('--zip', type=Path)
    args = parser.parse_args()
    if args.mode == 'status':
        for thread, data in OWNERS.items():
            print(f'{thread}: ' + ', '.join(data.get('files', []) + data.get('directories', [])))
        return 0
    if not args.thread or not args.zip:
        parser.error('--thread and --zip required for check/apply')
    changes = extract_patch(args.zip)
    updates, unchanged = validate(args.thread, changes)
    print(f'Validated {args.thread}: {len(updates)} updates; {len(unchanged)} already identical')
    for name in updates:
        print('  +', name)
    if args.mode == 'check':
        return 0
    # Preflight above covers every file before any changes are made.
    backups = {}
    try:
        for name in updates:
            dest = ROOT / name
            backups[name] = dest.read_bytes() if dest.exists() else None
            dest.parent.mkdir(parents=True, exist_ok=True)
            fd, tmp = tempfile.mkstemp(dir=dest.parent, prefix='.merge-')
            try:
                with os.fdopen(fd, 'wb') as out:
                    out.write(changes[name])
                os.replace(tmp, dest)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
    except Exception:
        for name, previous in backups.items():
            dest = ROOT / name
            if previous is None:
                dest.unlink(missing_ok=True)
            else:
                dest.write_bytes(previous)
        raise
    print('Merged. Run: python tools/release_check.py')
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f'Merge rejected: {exc}', file=sys.stderr)
        sys.exit(2)
