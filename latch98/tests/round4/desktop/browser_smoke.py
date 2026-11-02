#!/usr/bin/env python3
"""Optional real-Chromium smoke test. No remote sites or game content edits.
Run on a computer where local page navigation is permitted:
  python tests/round4/desktop/browser_smoke.py
Uses project-local /web/index.html and its existing apps; does not build releases.
"""
from __future__ import annotations
import asyncio
import contextlib
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[3]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

async def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, executable_path=shutil.which('chromium') or None, args=['--no-sandbox'])
            try:
                page = await browser.new_page(viewport={'width': 1250, 'height': 850}, reduced_motion='reduce')
                await page.goto(f'http://127.0.0.1:{server.server_port}/web/index.html', wait_until='domcontentloaded')
                await page.click('#boot-button')
                await page.locator('#desktop:not(.hidden)').wait_for(timeout=8000)
                original_url = page.url
                async def measure(label):
                    beginning = await page.evaluate('window.LatchGamePerformance.stats()')
                    await page.wait_for_timeout(3000)
                    end = await page.evaluate('window.LatchGamePerformance.stats()')
                    before = beginning['jobs']['desktop-controller']['calls']
                    after = end['jobs']['desktop-controller']['calls']
                    print(label, {'shellControllerCalls': after-before,
                                  'hostCallbackMs': end['jobs']['desktop-controller']['hostMs']-beginning['jobs']['desktop-controller']['hostMs'],
                                  'fullscreen': end['active'], 'exitPollingUnchanged': True})
                    return end
                await measure('desktop idle')
                await page.evaluate('window.LatchDesktop.launchBloodlineFull()')
                await page.locator('#l98-modular-game:not(.hidden)').wait_for()
                fullscreen = await measure('Bloodline fullscreen')
                assert fullscreen['active']
                assert fullscreen['jobs']['desktop-controller']['scheduled'] is False
                assert page.url == original_url
                await page.locator('[data-l98-modular-return]').click()
                assert not await page.evaluate('window.LatchGamePerformance.isActive()')
                await page.evaluate("document.querySelector('[data-app=notepad]').click()")
                assert await page.locator('.window[data-id=notepad]').count() == 1
                await measure('returned')
                # Windowed Bloodline uses the normal shell path, not fullscreen mode.
                await page.evaluate('''() => {
                  const entry=document.createElement('div');entry.className='desktop-icon';
                  entry.dataset.app='bloodline-windowed';document.getElementById('desktop-icons').append(entry);
                  entry.click();entry.remove();
                }''')
                assert await page.locator('.window[data-id="bloodline-windowed"]').count() == 1
                windowed = await measure('Bloodline windowed')
                assert windowed['active'] is False
                # Simulated safe cooperative app and unsupported iframe policy.
                await page.evaluate('''() => {
                  window.__l98Harness = {pauses:0,resumes:0};
                  window.__l98Harness.unregister=window.LatchGamePerformance.registerCooperativeApp('test-iframe',{
                    pause:()=>{window.__l98Harness.pauses++;return Promise.resolve({paused:true})},
                    resume:()=>{window.__l98Harness.resumes++;return Promise.resolve(true)}
                  });
                }''')
                await page.evaluate('window.LatchDesktop.launchBloodlineFull()')
                await page.wait_for_timeout(100)
                assert await page.evaluate('window.LatchGamePerformance.stats().cooperative["test-iframe"]') == 'paused'
                await page.keyboard.press('Control+Shift+Escape')
                await page.wait_for_timeout(100)
                assert not await page.evaluate('window.LatchGamePerformance.isActive()')
                assert await page.evaluate('window.__l98Harness.resumes') == 1
                await page.evaluate('window.__l98Harness.unregister()')
                await page.set_viewport_size({'width': 390, 'height': 740})
                await page.evaluate('window.LatchDesktop.launchBloodlineFull()')
                assert await page.locator('[data-l98-modular-return]').is_visible()
                await page.locator('[data-l98-modular-return]').click()
                assert not await page.evaluate('window.LatchGamePerformance.isActive()')
                print('PASS browser modular+windowed/keyboard/touch-size/performance lifecycle')
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__':
    asyncio.run(run())
