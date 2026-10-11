#!/usr/bin/env python3
"""Build the installable web version of Bloodline (a PWA) from the single-file game.

  python3 build_web.py path/to/bloodline.html OUT_DIR [--build 2026-10-05.1]

Writes OUT_DIR/: index.html (the game plus install tags and an update banner), catacombs.html and wilds.html (if they sit next to the game), manifest.webmanifest, sw.js, version.json,
icons/, HOSTING.md. Upload the contents of OUT_DIR to any static host (GitHub Pages, Netlify, Cloudflare Pages). All paths are
relative, so it works at a sub-path such as https://name.github.io/bloodline/.

How updates reach players: the service worker fetches the page network-first (offline it falls back to the saved copy), and
the page compares its BUILD id with version.json every time it comes to the foreground; if they differ a small banner offers a
reload. Saves are in localStorage and never touched. Re-run this script for every release: it stamps a new build id.
"""
import json, math, os, re, shutil, sys, time

# pages that sit beside the game, and the line in each that names where Leave goes (rewritten for the web build).
# If you change one of these lines in the page, change it here too: the build asserts it is there
SIDE_PAGES = [('catacombs.html', "let home = '%s'"), ('wilds.html', "const WD_HOME_FALLBACK = '%s'")]
from PIL import Image, ImageDraw

