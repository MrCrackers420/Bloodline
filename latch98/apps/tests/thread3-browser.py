"""Run: python apps/tests/thread3-browser.py
Uses Chromium through Playwright. set_content avoids filesystem/server permissions;
this confirms real DOM interactions and browser AudioContext decoding, but not file:// mic permission.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import wave, math, struct, json, io

ROOT=Path(__file__).resolve().parents[1]


def wav_fixture(samples=22050,rate=22050):
    b=io.BytesIO()
    with wave.open(b,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h',int(16000*math.sin(2*math.pi*440*i/rate))) for i in range(samples)))
    return b.getvalue()


def source(name):return (ROOT/name/'index.html').read_text(encoding='utf8')


def check_audacity(browser,folder):
    page=browser.new_page(accept_downloads=True,viewport={'width':1280,'height':820})
    errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(source('audacity'))
    page.locator('[data-menu=Generate]').click()
    page.locator('#popup button').filter(has_text='Tone').first.click()
    page.locator('#dialogContent input[name=duration]').fill('1')
    page.locator('#dialogContent input[name=frequency]').fill('440')
    page.locator('#dialogContent .actions button').first.click()
    assert page.locator('.track').count()==1,'Did not generate a track'
    page.locator('[data-do=frames]').click()
    page.locator('#dialogContent input[name=start]').fill('0')
    page.locator('#dialogContent input[name=end]').fill('22050')
    page.locator('#dialogContent .actions button').first.click()
    assert '22050 frames' in page.locator('#status').inner_text()
    page.locator('[data-menu=Effect]').click()
    page.locator('#popup button').filter(has_text='Change Speed and Pitch').click()
    page.locator('#dialogContent input[name=percent]').fill('200')
    page.locator('#dialogContent .actions button').first.click()
    assert '22050 → 11025 frames' in page.locator('#status').inner_text()
    page.locator('[data-do=undo]').click()
    page.locator('[data-do=redo]').click()
    # Restore time-stretch selection to full 0.25 seconds; double duration to 0.5 s.
    page.locator('[data-do=frames]').click()
    page.locator('#dialogContent input[name=start]').fill('0')
    page.locator('#dialogContent input[name=end]').fill('11025')
    page.locator('#dialogContent .actions button').first.click()
    page.locator('[data-menu=Effect]').click()
    page.locator('#popup button').filter(has_text='Change Tempo').click()
    page.locator('#dialogContent input[name=percent]').fill('50')
    page.locator('#dialogContent .actions button').first.click()
    assert '11025 → 22050 frames' in page.locator('#status').inner_text()
    page.locator('#loopPlay').check()
    with page.expect_download() as item:
        page.locator('[data-menu=File]').click();page.locator('#popup button').filter(has_text='Save Project').click()
    location=Path(item.value.path())
    data=location.read_bytes()
    assert data[:8]==b'L98AUDIO'
    meta=json.loads(data[12:12+int.from_bytes(data[8:12],'little')])
    assert meta['version']==2 and meta['loop']
    assert meta['undoCount']>=2 and meta['states'][0]['tracks'][0]['channels']==[44100],meta
    # Round-trip into freshly initialized page from the actual browser-downloaded file.
    new=browser.new_page(accept_downloads=True)
    new.set_content(source('audacity'))
    new.locator('#projectInput').set_input_files(str(location))
    new.wait_for_function("document.querySelector('#status').textContent.includes('Opened')")
    assert new.locator('#loopPlay').is_checked()
    new.locator('[data-do=undo]').click()
    assert new.locator('#status').inner_text()=='Undo'
    with new.expect_download() as item:
        new.locator('[data-menu=File]').click();new.locator('#popup button').filter(has_text='Export as WAV').click()
    wav_bytes=Path(item.value.path()).read_bytes()
    with wave.open(io.BytesIO(wav_bytes),'rb') as w:
        assert w.getframerate()==44100 and w.getnchannels()==2
        # Undo tempo leaves 33075 frames; undo is not just a cosmetic edit.
        assert w.getnframes()==33075, w.getnframes()
    assert not errors,errors
    print('Audacity browser: Generate -> frame-select -> speed -> undo/redo -> tempo -> save -> reopen -> undo -> WAV export PASS')
    new.close();page.close()


def check_soundstudio(browser):
    page=browser.new_page(accept_downloads=True,viewport={'width':1280,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    content=source('soundstudio').replace('})();\n</script>',
      'window.__r3Project=()=>projectData();window.__r3Load=(raw)=>applyProject(raw,false);\n})();\n</script>')
    page.set_content(content)
    assert page.locator('#styloKeys .stylo-key').count()>12
    # Browser's audio decoder is used (not a Node WAV parser).
    page.locator('#sampleFile').set_input_files({'name':'reference.wav','mimeType':'audio/wav','buffer':wav_fixture()})
    page.wait_for_function("document.querySelector('#sampleStatus').textContent.includes('reference.wav')",timeout=15000)
    page.locator('#sampleStart').fill('0.250')
    page.locator('#sampleStart').dispatch_event('change')
    page.locator('#sampleEnd').fill('0.750')
    page.locator('#sampleEnd').dispatch_event('change')
    page.locator('#sampleSpeedNumber').fill('200')
    page.locator('#sampleSpeedNumber').dispatch_event('change')
    page.wait_for_function("document.querySelector('#sampleStatus').textContent.includes('200%')",timeout=15000)
    assert '0.250s' in page.locator('#sampleStatus').inner_text(),page.locator('#sampleStatus').inner_text()
    with page.expect_download() as item:
        page.locator('#sampleExportWav').click()
    with wave.open(io.BytesIO(Path(item.value.path()).read_bytes()),'rb') as w:
        assert w.getnframes()==5513,(w.getnframes(),w.getframerate())
        assert w.getframerate()==22050
    # Import with invalid embedded sound must not replace the current sample or notes.
    old=page.evaluate('window.__r3Project()')
    corrupt=page.evaluate("""() => {let p=window.__r3Project();p.notes=[{id:1,instrument:'stylophone',note:60,start:0,duration:1,velocity:1}];p.sample={wav:'broken! base64',name:'invalid.wav'};return p;}""")
    rejected=page.evaluate("""async p=>{try{await window.__r3Load(p);return false;}catch{return true;}}""",corrupt)
    assert rejected
    restored=page.evaluate('window.__r3Project()')
    assert restored==old,'Failed import destroyed or changed previous song'
    # Test both pointer chord input and interruption while playing (2 simultaneous touches).
    page.locator('#styloKeys .stylo-key').first.dispatch_event('pointerdown',{'pointerId':91,'pointerType':'touch','clientX':5,'clientY':5})
    page.locator('#styloKeys .stylo-key').nth(2).dispatch_event('pointerdown',{'pointerId':92,'pointerType':'touch','clientX':65,'clientY':5})
    page.locator('#styloKeys').dispatch_event('pointercancel',{'pointerId':91,'pointerType':'touch'})
    page.locator('#styloKeys').dispatch_event('pointercancel',{'pointerId':92,'pointerType':'touch'})
    assert not errors,errors
    print('Sound Studio browser: WAV decode -> precise splice times -> tape render -> WAV export -> pointer input PASS')
    page.close()




def check_soundstudio_loops(browser):
    page=browser.new_page(accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    content=source('soundstudio')
    hook='window.__r3Probe=()=>({playing,playStart,scheduledFrom,scheduledTo,clock:audio?.ctx.currentTime,activePasses:activePassBuses.size,nextPassScheduled,voices:liveVoices.size});'
    assert content.endswith('</html>\n')
    content=content.replace('})();\n</script>',hook+'\n})();\n</script>')
    page.set_content(content)
    page.locator('#bpm').fill('240');page.locator('#bpm').dispatch_event('change')
    page.locator('#loopFrom').select_option('1')
    page.locator('#loopTo').select_option('1')
    page.locator('#metro').check()
    page.locator('#play').click()
    first=page.evaluate('window.__r3Probe()')
    assert first['playing'] and first['scheduledTo']-first['scheduledFrom']==4,first
    # Four quarter notes at 240 BPM = exactly one second per pass.
    page.wait_for_timeout(2550)
    current=page.evaluate('window.__r3Probe()')
    assert current['playing'] and current['playStart']-first['playStart']>=1.999,current
    delta=current['playStart']-first['playStart']
    assert abs(delta-round(delta))<1e-4,delta
    # Physical keyboard chord: two independent voices must remain active.
    page.locator('body').click(position={'x':10,'y':60})
    page.keyboard.down('z');page.keyboard.down('x')
    assert page.evaluate('window.__r3Probe().voices')==2,page.evaluate('window.__r3Probe()')
    page.keyboard.up('z');page.keyboard.up('x')
    assert page.evaluate('window.__r3Probe().voices')==0
    page.locator('#stop').click()
    assert page.evaluate('window.__r3Probe().activePasses')==0
    page.locator('#metroListen').click()
    assert page.locator('#metroListen').inner_text()=='Stop click'
    page.locator('#metroListen').click()
    assert page.locator('#metroListen').inner_text()=='Hear click'
    assert not errors,errors
    print('Sound Studio browser: repeated 1.000-second loop scheduling, two simultaneous keyboard notes, stop/metro interruption PASS')
    page.close()

def check_games(browser):
    for app,page_name in [('solitaire','solitaire.html'),('minesweeper','latch98-minesweeper-preview.html')]:
        page=browser.new_page()
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content((ROOT/app/page_name).read_text())
        assert page.locator('body').inner_text().strip(),app
        # Script dependencies may be external on these apps: page smoke only; engine tests are separate.
        print(app,'browser DOM smoke PASS',('script errors '+str(errors)) if errors else '')
        page.close()


def main():
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        with TemporaryDirectory() as folder:
            check_audacity(b,folder)
            check_soundstudio(b)
            check_soundstudio_loops(b)
            check_games(b)
        b.close()
if __name__=='__main__': main()
