#!/usr/bin/env python3
"""Browser smoke test for self-contained Latch 98 app entrypoints.

Run from the repository root with `python apps/tests/iframe_smoke.py`.
Requires Playwright's Python package and an installed Chromium browser.
Never serves or edits the Latch 98 desktop; exercises self-contained srcdoc
iframes in the same arrangement as the single-file Latch 98 edition.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse
import json

ROOT = Path(__file__).resolve().parents[2]
ENTRIES = {
    'solitaire': 'apps/solitaire/solitaire.html',
    'minesweeper': 'apps/minesweeper/latch98-minesweeper-preview.html',
    'soundstudio': 'apps/soundstudio/index.html',
    'audacity': 'apps/audacity/index.html',
    'weedwarrior': 'apps/weedwarrior/index.html',
    'catacombs': 'apps/catacombs/index.html',
    'wilds': 'apps/wilds/index.html',
}

def app_html(name):
    markup = (ROOT / ENTRIES[name]).read_text(encoding='utf-8')
    if name == 'solitaire':
        # Match tools/build_standalone.py: Solitaire has three local resources.
        markup = markup.replace('<link rel="stylesheet" href="solitaire.css">',
            '<style>'+(ROOT/'apps/solitaire/solitaire.css').read_text()+'</style>')
        for file in ('engine.js', 'app.js'):
            code = (ROOT / 'apps/solitaire' / file).read_text()
            markup = markup.replace('<script src="'+file+'"></script>', '<script>'+code+'</script>')
    return markup


def smoke(names, browser_path):
    failures = []
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=browser_path or None, args=['--no-sandbox', '--disable-gpu-sandbox'])
        try:
            for name in names:
                print("iframe test:", name, flush=True)
                context = browser.new_context(viewport={'width': 1100, 'height': 720}, has_touch=(name == 'minesweeper'), is_mobile=(name == 'minesweeper'))
                page = context.new_page()
                page.set_default_timeout(7000)
                errors, remote, missing = [], [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
                page.on('response', lambda r: missing.append((r.status, r.url)) if r.status >= 400 and not r.url.endswith('/pkg/latch98_minesweeper.js') else None)
                try:
                    # srcdoc matches how the complete single-file edition embeds its apps.
                    page.set_content('<iframe id="smoke-frame" name="smoke-app" style="width:1000px;height:675px;border:0"></iframe>')
                    page.evaluate('(html) => document.querySelector("iframe").srcdoc = html', app_html(name))
                    frame = page.frame(name='smoke-app')
                    frame.wait_for_load_state('domcontentloaded', timeout=30000)
                    if name == 'solitaire':
                        frame.locator('.sol-card.faceup').first.wait_for()
                        assert frame.evaluate('window.__solitaire.getState().stock.length') == 24
                    elif name == 'minesweeper':
                        frame.locator('.ms-cell').first.wait_for()
                        # A selected Flag mode must work even on a desktop mouse.
                        frame.locator('[data-touch="flag"]').click()
                        frame.locator('.ms-cell').first.click()
                        assert 'flagged' in frame.locator('.ms-cell').first.get_attribute('class')
                    elif name == 'soundstudio':
                        frame.locator('#footerStatus').wait_for()
                        assert 'Ready' in frame.locator('#footerStatus').inner_text()
                    elif name == 'audacity':
                        frame.locator('#menubar').wait_for()
                        assert frame.evaluate('!!window.LatchAudioApp')
                        frame.locator('#menubar [data-menu="Generate"]').click()
                        frame.locator('#popup button').filter(has_text='Tone...').click()
                        frame.locator('#dialogContent .actions button').first.click()
                        assert frame.evaluate('window.LatchAudioApp.getSummary().tracks') == 1
                        # A valid project must never silently overwrite unsaved audio.
                        meta=json.dumps({'version':1,'name':'Another project','rate':44100,'selectedId':None,'tracks':[]}).encode()
                        project=b'L98AUDIO'+len(meta).to_bytes(4,'little')+meta
                        file={'name':'other.l98aud','mimeType':'application/octet-stream','buffer':project}
                        page.once('dialog',lambda d: d.dismiss())
                        frame.locator('#projectInput').set_input_files(file)
                        page.wait_for_timeout(100)
                        assert frame.evaluate('window.LatchAudioApp.getSummary().tracks') == 1
                        page.once('dialog',lambda d: d.accept())
                        frame.locator('#projectInput').set_input_files(file)
                        page.wait_for_timeout(100)
                        assert frame.evaluate('window.LatchAudioApp.getSummary().tracks') == 0
                    else:
                        frame.locator('canvas').first.wait_for(timeout=20000)
                    page.wait_for_timeout(700 if name in ('wilds','catacombs') else 200)
                    # A missing WebAssembly pkg is the documented fallback, not a failure.
                    success = not errors and not remote and not missing
                    result = dict(app=name, success=success, script_errors=errors[:4], external_requests=remote[:4], missing_resources=missing[:4])
                    results.append(result)
                    if not success:
                        failures.append(name)
                except Exception as e:
                    results.append(dict(app=name, success=False, error=str(e)[:300]))
                    failures.append(name)
                finally:
                    page.close()
                    context.close()
        finally:
            browser.close()
    print(json.dumps(results, indent=2))
    if failures:
        raise SystemExit('Iframe smoke failures: ' + ', '.join(failures))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--chromium', default=None, help='Path to Chromium if not installed through Playwright')
    parser.add_argument('apps', nargs='*', default=list(ENTRIES))
    args = parser.parse_args()
    for name in args.apps:
        if name not in ENTRIES:
            parser.error('Unrecognized app: '+name)
    smoke(args.apps,args.chromium)
