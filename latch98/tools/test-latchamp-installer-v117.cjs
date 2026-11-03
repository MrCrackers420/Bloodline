'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/filesystem.js','utf8');const store=new Map();
async function setup(){const win={},context={window:win,structuredClone,document:{dispatchEvent(){}},CustomEvent:class{constructor(t){this.type=t;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),console};vm.runInNewContext(source,context);await win.LatchFS.ready;return win.LatchFS;}
(async()=>{
 let disk=await setup();assert.ok(!disk.installedPrograms().some(p=>p.id==='latchamp'));
 const path=disk.createAppInstaller('latchamp');assert.equal(path,'C:/Downloads/LatchAmp-117.setup.exe');
 assert.equal(disk.get(path).version,'1.17');disk.installSoftware('latchamp');
 assert.equal(disk.installedPrograms().find(x=>x.id==='latchamp').version,'1.17');
 disk.write('C:/My Documents/Playlist-Test.json','{"format":"latchamp-links-v1","links":[]}');
 let snapshot=JSON.parse(disk.export());snapshot.installed.latchamp.version='1.14';
 // Old version upgrading in place must not touch the document tree.
 disk.importDisk(JSON.stringify(snapshot));disk.installSoftware('latchamp');
 assert.equal(disk.installedPrograms().find(x=>x.id==='latchamp').version,'1.17');
 assert.equal(disk.read('C:/My Documents/Playlist-Test.json'),'{"format":"latchamp-links-v1","links":[]}');
 disk=await setup();assert.equal(disk.installedPrograms().find(x=>x.id==='latchamp').version,'1.17');
 console.log('PASS: optional install, in-place 1.14 → 1.17 upgrade, save preservation, reload');
})().catch(e=>{console.error(e);process.exitCode=1});
