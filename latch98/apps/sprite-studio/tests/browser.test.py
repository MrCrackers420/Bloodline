"""End-to-end offline Sprite Studio regression suite. Run: python tests/browser.test.py"""
from pathlib import Path
from io import BytesIO
import json
import tempfile
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
URL='https://sprite-studio.test/index.html'
HOST='https://sprite-studio.test/tests/host.html'
# Network requests are intercepted and served from our local files; no HTTP server runs.
def serve_from_files(route):
    url=route.request.url
    path=(ROOT/'tests'/'host.html') if url.endswith('/tests/host.html') else ROOT/'index.html'
    route.fulfill(body=path.read_bytes(),content_type='text/html')

def pixel_click(page,x,y,touch=False):
    r=page.locator('#canvas').bounding_box()
    d=page.evaluate('({w:LSSDebug.getDocument().width,h:LSSDebug.getDocument().height})')
    px=r['x']+(x+.5)*r['width']/d['w'];py=r['y']+(y+.5)*r['height']/d['h']
    if touch:page.touchscreen.tap(px,py)
    else:page.mouse.click(px,py)

def rgba(page,x,y,frame=0,layer=0):
    return page.evaluate('([x,y,f,l])=>{const d=LSSDebug.getDocument(),p=d.frames[f].cels[l],k=(y*d.width+x)*4;return Array.from(p.slice(k,k+4))}',[x,y,frame,layer])

