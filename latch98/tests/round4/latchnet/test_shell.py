"""Round 4 shell-integration checks using original desktop/FS/SwarmWire JS.
Runs entirely from in-memory HTML to comply with restricted test Chromium.
Run: python tests/round4/latchnet/test_shell.py
"""
from pathlib import Path
import re,unittest
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[3]
INDEX=(R/'web/index.html').read_text()
INDEX=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '',INDEX)
INDEX=re.sub(r'<script\s+src="[^"]+"\s*></script>','',INDEX)
CSS=[(R/'web'/name).read_text() for name in ['desktop.css','shell_v07.css','explorer_v08.css','swarmwire.css','latchnet.css']]
JS=[(R/'web'/name).read_text() for name in ['latchnet.js','filesystem.js','swarmwire.js','desktop.js']]
STORAGE='''(()=>{const content=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>content.has(k)?content.get(k):null,setItem:(k,v)=>content.set(k,String(v)),removeItem:k=>content.delete(k),clear:()=>content.clear()}});window.__stored=content;})()'''
class Shell(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1160,'height':800},reduced_motion='reduce')
  self.page=self.ctx.new_page();self.page.set_default_timeout(5000)
  self.errors=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  self.page.set_content(INDEX)
  for css in CSS:self.page.add_style_tag(content=css)
  self.page.evaluate(STORAGE)
  for js in JS:self.page.add_script_tag(content=js)
  self.page.locator('#boot-button').click()
  self.page.locator('#desktop:not(.hidden)').wait_for()
  self.page.evaluate('LatchFS.ready')
 def tearDown(self):self.ctx.close()
 def address(self):return self.page.locator('#ln-location').input_value()
 def test_desktop_icon_clean_disk_and_attachment_opens_real_swarmwire(self):
  self.assertEqual(self.page.evaluate('LatchFS.installedPrograms().filter(x=>x.id==="nornlab").length'),0)
  self.page.locator('.desktop-icon[data-app="site:postbox"]').dblclick()
  self.assertIn('www.postbox.l98',self.address())
  self.page.locator('.ln-message-link').first.click()
  self.assertIn('NWLAB03.torrent',self.page.locator('.ln-attachment').inner_text())
  self.page.locator('[data-ln-attachment="open"]').click()
  self.page.locator('.window[data-id="swarmwire"]').wait_for()
  self.assertTrue(self.page.evaluate('!!LatchFS.get("C:/Downloads/NWLAB03.torrent")'))
  self.assertEqual(self.page.evaluate('LatchFS.installedPrograms().filter(x=>x.id==="nornlab").length'),0)
  self.assertFalse(self.errors,f'JS errors: {self.errors}')
 def test_saved_disk_reinitialize_and_postbox_access(self):
  self.page.locator('.desktop-icon[data-app="site:postbox"]').dblclick()
  self.page.locator('.ln-message-link').first.click()
  self.page.locator('[data-ln-attachment="save"]').click()
  self.page.evaluate('LatchFS.ready')
  self.assertTrue(self.page.evaluate('!!LatchFS.get("C:/Downloads/NWLAB03.torrent")'))
  saved=self.page.evaluate('Object.fromEntries(window.__stored)')
  # Simulate a fully restarted browser process with the same saved local profile.
  self.page.set_content(INDEX)
  for css in CSS:self.page.add_style_tag(content=css)
  self.page.evaluate(STORAGE)
  self.page.evaluate('(saved)=>{for(const [key,value] of Object.entries(saved))localStorage.setItem(key,value)}',saved)
  for js in JS:self.page.add_script_tag(content=js)
  self.page.locator('#boot-button').click()
  self.page.locator('#desktop:not(.hidden)').wait_for()
  self.page.evaluate('LatchFS.ready')
  self.assertTrue(self.page.evaluate('!!LatchFS.get("C:/Downloads/NWLAB03.torrent")'))
  self.assertEqual(self.page.evaluate('LatchFS.installedPrograms().filter(x=>x.id==="nornlab").length'),0)
  self.page.locator('#start-button').click()
  self.page.locator('#start-items [data-app="site:postbox"]').click()
  self.assertEqual(self.page.locator('.ln-mail-table .ln-message-link').count(),4)
  self.page.locator('.ln-message-link').first.click()
  self.assertIn('NWLAB03.torrent',self.page.locator('.ln-attachment').inner_text())
  self.assertFalse(self.errors,f'JS errors: {self.errors}')
 def test_start_mail_and_existing_profile_keep_unique_private_message(self):
  self.page.locator('#start-button').click()
  self.page.locator('#start-items [data-app="site:postbox"]').click()
  self.assertIn('www.postbox.l98',self.address())
  self.assertEqual(self.page.locator('.ln-mail-table .ln-message-link').count(),4)
  self.page.locator('[data-ln-attachment]').count() # unopened
  self.page.evaluate('LatchNet.active.navigate("http://www.pixelshelf.l98/notes")')
  self.page.locator('.window[data-id="browser"] [data-window-action="close"]').click()
  self.page.locator('#start-button').click()
  self.page.locator('#start-items [data-app="site:postbox"]').click()
  self.assertIn('www.postbox.l98',self.address())
  self.assertEqual(self.page.locator('.ln-mail-table .ln-message-link').count(),4)
  self.assertFalse(self.errors,f'JS errors: {self.errors}')
if __name__=='__main__':unittest.main(verbosity=2)
