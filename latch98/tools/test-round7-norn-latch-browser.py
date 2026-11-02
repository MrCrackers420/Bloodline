#!/usr/bin/env python3
"""Smoke-check the actual optional Norn install and Round 7 Egg Maker UI in standalone Latch 98."""
import os,sys,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

file_arg=os.environ.get('LATCH98_TEST_HTML')
if file_arg:
    file=Path(file_arg)
else:
    file=Path(tempfile.mkdtemp(prefix='latch98-r7-'))/'Latch98-Round7-Norn-Desktop-Review.html'
    subprocess.run([sys.executable,str(Path(__file__).resolve().parent/'build_standalone.py'),str(file)],check=True)
text=file.read_text(encoding='utf8')
# In-memory disk keeps the test from touching a real Latch save.
poly='''<script>window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>'''
text=text.replace('<head>','<head>'+poly,1)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1220,'height':820})
    errors=[]
    page.on('pageerror',lambda e:errors.append('Latch: '+str(e)))
    page.set_content(text,wait_until='domcontentloaded',timeout=90000)
    assert page.evaluate('window.LatchBundle.get("norn").includes("r7practice8128")')
    page.locator('#boot-fullscreen').uncheck()
    page.locator('#boot-button').click()
    page.wait_for_function("!document.querySelector('#desktop').classList.contains('hidden')",timeout=15000)
    before=page.evaluate("async()=>{await LatchFS.ready; return LatchFS.installedPrograms().some(x=>x.id==='nornlab')}")
    assert not before, 'Norn must not be preinstalled'
    steps=page.evaluate('''()=>{
        const torrent=LatchFS.saveNornTorrent();
        const iso=LatchFS.downloadNornDisc(torrent);
        LatchFS.mountDisc(iso);
        const setup=LatchFS.get('D:/SETUP.EXE');
        LatchFS.installSoftware('nornlab');
        return {torrent,iso,setup:setup.program,installed:LatchFS.installedPrograms().some(x=>x.id==='nornlab')};
    }''')
    assert steps['setup']=='nornlab' and steps['installed'], steps
    # Use actual Start > Programs > Games menu to launch.
    page.locator('#start-button').click()
    page.locator('#start-items [data-sub="programs"]').click()
    page.locator('#submenu [data-sub="games"]').click()
    page.locator('#nested-menu [data-app="nornlab"]').click()
    frame=page.locator('iframe.norn-frame').first
    frame.wait_for(state='attached',timeout=15000)
    # The host replaces its loader after the embedded game finishes loading.
    page.wait_for_function("!!document.querySelector('.window[data-id=nornlab] iframe.norn-frame')",timeout=15000)
    frame_locator=frame.content_frame
    frame_locator.locator('#e-gait').wait_for(state='attached',timeout=30000)
    options=frame_locator.locator('#e-gait option').evaluate_all('els=>els.map(e=>({value:e.value,text:e.textContent}))')
    assert options[0]['value']==''
    assert any(x['value']=='quad' for x in options)
    assert any(x['value']=='r7practice8128' for x in options),options
    assert any(x['value']=='r7practice4213' for x in options),options
    assert frame_locator.locator('#e-gait').input_value()==''
    print('PASS: optional Postbox/torrent/ISO install remains gated, Round7 frame loads, 5/15 minute learned gait options available, default unchanged')
    if errors:
        print('Browser errors:',errors[:5])
        # Any Latch top-level uncaught JS errors are regressions.
        assert not errors,errors[:5]
    browser.close()
