import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
file=os.environ.get('LATCH98_TEST_HTML','/mnt/data/Latch98-Standalone-Step32-AllGames-Fullscreen.html')
html=Path(file).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--allow-file-access-from-files','--no-sandbox'])
 page=browser.new_page(viewport={'width':1150,'height':780})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def put_html(snapshot=None):
  state=json.dumps(snapshot or {})
  poly='<script>window.__testStore='+state+';Object.defineProperty(window,\'localStorage\',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>'
  page.set_content(html.replace('<head>','<head>'+poly,1),wait_until='domcontentloaded',timeout=90000)
 put_html()
 assert page.locator('#boot-fullscreen').is_checked()
 page.locator('#boot-fullscreen').uncheck()
 page.locator('#boot-button').click()
 page.wait_for_timeout(3200)
 assert page.locator('#desktop').is_visible()
 state=page.evaluate('''async()=>{await LatchFS.ready;return {installed:LatchFS.installedPrograms(),bloodline:!!LatchFS.get('C:/Windows/Desktop/Bloodline.lnk'),iso:!!LatchFS.get('C:/Downloads/NornWorldLab.iso')}}''')
 print('fresh disk',state)
 assert not any(x['id']=='nornlab' for x in state['installed']);assert state['bloodline'];assert not state['iso']
 # Both built-in games are truly available in srcdoc
 page.evaluate("document.querySelector('[data-app=minesweeper]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));")
 page.evaluate("document.querySelector('[data-app=solitaire]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));")
 page.wait_for_timeout(700)
 print('games',page.locator('iframe').count(),[(f.get_attribute('title'),len(f.get_attribute('srcdoc') or '')) for f in page.locator('iframe').all()])
 assert page.locator('iframe[title="Minesweeper game"]').count()==1
 assert page.locator('iframe[title="Solitaire — Klondike"]').count()==1
 # Try to open Norn without install
 page.evaluate("document.querySelector('[data-app=notepad]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));")
 page.evaluate('''()=>{}''')
 # Confirm installer pipeline and persistent install
 result=page.evaluate('''()=>{let p=LatchFS.saveNornTorrent();let m=LatchFS.torrentInfo(p);let iso=LatchFS.downloadNornDisc(p);let mounted=LatchFS.mountDisc(iso);let n=LatchFS.get('D:/SETUP.EXE');let installed=LatchFS.installSoftware('nornlab');return {iso,mounted,program:n.program,installed:installed.name}}''')
 print('installation',result)
 assert result['program']=='nornlab'
 put_html(page.evaluate('window.__testStore'))
 installed=page.evaluate('''async()=>{await LatchFS.ready;return LatchFS.installedPrograms()}''')
 print('installed after reload',installed)
 assert any(x['id']=='nornlab' for x in installed)
 page.locator('#boot-fullscreen').uncheck();page.locator('#boot-button').click();page.wait_for_timeout(3200)
 # Start Norn and inspect embedded initialization
 page.evaluate("document.querySelector('[data-app=browser]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));")
 page.evaluate('''()=>{const el=document.querySelector('#desktop'); el.focus?.();}''')
 page.evaluate('''()=>{ const buttons=[...document.querySelectorAll('[data-app]')]; }''')
 page.evaluate("document.querySelector('[data-app=solitaire]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));")
 # Use Start menu to launch Norn, 2 nested clicks are browser-dependent. JS launch is closure; via start menu.
 page.locator('#start-button').click()
 page.locator('#start-items [data-sub="programs"]').click()
 page.locator('#submenu [data-sub="games"]').click()
 page.locator('#nested-menu [data-app="nornlab"]').click()
 page.wait_for_timeout(1800)
 norn_frames=page.locator('iframe.norn-frame')
 print('norn iframe count',norn_frames.count())
 assert norn_frames.count()==1
 print('norn title',norn_frames.first.content_frame.locator('title').all_text_contents())
 print('norn embedded',norn_frames.first.element_handle().content_frame().evaluate('window.NornDiskEmbedded'))
 assert norn_frames.first.element_handle().content_frame().evaluate('window.NornDiskEmbedded') is True
 print('errors',errors[:5])
 browser.close()
