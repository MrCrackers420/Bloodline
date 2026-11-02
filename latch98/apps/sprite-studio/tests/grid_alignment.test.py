"""Regression: checkerboard and sprite grid must use the same pixel origin/size."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')

def geometry(page):
    return page.evaluate('''() => {
      const wrap=document.querySelector('#pixelwrap'), grid=document.querySelector('#pixelgrid'),
            cvs=document.querySelector('#canvas'),box=wrap.getBoundingClientRect(),b=cvs.getBoundingClientRect(),g=grid.getBoundingClientRect();
      return {css: getComputedStyle(wrap).getPropertyValue('--lss-cell-size').trim(),
        checker:getComputedStyle(wrap).backgroundSize, grid:getComputedStyle(grid).backgroundSize,
        gridDisplay:getComputedStyle(grid).display,
        canvas:[b.x,b.y,b.width,b.height], wrap:[box.x,box.y,box.width,box.height],overlay:[g.x,g.y,g.width,g.height],
        zoom:LSSDebug.getState().zoom, w:LSSDebug.getDocument().width,h:LSSDebug.getDocument().height};
    }''')

def verify(page, size):
    x=geometry(page);z=x['zoom'];assert z==size,(size,x)
    assert x['css']==f'{z}px',x
    assert x['checker']==f'{2*z}px {2*z}px',x
    assert x['grid']==f'{z}px {z}px, {z}px {z}px',x
    assert x['gridDisplay']==('none' if z<4 else 'block'),x
    for a,b in zip(x['canvas'],x['wrap']):assert abs(a-b)<.05,x
    if z>=4:
      for a,b in zip(x['canvas'],x['overlay']):assert abs(a-b)<.05,x
    assert x['canvas'][2]==x['w']*z and x['canvas'][3]==x['h']*z,x

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(1250,830),(390,844)]:
  ctx=browser.new_context(viewport={'width':width,'height':height})
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML);page.locator('#canvas').wait_for()
  for size in (2,3,4,6,8,12,16,24,32):
   page.locator('#zoom').select_option(str(size));verify(page,size)
  page.locator('#zoom').select_option('8');verify(page,8)
  # Transparent pixels actually render as alternating checkerboard cells.
  png=Image.open(BytesIO(page.locator('#pixelwrap').screenshot())).convert('RGB')
  color=lambda x,y:png.getpixel((x*8+4,y*8+4))
  assert color(0,0)!=color(1,0),(color(0,0),color(1,0))
  assert color(0,0)==color(1,1),(color(0,0),color(1,1))
  # A visible grid line is centered on the same cell boundary, not halfway through a checker tile.
  assert png.getpixel((0,4))!=png.getpixel((4,4))
  page.locator('#grid').uncheck();x=geometry(page);assert x['gridDisplay']=='none';assert x['checker']=='16px 16px'
  page.locator('#grid').check();verify(page,8)
  # Panning must not detach the grid overlay or checkerboard from the canvas.
  page.evaluate('document.querySelector("#stage").scrollLeft=77;document.querySelector("#stage").scrollTop=39');verify(page,8)
  # Zoom again after panning; geometry remains in phase.
  page.locator('#zoom').select_option('12');verify(page,12)
  assert not errors,errors
  ctx.close();print(f'PASS aligned checkerboard/grid at nine zooms, width {width}')
 browser.close()
print('Sprite Studio grid alignment: PASS')
