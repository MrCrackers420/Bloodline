const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync('web/filesystem.js','utf8');
const storage = new Map();
async function start(){
 const window={};
 const context={window,document:{dispatchEvent(){}},CustomEvent:class{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),console};
 vm.runInNewContext(src,context);await window.LatchFS.ready;return window.LatchFS;
}
const oldWelcome='Welcome to Latch 98!\n\nThis computer has a working virtual disk.\n\nDouble-click My Computer to browse C: and A:.\nUse File > New Folder, New Text Document, or the right-click menu.\nYou can rename, copy, cut, paste, move, delete, and restore files.\n\nOpen text documents in Notepad. Save with Ctrl+S.\nThe Rust edition saves the disk image to data/virtual_disk.json.\nThe standalone HTML stores it in this browser.\n\nVisit PixelShelf and the other fictional sites through Latch Browser!\n';
const oldUtil='Latch 98 Utilities Disk, Disk 1 of 1\n\nRun Setup.exe to install Character Map.\n\nTo change disks, open My Computer, select the floppy drive and choose Disk Tray. No physical disk is required.\n';
(async()=>{
 let d=await start();
 assert(!/fictional|offline/i.test(d.read('C:/My Documents/Welcome to Latch 98.txt')));
 d.write('C:/My Documents/Welcome to Latch 98.txt',oldWelcome);
 d.switchMedia('utilities');
 d.switchMedia('original');
 // Save old utility copy in the backup model, then reimport.
 const img=JSON.parse(d.export());
 img.media.disks.utilities.nodes['A:/README.TXT'].data=oldUtil;
 d.importDisk(JSON.stringify(img));
 d=await start();
 assert(!/fictional|offline/i.test(d.read('C:/My Documents/Welcome to Latch 98.txt')));
 d.switchMedia('utilities');
 assert(!/No physical disk/i.test(d.read('A:/README.TXT')));
 d.write('C:/My Documents/Welcome to Latch 98.txt','I changed this document.');
 d=await start();
 assert.equal(d.read('C:/My Documents/Welcome to Latch 98.txt'),'I changed this document.');
 console.log('PASS: default copy migrates; edited documents are preserved; utility disk note is updated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
