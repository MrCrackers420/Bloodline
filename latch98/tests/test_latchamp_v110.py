"""Browser smoke tests using generated WAV; storage stubbed because URL navigation is restricted."""
import io
import json
import math
import struct
import wave
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/'apps/latchamp/index.html').read_text(encoding='utf-8')
STUB='''<script>
if(!window.__latchAmpFakeDB){window.__latchAmpFakeDB={records:new Map(),sequence:1,preferences:{}};}
Object.defineProperty(window,'localStorage',{configurable:true,value:{
 getItem:k=>window.__latchAmpFakeDB.preferences[k]??null,
 setItem:(k,v)=>{window.__latchAmpFakeDB.preferences[k]=String(v)},
 removeItem:k=>delete window.__latchAmpFakeDB.preferences[k]}});
Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{
 const req={result:{objectStoreNames:{contains:()=>true},createObjectStore:()=>{},transaction:()=>{
 const tx={objectStore:()=>({getAll:()=>start('getAll'),add:v=>start('add',v),delete:v=>start('delete',v),clear:()=>start('clear')})};
 function start(method,value){const out={};setTimeout(()=>{
  let result;if(method==='getAll')result=[...window.__latchAmpFakeDB.records.values()];
  if(method==='add'){result=window.__latchAmpFakeDB.sequence++;window.__latchAmpFakeDB.records.set(result,{...value,id:result});}
  if(method==='delete')window.__latchAmpFakeDB.records.delete(value);
  if(method==='clear')window.__latchAmpFakeDB.records.clear();
  out.result=result;out.onsuccess?.();tx.oncomplete?.();},1);return out;}
 return tx;}}
 };setTimeout(()=>req.onsuccess?.(),1);return req;
}}});
</script>'''

def wav_data(freq=440):
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(11025)
        w.writeframes(b''.join(struct.pack('<h',int(10000*math.sin(2*math.pi*freq*i/11025))) for i in range(11025*2)))
    return b.getvalue()

def show(page):
    page.set_content(APP.replace('<head>','<head>'+STUB,1),wait_until='domcontentloaded')
    page.wait_for_function('document.querySelector("#queue-status")?.textContent?.includes("tracks")')

def test_player_queue_playback_eq_persistence_and_export():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':580,'height':850},accept_downloads=True)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        show(page)
        assert page.locator('#queue-status').inner_text()=='0/0 tracks'
        page.locator('#pick').set_input_files([
            {'name':'Alpha.wav','mimeType':'audio/wav','buffer':wav_data(440)},
            {'name':'Bravo.wav','mimeType':'audio/wav','buffer':wav_data(660)}])
        page.wait_for_function("document.querySelectorAll('.track').length===2")
        assert page.locator('#queue-status').inner_text()=='2/2 tracks'
        page.get_by_role('button',name='Play Alpha.wav').click()
        page.wait_for_function("document.querySelector('#audio').currentTime>0.05",timeout=10000)
        assert page.locator('#status').inner_text()=='PLAYING'
        page.locator('#eqpreset').select_option('bass')
        assert page.locator('#eqbass').input_value()=='7'
        page.locator('#eqmid').fill('4')
        assert page.locator('#eqpreset').input_value()=='custom'
        page.locator('#speed').select_option('1.25')
        assert page.locator('#audio').evaluate('(a)=>a.playbackRate')==1.25
        page.locator('#repeat').click();assert page.locator('#repeat').inner_text()=='RPT ALL'
        page.locator('#repeat').click();assert page.locator('#repeat').inner_text()=='RPT 1'
        page.locator('#shuffle').click()
        page.locator('#search').fill('Bravo');assert page.locator('.track').count()==1
        assert page.get_by_role('button',name='Move Bravo.wav up').is_disabled()
        page.locator('#search').fill('')
        page.get_by_role('button',name='Move Bravo.wav up').click()
        assert page.locator('.track .name').first.inner_text()=='Bravo'
        with page.expect_download() as dl:page.locator('#exportlist').click()
        data=json.loads(Path(dl.value.path()).read_text())
        assert data['format']=='latchamp-tracklist-v1'
        assert [t['name'] for t in data['tracks']]==['Bravo.wav','Alpha.wav']
        assert data['equalizer']==[7,4,0]
        page.locator('#importlist').set_input_files({'name':'tracklist.json','mimeType':'application/json','buffer':json.dumps({**data,'tracks':list(reversed(data['tracks']))}).encode()})
        page.wait_for_function("document.querySelector('.track .name')?.textContent==='Alpha'")
        show(page)
        page.wait_for_function("document.querySelectorAll('.track').length===2")
        assert page.locator('.track .name').first.inner_text()=='Alpha'
        assert page.locator('#eqbass').input_value()=='7'
        assert page.locator('#eqmid').input_value()=='4'
        assert page.locator('#repeat').inner_text()=='RPT 1'
        assert page.locator('#shuffle').get_attribute('aria-pressed')=='true'
        assert page.locator('#speed').input_value()=='1.25'
        page.locator('#tab-yt').click()
        page.locator('#ytlink').fill('https://music.youtube.com/watch?v=dQw4w9WgXcQ')
        page.locator('#loadvideo').click()
        assert page.locator('#video-shell iframe').count()==1
        assert 'youtube.com/embed/dQw4w9WgXcQ' in page.locator('#video-shell iframe').get_attribute('src')
        page.locator('#tab-local').click()
        assert page.locator('#video-shell iframe').count()==0
        assert not errors,errors
        browser.close()
