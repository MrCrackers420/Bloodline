"""Integration tests for sprite-cell selection, real sheet import, high-DPI zoom and touch."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright
import json, tempfile, base64
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text()

def point(page,x,y):
    r=page.locator('#canvas').bounding_box()
    d=page.evaluate('({w:LSSDebug.getDocument().width,h:LSSDebug.getDocument().height})')
    return r['x']+(x+.5)*r['width']/d['w'],r['y']+(y+.5)*r['height']/d['h']

def pix(page,x,y,f=0,l=0):
    return page.evaluate('([x,y,f,l])=>{let d=LSSDebug.getDocument(),p=d.frames[f].cels[l];return [...p.slice((y*d.width+x)*4,(y*d.width+x+1)*4)]}',[x,y,f,l])

def drag(page,a,b):
    x,y=point(page,*a);xx,yy=point(page,*b)
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(xx,yy,steps=5);page.mouse.up()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1320,'height':880},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(HTML)
    page.locator('#palette .swatch').nth(5).click()
    for cell in [(2,2),(3,2)]:page.mouse.click(*point(page,*cell))
    assert pix(page,2,2)==[255,0,0,255]
    page.locator('[data-tool="select"]').click()
    drag(page,(2,2),(3,2))
    assert page.evaluate('LSSDebug.getState().selection')=={'x':2,'y':2,'w':2,'h':1}
    drag(page,(2,2),(5,4))
    assert pix(page,2,2)==[0,0,0,0],pix(page,2,2)
    assert pix(page,5,4)==[255,0,0,255],pix(page,5,4)
    assert page.evaluate('LSSDebug.getState().selection')=={'x':5,'y':4,'w':2,'h':1}
    page.locator('#undo').click();assert pix(page,2,2)==[255,0,0,255]
    page.locator('#redo').click();assert pix(page,5,4)==[255,0,0,255]
    # Undo clears selection intentionally; reselect and use internal copy across frames.
    drag(page,(5,4),(6,4));page.locator('#copySelection').click()
    page.locator('#addFrame').click();page.locator('#deselect').click();page.locator('#pasteSelection').click()
    assert pix(page,0,0,1)==[255,0,0,255]
    assert pix(page,5,4,0)==[255,0,0,255]
    page.locator('#flipH').click();page.locator('#cutSelection').click()
    assert pix(page,0,0,1)==[0,0,0,0]
    page.locator('#undo').click();assert pix(page,0,0,1)==[255,0,0,255]
    page.locator('#layerAdd').click();page.locator('#nudgeRight').click()
    assert len(page.evaluate('LSSDebug.getDocument().layers'))==2
    page.locator('[data-tool="pencil"]').click()
    page.mouse.click(*point(page,2,3))
    page.locator('#frames .frameItem').first.click()
    page.mouse.click(*point(page,2,3))
    page.locator('#moveAllFrames').check()
    page.locator('#nudgeRight').click()
    assert pix(page,3,3,0,1)==[255,0,0,255]
    assert pix(page,3,3,1,1)==[255,0,0,255]
    page.locator('#undo').click();assert pix(page,2,3,0,1)==[255,0,0,255]
    assert pix(page,2,3,1,1)==[255,0,0,255]
    page.locator('#redo').click();assert pix(page,3,3,0,1)==[255,0,0,255]
    assert pix(page,3,3,1,1)==[255,0,0,255]
    print('PASS rectangle selection, drag move, undo/redo, copy across frames, flip/cut and cel nudge')
    # Actual files from the shipped fixture, including out-of-order frame entries.
    fixture=ROOT/'tests'/'fixtures';png=base64.b64decode((fixture/'three-frame-sheet.png.base64').read_text().strip())
    out=Path(tempfile.mkdtemp());sheet_png=out/'three-frame-sheet.png';sheet_png.write_bytes(png)
    sheet_meta=out/'three-frame-sheet.json';sheet_meta.write_bytes((fixture/'three-frame-sheet.json').read_bytes())
    page.locator('#sheetFiles').set_input_files([str(sheet_png),str(sheet_meta)])
    page.locator('#dialogOK').click()  # Discard working project after validation.
    page.wait_for_function('LSSDebug.getDocument().frames.length===3')
    assert page.evaluate('LSSDebug.getDocument().frames.map(f=>f.duration)')==[80,180,530]
    assert pix(page,0,0,1)==[80,50,70,110]
    # Export project and re-import losslessly; frame order and timing preserved.
    with page.expect_download() as dl:page.locator('#saveProject').click()
    saved=Path(dl.value.path()).read_text()
    assert json.loads(saved)['frames'][2]['duration']==530
    page.evaluate('(text)=>LSSDebug.loadJSON(text)',saved)
    assert pix(page,0,0,2)==[130,50,70,200]
    # Round-trip the actual exported PNG + JSON pair through the UI.
    downloads=[]
    page.on('download',lambda dl:downloads.append(dl))
    page.locator('#sheetExport').click()
    page.wait_for_function('true')
    page.wait_for_timeout(400)
    assert len(downloads)==2,[d.suggested_filename for d in downloads]
    png_out=next(d for d in downloads if d.suggested_filename.endswith('.png'))
    manifest_out=next(d for d in downloads if d.suggested_filename.endswith('.json'))
    png_path=Path(png_out.path());json_path=Path(manifest_out.path())
    page.locator('#sheetFiles').set_input_files([str(png_path),str(json_path)])
    page.locator('#dialogOK').click()
    page.wait_for_function('LSSDebug.getDocument().frames.length===3')
    assert page.evaluate('LSSDebug.getDocument().frames.map(f=>f.duration)')==[80,180,530]
    assert pix(page,0,0,2)==[130,50,70,200]
    print('PASS exported sprite-sheet PNG + JSON can be imported without losing pixels or frame timing')
    with page.expect_download() as dl:page.locator('#pngExport').click()
    pic=Image.open(BytesIO(Path(dl.value.path()).read_bytes())).convert('RGBA')
    assert pic.getpixel((0,0))==(30,50,70,20)
    # Onion skin affects preview only; never the current cel or PNG output.
    page.evaluate('''async () => {const d=LSSModel.makeProject(3,3);LSSModel.pencil(d,0,0,1,1,'#ff0000ff');LSSModel.createFrame(d,0,false);await LSSDebug.loadJSON(LSSModel.serialize(d));}''')
    page.locator('#frames .frameItem').nth(1).click()
    page.locator('#onion').check()
    ghost=page.evaluate("[...document.querySelector('#canvas').getContext('2d').getImageData(1,1,1,1).data]")
    assert ghost[0]==255 and 0<ghost[3]<255,ghost
    assert pix(page,1,1,1)==[0,0,0,0]
    with page.expect_download() as dl:page.locator('#pngExport').click()
    pic=Image.open(BytesIO(Path(dl.value.path()).read_bytes())).convert('RGBA')
    assert pic.getpixel((1,1))==(0,0,0,0)
    print('PASS onion-skin previous-frame ghost stays out of editable cel and PNG output')
    print('PASS real 3-frame PNG+manifest fixture and editable project round-trip')
    assert not errors,errors
    context.close()
    for dpi in (1,1.25,2.5):
        ctx=browser.new_context(viewport={'width':1380,'height':930},device_scale_factor=dpi)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(HTML)
        for zoom in ('1','1.5','2','2.5','3','4','5','8','12'):
            page.locator('#zoom').select_option(zoom)
            dim=page.evaluate('''() => {let a=document.querySelector('#pixelwrap'),b=document.querySelector('#canvas'),g=document.querySelector('#pixelgrid');
              let rect=n=>n.getBoundingClientRect();return {cell:getComputedStyle(a).getPropertyValue('--lss-cell-size').trim(),checker:getComputedStyle(a).backgroundSize,grid:getComputedStyle(g).backgroundSize,
              a:[rect(a).x,rect(a).y,rect(a).width,rect(a).height],b:[rect(b).x,rect(b).y,rect(b).width,rect(b).height],c:[rect(g).x,rect(g).y,rect(g).width,rect(g).height]}}''')
            expected=float(zoom);assert dim['cell']==f'{zoom}px',dim
            assert dim['checker']==f'{expected*2:g}px {expected*2:g}px',dim
            assert all(abs(a-b)<.03 for a,b in zip(dim['a'],dim['b'])),dim
            if expected>=4:assert all(abs(a-b)<.03 for a,b in zip(dim['a'],dim['c'])),dim
            page.locator('#palette .swatch').nth(5).click()
            page.mouse.click(*point(page,2,3))
            assert pix(page,2,3)==[255,0,0,255],(dpi,zoom,pix(page,2,3))
            page.locator('[data-tool="eraser"]').click();page.mouse.click(*point(page,2,3));assert pix(page,2,3)==[0,0,0,0]
            page.locator('[data-tool="pencil"]').click()
        # Scroll while enlarged and paint at same coordinates that remain visible.
        page.locator('#zoom').select_option('12')
        page.evaluate('''() => {let s=document.querySelector('#stage');s.scrollLeft=64;s.scrollTop=36;}''')
        page.mouse.click(*point(page,9,9));assert pix(page,9,9)==[255,0,0,255]
        # Changing dimensions must keep shared image/checker/grid origin.
        page.locator('#resize').click()
        page.locator('#dlg_width').fill('24');page.locator('#dlg_height').fill('21')
        page.locator('#dialogOK').click()
        page.wait_for_function('LSSDebug.getDocument().width===24')
        metrics=page.evaluate("() => {let a=document.querySelector('#canvas').getBoundingClientRect(),b=document.querySelector('#pixelwrap').getBoundingClientRect();return [a.width,a.height,b.width,b.height]}")
        assert metrics==[288,252,288,252],metrics
        page.mouse.click(*point(page,9,9));assert pix(page,9,9)==[255,0,0,255]
        assert not errors,errors
        print(f'PASS zoom 1/1.5/2/2.5/3/4/5/8/12 with DPR={dpi}, grid/checker coordinate alignment, pointer painting and pan')
        ctx.close()
    browser.close()
print('New editor/browser tests: PASS')
