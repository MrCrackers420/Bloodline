#!/usr/bin/env python3
"""Use an actual Chromium IndexedDB store across browser process restarts.
Tests lossless complete backup, cross-device restore, corruption rejection and
metadata-only import behavior using generated, non-copyrighted WAV bytes.
"""
import asyncio, http.server, json, multiprocessing, os, pathlib, tempfile, time, base64, socketserver
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
HOST='127.0.0.1';PORT=18983
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT/'web'),**kw)
 def log_message(self,*a): pass
class Server(socketserver.ThreadingTCPServer): allow_reuse_address=True

def serve():
 with Server((HOST,PORT),Handler) as s:s.serve_forever()

async def launch(p,profile):
 ctx=await p.chromium.launch_persistent_context(profile,headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=ctx.pages[0] if ctx.pages else await ctx.new_page()
 # Minimal stable harness: avoid booting games, but use production scripts and same HTTP origin.
 await page.goto(f'http://{HOST}:{PORT}/index.html',wait_until='domcontentloaded')
 await page.evaluate('()=>window.LatchFS.ready')
 await page.wait_for_function('!!window.LatchMediaBackup')
 return ctx,page

async def main():
 process=multiprocessing.Process(target=serve,daemon=True);process.start();await asyncio.sleep(0.7)
 try:
  async with async_playwright() as p:
   with tempfile.TemporaryDirectory(prefix='l98-idb-a-') as profileA,tempfile.TemporaryDirectory(prefix='l98-idb-b-') as profileB:
    ctx,page=await launch(p,profileA)
    src=await page.evaluate('''async()=>{
      const r=new Uint8Array(44+32);const d=new DataView(r.buffer);r.set(new TextEncoder().encode('RIFF'),0);d.setUint32(4,68,true);r.set(new TextEncoder().encode('WAVEfmt '),8);d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,8000,true);d.setUint32(28,16000,true);d.setUint16(32,2,true);d.setUint16(34,16,true);r.set(new TextEncoder().encode('data'),36);d.setUint32(40,32,true);
      for(let i=44;i<r.length;i++)r[i]=i;
      const file=new File([r],'backup-test.wav',{type:'audio/wav'});
      const path=await LatchMedia.importFile(file);
      const link=LatchFS.makeMediaLink('C:/My Documents/My Music','Online.l98music','https://www.youtube.com/watch?v=jfKfPfyJRdk','Radio');
      LatchFS.makeMediaPlaylist('C:/My Documents/My Music','Both.l98mix',[{type:'local',mediaId:LatchFS.get(path).mediaId,title:'Test'},{type:'youtube',url:LatchFS.get(link).url,title:'Radio'}]);
      return {path,id:LatchFS.get(path).mediaId,expected: Array.from(r)};
    }''')
    await ctx.close()
    ctx,page=await launch(p,profileA) # new Chromium process, same profile
    got=await page.evaluate('''async p=>({
      kind: LatchFS.get(p.path)?.kind,
      bytes: Array.from(new Uint8Array(await (await LatchMedia.blobFor(p.id)).arrayBuffer())),
      fileCount: LatchFS.mediaFiles().length
    })''',src)
    assert got['kind']=='media-local' and got['bytes']==src['expected'], f'IndexedDB not durable across new browser process: {got}'
    b64=await page.evaluate('''async()=>{
       const b=await LatchMediaBackup.exportBundle();
       return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(b)});
    }''')
    assert len(b64)>100
    # importing a corrupt backup must not alter either metadata or bytes
    before=await page.evaluate('LatchFS.export()')
    error=await page.evaluate('''async b64=>{
       const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));bytes[bytes.length-1]^=255;
       try{await LatchMediaBackup.restoreBundle(new File([bytes],'bad.l98backup'));return 'unexpected success';}catch(e){return e.message;}
    }''',b64)
    assert 'corrupt' in error.lower() and before==await page.evaluate('LatchFS.export()'),error
    await ctx.close()
    ctx2,page2=await launch(p,profileB)
    before=await page2.evaluate('LatchFS.mediaFiles().length')
    assert before==0,before
    restored=await page2.evaluate('''async b64=>{
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      return await LatchMediaBackup.restoreBundle(new File([bytes],'test.l98backup',{type:'application/octet-stream'}));
    }''',b64)
    same=await page2.evaluate('''async p=>({
      bytes:Array.from(new Uint8Array(await (await LatchMedia.blobFor(p.id)).arrayBuffer())),
      entries: LatchFS.mediaFiles().length,
      playlist: LatchFS.get('C:/My Documents/My Music/Both.l98mix')?.kind
    })''',src)
    assert same['bytes']==src['expected'] and same['entries']==3 and same['playlist']=='media-playlist',same
    await ctx2.close()
    ctx2,page2=await launch(p,profileB)
    assert await page2.evaluate('''async id=>Array.from(new Uint8Array(await (await LatchMedia.blobFor(id)).arrayBuffer())).length''',src['id'])==len(src['expected'])
    await ctx2.close()
    print('PASS real Chromium: IndexedDB survives restart; complete binary backup restores on another profile; playlist+link retained; tampering rejected; second restart persists')
 except:
  raise
 finally:
  process.terminate();process.join(timeout=5)

if __name__=='__main__': asyncio.run(main())