def icon(size, maskable=False):
    bg = (21, 16, 15); crim = (199, 58, 92); crim_lt = (224, 107, 134); dark = (36, 26, 23)
    im = Image.new('RGB', (size, size), bg); d = ImageDraw.Draw(im)
    cx = cy = size / 2
    r = size * (0.27 if maskable else 0.36)                 # maskable icons keep everything inside the central 80%
    def pent(rad, rot=-90):
        return [(cx + rad * math.cos(math.radians(rot + 72 * i)), cy + rad * math.sin(math.radians(rot + 72 * i))) for i in range(5)]
    d.polygon(pent(r * 1.22), fill=(46, 22, 30))             # a soft base so the shape reads on any launcher background
    d.polygon(pent(r), fill=crim)
    d.polygon(pent(r * 0.86), fill=dark)
    d.polygon(pent(r * 0.52), fill=crim_lt)
    d.ellipse([cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2], fill=dark)
    return im

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    build = sys.argv[sys.argv.index('--build') + 1] if '--build' in sys.argv else time.strftime('%Y%m%d-%H%M')
    html = open(src, encoding='utf-8').read()
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'icons'))

    head = '''<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#15100f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Bloodline">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
</head>'''
    page = r'''<script>
/* web release: register the offline worker and offer a reload when a newer build is live */
(function(){
  if(window.top!==window || !/^https?:$/.test(location.protocol) || (window.BLOODLINE && window.BLOODLINE.release)) return;
  var BUILD='__BUILD__';
  try{ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js'); }catch(e){}
  var shown=false;
  function banner(){
    if(shown) return; shown=true;
    var b=document.createElement('div');
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:300;background:#1d1613;color:#d9c9a3;border-top:1px solid #e0b54a;padding:.6rem .8rem calc(.6rem + env(safe-area-inset-bottom,0px));display:flex;gap:.7rem;align-items:center;justify-content:center;font:.8rem/1.3 Georgia,serif;';
    b.innerHTML='<span>A new version of Bloodline is ready.</span>';
    var btn=document.createElement('button'); btn.textContent='Reload';
    btn.style.cssText='background:#e0b54a;color:#15100f;border:0;border-radius:4px;padding:.35rem .9rem;font:inherit;cursor:pointer;';
    btn.onclick=function(){ location.reload(); };
    var x=document.createElement('button'); x.textContent='Later'; x.style.cssText='background:none;color:#8f8470;border:0;font:inherit;cursor:pointer;'; x.onclick=function(){ b.remove(); };
    b.appendChild(btn); b.appendChild(x); document.body.appendChild(b);
  }
  function check(){ fetch('./version.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(v){ if(v&&v.build&&v.build!==BUILD) banner(); }).catch(function(){}); }
  check();
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  setInterval(check, 30*60*1000);
})();
</script>
</body>'''.replace('__BUILD__', build)
    assert html.count('</head>') == 1 and html.count('</body>') == 1, 'unexpected page structure'
    html = html.replace('</head>', head).replace('</body>', page)
    html = re.sub(r'<title>.*?</title>', '<title>Bloodline</title>', html, count=1)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)

    # the side pages: the Catacombs and the Wilds, next to the game (same address, so they share the saves). Each one's Leave
    # falls back to 'bloodline.html', which here is index.html, so point it at './'. They register the same worker but have no
    # update banner: players always come back to the game page, which shows the banner
    sw_reg = '''<script>
(function(){ if(window.top!==window || !/^https?:$/.test(location.protocol)) return; try{ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js'); }catch(e){} })();
</script>
</body>'''
    for name, fallback in SIDE_PAGES:
        side_src = os.path.join(os.path.dirname(os.path.abspath(src)), name)
        if not os.path.exists(side_src): continue
        side = open(side_src, encoding='utf-8').read()
        assert side.count('</head>') == 1 and side.count('</body>') == 1, 'unexpected %s page structure' % name
        assert fallback % 'bloodline.html' in side, '%s Leave fallback not found' % name
        side = side.replace(fallback % 'bloodline.html', fallback % './', 1)
        side = side.replace('</head>', head).replace('</body>', sw_reg)
        open(os.path.join(out, name), 'w', encoding='utf-8').write(side)

    json.dump({"name": "Bloodline", "short_name": "Bloodline", "description": "A war fought in blood, across two rivers.",
               "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",  # any: the installed app turns with the phone (the game has sideways layouts)
               "background_color": "#15100f", "theme_color": "#15100f",
               "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                         {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                         {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]},
              open(os.path.join(out, 'manifest.webmanifest'), 'w'), indent=2)
    json.dump({"build": build}, open(os.path.join(out, 'version.json'), 'w'))

    sw = r'''// Bloodline service worker (build __BUILD__): offline play, and fresh pages whenever the network is reachable.
const CACHE = 'bloodline-__BUILD__';
const SHELL = ['./', './index.html', './catacombs.html', './wilds.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function networkFirst(req) {                       // the page and the version file: newest when online, the saved copy offline or on a slow link
  return new Promise(resolve => {
    let done = false;
    const slow = setTimeout(() => caches.match(req, { ignoreSearch: true }).then(r => { if (r && !done) { done = true; resolve(r); } }), 4000);
    fetch(req, { cache: 'no-store' }).then(res => {
      clearTimeout(slow);
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(slow); caches.match(req, { ignoreSearch: true }).then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || /\/(index\.html|catacombs\.html|wilds\.html|version\.json)?$/.test(url.pathname) && !/\/icons\//.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));      // icons and the manifest: saved copy first
});
'''.replace('__BUILD__', build)
    open(os.path.join(out, 'sw.js'), 'w').write(sw)

    icon(192).save(os.path.join(out, 'icons', 'icon-192.png')); icon(512).save(os.path.join(out, 'icons', 'icon-512.png'))
    icon(512, True).save(os.path.join(out, 'icons', 'icon-maskable-512.png')); icon(180).save(os.path.join(out, 'icons', 'apple-touch-icon.png'))
    open(os.path.join(out, 'HOSTING.md'), 'w').write(HOSTING.replace('__BUILD__', build))
    print('built', out, 'build', build)

HOSTING = '''# Bloodline web app (build __BUILD__)

## Put it online with GitHub Pages (free, about 5 minutes, no git needed)
1. Sign in at github.com (a free account is fine). Click **New repository**. Name it `bloodline` (this name becomes part of the
   address, and saves belong to the address, so pick it once and never rename it). Choose **Public**. Create it.
2. On the new repository page click **uploading an existing file**. Drag in everything from this folder: `index.html`, `catacombs.html`, `wilds.html`,
   `manifest.webmanifest`, `sw.js`, `version.json` and the `icons` folder. Click **Commit changes**.
3. Open **Settings**, then **Pages**. Under Build and deployment choose **Deploy from a branch**, branch **main**, folder **/ (root)**,
   and Save. After a minute or two the address appears: `https://YOUR-NAME.github.io/bloodline/`.

## Share it
Send friends the address. To install:
- **iPhone (Safari):** open the link, tap Share, then Add to Home Screen. Installing matters on iPhone: Safari can clear the saves
  of a site that is only bookmarked, but not of an installed one.
- **Android (Chrome):** menu, then Install app (or Add to Home screen).
- **Windows (Edge or Chrome):** click the install icon at the right of the address bar.
It then opens full screen, works offline, and keeps its own saves. Tell friends to use **Export Save** now and then.

## Update it (every champion)
Replace the files in the repository with the new folder (Add file, Upload files, same names, commit). Players get a
"new version is ready" banner the next time they open the game, and tap Reload. Their saves are never touched.

## Notes
- The code is visible to anyone with the link, as with every web game. Only share the address with friends.
- Moving to another host or a custom domain changes the address, and saves do not follow it. Export Save, then Import Save.
'''

if __name__ == '__main__': main()
