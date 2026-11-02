"""Self-contained Latch boot -> Accessories -> Sprite Studio & PNG editing smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

R=Path(__file__).resolve().parents[1]
STANDALONE=Path(os.environ.get('LATCH98_TEST_HTML','/mnt/data/Latch98-Threads1-5-Final-Standalone.html'))
assert STANDALONE.exists()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files'])
 for width in (1200,390):
  context=browser.new_context(viewport={'width':width,'height':800 if width>600 else 820})
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # This environment forbids test URLs and about:blank localStorage. Stub only the
  # browser storage in the harness; persistence itself is tested by Node suite.
  page.evaluate('''() => {const mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),clear:()=>mem.clear()}})}''')
  page.set_content(STANDALONE.read_text(encoding='utf-8'),wait_until='load',timeout=45000)
  assert page.locator('#l98-packed-spritestudio').count()==1
  page.locator('#boot-fullscreen').uncheck()
  page.locator('#boot-button').click()
  page.locator('#start-button').click()
  page.locator('.menu-item[data-sub=programs]').first.click()
  page.locator('.menu-item[data-sub=accessories]').first.click()
  target=page.locator('.menu-item[data-app=spritestudio]');target.first.wait_for(timeout=10000)
  assert 'Sprite Studio' in target.first.inner_text()
  target.first.click()
  frame=page.frame_locator('.window[data-id=spritestudio] iframe')
  frame.locator('#canvas').wait_for(timeout=30000)
  assert frame.locator('#canvas').count()==1
  assert frame.locator('#grid').is_checked()
  assert frame.locator('#pixelwrap').evaluate('(el)=>getComputedStyle(el).backgroundSize')=='16px 16px'
  assert frame.locator('#canvas').evaluate('(el)=>el.width')==32
  # Real hosted drawing: foreground preset black on transparent image.
  canvas=frame.locator('#canvas');box=canvas.bounding_box();assert box is not None
  page.mouse.click(box['x']+4*8+4,box['y']+3*8+4)
  data=canvas.evaluate('''() => {const d=LSSDebug.getDocument(),n=(3*d.width+4)*4;return Array.from(d.frames[0].cels[0].slice(n,n+4))}''')
  assert data==[0,0,0,255],data
  # Shared disk accessible to app, but Norn does not auto-install.
  assert page.evaluate("!!window.LatchFS && !!window.LatchBundle")
  assert not page.evaluate("window.LatchFS.installedPrograms().some(p=>p.id==='nornlab')")
  assert not errors,errors
  print('PASS standalone Latch boot, Start > Accessories > Sprite Studio, draw, disk / Norn guard at',width)
  context.close()
 browser.close()
