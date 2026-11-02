/* Offline regression tests. Run: node tools/test-filesystem.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('web/filesystem.js','utf8');
const store=new Map();
async function load(){const window={}, context={window,document:{dispatchEvent(){}},CustomEvent:class{constructor(type){this.type=type;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),console};vm.runInNewContext(source,context);await window.LatchFS.ready;return window.LatchFS;}
(async()=>{
 const d=await load();assert.equal(d.get('c:/my documents').kind,'dir');
 d.mkdir('C:/My Documents','Test Folder');d.write('C:/My Documents/Test Folder/Note.txt','The norns need room to pass.');
 assert.equal(d.read('c:/my documents/test folder/note.txt'),'The norns need room to pass.');
 d.copy('C:/My Documents/Test Folder','C:/Downloads');
 assert.equal(d.read('C:/Downloads/Test Folder/Note.txt'),'The norns need room to pass.');
 d.rename('C:/Downloads/Test Folder/Note.txt','Renamed.txt');
 assert.equal(d.read('C:/Downloads/Test Folder/Renamed.txt'),'The norns need room to pass.');
 d.move('C:/Downloads/Test Folder/Renamed.txt','A:/Floppy Note.txt');
 assert.equal(d.read('A:/Floppy Note.txt'),'The norns need room to pass.');
 d.remove('A:/Floppy Note.txt');assert.equal(d.get('A:/Floppy Note.txt'),null);
 const trashed=d.list('C:/Recycled')[0];assert(trashed);
 d.restore(trashed.path);assert.equal(d.read('A:/Floppy Note.txt'),'The norns need room to pass.');
 const disk=d.export();d.write('C:/My Documents/Temporary.txt','temporary');d.importDisk(disk);assert.equal(d.get('C:/My Documents/Temporary.txt'),null);
 const d2=await load();assert.equal(d2.read('a:/floppy note.txt'),'The norns need room to pass.');
 console.log('PASS: create, read/write, case-insensitive paths, copy subtree, rename, move across drives, recycle/restore, disk backup, reload.');
})().catch(e=>{console.error(e);process.exitCode=1;});
