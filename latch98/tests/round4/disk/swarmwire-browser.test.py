"""Run from repo root: python tests/round4/disk/swarmwire-browser.test.py
Requires playwright Python package and locally installed Chromium; no Internet.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT = Path(os.environ.get('LATCH_DISK_TEST_ROOT', Path(__file__).resolve().parents[3])).resolve()
DISK = (ROOT/'web/filesystem.js').read_text()
SWARM = (ROOT/'web/swarmwire.js').read_text()
HTML = '<!doctype html><meta charset="utf-8"><div id="sw"></div>'

# Deterministic timer harness: no real waiting or simulated time acceleration;
# every tick is invoked through the same interval callback the UI schedules.
TIMER = '''window.__timers=new Map();window.__nextTimer=1;
window.setInterval=function(fn,ms){let id=window.__nextTimer++;window.__timers.set(id,fn);return id};
window.clearInterval=function(id){window.__timers.delete(id)};
window.__step=function(count=1){for(let n=0;n<count;n++)for(let fn of [...window.__timers.values()])fn()};
window.__errors=[];window.__mount=function(){window.__app=SwarmWire.mount(document.querySelector('#sw'),{
 fs:LatchFS,showError:e=>window.__errors.push(String(e)),mountDisc:p=>LatchFS.mountDisc(p),
 pickTorrent:done=>done(LatchFS.saveNornTorrent())});return window.__app};'''

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':900,'height':650})
  def init(saved=None):
   page.set_content(HTML)
   page.evaluate('''(seed)=>{const records=new Map(Object.entries(seed||{}));
    const obj={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v)),removeItem:k=>records.delete(k)};
    Object.defineProperty(window,'localStorage',{configurable:true,value:obj});
    window.__timers=new Map();window.__nextTimer=1;
    window.setInterval=function(fn){let id=window.__nextTimer++;window.__timers.set(id,fn);return id};
    window.clearInterval=id=>window.__timers.delete(id);
    window.__step=function(count=1){for(let n=0;n<count;n++)for(let fn of [...window.__timers.values()])fn()};
    window.__errors=[];
    window.__mount=function(){window.__app=SwarmWire.mount(document.querySelector('#sw'),{
     fs:LatchFS,showError:e=>window.__errors.push(String(e)),mountDisc:p=>LatchFS.mountDisc(p),
     pickTorrent:done=>done(LatchFS.saveNornTorrent())});return window.__app};
   }''', saved)
   page.add_script_tag(content=DISK)
   page.add_script_tag(content=SWARM)
   page.evaluate('LatchFS.ready')
   page.evaluate('__mount()')
  def reload():
   saved=page.evaluate('localStorage.getItem("latch98.virtual_disk.v1")')
   # A fresh JS runtime models process interruption without real network.
   page.reload()
   init({'latch98.virtual_disk.v1':saved})
  init()
  assert page.evaluate('LatchFS.nornTransfer()') is None
  assert not page.evaluate('LatchFS.installedPrograms().some(x=>x.id==="nornlab")')
  page.locator('[data-sw="add"]').click()
  assert page.evaluate('LatchFS.nornTransfer().percent')==0
  page.locator('[data-sw="start"]').click()
  page.evaluate('__step(7)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==10.5
  page.locator('[data-sw="pause"]').click()
  assert page.evaluate('LatchFS.nornTransfer().state')=='Stopped'
  page.evaluate('__step(20)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==10.5
  page.locator('[data-sw="start"]').click()
  page.evaluate('__step(2)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==13.5
  # Two UI mounts cannot run two timers and thereby double the transfer speed.
  page.evaluate('__mount()')
  assert page.evaluate('__timers.size')==1
  page.evaluate('__step(5)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==13.5 # new mount is interrupted, must explicitly resume
  page.locator('[data-sw="start"]').click()
  page.evaluate('__step(1)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==15
  # A fullscreen Bloodline flag does not implicitly suspend the transfer.
  page.evaluate('window.LATCH_GAME_PERFORMANCE_MODE=true;__step(1)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==16.5
  # Full reload reopens same browser storage; no phantom completion.
  reload()
  assert page.evaluate('LatchFS.nornTransfer().percent')==16.5
  assert page.locator('.sw-status').inner_text().endswith('Interrupted')
  assert page.evaluate('LatchFS.get("C:/Downloads/NornWorldLab.iso")') is None
  page.evaluate('__step(5)');assert page.evaluate('LatchFS.nornTransfer().percent')==16.5
  # Fail one real storage write. The incomplete tick is rolled back and UI stops.
  page.locator('[data-sw="start"]').click()
  page.evaluate('''window.__originalSet=localStorage.setItem;
  localStorage.setItem=function(){throw Error('QuotaExceededError')};__step(1)''')
  assert page.evaluate('LatchFS.nornTransfer().percent')==16.5
  assert page.evaluate('__errors.length')==1
  page.evaluate('localStorage.setItem=window.__originalSet;__step(10)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==16.5
  page.locator('[data-sw="start"]').click()
  page.evaluate('__step(56)')
  assert page.evaluate('LatchFS.nornTransfer().percent')==100
  assert page.evaluate('LatchFS.nornTransfer().state')=='Finished'
  assert page.evaluate('LatchFS.get("C:/Downloads/NornWorldLab.iso").kind')=='iso'
  assert page.evaluate('LatchFS.discInfo().mounted') is None
  assert not page.evaluate('LatchFS.installedPrograms().some(x=>x.id==="nornlab")')
  page.locator('[data-sw="disc"]').click()
  assert page.evaluate('LatchFS.get("D:/Setup.exe").program')=='nornlab'
  page.evaluate('LatchFS.installSoftware("nornlab")')
  reload()
  assert page.evaluate('LatchFS.installedPrograms().filter(x=>x.id==="nornlab").length')==1
  assert page.evaluate('LatchFS.get("D:/Setup.exe").program')=='nornlab'
  assert page.evaluate('LatchFS.nornTransfer().state')=='Finished'
  assert page.evaluate('LatchFS.get("C:/Downloads/NornWorldLab.iso").kind')=='iso'
  browser.close()
  print('PASS: SwarmWire Chromium offline UI — pause/resume/reload, single timer, quota rollback, fullscreen flag, ISO/Setup, reload installation')

if __name__=='__main__':run()
