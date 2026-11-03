"""Standalone Latch 98 browser smoke: MySpace opens in an actual Latch window."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, subprocess, tempfile
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as d:
 html_path=Path(d)/'latch.html'
 subprocess.run([sys.executable,str(ROOT/'tools/build_standalone.py'),str(html_path)],check=True,capture_output=True)
 html=html_path.read_text('utf-8')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1180,'height':850})
  page=context.new_page()
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded',timeout=90000)
  page.locator('#boot-fullscreen').uncheck()
  page.locator('#boot-button').click()
  page.locator('#desktop').wait_for(state='visible',timeout=15000)
  page.locator('.desktop-icon[data-app="browser"]').dblclick()
  page.locator('.window[data-id="browser"] .ln-address input').wait_for(timeout=15000)
  page.evaluate("window.LatchNet.active.navigate('https://myspace.com/music')")
  win=page.locator('.window[data-id="browser"]')
  assert win.is_visible()
  assert win.locator('iframe.ln-live-frame').get_attribute('src')=='https://myspace.com/music'
  assert page.locator('.window[data-id="browser"] .titlebar .caption').inner_text()=='MySpace.com - Latch Browser'
  assert len(context.pages)==1
  assert 'real website test fixture' not in page.locator('.ln-live-help').inner_text().lower()
  assert not [e for e in errors if 'LatchNet' in e],errors[:5]
  page.screenshot(path=str(ROOT.parent/'Latch98-v120-MySpace-In-Window-Preview.png'),animations='disabled')
  context.close();browser.close()
print('PASS standalone MySpace opens inside Latch Browser window; live site render cannot be asserted')
