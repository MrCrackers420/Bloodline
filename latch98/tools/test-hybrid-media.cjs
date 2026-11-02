/* Hybrid-media metadata and filesystem safety regressions, no browser needed. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('web/filesystem.js','utf8');
const store=new Map(),context={URL,window:{},document:{dispatchEvent(){}},CustomEvent:class{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),console};
(async()=>{
 vm.runInNewContext(source,context);const disk=context.window.LatchFS;await disk.ready;
 const folder='C:/My Documents/My Music';assert.equal(disk.get(folder).kind,'dir');
 const audio='m-0123456789abcdef0123456789abcdef';
 const imported=disk.makeMedia(folder,'SAMPLE.WAV',audio,1024,'audio/wav');
 assert.equal(disk.get(imported).kind,'media-local');
 const copy=disk.copy(imported,folder,'SAMPLE-COPY.WAV');assert.equal(disk.get(copy).mediaId,audio);
 const moved=disk.move(imported,folder+'/MOVED.WAV');assert.equal(disk.get(moved).mediaId,audio);
 const link=disk.makeMediaLink(folder,'RADIO.L98MUSIC','https://music.youtube.com/watch?v=jfKfPfyJRdk','Radio');
 assert.equal(disk.get(link).kind,'media-link');
 assert.throws(()=>disk.makeMediaLink(folder,'BAD.L98MUSIC','https://evil.test/watch?v=jfKfPfyJRdk'));
 const mixed=disk.makeMediaPlaylist(folder,'MIX.L98MIX',[{type:'local',mediaId:audio,title:'Sample'},{type:'youtube',url:disk.get(link).url,title:'Radio'}]);
 assert.equal(disk.get(mixed).kind,'media-playlist');
 assert(disk.mediaIds().includes(audio));
 disk.remove(moved,true);disk.remove(copy,true);
 assert(disk.mediaIds().includes(audio),'mixed playlist must retain binary after original files removed');
 const backup=disk.export();assert(backup.length<100000);
 disk.importDisk(backup);assert.equal(disk.get(mixed).kind,'media-playlist');
 const cloned=JSON.parse(disk.export());cloned.nodes[disk.canonical(link)].url='https://evil.test/xyz';
 assert.throws(()=>disk.importDisk(JSON.stringify(cloned)),'invalid backup must not be importable');
 disk.remove(mixed,true);assert(!disk.mediaIds().includes(audio),'unreferenced binary should now be collectible');
 console.log('PASS hybrid media: drive entries, links, mixed playlists, copy/move/recycle reference preservation, backup validation');
})().catch(e=>{console.error(e);process.exitCode=1});
