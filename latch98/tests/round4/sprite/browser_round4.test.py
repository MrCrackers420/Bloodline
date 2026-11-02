"""Standalone offline Sprite Studio Round-4 browser regressions.
Run: python tests/round4/sprite/browser_round4.test.py
Requires Playwright, Chromium. All art is generated in memory by the test.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import base64
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[3]
HTML=(ROOT/'apps/sprite-studio/index.html').read_text(encoding='utf-8')


def pixel(page,x,y,frame=0,layer=0):
    return page.evaluate('''([x,y,f,l]) => {const d=LSSDebug.getDocument(),c=d.frames[f].cels[l];return Array.from(c.slice((y*d.width+x)*4,(y*d.width+x+1)*4));}''',[x,y,frame,layer])

def at(page,x,y):
    return page.evaluate('''([x,y])=>{const r=document.querySelector('#canvas').getBoundingClientRect(),d=LSSDebug.getDocument();return [r.left+(x+.5)*r.width/d.width,r.top+(y+.5)*r.height/d.height];}''',[x,y])

def pointer(page,kind,number,point,ptype='pen'):
    page.evaluate('''([kind,id,x,y,ptype])=>{const c=document.querySelector('#canvas'),r=c.getBoundingClientRect(),d=LSSDebug.getDocument();c.dispatchEvent(new PointerEvent(kind,{bubbles:true,cancelable:true,pointerId:id,pointerType:ptype,isPrimary:true,button:0,buttons:kind==='pointerup'?0:1,clientX:r.left+(x+.5)*r.width/d.width,clientY:r.top+(y+.5)*r.height/d.height}));}''',[kind,number,*point,ptype])

def check_alignment(page,zoom):
    values=page.evaluate('''()=>{const names=['pixelwrap','canvas','pixelgrid'];const nodes=names.map(id=>document.getElementById(id));const rs=nodes.map(n=>n.getBoundingClientRect());return {rects:rs.map(r=>[r.x,r.y,r.width,r.height]),checker:getComputedStyle(nodes[0]).backgroundSize,grid:getComputedStyle(nodes[2]).backgroundSize,cell:getComputedStyle(nodes[0]).getPropertyValue('--lss-cell-size').trim()};}''')
    assert values['cell']==f'{zoom:g}px',values
    assert values['checker']==f'{zoom*2:g}px {zoom*2:g}px',values
    for b in (values['rects'][1:] if zoom>=4 else values['rects'][1:2]):
        assert all(abs(x-y)<.04 for x,y in zip(values['rects'][0],b)),values


def touch_and_pen(browser,viewport,dpi):
    context=browser.new_context(viewport=viewport,device_scale_factor=dpi,has_touch=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.locator('#palette .swatch').nth(5).click() # fully opaque red
    for z in ('1','1.5','2.5','6','12'):
        page.locator('#zoom').select_option(z)
        check_alignment(page,float(z))
        # Fast touch drag under 75ms: intermediate and final cells must not be lost.
        pointer(page,'pointerdown',91,(1,4),'touch')
        pointer(page,'pointermove',91,(3,4),'touch')
        pointer(page,'pointerup',91,(5,4),'touch')
        for x in range(1,6):
            assert pixel(page,x,4)==[255,0,0,255],('short touch lost pixel',viewport,dpi,z,x)
        page.locator('#undo').click()
        for x in range(1,6):assert pixel(page,x,4)==[0,0,0,0]
        # Pen crossing pixel-cell edges and a touch resting on canvas must not interrupt it.
        pointer(page,'pointerdown',201,(1,7),'pen')
        pointer(page,'pointerdown',202,(16,16),'touch')
        pointer(page,'pointermove',201,(5,7),'pen')
        pointer(page,'pointerup',201,(7,7),'pen')
        pointer(page,'pointerup',202,(16,16),'touch')
        for x in range(1,8):assert pixel(page,x,7)==[255,0,0,255],('pen dropped',dpi,z,x)
        assert pixel(page,16,16)==[0,0,0,0],('palm wrote paint',dpi,z)
        page.locator('#undo').click()
        # First finger starts a would-be paint stroke; second finger turns it into a gesture.
        pointer(page,'pointerdown',301,(8,10),'touch')
        pointer(page,'pointerdown',302,(10,10),'touch')
        pointer(page,'pointermove',301,(7,10),'touch')
        pointer(page,'pointerup',301,(7,10),'touch')
        pointer(page,'pointerup',302,(10,10),'touch')
        assert pixel(page,8,10)==[0,0,0,0],('two-finger gesture painted',dpi,z)
        # Synthetic mouse pointer path, same coordinate mapping as the real canvas.
        pointer(page,'pointerdown',401,(1,2),'mouse');pointer(page,'pointermove',401,(6,2),'mouse');pointer(page,'pointerup',401,(6,2),'mouse')
        for x in range(1,7):assert pixel(page,x,2)==[255,0,0,255],('mouse failed',dpi,z)
        page.locator('#undo').click()
    # CSS rotation/resize and pan preserve the SAME checker/grid coordinate origin.
    page.set_viewport_size({'width':viewport['height'],'height':viewport['width']})
    page.locator('#zoom').select_option('24');check_alignment(page,24)
    page.evaluate('''()=>{const s=document.getElementById('stage');s.scrollLeft=90;s.scrollTop=170;}''')
    check_alignment(page,24)
    pointer(page,'pointerdown',501,(15,15),'pen');pointer(page,'pointerup',501,(15,15),'pen')
    assert pixel(page,15,15)==[255,0,0,255]
    assert not errors,errors
    print(f'PASS pointer touch/pen/mouse, pinch cancellation and rotated zoom alignment at DPR={dpi}, viewport={viewport}')
    context.close()


def test_real_pointer_capture(browser):
    ctx=browser.new_context(viewport={'width':1290,'height':900})
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.locator('#palette .swatch').nth(5).click()
    page.locator('#zoom').select_option('12')
    start=at(page,8,8)
    outer=page.evaluate("() => {const c=document.getElementById('canvas').getBoundingClientRect();return [Math.min(innerWidth-20,c.right+60),c.top+8.5*12];}")
    page.mouse.move(*start);page.mouse.down()
    page.mouse.move(*at(page,12,8),steps=4)
    page.mouse.move(*outer,steps=4) # Pointerup/reentry while outside the canvas uses browser pointer capture.
    page.mouse.move(*at(page,17,8),steps=4);page.mouse.up()
    for x in range(8,18): assert pixel(page,x,8)==[255,0,0,255],('capture stroke missing',x)
    page.locator('#undo').click()
    for x in range(8,18):assert pixel(page,x,8)==[0,0,0,0]
    # Unexpected lost capture should commit existing work instead of erasing a whole stroke.
    pointer(page,'pointerdown',801,(2,12),'pen')
    pointer(page,'pointermove',801,(7,12),'pen')
    pointer(page,'lostpointercapture',801,(7,12),'pen')
    for x in range(2,8):assert pixel(page,x,12)==[255,0,0,255]
    page.locator('#undo').click()
    for x in range(2,8):assert pixel(page,x,12)==[0,0,0,0]
    # Pointer cancellation (OS gesture) deliberately rolls back in-progress drawing.
    pointer(page,'pointerdown',802,(3,14),'pen')
    pointer(page,'pointermove',802,(7,14),'pen')
    pointer(page,'pointercancel',802,(7,14),'pen')
    for x in range(3,8):assert pixel(page,x,14)==[0,0,0,0]
    assert not errors,errors
    print('PASS native mouse capture outside canvas, loss-of-capture commit, canceled-stroke rollback')
    ctx.close()


def test_bad_import_and_legacy(browser):
    ctx=browser.new_context(viewport={'width':1290,'height':900})
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    fixture=ROOT/'apps/sprite-studio/tests/fixtures/prior-v1-project.lss.json'
    page.locator('#projectFile').set_input_files(str(fixture))
    page.wait_for_function('LSSDebug.getDocument().name!=="Untitled"')
    baseline=page.evaluate('LSSDebug.projectJSON()')
    with TemporaryDirectory() as td:
        badjson=Path(td)/'bad.lss.json';badjson.write_text('{invalid',encoding='utf-8')
        page.locator('#projectFile').set_input_files(str(badjson))
        page.wait_for_function("document.querySelector('#dialogBackdrop').classList.contains('open')")
        assert 'Not valid JSON' in page.locator('#statusText').inner_text()
        assert page.evaluate('LSSDebug.projectJSON()')==baseline
        page.locator('#dialogOK').click()
        png=bytearray(base64.b64decode((ROOT/'apps/sprite-studio/tests/fixtures/three-frame-sheet.png.base64').read_text().strip()))
        png[-15]^=0x20  # damage a CRC-protected chunk
        broken=Path(td)/'corrupt.png';broken.write_bytes(png)
        page.locator('#pngFile').set_input_files(str(broken))
        page.wait_for_function("document.querySelector('#dialogBackdrop').classList.contains('open')")
        assert 'Error:' in page.locator('#statusText').inner_text()
        assert page.evaluate('LSSDebug.projectJSON()')==baseline
        page.locator('#dialogOK').click()
    assert not errors,errors
    print('PASS original v1 project fixture and rejection of corrupt JSON/PNG without replacing project')
    ctx.close()


def test_timeline(browser):
    ctx=browser.new_context(viewport={'width':1290,'height':900},accept_downloads=True)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install()
    page.set_content(HTML)
    page.evaluate('''async()=>{const d=LSSModel.makeProject(4,4);LSSModel.addLayer(d,0);LSSModel.createFrame(d,0);LSSModel.createFrame(d,1);d.frames[0].duration=80;d.frames[1].duration=200;d.frames[2].duration=480;
      for(let f=0;f<3;f++){LSSModel.pencil(d,f,0,f,0,'#ff0000ff');LSSModel.pencil(d,f,1,f,1,'#0000ffff');}await LSSDebug.loadJSON(LSSModel.serialize(d));}''')
    assert page.evaluate('LSSDebug.getDocument().frames.length')==3
    assert page.evaluate('LSSDebug.getDocument().frames.map(f=>f.duration)')==[80,200,480]
    # Copy a 2-layer frame, paste into an existing third frame, undo and redo without timeline corruption.
    page.locator('#frames .frameItem').first.click();page.locator('#copyFrame').click()
    page.locator('#frames .frameItem').nth(2).click();page.locator('#pasteFrame').click()
    assert pixel(page,0,0,2)==[255,0,0,255]
    assert pixel(page,0,1,2,1)==[0,0,255,255]
    assert page.evaluate('LSSDebug.getDocument().frames[2].duration')==80
    page.locator('#undo').click();assert pixel(page,2,0,2)==[255,0,0,255]
    page.locator('#redo').click();assert pixel(page,0,0,2)==[255,0,0,255]
    # Undo to restore the third frame's unique timing before checking fixed-FPS preview.
    page.locator('#undo').click()
    before=page.evaluate('Array.from({length:3},(_,i)=>Array.from(LSSModel.composite(LSSDebug.getDocument(),i)))')
    page.locator('#layers .layerItem').first.click() # top layer
    page.locator('#layerMerge').click()
    assert page.evaluate('LSSDebug.getDocument().layers.length')==1
    after=page.evaluate('Array.from({length:3},(_,i)=>Array.from(LSSModel.composite(LSSDebug.getDocument(),i)))')
    assert before==after, 'merging two fully opaque-metadata layers changed composite'
    page.locator('#undo').click();assert page.evaluate('LSSDebug.getDocument().layers.length')==2
    page.locator('#redo').click();assert page.evaluate('LSSDebug.getDocument().layers.length')==1
    # Use a fixed 10 FPS preview: frame 0 --> frame 2 at virtual t=250ms.
    page.locator('#frames .frameItem').first.click()
    page.locator('#fixedFps').check();page.locator('#fpsValue').fill('10');page.locator('#fpsValue').press('Tab')
    assert page.locator('#previewLabel').inner_text().endswith('10 FPS preview')
    page.locator('#play').click();page.clock.run_for(250)
    state=page.evaluate('LSSDebug.getState()')
    assert state['playing'] and state['playFrame']==2,('fixed FPS not applied',state)
    page.locator('#play').click()
    # Playback override never changes underlying duration metadata or serialization.
    assert page.evaluate('LSSDebug.getDocument().frames.map(f=>f.duration)')==[80,200,480]
    # Compare with per-frame duration playback: at 250 ms we should be on frame 1.
    page.locator('#fixedFps').uncheck();page.locator('#play').click();page.clock.run_for(250)
    state=page.evaluate('LSSDebug.getState()')
    assert state['playing'] and state['playFrame']==1,('timed playback not applied',state)
    page.locator('#play').click()
    # Repeated undo/redo and project save preserve frame order and times.
    with page.expect_download() as d:page.locator('#saveProject').click()
    exported=Path(d.value.path()).read_text(encoding='utf-8');obj=json.loads(exported)
    assert [f['duration'] for f in obj['frames']]==[80,200,480]
    assert len(obj['layers'])==1
    await_load=page.evaluate('(text)=>LSSDebug.loadJSON(text)',exported)
    assert page.evaluate('LSSDebug.getDocument().frames.map(f=>f.duration)')==[80,200,480]
    assert not errors,errors
    print('PASS frame copy/paste, layer merge, undo/redo, virtual-clock fixed FPS and exact duration preview/export')
    ctx.close()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    touch_and_pen(browser,{'width':1290,'height':900},1)
    touch_and_pen(browser,{'width':390,'height':844},2.5)
    test_real_pointer_capture(browser)
    test_bad_import_and_legacy(browser)
    test_timeline(browser)
    browser.close()
print('Round 4 Sprite Studio browser regressions: PASS')
