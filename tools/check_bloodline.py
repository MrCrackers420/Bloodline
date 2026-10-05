#!/usr/bin/env python3
"""Sanity checks for bloodline.html before publishing.

1. Extracts the <script> block and runs `node --check` on it.
2. Loads the game headless (Playwright Chromium) with several saved states and confirms the "Tap anywhere" gate opens
   with no page errors. Saved states matter: a load-order bug once broke the game only for players with a saved deck.
3. Optionally (--fight N) starts challenger N from a tier-10 save and runs it briefly, reporting page errors.

4. With --audit N: counts the measurable parts of the ambition bar for challenger N (new cards, brews, relic or
   trinket, lore, and the profile's herald, intro, stories, mid-fight scene, last words). Creative quality is not
   measurable here: the audit only catches omissions.

Usage: python3 check_bloodline.py path/to/bloodline.html [--fight 9] [--audit 10]
"""
import asyncio, json, os, re, subprocess, sys, tempfile

def syntax_check(path):
    html = open(path, encoding='utf-8').read()
    blocks = [b for b in re.findall(r'<script>(.*?)</script>', html, re.S) if b.strip()]   # a web build adds a second, small block
    if not blocks:
        print('FAIL: no <script> block found'); return False
    for n, block in enumerate(blocks, 1):
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(block); js = f.name
        r = subprocess.run(['node', '--check', js], capture_output=True, text=True)
        os.unlink(js)
        if r.returncode:
            print('FAIL: syntax in script block %d\n' % n + r.stderr[:1500]); return False
    print('ok: syntax (%d script block%s)' % (len(blocks), '' if len(blocks) == 1 else 's')); return True

DECK = ['Leach', 'Ramhorn', 'Camel', 'Jackal', 'Wall', 'Cannon', 'Viper', 'Behemoth']
STATES = {
    'fresh': {},
    'veteran': {'bloodline_unlockedTier': '10', 'bloodline_challengerId': '9', 'bloodline_askel': 'spared',
                'bloodline_askelPaid': '1', 'bloodline_hadrek': 'spared', 'bloodline_trinket': 'plumb',
                'bloodline_deck': json.dumps(DECK), 'bloodline_tutorialDone': '1', 'bloodline_plumbSlot': 'Eggs',
                'bloodline_name': 'Tester'},
    'two-trinkets': {'bloodline_unlockedTier': '10', 'bloodline_trinket': '["signet","stone"]', 'bloodline_deck': json.dumps(DECK)},
    'formation': {'bloodline_unlockedTier': '10', 'bloodline_deck': json.dumps(['F:f1', 'Leach']),
                  'bloodline_formations': json.dumps([{'id': 'f1', 'a': 'Ramhorn', 'b': 'Camel', 'shape': 'behind'}])},
    'alchemy': {'bloodline_unlockedTier': '10', 'bloodline_materials': json.dumps({'ash': 9, 'brine': 9, 'bone': 9, 'ichor': 9}),
                'bloodline_brewed': json.dumps(['Transfusion']), 'bloodline_deck': json.dumps(DECK)},
}

async def load_checks(path, fight):
    from playwright.async_api import async_playwright
    url = 'file://' + os.path.abspath(path)
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, ls in STATES.items():
            pg = await b.new_page(viewport={'width': 384, 'height': 824})
            errs = []; pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
            await pg.goto(url)
            await pg.evaluate("(ls)=>{localStorage.clear(); for(const k in ls) localStorage.setItem(k, ls[k]);}", ls)
            await pg.reload(); await pg.wait_for_timeout(500)
            await pg.mouse.click(192, 500); await pg.wait_for_timeout(700)
            gated = await pg.evaluate("document.getElementById('titleOverlay').classList.contains('gate')")
            good = not gated and not errs
            ok &= good
            print(('ok' if good else 'FAIL') + f': load {name}' + ('' if good else f' (gate {"stuck" if gated else "open"}, errors {errs[:3]})'))
            await pg.close()
        if fight:
            pg = await b.new_page(viewport={'width': 384, 'height': 824})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(url)
            await pg.evaluate("(id)=>{localStorage.clear(); localStorage.setItem('bloodline_unlockedTier','99'); localStorage.setItem('bloodline_challengerId', String(id)); localStorage.setItem('bloodline_tutorialDone','1');}", fight)
            await pg.reload(); await pg.wait_for_timeout(500)
            await pg.mouse.click(192, 500); await pg.wait_for_timeout(600)
            await pg.click('#titleContinue'); await pg.wait_for_timeout(600)
            if await pg.evaluate("document.getElementById('heraldOverlay').classList.contains('show')"):
                await pg.wait_for_timeout(5500); await pg.click('#heraldContinue'); await pg.wait_for_timeout(400)
            title = await pg.evaluate("document.getElementById('introTitle').textContent")
            await pg.click('#introStart'); await pg.wait_for_timeout(15000)
            good = not errs; ok &= good
            print(('ok' if good else 'FAIL') + f': 15s of "{title}"' + ('' if good else f' errors {errs[:3]}'))
        await b.close()
    return ok

