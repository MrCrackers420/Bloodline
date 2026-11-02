/* Thread 2 integration regression. Run from project root:
   node apps/norn-world-lab/tests/test-thread2-disk.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('web/filesystem.js','utf8');
async function load(store,server=null){
 const window={};
 const fetch=server|| (async()=>({status:404,ok:false,headers:{get:()=>null}}));
 vm.runInNewContext(source,{window,document:{dispatchEvent(){}},CustomEvent:class{},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch,console});
 await window.LatchFS.ready;return window.LatchFS;
}
(async()=>{
 const store=new Map();let disk=await load(store);
 assert(!disk.installedPrograms().some(p=>p.id==='nornlab'),'Fresh Norn installation must be absent');
 assert(!disk.get('C:/DOWNLOADS/NWLAB03.TORRENT'));
 assert(!disk.get('C:/DOWNLOADS/NORNWORLDLAB.ISO'));
 assert.equal(disk.nornTransfer(),null);
 assert.throws(()=>disk.installSoftware('nornlab'),/Insert/);
 const path=disk.saveNornTorrent();
 disk.setNornTransfer(path,37.5,'Downloading');
 assert.throws(()=>disk.downloadNornDisc(path),/finish/);
 const imageWithProgress=disk.export();
 disk=await load(store);
 assert.equal(disk.nornTransfer().percent,37.5);
 assert.equal(disk.nornTransfer().state,'Downloading');
 disk.setNornTransfer(path,37.5,'Stopped');
 disk.setNornTransfer(path,100,'Downloading');
 assert.throws(()=>disk.setNornTransfer(path,100,'Finished'),/incomplete/);
 const image=disk.downloadNornDisc(path);
 disk.setNornTransfer(path,100,'Finished');
 disk.mountDisc(image);
 disk.installSoftware('nornlab');
 const finishedBackup=disk.export();
 disk=await load(store);
 assert.equal(disk.discInfo().mounted,disk.canonical(image));
 assert.equal(disk.get('D:/SETUP.EXE').program,'nornlab');
 assert(disk.installedPrograms().some(p=>p.id==='nornlab'));
 assert.equal(disk.nornTransfer().state,'Finished');
 // Progress as well as mounted CD/install survive backup/restore.
 disk.importDisk(imageWithProgress);
 assert.equal(disk.nornTransfer().percent,37.5);
 assert.equal(disk.discInfo().mounted,null);
 assert(!disk.installedPrograms().some(p=>p.id==='nornlab'));
 disk.importDisk(finishedBackup);
 assert(disk.installedPrograms().some(p=>p.id==='nornlab'));
 assert.equal(disk.discInfo().mounted,disk.canonical(image));
 assert.equal(disk.nornTransfer().state,'Finished');
 // Legacy localStorage SwarmWire job is imported once, when the old disk has a torrent.
 const oldStore=new Map(),old=await load(oldStore);old.saveNornTorrent();
 const raw=JSON.parse(old.export());delete raw.swarmwire;
 oldStore.set('latch98.virtual_disk.v1',JSON.stringify(raw));
 oldStore.set('latch98.swarmwire.v1',JSON.stringify({path,percent:45,state:'Downloading'}));
 const migrated=await load(oldStore);
 assert.equal(migrated.nornTransfer().percent,45);
 assert.equal(JSON.parse(migrated.export()).swarmwire.version,1);
 // Importing a fresh or unrelated disk never resurrects the old separate job.
 const cleanStore=new Map(),clean=await load(cleanStore);
 const freshBackup=clean.export();
 migrated.importDisk(freshBackup);
 assert.equal(migrated.nornTransfer(),null);
 migrated.saveNornTorrent();
 assert.equal(migrated.nornTransfer(),null);
 // A completed disc remains mountable if the .torrent itself is discarded.
 disk.remove(path,true);
 disk=await load(store);
 assert.equal(disk.nornTransfer().state,'Finished');
 assert.equal(disk.get(image).kind,'iso');
 // Existing files in old-style backups are kept when new metadata is initialized.
 const oldSnapshot=JSON.parse(clean.export());delete oldSnapshot.swarmwire;
 oldSnapshot.nodes['C:/MY DOCUMENTS/TEST.TXT']={kind:'text',name:'Test.txt',parent:'C:/MY DOCUMENTS',data:'saved data'};
 cleanStore.set('latch98.virtual_disk.v1',JSON.stringify(oldSnapshot));
 const compatible=await load(cleanStore);
 assert.equal(compatible.read('C:/My Documents/Test.txt'),'saved data');
 // The Rust host has an asynchronous JSON POST path; a newer browser mirror
 // must win after a fast reload instead of being overwritten by a stale server.
 const syncStore=new Map(),seed=await load(syncStore);seed.saveNornTorrent();
 const serverOld=JSON.parse(seed.export());
 seed.setNornTransfer(path,72,'Stopped');
 const localNew=JSON.parse(seed.export());
 assert(localNew.revision>serverOld.revision);
 let remote=JSON.stringify(serverOld),posts=0;
 const fakeRust=async(url,options={})=>{
  if(options.method==='POST'){remote=options.body;posts++;return {ok:true,status:200};}
  return {ok:true,status:200,headers:{get:name=>name==='content-type'?'application/json':null},json:async()=>JSON.parse(remote)};
 };
 const hosted=await load(syncStore,fakeRust);
 assert.equal(hosted.nornTransfer().percent,72);
 await hosted.sync();
 assert.equal(JSON.parse(remote).swarmwire.job.percent,72);
 assert(posts>=1);
 console.log('PASS: clean boot; incomplete download blocked; resume/reload; ISO + install persistence; backup/restore; old SwarmWire and disk migrations; deleted torrent; Rust mirror recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
