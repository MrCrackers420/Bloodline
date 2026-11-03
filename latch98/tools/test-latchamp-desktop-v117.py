"""Smoke-test the real Latch 98 optional installer and embedded LatchAmp browser."""
from pathlib import Path
import os,tempfile,subprocess,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
preview=os.environ.get('LATCH98_TEST_HTML')
if preview: HTML=Path(preview).read_text()
else:
 with tempfile.TemporaryDirectory() as tmp:
  dest=Path(tmp)/'Latch98-Review.html'
  subprocess.run([sys.executable,str(ROOT/'tools/build_standalone.py'),str(dest)],check=True)
  HTML=dest.read_text()
poly='''<script>window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1240,'height':930});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content(HTML.replace('<head>','<head>'+poly,1),wait_until='domcontentloaded',timeout=80000)
 pg.locator('#boot-fullscreen').uncheck();pg.locator('#boot-button').click()
 pg.wait_for_function("!document.querySelector('#desktop').classList.contains('hidden')",timeout=9000)
 result=pg.evaluate('''async()=>{await LatchFS.ready;const initial=LatchFS.installedPrograms().some(x=>x.id==='latchamp');const file=LatchFS.createAppInstaller('latchamp');LatchFS.installSoftware('latchamp');return {initial,file,version:LatchFS.installedPrograms().find(x=>x.id==='latchamp').version}}''')
 assert not result['initial'] and result['version']=='1.17',result
 pg.locator('#start-button').click();pg.locator('#start-items [data-sub="programs"]').click();pg.locator('#submenu [data-sub="accessories"]').click();pg.locator('#nested-menu [data-app="latchamp"]').click()
 pg.wait_for_function("!!document.querySelector('.window[data-id=latchamp] iframe.l98-extra-frame')",timeout=12000)
 fr=pg.locator('.window[data-id="latchamp"] iframe').content_frame
 fr.locator('#tab-yt').click(timeout=5000)
 assert fr.locator('#yt-library-panel').count()==1 and fr.locator('#video-shell').count()==1
 assert fr.locator('#yt-saved-details').count()==1
 title=fr.locator('.titlebar').text_content();assert '1.17' in title,title
 assert not errors,errors
 print('PASS: Latch boot, optional v1.17 installer, Start menu launch, embedded player UI, page errors')
 b.close()
