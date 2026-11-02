/* Run from repository root: node tests/round4/disk/fault-matrix.test.cjs */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('web/filesystem.js','utf8');
const KEY='latch98.virtual_disk.v1';
function storage(){
 const records=new Map();const state={reject:false,quota:Infinity};
 return {records,state,getItem:k=>records.get(k)??null,setItem(k,v){if(state.reject||v.length>state.quota)throw Error('QuotaExceededError');records.set(k,v);}};
}
async function load(store,backend){
 const window={};const dispatched=[];
 const context={window,document:{dispatchEvent(e){dispatched.push(e.type);}},CustomEvent:class{constructor(type){this.type=type;}},localStorage:store,
 fetch:backend|| (async()=>({ok:false,status:404,headers:{get:()=>null}})),console};
 vm.runInNewContext(code,context);await window.LatchFS.ready;
 return {disk:window.LatchFS,events:dispatched};
}
function backupEdit(d,cb){const a=JSON.parse(d.export());cb(a);return JSON.stringify(a);}
async function main(){
 let checks=0;const ok=()=>checks++;
 const store=storage();let {disk:d}=await load(store);
 assert(!d.installedPrograms().some(x=>x.id==='nornlab'));
 assert.equal(d.nornTransfer(),null);ok(); // blank drive, no shortcut
 d.mkdir('C:/MY DOCUMENTS','Lab Notes');d.write('C:/MY DOCUMENTS/LAB NOTES/My Work.txt','valuable');
 const savedNode=d.get('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),savedBackup=d.export();
 const restored=JSON.parse(savedBackup);
 assert.equal(restored.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].modified,savedNode.modified);
 d.write('C:/MY DOCUMENTS/LAB NOTES/My Work.txt','changed');d.importDisk(savedBackup);
 assert.equal(d.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'valuable');
 assert.equal(d.get('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT').modified,savedNode.modified);ok();
 const snapshot=store.getItem(KEY);
 for(const malformed of [
  '{bad', '{}','[]', JSON.stringify({version:1,nodes:[]}),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/../X']={kind:'text',name:'X',parent:'C:/MY DOCUMENTS',data:'bad'}),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].modified='yesterday'),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].displaySize=-1),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].constructor='bad'),
  backupEdit(d,a=>a.nodes['c:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT']={...a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT']}),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].parent='C:/DOWNLOADS'),
  backupEdit(d,a=>a.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].name='Trick.txt'),
  backupEdit(d,a=>a.cdrom={mounted:'C:/DOWNLOADS/NOT-THERE.ISO'})
 ]){
  assert.throws(()=>d.importDisk(malformed),/backup|invalid|Invalid|Corrupt|disk|path|name|metadata|image|entries|size|time|CD-ROM|file|drive|corrupt|mount/i);
  assert.equal(store.getItem(KEY),snapshot);
  assert.equal(d.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'valuable');
 }ok();
 // A failed overwrite is never published to the live object or localStorage.
 store.state.reject=true;assert.throws(()=>d.write('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT','lost'),/quota/i);
 assert.equal(d.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'valuable');
 assert.equal(store.getItem(KEY),snapshot);
 assert.throws(()=>d.mkdir('C:/MY DOCUMENTS','Unsaved'),/quota/i);
 assert.equal(d.get('C:/MY DOCUMENTS/UNSAVED'),null);
 assert.throws(()=>d.importDisk(savedBackup),/quota/i);
 assert.equal(store.getItem(KEY),snapshot);
 store.state.reject=false;ok();
 // Tiny browser quota, independent of virtual disk size.
 store.state.quota=snapshot.length+4;
 assert.throws(()=>d.write('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT','different/newer'),/quota/i);
 assert.equal(store.getItem(KEY),snapshot);
 store.state.quota=Infinity;ok();
 // Concurrent windows: two different valid changes made from one revision.
 const beforeReopen=store.getItem(KEY);
 const b=(await load(store)).disk;
 assert.equal(store.getItem(KEY),beforeReopen,'read-only reload should not bump a revision');
 d.write('C:/MY DOCUMENTS/LAB NOTES/A.txt','first window');
 assert.throws(()=>b.write('C:/MY DOCUMENTS/LAB NOTES/B.txt','stale window'),/another window or tab/);
 assert(!d.get('C:/MY DOCUMENTS/LAB NOTES/B.txt'));
 assert(!b.get('C:/MY DOCUMENTS/LAB NOTES/B.txt'));
 assert.equal(b.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'valuable');
 assert(b.reloadFromStorage());assert.equal(b.read('C:/MY DOCUMENTS/LAB NOTES/A.txt'),'first window');
 assert.equal(b.get('C:/MY DOCUMENTS/LAB NOTES/A.txt').data,'first window');
 b.write('C:/MY DOCUMENTS/LAB NOTES/B.txt','after refresh');
 assert.throws(()=>d.write('C:/MY DOCUMENTS/LAB NOTES/C.txt','stale again'),/another window or tab/);ok();
 // Cross-tab imports with same revision still conflict (exact byte comparison).
 d.reloadFromStorage();const oldRevision=JSON.parse(store.getItem(KEY)).revision;
 const replacement=JSON.parse(d.export());replacement.nodes['C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'].data='different bytes';replacement.revision=oldRevision;
 store.setItem(KEY,JSON.stringify(replacement));
 assert.throws(()=>d.write('C:/MY DOCUMENTS/LAB NOTES/D.txt','must not replace'),/another window or tab/);
 d.reloadFromStorage();assert.equal(d.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'different bytes');ok();
 // File operations still work with fullscreen host state flagged. No fake pausing.
 d.write('C:/MY DOCUMENTS/LAB NOTES/Background.txt','continued');ok();
 // Old pre-R3 metadata: keep personal work, installed program, mounted media.
 d.switchMedia('utilities');d.installSoftware('charmap');d.switchMedia('original');
 const torr=d.saveNornTorrent();d.setNornTransfer(torr,62.5,'Stopped');
 const old=JSON.parse(d.export());delete old.swarmwire;delete old.preinstalledSpriteStudio;
 const priorStore=storage();priorStore.setItem(KEY,JSON.stringify(old));
 const legacy=(await load(priorStore)).disk;
 assert.equal(legacy.read('C:/MY DOCUMENTS/LAB NOTES/Background.txt'),'continued');
 assert(legacy.installedPrograms().some(i=>i.id==='charmap'));
 assert.equal(legacy.mediaInfo().mounted,'original');
 assert.equal(legacy.get('C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/LATCH SPRITE STUDIO.LNK').kind,'shortcut');ok();
 // Damage on boot is not overwritten and raw bytes remain retrievable.
 const corrupt=storage(),raw='{TRUNCATED';corrupt.setItem(KEY,raw);
 const damaged=(await load(corrupt)).disk;
 assert.equal(corrupt.getItem(KEY),raw);assert.equal(damaged.recoveryRaw(),raw);
 assert.throws(()=>damaged.write('C:/MY DOCUMENTS/Unsaved.txt','x'),/damaged/);
 damaged.importDisk(savedBackup);
 assert.equal(damaged.recoveryRaw(),null);
 assert.equal(damaged.read('C:/MY DOCUMENTS/LAB NOTES/MY WORK.TXT'),'valuable');ok();
 // Conflict with protected media, traversal, duplicate case, unexpected paths.
 assert.throws(()=>d.write('D:/STOWAWAY.TXT','x'),/read-only/);
 d.switchMedia('utilities');assert.throws(()=>d.write('A:/STOWAWAY.TXT','x'),/write-protected/);
 assert.throws(()=>d.mkdir('C:/MY DOCUMENTS','..'),/Invalid/);
 assert.throws(()=>d.write('C:/MY DOCUMENTS/../FAIL.TXT','x'),/Invalid/);
 d.reloadFromStorage();assert.throws(()=>d.mkdir('C:/MY DOCUMENTS','Lab Notes'),/already exists/);ok();
 // Actual virtual disk full, not an arbitrary browser quota increase.
 const fullStore=storage(),full=(await load(fullStore)).disk;
 let fullErr=null;for(let i=0;i<22;i++){
  try{full.write(`C:/DOWNLOADS/FILL${i}.TXT`,'a'.repeat(125000));}catch(e){fullErr=e;break;}
 }
 assert.match(String(fullErr),/full/);
 const kept=JSON.parse(fullStore.getItem(KEY));
 assert.equal(Object.keys(kept.nodes).filter(x=>x.includes('/FILL')).length,Object.keys(JSON.parse(full.export()).nodes).filter(x=>x.includes('/FILL')).length);ok();
 // Interrupted progress and old-format transfer field migration.
 let jobStore=storage(),j=(await load(jobStore)).disk;
 const tp=j.saveNornTorrent();j.setNornTransfer(tp,76.5,'Downloading');
 j=(await load(jobStore)).disk;assert.equal(j.nornTransfer().percent,76.5);
 j.setNornTransfer(tp,76.5,'Stopped');assert.throws(()=>j.downloadNornDisc(tp),/finish/);
 j.setNornTransfer(tp,100,'Downloading');const iso=j.downloadNornDisc(tp);j.mountDisc(iso);j.installSoftware('nornlab');
 const end=j.export();j=(await load(jobStore)).disk;
 assert.equal(j.discInfo().mounted,'C:/DOWNLOADS/NORNWORLDLAB.ISO');
 assert(j.installedPrograms().some(x=>x.id==='nornlab'));
 assert.equal(j.nornTransfer().state,'Finished');
 j.importDisk(end);assert.equal(j.nornTransfer().state,'Finished');
 assert.throws(()=>j.installSoftware('nornlab'),/already installed/);ok();
 // Rust rejected POST: browser mirror remains canonical recovery point, sync exposes failure.
 const serverStore=storage(),posted=[];let rejectPost=true;
 const host=async(url,opt={})=>opt.method==='POST'?(posted.push(opt.body),rejectPost?{ok:false,status:507}:{ok:true,status:200}):{ok:false,status:404,headers:{get:name=>name==='x-latch-backend'?'rust':null}};
 const hosted=(await load(serverStore,host)).disk;
 hosted.write('C:/MY DOCUMENTS/Host.txt','survives');
 await assert.rejects(hosted.sync(),/Rust disk save failed/);
 assert.equal((await load(serverStore)).disk.read('C:/MY DOCUMENTS/Host.txt'),'survives');
 rejectPost=false;hosted.write('C:/MY DOCUMENTS/Host.txt','recovered');await hosted.sync();
 assert.equal(JSON.parse(posted.at(-1)).nodes['C:/MY DOCUMENTS/HOST.TXT'].data,'recovered');ok();
 console.log(`PASS: ${checks} disk fault matrix groups (blank, import, times, corrupt, quota, concurrency, old profile, media, ISO, interrupted transfer, Rust host)`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
