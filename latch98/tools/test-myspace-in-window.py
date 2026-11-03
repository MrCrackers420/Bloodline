"""Regression: MySpace stays inside the Latch Browser window if frames are permitted.

Mock route is intentionally not a claim that live MySpace allows embedding.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'web/latchnet.js').read_text('utf-8')
CSS=(ROOT/'web/latchnet.css').read_text('utf-8')
DESKTOP=(ROOT/'web/desktop.js').read_text('utf-8')
assert "'MySpace.com (In Latch)','site:myspace'" in DESKTOP

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':960,'height':760})
 page=context.new_page()
 seen=[]
 def mock_route(route):
  seen.append(route.request.url)
  route.fulfill(status=200, content_type='text/html', body='<!doctype html><html><body><h1 id="myspace-live">Real website test fixture</h1><a href="/music">Music</a></body></html>')
 page.route('https://myspace.com/**',mock_route)
 page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="height:650px;width:900px"></div></body></html>')
 page.add_style_tag(content=CSS)
 page.evaluate('''(()=>{const m=new Map();Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})})()''')
 page.add_script_tag(content=JS)
 page.evaluate('LatchNet.mount(document.getElementById("host"),{})')
 assert page.locator('a[data-ln-url="https://myspace.com/"]').count()==1
 assert page.locator('a[data-ln-external]').count()==0
 page.locator('a[data-ln-url="https://myspace.com/"]').click()
 assert page.locator('#ln-location').input_value()=='https://myspace.com/'
 frame=page.locator('.ln-live-frame')
 assert frame.count()==1
 assert frame.get_attribute('src')=='https://myspace.com/'
 assert 'allow-top-navigation' not in (frame.get_attribute('sandbox') or '')
 # The runner's Chromium policy blocks external hosts before Playwright routing.
 # We verify an actual nested browsing context, not a successful live load.
 assert len(page.frames)==2
 assert page.locator('.ln-live-help').is_visible()
 assert page.locator('.ln-live-frame-slot').evaluate('(el)=>el.getBoundingClientRect().height')>100
 assert not page.locator('a[target="_blank"]').count()
 assert len(context.pages)==1
 # Reload stays within the same window and preserves true destination.
 page.locator('[data-ln-live-retry]').click()
 assert page.locator('.ln-live-frame').get_attribute('src')=='https://myspace.com/'
 page.locator('[data-ln-control="favorites"]').click()
 page.get_by_role('button',name='Add the last page I visited').click()
 assert page.locator('a[data-ln-url="https://myspace.com/"]').count()>=1
 # Deep links, history, and back/forward stay within Latch Browser.
 page.locator('.ln-address input').fill('www.myspace.com/artist/example?tab=music')
 page.locator('.ln-address button').click()
 assert page.locator('.ln-live-frame').get_attribute('src')=='https://myspace.com/artist/example?tab=music'
 page.locator('[data-ln-control="back"]').click()
 assert 'myspace.com/artist/example' not in page.locator('#ln-location').input_value()
 page.locator('[data-ln-control="forward"]').click()
 assert page.locator('.ln-live-frame').get_attribute('src')=='https://myspace.com/artist/example?tab=music'
 # Refuse deception, prohibited protocols, and credential-in-URL tricks.
 for bad in ('https://myspace.com.evil.example/','https://myspace.com@evil.example/', 'javascript:alert(1)'):
  page.locator('.ln-address input').fill(bad)
  page.locator('.ln-address button').click()
  assert page.locator('.ln-live-frame').count()==0,bad
  assert 'page not found' in page.locator('.ln-viewport').inner_text().lower(),bad
 # A successful remote response is not assertable in this restricted runner.
 assert page.locator('iframe[src^="https://myspace.com"]').count()==0
 context.close();browser.close()
print('PASS MySpace in Latch window, remote iframe, history, favorites, safe URLs and no outbound tabs')
