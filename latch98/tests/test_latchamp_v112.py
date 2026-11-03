"""Browser tests for the 1.12 LatchAmp review build (YouTube API mocked, no network playback claims)."""
import http.server, socketserver, threading, json, io, wave, math, struct, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from test_latchamp_v110 import STUB

ROOT=Path(__file__).resolve().parents[1]
PLAYER=ROOT/'apps/latchamp/index.html'

class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass

def serve():
 srv=socketserver.TCPServer(('127.0.0.1',0),Quiet);threading.Thread(target=srv.serve_forever,daemon=True).start();return srv

def wav_data(freq=440,dur=8):
 rate=11025;buf=io.BytesIO()
 with wave.open(buf,'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
  f.writeframes(b''.join(struct.pack('<h',int(7000*math.sin(2*math.pi*freq*i/rate))) for i in range(int(rate*dur))))
 return buf.getvalue()

MOCK_YOUTUBE=r"""
window.ytSpy={calls:[]};
window.YT={Player:function(id,opt){
 let videos=['AAAAAAA0001','BBBBBBB0002'],index=0,video=opt.videoId||videos[0],state=5,time=0;
 const iframe=document.createElement('iframe');iframe.title='Mock Official Player';iframe.src='about:blank';document.getElementById(id).replaceWith(iframe);
 const evt=v=>{state=v;opt.events.onStateChange?.({data:v,target:player})};
 const player={
 cueVideoById(v){window.ytSpy.calls.push('cue');video=v;evt(5)},
 loadPlaylist(arg){window.ytSpy.calls.push('loadPlaylist');videos=['AAAAAAA0001','BBBBBBB0002'];video=videos[0];evt(1)},
 playVideo(){window.ytSpy.calls.push('play');evt(1)},pauseVideo(){window.ytSpy.calls.push('pause');evt(2)},
 nextVideo(){window.ytSpy.calls.push('next');index=(index+1)%videos.length;video=videos[index];evt(1)},
 previousVideo(){window.ytSpy.calls.push('previous');index=(index+videos.length-1)%videos.length;video=videos[index];evt(1)},
 playVideoAt(i){window.ytSpy.calls.push('at:'+i);index=i;video=videos[i];evt(1)},
 setLoop(v){window.ytSpy.calls.push('loop:'+v)},setVolume(v){window.ytSpy.calls.push('volume:'+v)},
 seekTo(n){time=n;window.ytSpy.calls.push('seek')},getDuration(){return 100},getCurrentTime(){return time},
 getPlaylist(){return videos},getPlaylistIndex(){return index},getVideoData(){return{video_id:video,title:'Test song '+video}},
 destroy(){window.ytSpy.calls.push('destroy')},getPlayerState(){return state}};
 queueMicrotask(()=>opt.events.onReady({target:player}));return player;
}};
"""

def test_video_controls_and_link_library():
 srv=serve()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=browser.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content(PLAYER.read_text().replace('<head>','<head><base href="https://latch.test/">'+STUB+'<script>'+MOCK_YOUTUBE+'</script>',1))
   page.locator('#tab-yt').click();page.locator('#ytlink').fill('https://music.youtube.com/playlist?list=PLabc123xyz89')
   page.locator('#loadvideo').click();page.wait_for_function('window.ytSpy?.calls.includes("loadPlaylist")')
   page.wait_for_function("document.querySelectorAll('#yt-songs button').length===2")
   page.locator('#next').click();page.locator('#previous').click();page.locator('#stop').click();page.locator('#play').click()
   page.locator('#yt-repeat').select_option('playlist');page.locator('#yt-songs button').nth(1).click()
   calls=page.evaluate('window.ytSpy.calls');assert 'next' in calls and 'previous' in calls and 'pause' in calls and 'play' in calls and 'loop:true' in calls and 'at:1' in calls,calls
   page.once('dialog',lambda d:d.accept('My video playlist'));page.locator('#saveyt').click()
   assert page.locator('#yt-links .yt-entry').count()>=1
   page.locator('#yt-search').fill('My video');assert page.locator('#yt-links button').count()>=1
   with page.expect_download() as dl:page.locator('#yt-export').click()
   data=json.loads(Path(dl.value.path()).read_text());assert data['format']=='latchamp-links-v1' and data['links'][0]['title']=='My video playlist'
   page.set_content(PLAYER.read_text().replace('<head>','<head><base href="https://latch.test/">'+STUB+'<script>'+MOCK_YOUTUBE+'</script>',1));page.locator('#tab-yt').click();assert 'My video playlist' in page.locator('#yt-links').inner_text()
   assert not errors,errors
   browser.close()
 finally:srv.shutdown()

def test_local_fade_settings_and_transition():
 srv=serve()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=browser.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content(PLAYER.read_text().replace('<head>','<head><base href="https://latch.test/">'+STUB,1))
   page.locator('#transition-mode').select_option('smart');page.locator('#fade-seconds').fill('4')
   page.locator('#duck-game').check();page.locator('#suppress-music').check();page.locator('#mute-games').check()
   page.locator('#pick').set_input_files([{'name':'First.wav','mimeType':'audio/wav','buffer':wav_data(420,6)},{'name':'Second.wav','mimeType':'audio/wav','buffer':wav_data(660,6)}]);
   page.wait_for_function("document.querySelectorAll('.track').length===2")
   page.get_by_role('button',name='Play First.wav').click()
   page.wait_for_function("document.querySelector('#audio').currentTime > 0.1")
   page.wait_for_function("document.querySelector('#song').textContent.includes('SECOND')",timeout=16000)
   assert page.locator('#status').inner_text()=='PLAYING';assert page.locator('#transition-mode').input_value()=='smart'
   page.set_content(PLAYER.read_text().replace('<head>','<head><base href="https://latch.test/">'+STUB,1));assert page.locator('#duck-game').is_checked() and page.locator('#mute-games').is_checked()
   assert page.locator('#transition-mode').input_value()=='smart';assert not errors,errors
   browser.close()
 finally:srv.shutdown()
