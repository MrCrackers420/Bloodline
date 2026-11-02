"""Round 4 LatchNet regression: Chromium DOM interactions, no web server/CDN.

Run: python tests/round4/latchnet/test_browser.py
Chromium network navigation is administrator-blocked in the runner; browser
executes the actual JS/CSS via page.set_content / add_script_tag.
"""
from pathlib import Path
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[3]
JS=(ROOT/'web/latchnet.js').read_text()
CSS=(ROOT/'web/latchnet.css').read_text()
MOCK_STORAGE='''(()=>{const content=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{
 getItem(k){return content.has(k)?content.get(k):null},
 setItem(k,v){if(window.__quotaFail)throw new DOMException('Quota exceeded','QuotaExceededError');content.set(String(k),String(v))},
 removeItem(k){content.delete(k)},clear(){content.clear()},get length(){return content.size},key(i){return [...content.keys()][i]||null}
 }});window.__stored=content;window.__opened=[];window.__attachments=[];})()'''

class LatchNetBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.context=self.browser.new_context(viewport={'width':1160,'height':750})
  self.page=self.context.new_page();self.page.set_default_timeout(2600)
  self.page.set_content('<!doctype html><html><head></head><body><div id="host" style="height:620px;width:100%;"></div></body></html>')
  self.page.add_style_tag(content=CSS)
  self.page.evaluate(MOCK_STORAGE)
  self.page.add_script_tag(content=JS)
  self.page.evaluate('window.current=LatchNet.mount(document.querySelector("#host"),{openApp:(app)=>window.__opened.push(app),saveAttachment:(action)=>window.__attachments.push(action)})')
 def tearDown(self):self.context.close()
 def nav(self,url):self.page.evaluate('(url)=>LatchNet.active.navigate(url)',url)
 def current(self):return self.page.locator('#ln-location').input_value()
 def test_private_message_search_and_attachment_are_real_callbacks(self):
  self.nav('http://www.postbox.l98/')
  rows=self.page.locator('.ln-mail-table tr')
  self.assertEqual(rows.count(),5) # header plus four immutable messages
  self.page.get_by_role('link',name='Open message from m.vale@relay.l98: that program I told you about').click()
  self.assertIn('?message=lab',self.current())
  self.assertIn('Oct 15, 2003',self.page.locator('.ln-message').inner_text())
  self.assertIn('NWLAB03.torrent',self.page.locator('.ln-attachment').inner_text())
  self.page.locator('[data-ln-attachment="save"]').click()
  self.page.locator('[data-ln-attachment="open"]').click()
  self.assertEqual(self.page.evaluate('window.__attachments'),['save','open'])
  self.assertEqual(self.page.evaluate('document.querySelectorAll("[data-ln-attachment]").length'),2)
  self.assertEqual(self.page.evaluate('document.querySelectorAll("[data-ln-app=swarmwire]").length'),0)
 def test_mail_filters_preserved_on_back_and_outbox(self):
  self.nav('http://www.postbox.l98/')
  self.page.locator('#ln-mail-search [name=query]').fill('vale')
  self.page.locator('#ln-mail-search button').click()
  self.assertIn('q=vale',self.current());self.assertEqual(self.page.locator('.ln-mail-table tr').count(),2)
  self.page.locator('.ln-message-link').click()
  self.assertIn('q=vale',self.current())
  self.page.locator('[data-ln-mail-back]').click()
  self.assertIn('q=vale',self.current());self.assertEqual(self.page.locator('.ln-mail-table tr').count(),2)
  self.page.get_by_role('link',name='Outbox').first.click()
  self.page.locator('summary').click()
  self.page.locator('input[name=to]').fill('friend@example.l98')
  self.page.locator('input[name=subject]').fill('My test message')
  self.page.locator('textarea[name=body]').fill('A second line and <tag>')
  self.page.get_by_role('button',name='Save to Outbox').click()
  self.assertIn('out=0',self.current())
  self.page.locator('[data-ln-mail-folder]').click()
  self.assertIn('folder=outbox',self.current());self.assertEqual(self.page.locator('.ln-mail-table tr').count(),2)
 def test_anchor_history_focus_keyboard_and_branch(self):
  self.nav('http://www.pixelshelf.l98/')
  self.page.get_by_role('link',name='Utilities',exact=True).click()
  self.assertIn('#utilities',self.current())
  self.page.locator('[data-ln-control=back]').click()
  self.assertEqual(self.current(),'http://www.pixelshelf.l98/')
  self.page.locator('[data-ln-control=forward]').click()
  self.assertIn('#utilities',self.current())
  self.page.locator('[data-ln-control=back]').click()
  self.page.get_by_role('link',name='2003 Notes').click()
  self.assertIn('/notes',self.current())
  self.assertTrue(self.page.locator('.ln-viewport').evaluate('(el)=>document.activeElement===el'))
  self.page.locator('[data-ln-control=reload]').click()
  self.assertIn('/notes',self.current())
  self.assertTrue(self.page.locator('[data-ln-control=forward]').is_disabled())
  self.page.keyboard.press('Alt+ArrowLeft')
  self.assertEqual(self.current(),'http://www.pixelshelf.l98/')
  self.page.keyboard.press('Alt+ArrowRight')
  self.assertIn('/notes',self.current())
 def test_bookmarks_and_history_survive_browser_reopen(self):
  self.nav('http://www.lanternhouse.l98/radio-log')
  self.page.get_by_role('button',name='Favorites').click()
  self.page.get_by_role('button',name='Add the last page I visited').click()
  self.assertIn('radio-log',self.page.locator('.ln-viewport').inner_text())
  self.page.evaluate('LatchNet.active.destroy();window.current=LatchNet.mount(document.querySelector("#host"),{})')
  self.assertIn('favorites',self.current())
  self.page.locator('.ln-viewport a[data-ln-url*="radio-log"]').click()
  self.assertIn('radio-log',self.current())
  self.page.locator('[data-ln-control=back]').click()
  self.assertIn('favorites',self.current())
 def test_storage_failure_keeps_entry_and_mail(self):
  self.nav('http://www.asterpage.l98/')
  self.page.locator('[name=name]').fill('saver')
  self.page.locator('[name=message]').fill('Do not lose me')
  self.page.evaluate('window.__quotaFail=true')
  self.page.get_by_role('button',name='Sign!').click()
  self.assertEqual(self.page.locator('[name=message]').input_value(),'Do not lose me')
  self.assertIn('Not saved',self.page.locator('[data-ln-status]').inner_text())
  self.page.evaluate('window.__quotaFail=false')
  self.page.get_by_role('button',name='Sign!').click()
  self.assertIn('Do not lose me',self.page.locator('#ln-guestbook-list').inner_text())
 def test_html_is_escaped_in_guestbook_mail_query_and_favorites(self):
  self.nav('http://www.asterpage.l98/')
  self.page.locator('[name=name]').fill('<svg onload=alert(1)>')
  self.page.locator('[name=message]').fill('<img src=x onerror=alert(2)>')
  self.page.get_by_role('button',name='Sign!').click()
  self.assertIn('<img src=x',self.page.locator('#ln-guestbook-list').inner_text())
  self.assertEqual(self.page.locator('#ln-guestbook-list img, #ln-guestbook-list svg').count(),0)
  self.nav('http://www.postbox.l98/?q=%22%3E%3Cimg%3E')
  self.assertEqual(self.page.locator('.ln-mail-search img').count(),0)
  self.nav('http://www.postbox.l98/?folder=outbox')
  self.page.locator('summary').click()
  self.page.locator('input[name=to]').fill('"<b>@example.l98')
  self.page.locator('input[name=subject]').fill('<script>alert(1)</script>')
  self.page.locator('textarea[name=body]').fill('<img src=x onerror=alert(1)>')
  self.page.get_by_role('button',name='Save to Outbox').click()
  self.assertEqual(self.page.locator('.ln-message script, .ln-message img').count(),0)
 def test_crawl_all_internal_links_and_new_pages(self):
  seeds=list(self.page.evaluate('Object.values(LatchNet.addresses)'))
  seen=set();queue=seeds[:];broken=[];external=[]
  while queue and len(seen)<80:
   url=queue.pop(0)
   if url in seen:continue
   seen.add(url);self.nav(url)
   if self.page.locator('.ln-viewport h1:has-text("404"), .ln-viewport h1:has-text("Page not found")').count():broken.append(url)
   links=self.page.locator('.ln-viewport a[data-ln-url]').evaluate_all('(xs)=>xs.map(x=>x.dataset.lnUrl)')
   for link in links:
    if '.l98/' not in link:external.append(link)
    elif link not in seen and link not in queue:queue.append(link)
  self.assertFalse(broken,f'Broken links: {broken}')
  self.assertFalse(external,f'External links: {external}')
  self.assertGreaterEqual(len(seen),30)
  self.assertTrue(any('notes/sprites' in s for s in seen))
  print(f'LINK_CRAWL: {len(seen)} reachable routes; no 404 or external link')
 def test_mobile_mail_layout_focus_tab_and_torrent(self):
  self.page.set_viewport_size({'width':390,'height':750})
  self.nav('http://www.postbox.l98/')
  self.assertLessEqual(self.page.locator('.ln-mail-table').evaluate('(el)=>el.scrollWidth'),self.page.locator('.ln-viewport').evaluate('(el)=>el.clientWidth'))
  self.page.locator('.ln-viewport').focus()
  self.page.keyboard.press('Tab')
  self.assertNotEqual(self.page.evaluate('document.activeElement.tagName'),'BODY')
  self.page.get_by_role('link',name='Open message from m.vale@relay.l98: that program I told you about').click()
  self.assertTrue(self.page.locator('.ln-attachment [data-ln-attachment=open]').is_visible())
  self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),390)
 def test_2003_persistence_immutability_across_remount(self):
  self.nav('http://www.postbox.l98/')
  self.assertEqual(self.page.locator('.ln-mail-table .ln-message-link').count(),4)
  for _ in range(3):
   self.page.evaluate('LatchNet.active.destroy();window.current=LatchNet.mount(document.querySelector("#host"),{})')
   self.nav('http://www.postbox.l98/')
   self.assertEqual(self.page.locator('.ln-mail-table .ln-message-link').count(),4)
  self.assertIn('Oct 15, 2003',self.page.locator('.ln-mail-table').inner_text())
  self.assertIn('m.vale@relay.l98',self.page.locator('.ln-mail-table').inner_text())

if __name__=='__main__':unittest.main(verbosity=2)
