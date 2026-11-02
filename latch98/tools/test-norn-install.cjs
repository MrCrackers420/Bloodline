const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('web/filesystem.js','utf8'),store=new Map();
async function load(){const w={};vm.runInNewContext(code,{window:w,document:{dispatchEvent(){}},CustomEvent:class{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({ok:false,status:404,headers:{get:()=>null}}),console});await w.LatchFS.ready;return w.LatchFS;}
(async()=>{
 let d=await load();assert.equal(d.discInfo().mounted,null);
 assert.throws(()=>d.list('D:'),/insert/);
 assert.throws(()=>d.installSoftware('nornlab'),/Insert/);
 const torrent=d.saveNornTorrent();assert.equal(d.get(torrent).kind,'torrent');assert.equal(d.torrentInfo(torrent).release,'nwlab03');
 const image=d.downloadNornDisc(torrent);assert.equal(d.get(image).kind,'iso');assert.equal(d.downloadNornDisc(torrent),image);
 d.mountDisc(image);assert.equal(d.get('D:/SETUP.EXE').program,'nornlab');assert.throws(()=>d.write('D:/hello.txt','no'),/read-only/);
 d.installSoftware('nornlab');assert.equal(d.get('C:/PROGRAM FILES/NORN WORLD LAB/NORNLAB.EXE').target,'nornlab');
 assert.equal(d.get('C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK').target,'nornlab');
 d=await load();assert.equal(d.discInfo().mounted,'C:/DOWNLOADS/NORNWORLDLAB.ISO');assert.equal(d.installedPrograms().some(x=>x.id==='nornlab'),true);
 d.ejectDisc();assert.equal(d.get('D:/SETUP.EXE'),null);assert.equal(d.installedPrograms().some(x=>x.id==='nornlab'),true);
 d.uninstallSoftware('nornlab');assert.equal(d.get('C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK'),null);
 console.log('PASS: private torrent, ISO, mounted CD-ROM, read-only drive, install, persistence, eject, uninstall');
})().catch(e=>{console.error(e);process.exitCode=1});
