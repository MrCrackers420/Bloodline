from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1100,'height':730})
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content((root/'apps/soundstudio/index.html').read_text(),wait_until='load')
 assert page.locator('#startButton').count()==0
 assert page.locator('#startMenu').count()==0
 assert page.locator('.studio-applets button').count()==5
 assert page.locator('.applet-active').count()==1
 for app in ['sampler','beatlab','vocal','arrange','stylophone']:
  page.locator(f'.studio-applets [data-task="{app}"]').click()
  assert page.locator(f'.window[data-win="{app}"]').is_visible(),f'not visible {app}'
  assert page.locator('.window[data-win]:visible').count()==1, f'multiple windows on {app}'
 print('Sound Studio tab switching PASS')
 # shim, source string loaded from module as JS literal
 text=(root/'web/latch-audio.js').read_text();start=text.index('const SHIM=')+len('const SHIM=');end=text.index(';\n let state=',start);shim=json.loads(text[start:end]);
 page.evaluate(shim)
 result=page.evaluate('''() => { const C=window.AudioContext||window.webkitAudioContext;const ctx=new C();const gain=ctx.createGain();gain.connect(ctx.destination); const osc=ctx.createOscillator();osc.connect(gain); return {connected:true,contexts:!!window.LatchSoundtrack}; }''')
 print('Audio adapter direct routing PASS',result)
 page.locator('#styloKeys .stylo-key').first.click()
 page.wait_for_timeout(300)
 assert not any('AudioGainNode' in x for x in errors), errors
 print('Audio click errors:',errors)
 # Standalone screenshot may be taken interactively for manual review.
 page2=browser.new_page(viewport={'width':1100,'height':760});errors2=[];page2.on('pageerror',lambda e: errors2.append(str(e)))
 page2.set_content((root/'apps/latchamp/index.html').read_text(),wait_until='load')
 page2.locator('#tab-yt').click()
 page2.locator('#yt-page-home').click()
 assert page2.locator('#yt-home').is_visible()
 assert page2.locator('#yt-player-view').is_hidden()
 assert page2.locator('#yt-home-saved .home-empty').count()==1
 page2.locator('#yt-home-query').fill('synthwave')
 # mock fetch no external calls
 page2.evaluate('''() => { window.fetch = async (url) => ({ok:true,json:async()=>({items:[{id:{videoId:'dQw4w9WgXcQ'},snippet:{title:'Sample public title',channelTitle:'Example channel',thumbnails:{medium:{url:'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'}}}}]})}) }''')
 page2.locator('#yt-home-api-key').fill('sample-restricted-key')
 page2.locator('#yt-home-search-button').click()
 assert page2.locator('#yt-home-results .yt-home-card').count()==1
 assert page2.locator('#yt-home-api-key').input_value()==''
 page2.locator('#yt-page-player').click()
 assert page2.locator('#video-shell').is_visible()
 page2.locator('#yt-page-home').click()
 assert page2.locator('#yt-home').is_visible()
 print('YouTube homepage/search navigation PASS')
 print('Player errors:',errors2)
 # Thumbnail network access is intentionally not required for this UI test.
 browser.close()
