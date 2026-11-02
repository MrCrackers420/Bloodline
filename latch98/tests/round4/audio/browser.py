"""From project root: python tests/round4/audio/browser.py
Standalone editors, no network, microphone, or third-party media samples required.
Uses Playwright + /usr/bin/chromium, ships synthetic PCM fixtures."""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import io,struct,math,wave,time,sys,json
ROOT=Path(__file__).resolve().parents[3]

def pcm(rate,seconds=1.25,stereo=True):
    out=io.BytesIO();frames=round(seconds*rate)
    with wave.open(out,'wb') as w:
        w.setnchannels(2 if stereo else 1);w.setsampwidth(2);w.setframerate(rate)
        samples=[]
        for i in range(frames):
            a=int(14000*math.sin(2*math.pi*440*i/rate))
            b=int(9000*math.sin(2*math.pi*660*i/rate))
            samples.extend([a,b] if stereo else [a])
        w.writeframes(struct.pack('<'+'h'*len(samples),*samples))
    return out.getvalue()

def editor(name,probe):
    text=(ROOT/'apps'/name/'index.html').read_text()
    assert '})();\n</script>' in text
    return text.replace('})();\n</script>',probe+'\n})();\n</script>')

def select_frames(page,start,end):
    page.locator('[data-do=frames]').click()
    page.locator('#dialogContent input[name=start]').fill(str(start))
    page.locator('#dialogContent input[name=end]').fill(str(end))
    page.locator('#dialogContent .actions button').first.click()

def do_menu(page,menu,label):
    page.locator('[data-menu='+menu+']').click()
    page.locator('#popup button').filter(has_text=label).first.click()

def get_wav(item):
    with wave.open(str(item.value.path()),'rb') as w:
        channels=w.getnchannels();rate=w.getframerate();frames=w.getnframes();raw=w.readframes(frames)
    assert frames>0 and len(raw)==frames*channels*2
    vals=struct.unpack('<'+'h'*(frames*channels),raw)
    peak=max(map(abs,vals))
    assert peak>500,'nonempty WAV must not be silent'
    assert peak<=32767
    return channels,rate,frames,peak,vals

