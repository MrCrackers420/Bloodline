"""Check 1.12 setup, safe in-place upgrade and optional install in Latch shell."""
from pathlib import Path
from playwright.sync_api import sync_playwright

STANDALONE=Path(__file__).resolve().parents[1]/'Latch98-LatchAmp-v112-Standalone.html'

def test_optional_install_and_upgrade():
    html=STANDALONE.read_text(encoding='utf8')
    poly="""<script>window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__testStore[k]??null,setItem:(k,v)=>{window.__testStore[k]=String(v)},removeItem:k=>delete window.__testStore[k]}});</script>"""
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files'])
        page=browser.new_page(viewport={'width':1200,'height':780})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html.replace('<head>','<head>'+poly,1),wait_until='domcontentloaded',timeout=45000)
        page.click('#boot-button');page.locator('#desktop').wait_for(state='visible',timeout=15000)
        assert page.evaluate('window.LatchFS.installedPrograms().some(x=>x.id==="latchamp")') is False
        page.click('#start-button');page.locator('#start-items [data-app="updates"]').click()
        page.get_by_role('button',name='Download Setup').click()
        assert page.evaluate('!!window.LatchFS.get("C:/Downloads/LatchAmp-112.setup.exe")')
        page.get_by_role('button',name='Run Setup...').click()
        page.get_by_role('button',name='Next >').click();page.get_by_role('button',name='Install',exact=True).click()
        assert page.evaluate('window.LatchFS.installedPrograms().find(x=>x.id==="latchamp").version')=='1.12'
        page.get_by_role('button',name='Finish').click()
        # Downgrade the virtual installed record to represent a save made with 1.03.
        page.evaluate('''() => { const disk=JSON.parse(window.LatchFS.export());disk.installed.latchamp.version='1.03';
          disk.nodes['C:/PROGRAM FILES/LATCHAMP/README.TXT'].data='original readme';
          window.LatchFS.importDisk(JSON.stringify(disk));
          window.LatchFS.write('C:/MY DOCUMENTS/Latch User Data.txt','keep me');
        }''')
        assert page.get_by_text('Update ready: run Setup to upgrade LatchAmp.').count()==1
        page.get_by_role('button',name='Run Setup...').click()
        page.get_by_role('button',name='Next >').click()
        page.get_by_role('button',name='Upgrade',exact=True).click()
        assert page.evaluate('window.LatchFS.installedPrograms().find(x=>x.id==="latchamp").version')=='1.12'
        assert page.evaluate('window.LatchFS.read("C:/MY DOCUMENTS/Latch User Data.txt")')=='keep me'
        assert page.evaluate('window.LatchFS.read("C:/PROGRAM FILES/LATCHAMP/README.TXT")').startswith('LatchAmp 1.12')
        page.get_by_role('button',name='Finish').click()
        assert page.get_by_text('LatchAmp 1.12 is installed.',exact=False).count()==1
        page.click('#start-button');page.locator('#start-items [data-app="run"]').click()
        page.locator('#run-input').fill('latchamp');page.locator('#run-input').press('Enter')
        frame=page.locator('.window[data-id="latchamp"] iframe');frame.wait_for(timeout=15000)
        assert page.frame_locator('.window[data-id="latchamp"] iframe').locator('title').inner_text()=='LatchAmp 1.12 — Latch 98'
        nested=page.frame_locator('.window[data-id="latchamp"] iframe')
        assert nested.locator('body').get_attribute('class')=='in-latch'
        nested.locator('#savelatch').click()
        assert page.evaluate('JSON.parse(window.LatchFS.read("C:/MY DOCUMENTS/LatchAmp Playlist.json")).format')=='latchamp-tracklist-v1'
        nested.locator('#loadlatch').click()
        assert not errors,errors
        print('PASS: opt-in install; 1.03->1.12 upgrade; existing Latch files preserved; app launched')
        browser.close()
