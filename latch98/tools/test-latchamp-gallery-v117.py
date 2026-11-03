"""Fast deterministic player/gallery checks: no third-party video or image traffic."""
import io,json,base64,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from test_latchamp_v112 import MOCK_YOUTUBE
from test_latchamp_v110 import STUB
SOURCE=(ROOT/'apps/latchamp/index.html').read_text()
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/iC8AAAAASUVORK5CYII=')

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=browser.new_page(viewport={'width':1150,'height':900},accept_downloads=True)
  page.route('https://i.ytimg.com/**',lambda r:r.fulfill(status=200,body=PNG,content_type='image/png'))
  page.route('https://www.googleapis.com/youtube/v3/**',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({
   'items':[{'snippet':{'resourceId':{'videoId':'AAAAAAA0001'},'title':'First real title','videoOwnerChannelTitle':'Channel one','thumbnails':{'medium':{'url':'https://i.ytimg.com/vi/AAAAAAA0001/mqdefault.jpg'}}}},
            {'snippet':{'resourceId':{'videoId':'BBBBBBB0002'},'title':'Second real title','videoOwnerChannelTitle':'Channel two','thumbnails':{'medium':{'url':'https://i.ytimg.com/vi/BBBBBBB0002/mqdefault.jpg'}}}}],
   'nextPageToken':''})))
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def load():page.set_content(SOURCE.replace('<head>','<head><base href="https://latch.test/">'+STUB+'<script>'+MOCK_YOUTUBE+'</script>',1),wait_until='domcontentloaded',timeout=12000)
  load();page.locator('#tab-yt').click();page.locator('#ytlink').fill('https://music.youtube.com/playlist?list=PLabc123xyz89');page.locator('#loadvideo').click()
  page.wait_for_function("document.querySelectorAll('#yt-songs button').length===2",timeout=5000)
  assert page.locator('#video-shell').bounding_box()['height']>400
  # Player first; bookmark/playlist shelves underneath.
  assert page.evaluate("document.querySelector('#video-shell').compareDocumentPosition(document.querySelector('#yt-songs')) & Node.DOCUMENT_POSITION_FOLLOWING")
  assert page.locator('#yt-saved-details').get_attribute('open') is None
  assert page.locator('#yt-songs img').count()==2
  assert 'i.ytimg.com/vi/AAAAAAA0001/mqdefault.jpg' in page.locator('#yt-songs img').first.get_attribute('src')
  page.locator('#yt-songs button').nth(1).click()
  assert 'at:1' in page.evaluate('window.ytSpy.calls')
  page.locator('#yt-song-search').fill('BBBB');assert page.locator('#yt-songs button').count()==1
  page.locator('#yt-song-search').fill('');page.locator('#yt-gallery-view').select_option('list')
  assert page.locator('#yt-songs').evaluate("n=>n.style.gridTemplateColumns")=='1fr'
  page.locator('#yt-shuffle').check();assert page.evaluate('window.ytSpy.calls.some(s=>s==="loop:false")')
  page.locator('#yt-repeat').select_option('playlist');assert 'loop:true' in page.evaluate('window.ytSpy.calls')
  page.locator('#yt-library-panel details.yt-advanced summary').click();page.locator('#yt-data-key').fill('test_restricted_key');page.locator('#yt-fetch-titles').click()
  page.wait_for_function("document.querySelector('#yt-songs').textContent.includes('First real title')",timeout=5000)
  assert page.locator('#yt-songs').inner_text().find('Channel one')>=0
  assert page.locator('#yt-data-key').input_value()==''
  assert 'test_restricted_key' not in page.evaluate("JSON.stringify([localStorage.getItem('latchamp.prefs.v110'),localStorage.getItem('latchamp.youtube.links.v112')])")
  # Save one currently playing video without overwriting the full playlist URL.
  page.locator('#yt-save-current').click();page.locator('#yt-focus-bookmarks').click()
  assert page.locator('#yt-saved-details').get_attribute('open') is not None
  assert page.locator('#yt-links .yt-bookmark').count()==1
  page.locator('#yt-links .yt-bookmark-top').click()
  page.wait_for_timeout(150)
  assert not errors,errors
  # Saving a named playlist keeps a browsable thumbnail list after reload.
  page.locator('#ytlink').fill('https://music.youtube.com/playlist?list=PLabc123xyz89')
  page.once('dialog',lambda d:d.accept('My saved playlist'))
  page.locator('#saveyt').click()
  page.locator('#loadvideo').click()
  page.wait_for_function("document.querySelectorAll('#yt-songs button').length===2",timeout=5000)
  page.wait_for_timeout(120)
  raw=page.evaluate("localStorage.getItem('latchamp.youtube.links.v112')")
  parsed=json.loads(raw)
  assert any(len(e.get('knownIds') or [])==2 for e in parsed)
  load();page.locator('#tab-yt').click();page.locator('#yt-focus-bookmarks').click()
  assert page.locator('#yt-links .yt-bookmark').count()==2
  page.get_by_role('button',name='My saved playlist').click()
  assert page.locator('#yt-songs img').count()==2
  assert not errors,errors
  browser.close()
 print('PASS: gallery, video controls, shuffle/repeat, public metadata, saved links and offline gallery restoration')
if __name__=='__main__':run()