def audacity(browser):
    p=browser.new_page(accept_downloads=True,viewport={'width':1280,'height':840});errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.set_content(editor('audacity',"window.__audioR4=()=>({rate:tracks[0]?.rate,channels:tracks[0]?.data.length,frames:tracks[0]?.data[0].length,first:Array.from(tracks[0]?.data[0].slice(0,5)||[]),last:tracks[0]?.data[0].at(-1),undos:undos.length,redos:redos.length});window.__peakR4=(s,a,b)=>samplePeaks(s,a,b);window.__peekR4=(ch,frames)=>frames.map(i=>tracks[0].data[ch][i]);"))
    p.locator('#fileInput').set_input_files({'name':'stereo-48k.wav','mimeType':'audio/wav','buffer':pcm(48000)})
    p.wait_for_function("window.__audioR4().frames === 60000")
    assert p.evaluate('window.__audioR4()')['rate']==48000
    assert p.evaluate('window.__audioR4()')['channels']==2
    select_frames(p,4801,10937)
    p.locator('[data-do=cut]').click()
    assert p.evaluate('window.__audioR4().frames')==60000-(10937-4801)
    p.locator('[data-do=undo]').click();assert p.evaluate('window.__audioR4().frames')==60000
    p.locator('[data-do=redo]').click();assert p.evaluate('window.__audioR4().frames')==53864
    p.locator('#rate').select_option('48000')
    with p.expect_download() as item:do_menu(p,'File','Export as WAV')
    ch,rate,frames,peak,vals=get_wav(item)
    assert (ch,rate,frames)==(2,48000,53864)
    assert vals[0]==0 and vals[1]==0
    assert vals[2]!=vals[3], 'stereo export should not collapse channels'
    original=pcm(48000)
    with wave.open(io.BytesIO(original),'rb') as original_wav:
        original_pcm=struct.unpack('<'+'h'*(60000*2),original_wav.readframes(60000))
    # Cut [4801,10937) is precisely half-open; at output frame 4801 we must see
    # old source frame 10937, without a lost or duplicated sample in either channel.
    for frame in (0,4800,4801,4802,50000,53863):
        expected=frame if frame<4801 else frame+6136
        assert all(abs(a-b)<=1 for a,b in zip(vals[frame*2:frame*2+2],original_pcm[expected*2:expected*2+2])),(frame,vals[frame*2:frame*2+2],original_pcm[expected*2:expected*2+2])
    # Verify actual reverse and fades, not just visible waveform changes.
    select_frames(p,2000,4000)
    old=p.evaluate('window.__audioR4().frames')
    before=p.evaluate('window.__peekR4(0,[2000,2001,3998,3999])')
    do_menu(p,'Effect','Reverse')
    after=p.evaluate('window.__peekR4(0,[2000,2001,3998,3999])')
    assert after==list(reversed(before)), (before,after)
    p.locator('[data-do=undo]').click();assert p.evaluate('window.__peekR4(0,[2000,2001,3998,3999])')==before
    p.locator('[data-do=redo]').click();assert p.evaluate('window.__peekR4(0,[2000,2001,3998,3999])')==after
    p.locator('[data-do=undo]').click()
    do_menu(p,'Effect','Fade In')
    assert p.evaluate('window.__peekR4(0,[2000])')==[0]
    p.locator('[data-do=undo]').click()
    assert p.evaluate('window.__peekR4(0,[2000])')==before[:1]
    do_menu(p,'Effect','Fade Out')
    assert p.evaluate('window.__peekR4(0,[3999])')==[0]
    p.locator('[data-do=undo]').click()
    assert p.evaluate('window.__peekR4(0,[3999])')==before[-1:]
    assert p.evaluate('window.__audioR4().frames')==old

    with p.expect_download() as item:do_menu(p,'File','Save Project')
    project=Path(item.value.path());assert project.stat().st_size>100000
    s=browser.new_page(accept_downloads=True)
    s.set_content(editor('audacity',"window.__audioR4=()=>({rate:tracks[0]?.rate,channels:tracks[0]?.data.length,frames:tracks[0]?.data[0].length,undos:undos.length});"))
    s.locator('#projectInput').set_input_files(str(project))
    s.wait_for_function("window.__audioR4().frames===53864")
    assert s.evaluate('window.__audioR4()')['rate']==48000
    assert s.evaluate('window.__audioR4()')['undos']>=1
    with s.expect_download() as item:do_menu(s,'File','Save Project')
    assert Path(item.value.path()).stat().st_size>100000
    with s.expect_download() as item:do_menu(s,'File','Export as WAV')
    assert get_wav(item)[2]==53864
    # A long waveform includes a one-frame impulse at a frame traditional
    # decimation used to miss. Browser draw call must stay responsive.
    start=time.monotonic()
    peak=p.evaluate('''() => {const sig=new Float32Array(1_900_000);sig[162_037]=.99;return window.__peakR4(sig,160000,164000)}''')
    elapsed=time.monotonic()-start
    assert abs(peak[1]-.99)<1e-6 and elapsed<7, (peak,elapsed)
    assert not errors,errors
    print('Audacity R4: 48000Hz stereo PCM, 6136-frame cut, undo/redo, 53864-frame WAV, save/open/save/export, 1.9M-frame peak PASS; peak query %.3fs'%elapsed)
    s.close();p.close()

