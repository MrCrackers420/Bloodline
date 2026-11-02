from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parents[1]

def test_catalog_download_installer_and_stays_optional():
    script=(BASE/'web/latch-update.js').read_text()
    html='''<!doctype html><html><body><div id="mount"></div><script>
      const files=new Map();let installed=false;
      const api={
        installedPrograms:()=>installed?[{id:'latchamp',name:'LatchAmp',version:'1.10'}]:[],
        get:path=>files.get(path.toUpperCase())||null,
        createAppInstaller:id=>{if(id!=='latchamp')throw Error('unknown');const path='C:/DOWNLOADS/LATCHAMP-110.SETUP.EXE';files.set(path,{kind:'installer',program:id});document.dispatchEvent(new Event('latchfschange'));return path;}
      };
      window.mock={api,install:()=>{installed=true;document.dispatchEvent(new Event('latchfschange'))}};
    </script><script id="addon"></script></body></html>'''
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page();page.set_content(html)
        page.add_script_tag(content=script)
        page.evaluate("""() => window.LatchUpdater.mount(document.getElementById('mount'), {fs:window.mock.api,showError:e=>{throw e},openFolder:()=>{},runSetup:id=>{if(id==='latchamp')window.mock.install()}})""")
        assert page.get_by_text('Not installed.',exact=True).count()==1
        assert page.get_by_role('button',name='Run Setup...').is_disabled()
        page.get_by_role('button',name='Download Setup').click()
        assert page.get_by_role('button',name='Run Setup...').is_enabled()
        assert page.evaluate('window.mock.api.installedPrograms().length')==0
        page.get_by_role('button',name='Run Setup...').click()
        assert page.get_by_text('LatchAmp 1.10 is installed.',exact=False).count()==1
        assert page.get_by_role('button',name='Download Setup').is_disabled()
        browser.close()
