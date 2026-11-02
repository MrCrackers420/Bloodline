import os
from playwright.sync_api import sync_playwright
from pathlib import Path
html=Path(os.environ.get('LATCH98_TEST_HTML','/mnt/data/Latch98-Standalone-Step32-AllGames-Fullscreen.html')).read_text()
bootshim='''<script>window.__diskMock={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__diskMock,k)?window.__diskMock[k]:null},setItem(k,v){window.__diskMock[k]=String(v)},removeItem(k){delete window.__diskMock[k]}}});</script>'''
html=html.replace('<head>','<head>'+bootshim,1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1150,'height':800})
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=90000)
 print('boot',page.locator('#boot-button').count(),'fullscreen',page.locator('#boot-fullscreen').is_checked(),'errors',errors[:4])
 print('FS',page.evaluate('''async()=>{await LatchFS.ready;return {installed:LatchFS.installedPrograms(),snapshot:JSON.parse(LatchFS.export()).version,shortcut:LatchFS.get('C:/WINDOWS/DESKTOP/BLOODLINE.LNK')?.target}}'''))
 page.locator('#boot-fullscreen').uncheck()
 page.locator('#boot-button').click();page.wait_for_timeout(3200)
 print('desktop visible',page.locator('#desktop').is_visible())
 for app in ('minesweeper','solitaire'):
  page.locator('#desktop-icons [data-app="'+app+'"]').dblclick()
 page.wait_for_timeout(450)
 print('frames',[(v.get_attribute('title'),len(v.get_attribute('srcdoc') or '')) for v in page.locator('iframe').all()]);print('errors',errors[:10])
 assert page.locator('iframe[title="Minesweeper game"]').count()==1
 assert page.locator('iframe[title="Solitaire — Klondike"]').count()==1
 # Simulate the entire file-system install pipeline; the UI still uses Postbox and SwarmWire.
 r=page.evaluate('''()=>{const p=LatchFS.saveNornTorrent(),iso=LatchFS.downloadNornDisc(p);LatchFS.mountDisc(iso);return LatchFS.installSoftware('nornlab')}''')
 print('installed',r)
 page.locator('#start-button').click()
 page.locator('#start-items [data-sub="programs"]').click()
 page.locator('#submenu [data-sub="games"]').click()
 page.locator('#nested-menu [data-app="nornlab"]').click()
 page.wait_for_timeout(1900)
 print('norn iframe',page.locator('.norn-frame').count())
 if page.locator('.norn-frame').count():print('embedded',page.locator('iframe.norn-frame').first.element_handle().content_frame().evaluate('window.NornDiskEmbedded'))
 print('errors',errors[:12])
 page.screenshot(path='/mnt/data/Latch98-Standalone-Step32-Preview.png')
 b.close()
