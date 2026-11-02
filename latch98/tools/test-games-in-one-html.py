import os
from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(os.environ.get('LATCH98_TEST_HTML','/mnt/data/Latch98-Standalone-Step32-AllGames-Fullscreen.html'))
html=p.read_text()
poly="""<script>window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]}}});</script>"""
html=html.replace('<head>','<head>'+poly,1)
with sync_playwright() as sync:
 b=sync.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1150,'height':780});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=90000)
 found=page.evaluate("['bloodline','norn','wilds','catacombs','weedwarrior','soundstudio','audacity','solitaire','minesweeper'].map(s=>[s,window.LatchBundle.get(s)?.length||0])")
 print('packed',found);assert all(x[1]>5000 for x in found)
 page.locator('#boot-fullscreen').uncheck();page.locator('#boot-button').click();page.wait_for_timeout(3100)
 # From original shortcut, no Latch desktop while playing; no network fallback.
 page.locator('.desktop-icon[data-path="C:/WINDOWS/DESKTOP/BLOODLINE.LNK"]').dblclick()
 page.wait_for_timeout(1500)
 print('fullscreen',page.locator('#l98-standalone-game').is_visible(),page.locator('#desktop').is_visible(),page.locator('#l98-standalone-game iframe').get_attribute('srcdoc') is not None)
 assert page.locator('#l98-standalone-game').is_visible();assert not page.locator('#desktop').is_visible()
 assert 'Bloodline' in (page.locator('#l98-standalone-game iframe').get_attribute('srcdoc') or '')
 # Visible, touch-friendly exit control — separate from the existing keyboard/gamepad exit.
 exit_button=page.locator('#l98-standalone-game [data-l98-exit-game]')
 assert exit_button.is_visible() and exit_button.get_attribute('aria-label')=='Close Bloodline and return to Latch 98'
 assert float(exit_button.evaluate('e=>getComputedStyle(e).opacity'))>0.9
 exit_button.click()
 assert page.locator('#desktop').is_visible() and not page.locator('#l98-standalone-game').is_visible()
 page.locator('.desktop-icon[data-path="C:/WINDOWS/DESKTOP/BLOODLINE.LNK"]').dblclick()
 page.wait_for_timeout(350)
 assert page.locator('#l98-standalone-game').is_visible()
 page.keyboard.down('Control');page.keyboard.down('Shift');page.keyboard.press('Escape');page.keyboard.up('Shift');page.keyboard.up('Control')
 print('returned',page.locator('#desktop').is_visible())
 assert page.locator('#desktop').is_visible()
 page.locator('.desktop-icon[data-path="C:/WINDOWS/DESKTOP/BLOODLINE (WINDOWED).LNK"]').dblclick()
 page.wait_for_timeout(600)
 assert page.locator('iframe.bloodline-frame').count()==1
 print('windowed bytes',len(page.locator('iframe.bloodline-frame').get_attribute('srcdoc') or ''))
 # Other apps are in the library, each opens its own window/frame.
 for app in ['catacombs','weedwarrior','soundstudio','audacity']:
  page.locator('#start-button').click()
  page.locator('#start-items [data-sub="programs"]').click()
  if app in ['soundstudio','audacity']:
   page.locator('#submenu [data-sub="accessories"]').click()
  else:
   page.locator('#submenu [data-sub="games"]').click()
  page.locator(f'#nested-menu [data-app="{app}"]').click()
  page.wait_for_timeout(250)
  frame=page.locator(f'.window[data-id="{app}"] iframe')
  assert frame.count()==1,app
  print('app',app,'bytes',len(frame.get_attribute('srcdoc') or ''))
 print('errors',errs[:6])
 b.close()