def screenshot(page,name):
    path=Path(tempfile.gettempdir())/name
    page.screenshot(path=str(path),full_page=True)
    return path

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--allow-file-access-from-files','--disable-web-security','--no-sandbox'])
    errors=[]
    context=browser.new_context(viewport={'width':1270,'height':860},accept_downloads=True)
    context.route('https://sprite-studio.test/**',serve_from_files)
    page=context.new_page();page.on('pageerror',lambda err: errors.append(str(err)))
    page.set_content((ROOT/'index.html').read_text());page.locator('#canvas').wait_for();assert page.title()=='Latch Sprite Studio'
    print('Desktop: launched from self-contained HTML via intercepted local source; no server/network dependencies')
    # Pencil in swatch #5 (red), exact target, eraser, undo/redo.
    page.locator('#palette .swatch').nth(5).click();pixel_click(page,2,3)
    assert rgba(page,2,3)==[255,0,0,255],rgba(page,2,3)
    page.locator('#toolgrid [data-tool=eraser]').click();pixel_click(page,2,3)
    assert rgba(page,2,3)==[0,0,0,0]
    page.locator('#undo').click();assert rgba(page,2,3)==[255,0,0,255]
    page.locator('#redo').click();assert rgba(page,2,3)==[0,0,0,0]
    page.locator('#toolgrid [data-tool=pencil]').click();pixel_click(page,3,4)
    page.locator('#addFrame').click();assert rgba(page,3,4,0)==[255,0,0,255]
    assert rgba(page,3,4,1)==[0,0,0,0]
    page.locator('#duration').fill('240');page.locator('#duration').dispatch_event('change')
    assert page.evaluate('LSSDebug.getDocument().frames[1].duration')==240
    page.locator('#layerAdd').click();assert page.evaluate('LSSDebug.getDocument().layers.length')==2
    page.locator('#fgHex').fill('#0088ff80');page.locator('#fgHex').dispatch_event('change');pixel_click(page,5,6)
    assert rgba(page,5,6,1,1)==[0,136,255,128]
    assert rgba(page,5,6,0,1)==[0,0,0,0]
    # Real UI playback should advance using each frame's own duration.
    page.locator('#frames .frameItem').first.click()
    page.locator('#play').click()
    page.wait_for_function('LSSDebug.getState().playFrame === 1',timeout=3000)
    assert 'Frame 2' in page.locator('#previewLabel').inner_text()
    page.locator('#play').click()
    assert not page.evaluate('LSSDebug.getState().playing')
    page.locator('#frames .frameItem').nth(1).click()
    print('Animation preview: actual timed frame progression and pause')
    print('Desktop: pencil, eraser, undo/redo, independent frames and layers, RGBA hex')
    # PNG export: needs preserve alpha, produce actual size.
    with page.expect_download() as dl:page.locator('#pngExport').click()
    png_data=Path(dl.value.path()).read_bytes()
    img=Image.open(BytesIO(png_data)).convert('RGBA')
    assert img.size==(32,32),img.size
    assert img.getpixel((5,6))==(0,136,255,128),img.getpixel((5,6))
    assert img.getpixel((1,1))==(0,0,0,0)
    print('PNG export: correct dimensions, color and alpha')
    # Download/editable project roundtrip via browser, plus second frame independent.
    with page.expect_download() as dl:page.locator('#saveProject').click()
    project=Path(dl.value.path()).read_text()
    assert json.loads(project)['format']=='latch-sprite-studio'
    page.locator('#newDoc').click();page.locator('#dialogOK').click()
    assert page.evaluate('LSSDebug.getDocument().frames.length')==1
    path=Path(tempfile.gettempdir())/'sprite-studio-tested.lss.json';path.write_text(project)
    page.locator('#projectFile').set_input_files(str(path));page.wait_for_function('LSSDebug.getDocument().frames.length === 2')
    assert rgba(page,5,6,1,1)==[0,136,255,128]
    print('Native project download/import: frames, RGBA pixel data and metadata round-trip')
    # Sheet export: two downloads could behave differently among browser engines.
    downloads=[]
    page.on('download',lambda dl:downloads.append(dl))
    page.locator('#sheetExport').click()
    page.wait_for_timeout(350)
    assert len(downloads)>=2,f'sprite sheet expected PNG and JSON manifest, got {len(downloads)}'
    png_file=next(dl for dl in downloads if dl.suggested_filename.endswith('.png'))
    manifest_file=next(dl for dl in downloads if dl.suggested_filename.endswith('.json'))
    sheet=Image.open(png_file.path()).convert('RGBA');manifest=json.loads(Path(manifest_file.path()).read_text())
    assert sheet.size==(64,32)
    assert manifest['frames'][1]['duration']==240
    assert sheet.getpixel((37,6))==(0,136,255,128)
    assert sheet.getpixel((5,6))==(0,0,0,0)
    print('Sheet PNG + JSON manifest: reproducible ordering, durations, actual RGBA pixels')
    # Source image import into a new editable canvas.
    png_tmp=Path(tempfile.gettempdir())/'sprite-studio-import.png'
    src=Image.new('RGBA',(16,16),(0,0,0,0));src.putpixel((8,6),(11,22,33,44));src.save(png_tmp)
    page.locator('#pngFile').set_input_files(str(png_tmp))
    page.wait_for_function('LSSDebug.getDocument().width === 16')
    assert rgba(page,8,6)==[11,22,33,44]
    print('PNG import: lossless original RGBA and correct canvas size')
    ss=screenshot(page,'latch-sprite-studio-desktop.png')
    assert not errors,f'Console exceptions: {errors}'
    context.close()
    # Phone viewport actual touch event path; no accidental two-touch drawing.
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2,accept_downloads=True)
    mobile.route('https://sprite-studio.test/**',serve_from_files)
    mp=mobile.new_page();mob_errors=[];mp.on('pageerror',lambda e:mob_errors.append(str(e)))
    mp.set_content((ROOT/'index.html').read_text());mp.locator('#canvas').wait_for();pixel_click(mp,7,8,touch=True)
    assert rgba(mp,7,8)==[0,0,0,255],rgba(mp,7,8)
    # Two simultaneous touch pointers should pan/zoom, never leave a painted pixel.
    mp.evaluate('''() => {const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();
     const evt=(type,id,x,y)=>new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:r.left+x,clientY:r.top+y,isPrimary:id===21,buttons:1});
     c.dispatchEvent(evt('pointerdown',21,10,10));c.dispatchEvent(evt('pointerdown',22,80,80));
     c.dispatchEvent(evt('pointermove',21,8,7));c.dispatchEvent(evt('pointermove',22,91,95));
     c.dispatchEvent(evt('pointerup',21,8,7));c.dispatchEvent(evt('pointerup',22,91,95));}''')
    assert rgba(mp,1,1)==[0,0,0,0],rgba(mp,1,1)
    print('Touch gesture: two fingers cancel pending painting and pan/zoom')
    mobile_ss=screenshot(mp,'latch-sprite-studio-mobile.png')
    assert not mob_errors,mob_errors
    print('390px phone: responsive view and real touch pointer drawing')
    mobile.close()
    # Sandboxed iframe: stub LatchFS save/open, failure paths.
    host=browser.new_context(viewport={'width':1250,'height':950},accept_downloads=True)
    host.route('https://sprite-studio.test/**',serve_from_files)
    h=host.new_page();errors2=[];h.on('pageerror',lambda e:errors2.append(str(e)))
    h.set_content((ROOT/'tests'/'host.html').read_text());h.evaluate('(html)=>document.querySelector("iframe").srcdoc=html',(ROOT/'index.html').read_text())
    child=h.frame_locator('iframe')
    child.locator('#canvas').wait_for()
    child.locator('#palette .swatch').nth(5).click()
    box=child.locator('#canvas').bounding_box();h.mouse.click(box['x']+4,box['y']+4)
    child.locator('#diskSave').click()
    child.locator('#dialogOK').click()
    h.wait_for_function("!!window.LatchFS.get('C:/MY DOCUMENTS/SPRITE STUDIO/UNTITLED.LSS.JSON')")
    saved=h.evaluate("window.LatchFS.read('C:/MY DOCUMENTS/SPRITE STUDIO/UNTITLED.LSS.JSON')")
    assert json.loads(saved)['format']=='latch-sprite-studio'
    # Modify then disk open; confirm discard.
    child.locator('#toolgrid [data-tool=eraser]').click()
    h.mouse.click(box['x']+4,box['y']+4)
    child.locator('#diskOpen').click()
    child.locator('#dialogOK').click()
    child.locator('#dialogOK').click()
    assert child.locator('#statusText').inner_text().startswith('Opened')
    h.evaluate('window.LatchFS.failWrite=true')
    child.locator('#diskSave').click();child.locator('#dialogOK').click()
    # Existing file must be confirmed before overwrite is attempted.
    child.locator('#dialogOK').click()
    assert 'Simulated disk full' in child.locator('#dialogBody').inner_text()
    child.locator('#dialogOK').click()
    assert not errors2,errors2
    print('Sandboxed iframe with LatchFS stub: virtual C: Save/Open and disk write failure displayed')
    host.close();browser.close()
    print('All browser tests passed. Screenshot previews:',ss,mobile_ss)
