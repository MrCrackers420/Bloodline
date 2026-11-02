"""Thread 2 standalone + modular browser regressions (inlined modular assets).
Run from project root: python apps/norn-world-lab/tests/test-thread2-browser.py generated-standalone.html [--modular]
Run twice to test each mode. Needs Chromium and Python Playwright. Both modes use in-memory documents to
avoid network dependencies. Tests actual Norn Step 32 file scripts in a lightweight
iframe; full simulation performance is tested separately.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys

if len(sys.argv)<2:raise SystemExit('Pass generated standalone HTML file as the first argument')
standalone=Path(sys.argv[1]).resolve()
HTML=standalone.read_text()
ROOT=Path(__file__).resolve().parents[3]
NORN= (ROOT/'apps/norn-world-lab/index.html').read_text()
def modular_html():
    html=(ROOT/'web/index.html').read_text()
    for css in ('desktop.css','shell_v07.css','explorer_v08.css','swarmwire.css','latchnet.css'):
        html=html.replace(f'<link rel="stylesheet" href="{css}">','<style>'+ (ROOT/'web'/css).read_text().replace('</style','<\\/style')+'</style>')
    for js in ('latchnet.js','filesystem.js','swarmwire.js','desktop.js'):
        html=html.replace(f'<script src="{js}"></script>','<script>'+ (ROOT/'web'/js).read_text().replace('</script','<\\/script')+'</script>')
    return html
MODULAR=modular_html()
def paint(page,storage=None,modular=False):
    # about:blank pages cannot use native localStorage in every browser.
    shim='<script>window.__testStore='+json.dumps(storage or {})+';Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>'
    page.set_content((MODULAR if modular else HTML).replace('<head>','<head>'+shim,1),wait_until='domcontentloaded',timeout=90000)
    if not modular:page.locator('#boot-fullscreen').uncheck()

def check(page,modular=False):
    problems=[]
    page.on('pageerror', lambda err: problems.append(str(err)))
    page.evaluate("document.getElementById('boot-button').click()")
    page.locator('#desktop:not(.hidden)').wait_for(timeout=13000)
    page.wait_for_function('window.LatchFS && window.LatchFS.ready')
    assert page.evaluate("LatchFS.installedPrograms().every(x=>x.id!=='nornlab')")
    assert page.evaluate('LatchFS.nornTransfer()') is None
    assert page.evaluate("LatchFS.discInfo().mounted") is None
    # The private letter must be where the torrent can be acquired.
    page.locator('#desktop-icons [data-app="browser"]').dblclick()
    page.evaluate("window.LatchNet.active.navigate('http://www.postbox.l98/')")
    page.locator('.ln-viewport a.ln-message-link[href*="message=lab"]').click()
    assert page.locator('.ln-mail-body').inner_text().find('Don\'t go looking for this on the software sites')!=-1
    page.locator('.ln-viewport [data-ln-attachment="open"]').click()
    page.locator('.window[data-id="swarmwire"] [data-sw="start"]').click()
    page.wait_for_timeout(1300)
    assert page.evaluate('LatchFS.nornTransfer().percent')>0
    page.locator('.window[data-id="swarmwire"] [data-sw="pause"]').click()
    assert page.evaluate('LatchFS.nornTransfer().state')=='Stopped'
    # Capture settled progress after Pause: one scheduled transfer tick can
    # legally complete between reading the live counter and clicking Pause.
    pct=page.evaluate('LatchFS.nornTransfer().percent')
    saved=page.evaluate('LatchFS.export()')
    # Page reload retains transfer state and the mailbox/torrent entry.
    storage=page.evaluate('window.__testStore')
    paint(page,storage,modular)
    page.evaluate("document.getElementById('boot-button').click()")
    page.locator('#desktop:not(.hidden)').wait_for(timeout=13000)
    assert page.evaluate('LatchFS.nornTransfer().percent')==pct
    # Use the launcher's established torrent/file association (private email still available).
    page.locator('#desktop-icons [data-app="browser"]').dblclick()
    page.evaluate("window.LatchNet.active.navigate('http://www.postbox.l98/?message=lab')")
    page.locator('.ln-viewport [data-ln-attachment="open"]').click()
    assert page.evaluate('LatchFS.nornTransfer().percent')==pct
    page.locator('.window[data-id="swarmwire"] [data-sw="start"]').click()
    page.wait_for_function("LatchFS.get('C:/Downloads/NornWorldLab.iso')?.kind==='iso'",timeout=25000)
    page.locator('.window[data-id="swarmwire"] [data-sw="disc"]').click()
    page.locator('#dialog-overlay button').filter(has_text='Open Disc').click()
    setup=page.locator('[data-fs-path="D:/SETUP.EXE"]')
    setup.first.dblclick(timeout=10000)
    page.locator('#dialog-overlay button').filter(has_text='Next >').click()
    page.locator('#dialog-overlay button').filter(has_text='Install').click()
    page.locator('#dialog-overlay button').filter(has_text='Finish').click()
    assert page.evaluate("LatchFS.installedPrograms().some(x=>x.id==='nornlab')")
    assert page.evaluate("LatchFS.discInfo().mounted==='C:/DOWNLOADS/NORNWORLDLAB.ISO'")
    backup=page.evaluate('LatchFS.export()')
    assert '"swarmwire"' in backup
    # The full simulation runs a perpetual physics loop. Validate its *actual*
    # Step 32 bridge/adapter scripts in a light same-origin iframe to keep this
    # installation test independent of simulation performance.
    bridgeCode='''()=>{
      const full=__NORN_SOURCE__;
      const host=full.match(/<script id="norn-disk-host">([\\s\\S]*?)<\\/script>/)[0];
      const files=full.match(/<script id="norn-files">([\\s\\S]*?)<\\/script>/)[0];
      const frame=document.createElement('iframe');frame.id='thread2-norn-bridge';
      frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock');
      frame.srcdoc='<html><head>'+host+files+'</head><body></body></html>';
      document.body.append(frame);
    }'''
    page.evaluate(bridgeCode.replace('__NORN_SOURCE__',json.dumps(NORN) if modular else "LatchBundle.get('norn')"))
    page.wait_for_function("document.querySelector('#thread2-norn-bridge')?.contentWindow?.NornFiles",timeout=10000)
    assert page.evaluate('document.querySelector("#thread2-norn-bridge").contentWindow.NornDiskEmbedded') is True
    assert page.evaluate('document.querySelector("#thread2-norn-bridge").contentWindow.LatchFS===window.LatchFS') is True
    page.evaluate('async()=>{const f=document.querySelector("#thread2-norn-bridge").contentWindow;await f.NornFiles.host();f.NornFiles.folder(LatchFS,"C:/My Documents/Norn World Lab/Research");await f.NornFiles.write("C:/My Documents/Norn World Lab/Research/Thread2-Test.txt","same disk as parent");}')
    assert page.evaluate("LatchFS.read('C:/My Documents/Norn World Lab/Research/Thread2-Test.txt')")=='same disk as parent'
    assert not any('Uncaught' in e or 'TypeError' in e for e in problems), problems[:8]
    print(('Modular' if modular else 'Standalone')+' PASS: private email -> torrent -> resume/reload -> ISO -> D: -> Setup; Norn bridge scripts share host disk', 'progress',pct)
    return saved

if __name__=='__main__':
    modular='--modular' in sys.argv[2:]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1200,'height':850},accept_downloads=True)
        page.set_default_timeout(12000)
        paint(page,modular=modular)
        check(page,modular=modular)
        browser.close()
