#!/usr/bin/env python3
"""Build one self-contained Latch 98 HTML file from modular sources.

Bundled games: Norn World Lab Step32, Solitaire, Minesweeper preview.
For offline Bloodline, supply the authoritative game/bloodline.html with --bloodline.
No fake installation state is inserted; installation remains LatchFS-driven.
"""
from pathlib import Path
import argparse,base64,re,html
root=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser()
ap.add_argument('output',nargs='?',default=str(root.parent/'Latch98-Standalone-Step32-AllGames.html'))
ap.add_argument('--bloodline',help='Path to the original complete Bloodline game HTML')
a=ap.parse_args()
def read(p):return (root/p).read_text(encoding='utf-8')
def payload(name,s):
    return f'\n<script type="text/plain" id="l98-packed-{name}">'+base64.b64encode(s.encode()).decode()+'</script>\n'
def css_inline(text):return '<style>\n'+text.replace('</style','<\\/style')+'\n</style>'
def script_inline(text):return '<script>\n'+text.replace('</script','<\\/script')+'\n</script>'
source=read('web/index.html')
csses=['desktop.css','shell_v07.css','explorer_v08.css','swarmwire.css','latchnet.css']
for f in csses:
    source=source.replace(f'<link rel="stylesheet" href="{f}">',css_inline(read('web/'+f)))
solitaire=read('apps/solitaire/solitaire.html')
solitaire=solitaire.replace('<link rel="stylesheet" href="solitaire.css">',css_inline(read('apps/solitaire/solitaire.css')))
solitaire=solitaire.replace('<script src="engine.js"></script>',script_inline(read('apps/solitaire/engine.js')))
solitaire=solitaire.replace('<script src="app.js"></script>',script_inline(read('apps/solitaire/app.js')))
minesweeper=read('apps/minesweeper/latch98-minesweeper-preview.html')
norn=read('apps/norn-world-lab/index.html')
packed='\n'.join([payload('norn',norn),payload('solitaire',solitaire),payload('minesweeper',minesweeper)])
for app in ('wilds','catacombs','weedwarrior','soundstudio','audacity','spritestudio','latchamp'):
    packed+=payload(app,read('apps/'+('sprite-studio' if app=='spritestudio' else app)+'/index.html'))
bloodline_path=Path(a.bloodline) if a.bloodline else (root/'apps/bloodline/bloodline.html')
if bloodline_path.exists():
    bloodline=bloodline_path.read_text(encoding='utf-8')
    packed+=payload('bloodline',bloodline)
# Uncompressed support code is inserted once; compressed payloads are lazy-decoded.
source=source.replace('<script src="latchnet.js"></script>',packed+'\n'+script_inline(read('web/latchnet.js')))
source=source.replace('<script src="filesystem.js"></script>',script_inline(read('web/filesystem.js')))
source=source.replace('<script src="latch-media.js"></script>',script_inline(read('web/latch-media.js')))
source=source.replace('<script src="latch-media-backup.js"></script>',script_inline(read('web/latch-media-backup.js')))
source=source.replace('<script src="swarmwire.js"></script>',script_inline(read('web/swarmwire.js')))
source=source.replace('<script src="latch-update.js"></script>',script_inline(read('web/latch-update.js')))
source=source.replace('<script src="latch-audio.js"></script>',script_inline(read('web/latch-audio.js')))
source=source.replace('<script src="desktop.js"></script>',script_inline(read('web/standalone_runtime.js'))+'''\n<script>
window.LATCH98_SOLITAIRE_B64=document.getElementById('l98-packed-solitaire').textContent.trim();
window.LATCH98_MINESWEEPER_PREVIEW_B64=document.getElementById('l98-packed-minesweeper').textContent.trim();
</script>\n'''+script_inline(read('web/desktop.js')))
source=source.replace('<button class="boot-trigger" id="boot-button">', '<label class="l98-fullscreen-choice" for="boot-fullscreen"><input id="boot-fullscreen" type="checkbox" checked> Start in fullscreen</label>\n    <button class="boot-trigger" id="boot-button">',1)
source=source.replace('<section id="poweroff"', '''<section id="l98-standalone-game" class="hidden" aria-label="Bloodline full screen game">
  <iframe title="Bloodline" allow="fullscreen; gamepad" allowfullscreen></iframe>
  <div class="l98-full-setup hidden"></div>
  <button type="button" class="l98-return" data-l98-exit-game title="Return to Latch 98 (Ctrl+Shift+Esc; controller Back + Start)" aria-label="Close Bloodline and return to Latch 98"><span aria-hidden="true">×</span><span class="l98-return-label">Return to Latch 98</span></button>
</section>
<section id="poweroff"''',1)
source=source.replace('</head>', '''<style>
.l98-fullscreen-choice{position:absolute;bottom:104px;left:10%;font:bold 12px Tahoma,Arial,sans-serif;display:flex;align-items:center;gap:7px;color:#174257;cursor:pointer;z-index:2}
.l98-fullscreen-choice input{width:16px;height:16px;accent-color:#003c88}
@media(max-height:470px){.l98-fullscreen-choice{bottom:75px}}
@media(max-width:650px){.l98-fullscreen-choice{left:7%}}
#l98-standalone-game{position:fixed;inset:0;z-index:9000;background:#000;color:#fff}
#l98-standalone-game iframe{width:100%;height:100%;border:0;display:block;background:#000}
#l98-standalone-game .l98-full-setup{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:#151114}
.l98-import-game{font:14px/1.55 Tahoma,Arial,sans-serif;max-width:530px;background:#c0c0c0;color:#000;padding:22px;border:3px outset white;box-shadow:4px 5px #333}
.l98-import-game h2{font-size:18px}.l98-import-game .l98-import-label{display:inline-block;cursor:pointer;margin:8px}
.l98-import-game .l98-online-game{cursor:pointer;margin:8px}.l98-import-status{color:#670000;min-height:22px}
/* A persistent close control is needed because keyboard/gamepad exits aren't discoverable on touch. */
#l98-standalone-game .l98-return{
  position:absolute;z-index:3;right:max(8px,env(safe-area-inset-right));
  top:max(8px,env(safe-area-inset-top));
  display:flex;align-items:center;gap:7px;min-height:36px;
  padding:5px 11px;border:1px solid #858585;border-radius:5px;
  background:rgba(14,14,16,.88);color:#fff;cursor:pointer;
  font:600 12px/1.2 Tahoma,Arial,sans-serif;opacity:1;
  box-shadow:0 1px 5px #0009;touch-action:manipulation;
}
#l98-standalone-game .l98-return span:first-child{font-size:20px;line-height:16px}
#l98-standalone-game .l98-return:hover,#l98-standalone-game .l98-return:focus-visible{
  background:#33343b;outline:2px solid #fff;outline-offset:1px;
}
@media(max-width:530px){#l98-standalone-game .l98-return{min-height:36px;padding:4px 7px}}
@media(max-width:320px){#l98-standalone-game .l98-return-label{display:none}}

</style></head>''',1)
if re.search(r'<(?:link|script)\s[^>]*(?:src|href)="(?!data:|https?:|#)[^"]+',source):
    raise RuntimeError('Unbundled local script or stylesheet found')
assert 'nornlab' in source and 'l98-packed-norn' in source and 'boot-fullscreen' in source
out=Path(a.output);out.parent.mkdir(exist_ok=True,parents=True);out.write_text(source,encoding='utf-8')
print(f'Created {out} ({out.stat().st_size:,} bytes)')
