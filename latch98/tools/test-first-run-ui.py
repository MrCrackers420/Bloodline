import os
from playwright.sync_api import sync_playwright
from pathlib import Path
h=Path(os.environ.get('LATCH98_TEST_HTML','/mnt/data/Latch98-Standalone-Step32-AllGames-Fullscreen.html')).read_text()
poly="<script>window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>"
h=h.replace('<head>','<head>'+poly,1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1150,'height':780});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(h,wait_until='domcontentloaded');page.locator('#boot-fullscreen').uncheck();page.locator('#boot-button').click();page.wait_for_timeout(3100)
 # Try to run Norn via Run dialog; install must be enforced.
 page.locator('#start-button').click();page.locator('#start-items [data-app="run"]').click();page.locator('#run-input').fill('nornlab');page.locator('#run-input').press('Enter')
 assert 'Install Norn World Lab before starting' in page.locator('#dialog-overlay').inner_text()
 page.locator('#dialog-overlay button').click()
 # Follow the private email attachment.
 page.locator('#desktop-icons [data-app="browser"]').dblclick();page.evaluate("window.LatchNet.active.navigate('http://www.postbox.l98/')")
 page.locator('.ln-viewport a[data-ln-url*="?message=lab"]').click()
 print('private email found',page.locator('.ln-viewport [data-ln-attachment="save"]').count())
 page.locator('.ln-viewport [data-ln-attachment="open"]').click()
 print('torrent node',page.evaluate("LatchFS.get('C:/Downloads/NWLAB03.torrent')?.kind"))
 print('swarmwire open',page.locator('.window[data-id="swarmwire"]').count())
 assert page.locator('.window[data-id="swarmwire"]').count()==1
 page.locator('.window[data-id="swarmwire"] [data-sw="start"]').click()
 page.wait_for_timeout(2000)
 print('torrent progress',page.locator('.window[data-id="swarmwire"] .sw-status').inner_text())
 assert 'Downloading' in page.locator('.window[data-id="swarmwire"] .sw-status').inner_text()
 # Complete simulated download rapidly by triggering ticks at minimum time; production timer is about 20 seconds.
 page.wait_for_function("LatchFS.get('C:/Downloads/NornWorldLab.iso')?.kind === 'iso'", timeout=40000)
 print('download',page.evaluate("LatchFS.get('C:/Downloads/NornWorldLab.iso')?.kind"))
 assert page.evaluate("LatchFS.get('C:/Downloads/NornWorldLab.iso')?.kind")=='iso'
 page.locator('.window[data-id="swarmwire"] [data-sw="disc"]').click()
 page.locator('#dialog-overlay button').filter(has_text='Open Disc').click()
 print('setup entry',page.locator('.window[data-id="explorer:D:"]').count())
 # File is navigated by Explorer; launch by double-click target.
 setup=page.locator('[data-fs-path="D:/SETUP.EXE"]')
 print('setup entries',setup.count())
 if setup.count():setup.first.dblclick()
 print('wizard title',page.locator('#dialog-overlay .dialog-bar').inner_text())
 page.locator('#dialog-overlay button').filter(has_text='Next >').click()
 page.locator('#dialog-overlay button').filter(has_text='Install').click()
 page.locator('#dialog-overlay button').filter(has_text='Finish').click()
 assert any(x['id']=='nornlab' for x in page.evaluate('LatchFS.installedPrograms()'))
 print('installed',page.evaluate('LatchFS.installedPrograms()'))
 print('errors',errors[:7])
 b.close()
