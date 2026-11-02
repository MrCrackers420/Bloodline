#!/usr/bin/env python3
"""Repeatable quick release gate for the modular and one-file Latch 98 builds.

This deliberately never touches app gameplay source or the user's actual save.
Creates a scratch standalone build, validates embedded asset digests, and
runs the existing Node filesystem/install/game checks. --browser enables the
slower Playwright smoke checks from the current source-generated HTML.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
NODE_TESTS = [
    'test-filesystem.cjs', 'test-media-install.cjs', 'test-norn-install.cjs',
    'test-shortcuts.cjs', 'test-language-migration.cjs',
    'test-modular.cjs', 'test-step32-bloodline.cjs',
    'test-integrated-norn-simulation.cjs',
]
MANDATORY_PAYLOADS = {
    'norn': ROOT/'apps/norn-world-lab/index.html',
    'minesweeper': ROOT/'apps/minesweeper/latch98-minesweeper-preview.html',
    'bloodline': ROOT/'apps/bloodline/bloodline.html',
    'wilds': ROOT/'apps/wilds/index.html',
    'catacombs': ROOT/'apps/catacombs/index.html',
    'weedwarrior': ROOT/'apps/weedwarrior/index.html',
    'soundstudio': ROOT/'apps/soundstudio/index.html',
    'audacity': ROOT/'apps/audacity/index.html',
    'spritestudio': ROOT/'apps/sprite-studio/index.html',
}


def verify_standalone(text: str):
    assert 'id="boot-fullscreen"' in text, 'Startup lacks fullscreen option'
    assert 'id="l98-standalone-game"' in text, 'Game viewport missing'
    assert 'data-l98-exit-game' in text and 'Return to Latch 98' in text, 'Visible Bloodline exit control missing'
    assert 'opacity:0' not in text.split('#l98-standalone-game .l98-return{',1)[1].split('}',1)[0], 'Bloodline close button must not be invisible'
    assert 'window.LatchFS' in text, 'Shared virtual disk absent'
    assert 'NornWorldLab.iso' in text, 'In-world Norn disc missing'
    # Game sources are bundled, not URLs. No unbundled local scripts/styles.
    bad = re.findall(r'<(?:script|link)\s[^>]*(?:src|href)="(?!https?:|data:|#)([^"]+)"', text)
    assert not bad, f'Standalone has local dependencies: {bad}'
    for name, src in MANDATORY_PAYLOADS.items():
        match = re.search(r'<script type="text/plain" id="l98-packed-'+re.escape(name)+r'">([^<]+)</script>', text)
        assert match, f'{name} missing from embedded game library'
        embedded = base64.b64decode(match.group(1))
        expected = src.read_bytes()
        assert embedded == expected, f'{name} bundled source differs from modular source'
        print(f'  {name:12} {len(embedded):>9,} bytes SHA256 {hashlib.sha256(embedded).hexdigest()[:14]}')
    # Solitaire is assembled from multiple files, so verify the entry point and
    # embedded script and CSS markers instead of comparing to solitaire.html.
    sol = re.search(r'<script type="text/plain" id="l98-packed-solitaire">([^<]+)</script>', text)
    assert sol, 'Solitaire missing'
    result = base64.b64decode(sol.group(1)).decode()
    assert '<style>' in result and 'Klondike' in result, 'Solitaire asset not assembled'
    # This gate cannot prove the installer UI, but it catches accidental
    # auto-install additions to the default disk source.
    fs = (ROOT/'web/filesystem.js').read_text()
    setup = fs.split('const defaults=', 1)[1].split('function ensureSystem()', 1)[0]
    assert "installed:{nornlab" not in setup.replace(' ', ''), 'Norn auto-installed by defaults()'
    assert 'installSoftware' in fs, 'Installer function disappeared'


def run(cmd):
    print('RUN', ' '.join(map(str, cmd)), flush=True)
    subprocess.run(list(map(str, cmd)), cwd=ROOT, check=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--browser', action='store_true', help='Run extended Playwright smoke checks (slower)')
    p.add_argument('--output', type=Path, help='Also write a standalone HTML release here')
    a = p.parse_args()
    with tempfile.TemporaryDirectory(prefix='latch98-check-') as folder:
        out = a.output or Path(folder)/'latch98-check.html'
        run([sys.executable, ROOT/'tools/build_standalone.py', out])
        verify_standalone(out.read_text(encoding='utf-8'))
        print('Packed source-integrity check: PASS')
        for test in NODE_TESTS:
            run(['node', ROOT/'tools'/test])
        run(['node', ROOT/'apps/norn-world-lab/tests/test-thread2-disk.cjs'])
        run([sys.executable, ROOT/'tools/test_parallel_merge.py'])
        run([sys.executable, ROOT/'tools/test_norn_boundary.py'])
        run(['node', ROOT/'apps/sprite-studio/tests/model.test.cjs'])
        run(['node', ROOT/'apps/sprite-studio/tests/png.test.cjs'])
        run([sys.executable, ROOT/'apps/sprite-studio/tests/grid_alignment.test.py'])
        # New Round 3 specialist regressions: audio precision, reliable disk song saves,
        # and Sprite Studio sprite-sheet round-tripping.
        run(['node', ROOT/'apps/tests/audio-accuracy.test.cjs'])
        run(['node', ROOT/'apps/tests/soundstudio-disk.test.cjs'])
        run(['node', ROOT/'apps/sprite-studio/tests/sheet.test.cjs'])
        if a.browser:
            for test in ['test-standalone-playwright.py', 'test-games-in-one-html.py', 'test-first-run-ui.py']:
                env = dict(os.environ, LATCH98_TEST_HTML=str(out))
                print('RUN BROWSER', test, flush=True)
                subprocess.run([sys.executable, str(ROOT/'tools'/test)], env=env, cwd=ROOT, check=True, timeout=75)
    print('Release gate: PASS')

if __name__ == '__main__':
    main()