def audit(path, cid):
    html = open(path, encoding='utf-8').read()
    tier = cid + 1
    lines = [l for l in html.splitlines() if re.search(r'\{name:"[^"]+"', l) and re.search(r'unlockTier:%d\b' % tier, l)]
    brews = [l for l in lines if 'brew:{' in l]
    cards = [l for l in lines if 'brew:{' not in l]
    def block(name):
        i = html.find('const %s = [' % name)
        j = html.find('\n  ];', i)
        return html[i:j] if i >= 0 else ''
    relics = len(re.findall(r'from:%d\b' % cid, block('RELICS')))
    trinkets = len(re.findall(r'from:%d\b' % cid, block('TRINKETS')))
    lore = len(re.findall(r'need:%d\b' % tier, block('LORE')))
    i = html.find('id:%d, name:' % cid)
    if i < 0:
        print('FAIL: no challenger profile with id %d' % cid); return False
    j = html.find('\n    }', i)
    prof = html[i:j]
    champion = 'chapterEnd' in prof
    has = lambda pat: re.search(pat, prof) is not None
    checks = [
        ('3+ new cards (not counting brews)', len(cards) >= 3, '%d found: %s' % (len(cards), ', '.join(re.search(r'name:"([^"]+)"', l).group(1) for l in cards))),
        ('a brewed spell', len(brews) >= 1, '%d found' % len(brews)),
        ('a reward item (relic or trinket) or a spare/slay choice', relics + trinkets >= 1 or has(r'deathWords:') or has(r'lastWords:'), '%d relic(s), %d trinket(s)' % (relics, trinkets)),
        ('2+ lore fragments', lore >= 2, '%d found' % lore),
        ('herald (3 lines)', has(r'herald:'), ''),
        ('intro names the broken rule', has(r'intro:'), ''),
        ('win and loss stories', has(r'winStory:') and has(r'lossStory:'), ''),
        ('a mid-fight scene (rally:/phases:)', has(r'rally:') or has(r'phases:'), ''),
        ('last words and a spare/slay choice' + (' (a champion may skip)' if champion else ''), champion or (has(r'deathWords:') or has(r'lastWords:')), ''),
        ('a portrait', has(r'portrait:'), ''),
        ("a What's new entry revealed by this challenger (revealAt:%d)" % tier, re.search(r'revealAt:%d\b' % tier, block('CHANGELOG') or html[html.find('const CHANGELOG'):html.find('const ROMAN')]) is not None, ''),
    ]
    prev = len(re.findall(r'from:%d\b' % (cid - 1), block('TRINKETS')))
    if trinkets and prev:
        print('WARN: challenger %d and %d both give a trinket. Policy: trinkets go to about every second challenger.' % (cid - 1, cid))
    elif trinkets:
        print('note: this challenger gives a trinket (the previous one did not): on pace.')
    else:
        print('note: no trinket here: on pace if the previous challenger gave one.')
    ok = True
    for name, good, note in checks:
        ok &= good
        print(('ok' if good else 'MISSING') + ': ' + name + ('  [' + note + ']' if note else ''))
    print('Reminder: for each card, "this does X, which no other card does" must be true; the audit cannot judge that.')
    return ok

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    path = sys.argv[1]
    fight = int(sys.argv[sys.argv.index('--fight') + 1]) if '--fight' in sys.argv else None
    good = syntax_check(path) and asyncio.run(load_checks(path, fight))
    if '--audit' in sys.argv:
        good = audit(path, int(sys.argv[sys.argv.index('--audit') + 1])) and good
    print('ALL CHECKS PASSED' if good else 'CHECKS FAILED')
    sys.exit(0 if good else 1)
