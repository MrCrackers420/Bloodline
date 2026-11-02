const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('web/filesystem.js','utf8'),store=new Map();
const window={};
async function load(){const instance={};const context={window:instance,structuredClone,document:{dispatchEvent(){}},CustomEvent:class{constructor(t){this.type=t;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),console};vm.runInNewContext(source,context);await instance.LatchFS.ready;return instance.LatchFS;}
(async()=>{
 let d=await load();assert.equal(d.mediaInfo().mounted,'original');d.write('A:/Journal.txt','on original');d.switchMedia('utilities');assert.equal(d.get('A:/SETUP.EXE').kind,'installer');assert.equal(d.get('A:/JOURNAL.TXT'),null);assert.throws(()=>d.write('A:/Evil.txt','x'),/write-protected/);
 d.switchMedia('original');assert.equal(d.read('A:/JOURNAL.TXT'),'on original');
 d.createBlankDisk('New Floppy');assert.equal(d.list('A:').length,0);d.write('A:/New.txt','hello disk');const newId=d.mediaInfo().mounted;
 d.switchMedia(null);assert.throws(()=>d.list('A:'),/insert/);d.switchMedia(newId);assert.equal(d.read('A:/New.txt'),'hello disk');
 d.switchMedia('utilities');d.installSoftware('charmap');assert.equal(d.get('C:/PROGRAM FILES/ACCESSORIES/CHARACTER MAP/CHARMAP.EXE').target,'charmap');assert.equal(d.get('C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/CHARACTER MAP.LNK').target,'charmap');
 assert.equal(d.installedPrograms()[0].id,'charmap');assert.throws(()=>d.installSoftware('charmap'),/already installed/);
 d=await load();assert.equal(d.mediaInfo().mounted,'utilities');assert.equal(d.installedPrograms()[0].id,'charmap');d.switchMedia(newId);assert.equal(d.read('A:/New.txt'),'hello disk');
 d.uninstallSoftware('charmap');assert.equal(d.installedPrograms().length,0);assert.equal(d.get('C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/CHARACTER MAP.LNK'),null);
 const saved=d.export();d=await load();d.importDisk(saved);assert.equal(d.read('A:/New.txt'),'hello disk');assert.equal(d.mediaInfo().disks.length,3);
 console.log('PASS: write-protected media, swap, eject, persistence, bundled installer, uninstaller, backup import');
})().catch(e=>{console.error(e);process.exitCode=1});
