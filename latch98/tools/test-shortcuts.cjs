const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=fs.readFileSync('web/filesystem.js','utf8'),store=new Map();
const ctx={window:{},document:{dispatchEvent(){}},CustomEvent:class{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({ok:false,status:404,headers:{get:()=>null}}),console};
vm.runInNewContext(text,ctx);
(async()=>{
 const d=ctx.window.LatchFS;await d.ready;
 const file=d.write('C:/MY DOCUMENTS/LETTER.TXT','Hello');
 assert.equal(d.createShortcut('C:/WINDOWS/DESKTOP','Letter.lnk',file),'C:/WINDOWS/DESKTOP/LETTER.LNK');
 assert.equal(d.get('C:/WINDOWS/DESKTOP/LETTER.LNK').target,file);
 d.createShortcut('C:/WINDOWS/DESKTOP','Solitaire.lnk','solitaire');
 assert.equal(d.get('C:/WINDOWS/DESKTOP/SOLITAIRE.LNK').target,'solitaire');
 assert.throws(()=>d.createShortcut('C:/WINDOWS/DESKTOP','Bad.lnk','C:/MISSING.TXT'),/not found/);
 assert.throws(()=>d.createShortcut('C:/WINDOWS/DESKTOP','Bad.lnk','javascript:alert(1)'),/target/);
 assert.throws(()=>d.createShortcut('C:/WINDOWS/DESKTOP','Bad.lnk','C:/WINDOWS/DESKTOP/LETTER.LNK'),/another shortcut/);
 const next=d.export();d.importDisk(next);assert.equal(d.get('C:/WINDOWS/DESKTOP/LETTER.LNK').target,file);
 console.log('PASS: desktop app and document shortcuts, invalid targets, persistence.');
})().catch(e=>{console.error(e);process.exitCode=1});