def studio(browser):
    p=browser.new_page(accept_downloads=True,viewport={'width':1280,'height':900});errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.set_content(editor('soundstudio',"window.__projectR4=()=>projectData();window.__applyR4=(p)=>applyProject(p,false);window.__soundR4=()=>({length:sampleState.original?.length,start:sampleState.start,end:sampleState.end,sr:sampleState.original?.sampleRate,undo:sampleUndoStack.length,redo:sampleRedoStack.length,speed:sampleState.speed,preview:sampleState.outputPreview?.length,mode:sampleState.speedMode});"))
    p.locator('#sampleFile').set_input_files({'name':'synthetic-44k.wav','mimeType':'audio/wav','buffer':pcm(44100,1,False)})
    p.wait_for_function('window.__soundR4().length>1000')
    # browser AudioContext resamples to system output rate, frame fields track actual source buffer rate
    rate=p.evaluate('window.__soundR4().sr');assert rate in (44100,48000),rate
    start,finish=round(rate*.24),round(rate*.29)
    p.locator('#sampleFrameStart').fill(str(start));p.locator('#sampleFrameStart').dispatch_event('change')
    p.locator('#sampleFrameEnd').fill(str(finish));p.locator('#sampleFrameEnd').dispatch_event('change')
    assert abs(p.evaluate('window.__soundR4().start')-start/rate)<1e-8
    assert abs(p.evaluate('window.__soundR4().end')-finish/rate)<1e-8
    p.locator('#sampleCrop').click()
    assert p.evaluate('window.__soundR4().length')==finish-start
    p.locator('#sampleUndoCut').click()
    assert p.evaluate('window.__soundR4().length')==rate
    assert p.evaluate('window.__soundR4().redo')==1
    p.locator('#sampleRedoCut').click()
    assert p.evaluate('window.__soundR4().length')==finish-start
    # A second separate splice is independently undoable and redoable.
    p.locator('#sampleFrameStart').fill(str(round(rate*.01)))
    p.locator('#sampleFrameStart').dispatch_event('change')
    p.locator('#sampleFrameEnd').fill(str(round(rate*.03)))
    p.locator('#sampleFrameEnd').dispatch_event('change')
    p.locator('#sampleCrop').click()
    length2=p.evaluate('window.__soundR4().length')
    assert length2==round(rate*.03)-round(rate*.01)
    p.locator('#sampleUndoCut').click()
    assert p.evaluate('window.__soundR4().length')==finish-start
    p.locator('#sampleUndoCut').click()
    assert p.evaluate('window.__soundR4().length')==rate
    p.locator('#sampleRedoCut').click()
    assert p.evaluate('window.__soundR4().length')==finish-start
    p.locator('#sampleRedoCut').click()
    assert p.evaluate('window.__soundR4().length')==length2
    p.locator('#sampleUndoCut').click()
    p.locator('#sampleUndoCut').click()
    p.locator('#sampleFrameStart').fill('0');p.locator('#sampleFrameStart').dispatch_event('change')
    p.locator('#sampleFrameEnd').fill(str(rate));p.locator('#sampleFrameEnd').dispatch_event('change')
    # apply time stretches to a one-second source
    for percent,expected in [(50,44100),(150,14700)]:
        p.locator('#sampleSpeedMode').select_option('stretch')
        p.locator('#sampleSpeedNumber').fill(str(percent))
        p.locator('#sampleSpeedNumber').dispatch_event('change')
        p.wait_for_function('(wanted) => window.__soundR4().preview===wanted',arg=expected)
        with p.expect_download() as item:p.locator('#sampleExportWav').click()
        c,r,f,peak,values=get_wav(item)
        assert (c,r,f)==(1,22050,expected)
        # RMS bounded, the sample remains nonzero after processing.
        mid=values[len(values)//4:3*len(values)//4]
        rms=(sum(x*x for x in mid)/len(mid))**.5/32768
        assert .05<rms<.8,(percent,rms)
        crossings=sum(mid[i-1]<=0 and mid[i]>0 for i in range(1,len(mid)))
        hz=crossings*r/(len(mid))
        assert abs(hz-440)<50,(percent,hz)
        print('Sound Studio WSOLA %s%%: %s frames, RMS %.4f, pitch %.1f Hz'%(percent,expected,rms,hz))
    p.locator('#sampleSpeedMode').select_option('tape')
    p.locator('#sampleSpeedNumber').fill('150');p.locator('#sampleSpeedNumber').dispatch_event('change')
    p.wait_for_function('window.__soundR4().preview===14700')
    with p.expect_download() as item:p.locator('#sampleExportWav').click()
    c,r,f,_,values=get_wav(item)
    assert f==14700
    middle=values[f//4:3*f//4]
    tape_hz=sum(middle[i-1]<=0 and middle[i]>0 for i in range(1,len(middle)))*r/len(middle)
    assert abs(tape_hz-660)<50,tape_hz
    # JSON project reopens with the processed audio still present and with the same
    # speed/mode; the multi-step sampler splice history is intentionally in-memory only.
    project=p.evaluate('window.__projectR4()')
    s=browser.new_page(accept_downloads=True)
    s.set_content(editor('soundstudio',"window.__applyR4=(p)=>applyProject(p,false);window.__openSamplerR4=()=>openWin('sampler');window.__soundR4=()=>({frames:sampleState.outputPreview?.length,mode:sampleState.speedMode,speed:sampleState.speed});"))
    s.evaluate('p=>window.__applyR4(p)',project)
    assert s.evaluate('window.__soundR4()')=={'frames':14700,'mode':'tape','speed':1.5}
    s.evaluate('window.__openSamplerR4()')
    with s.expect_download() as item:s.locator('#sampleExportWav').click()
    assert get_wav(item)[2]==14700
    # Deliberately invalid MOV container: expose a useful error without replacing
    # the currently loaded sound. This does NOT establish support for valid MOV codecs.
    s.locator('#sampleFile').set_input_files({'name':'unsupported.mov','mimeType':'video/quicktime','buffer':b'not a video file'})
    s.wait_for_function("document.querySelector('#dialog').classList.contains('open')",timeout=15000)
    assert 'MP4/MOV' in s.locator('#dialogText').inner_text()
    assert s.evaluate('window.__soundR4().frames')==14700
    s.locator('#dialogOk').click()
    s.close()
    assert not errors,errors
    print('Sound Studio R4: exact frames, crop/undo/redo, stretch 0.5x/1.5x, tape export PASS')
    p.close()

def mobile(browser):
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    a=context.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)))
    a.set_content(editor('audacity',"window.__mobileR4=()=>({frames:tracks[0]?.data[0].length,rate:tracks[0]?.rate,selection:[selA,selB]});"))
    a.locator('#fileInput').set_input_files({'name':'mobile.wav','mimeType':'audio/wav','buffer':pcm(22050,.8,False)})
    a.wait_for_function('window.__mobileR4().frames===17640')
    a.locator('[data-do=frames]').click()
    a.locator('#dialogContent input[name=start]').fill('111')
    a.locator('#dialogContent input[name=end]').fill('633')
    a.locator('#dialogContent .actions button').first.click()
    assert '522 frames' in a.locator('#status').inner_text()
    s=context.new_page();s.on('pageerror',lambda e:errors.append(str(e)))
    s.set_content(editor('soundstudio',"window.__mobileSound=()=>({start:sampleState.start,end:sampleState.end,rate:sampleState.original?.sampleRate});"))
    s.locator('#sampleFile').set_input_files({'name':'mobile.wav','mimeType':'audio/wav','buffer':pcm(22050,1,False)})
    s.wait_for_function('window.__mobileSound().rate>0')
    s.locator('#sampleFrameStart').fill('110')
    s.locator('#sampleFrameStart').dispatch_event('change')
    assert round(s.evaluate('window.__mobileSound().start*window.__mobileSound().rate'))==110
    # Dispatch two distinct stylus-like pointer identities; no global mouse state
    # should prevent the independent physical controls from responding.
    keys=s.locator('#styloKeys .stylo-key');assert keys.count()>10
    keys.nth(0).dispatch_event('pointerdown',{'pointerId':101,'pointerType':'pen','clientX':20,'clientY':50})
    keys.nth(3).dispatch_event('pointerdown',{'pointerId':102,'pointerType':'pen','clientX':140,'clientY':50})
    keys.nth(0).dispatch_event('pointerup',{'pointerId':101,'pointerType':'pen'})
    keys.nth(3).dispatch_event('pointerup',{'pointerId':102,'pointerType':'pen'})
    assert not errors,errors
    print('Mobile 390px viewport: Audacity frame selection, Sound Studio source frame precision and stylus pointer contacts PASS')
    context.close()

def main():
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        audacity(b);studio(b);mobile(b);b.close()
if __name__=='__main__':main()
