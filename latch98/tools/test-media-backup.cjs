/* Hermetic browser-store simulation for complete binary media backups. No external dependencies. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const src=names=>names.map(n=>fs.readFileSync(path.join(ROOT,'web',n),'utf8'));
const diskStore=new Map(),dbs=new Map();
function fakeIDB(){return {open(name){
 const req={result:null,error:null,onsuccess:null,onerror:null,onupgradeneeded:null};
 setTimeout(()=>{
  const fresh=!dbs.has(name);if(fresh)dbs.set(name,new Map());const data=dbs.get(name);
  req.result={objectStoreNames:{contains:k=>data.has(k)},createObjectStore:k=>{data.set(k,new Map());},transaction(name,mode){const tx={error:null,oncomplete:null,onerror:null,onabort:null};
     tx.objectStore=()=>{const store=data.get(name);return {
      get:key=>operation(()=>store.get(key)),put:record=>operation(()=>{store.set(record.id,record);return record.id;}),delete:key=>operation(()=>store.delete(key)),getAllKeys:()=>operation(()=>Array.from(store.keys()))
     };};
     function operation(fn){const r={result:undefined,onsuccess:null,onerror:null};setTimeout(()=>{try{r.result=fn();r.onsuccess?.();tx.oncomplete?.();}catch(e){tx.error=e;r.onerror?.();tx.onerror?.();}},0);return r;}
     return tx;
  }};if(fresh)req.onupgradeneeded?.();req.onsuccess?.();
 },0);return req;
 }};}
function env(){const c={console,Blob,File,URL,Date,Uint8Array,Uint32Array,DataView,TextEncoder,TextDecoder,ArrayBuffer,setTimeout,crypto:crypto.webcrypto,navigator:{storage:{persist:async()=>true}},indexedDB:fakeIDB(),document:{dispatchEvent(){}},CustomEvent:class{},localStorage:{getItem:k=>diskStore.get(k)||null,setItem:(k,v)=>diskStore.set(k,v),removeItem:k=>diskStore.delete(k)},fetch:async()=>({status:404,ok:false,headers:{get:()=>null}}),window:{}};c.window.indexedDB=c.indexedDB;c.window.crypto=c.crypto;c.window.LatchMedia=undefined;
 vm.createContext(c);for(const s of src(['filesystem.js','latch-media.js','latch-media-backup.js']))vm.runInContext(s,c);return c;}
(async()=>{
 let c=env();await c.window.LatchFS.ready;
 const f=c.window.LatchFS,m=c.window.LatchMedia,b=c.window.LatchMediaBackup,folder='C:/My Documents/My Music';
 const bytes=Buffer.from('RIFF:generated offline audio test 000123456789.');
 const mediaPath=await m.importFile(new File([bytes],'sample.wav',{type:'audio/wav'}));
 const id=f.get(mediaPath).mediaId;
 const link=f.makeMediaLink(folder,'Online.l98music','https://www.youtube.com/watch?v=jfKfPfyJRdk','Radio');
 f.makeMediaPlaylist(folder,'Mixed.l98mix',[{type:'local',mediaId:id,title:'Sample'},{type:'youtube',url:f.get(link).url,title:'Radio'}]);
 // Actual FS and fake durable IDB storage are deliberately shared across environments.
 c=env();await c.window.LatchFS.ready;
 assert.equal(c.window.LatchFS.get(mediaPath).mediaId,id,'Disk not restored after script reload');
 assert.deepEqual(Buffer.from(await (await c.window.LatchMedia.blobFor(id)).arrayBuffer()),bytes,'Media not restored after script reload');
 const archive=await c.window.LatchMediaBackup.exportBundle();assert(archive.size>bytes.length);
 const bad=new Uint8Array(await archive.arrayBuffer());bad[bad.length-1]^=0xFF;
 const before=c.window.LatchFS.export();
 await assert.rejects(c.window.LatchMediaBackup.restoreBundle(new Blob([bad])),/corrupt/i);
 assert.equal(c.window.LatchFS.export(),before,'Corrupt import changed filesystem');
 // Simulate a second device by clearing all metadata + blob stores before restoring.
 diskStore.clear();dbs.clear();c=env();await c.window.LatchFS.ready;
 assert.equal(c.window.LatchFS.get(mediaPath),null);
 const result=await c.window.LatchMediaBackup.restoreBundle(archive);
 assert.equal(result.files,1);
 assert.equal(c.window.LatchFS.get(mediaPath).mediaId,id);
 assert.equal(c.window.LatchFS.get(folder+'/Mixed.l98mix').kind,'media-playlist');
 assert.deepEqual(Buffer.from(await (await c.window.LatchMedia.blobFor(id)).arrayBuffer()),bytes);
 const health=await c.window.LatchMedia.status();assert.equal(health.referenced,1);assert.equal(health.missing.length,0);
 // Restore is idempotent and never clobbers a different blob sharing the same ID.
 await c.window.LatchMediaBackup.restoreBundle(archive);
 await c.window.LatchMedia.removeBackupBlob(id);
 await c.window.LatchMedia.putBackupBlob(id,new Blob(['mismatch'],{type:'audio/wav'}),'audio/wav');
 const old=c.window.LatchFS.export();
 await assert.rejects(c.window.LatchMediaBackup.restoreBundle(archive),/different content/);
 assert.equal(c.window.LatchFS.export(),old);
 await assert.rejects(c.window.LatchMediaBackup.exportBundle(),/Stored bytes do not match disk metadata/);
 console.log('PASS complete backup: reload, offline binary+link+playlist bundle, corruption rejection, cross-profile restore, duplicate restore, ID collision protection');
})().catch(e=>{console.error(e);process.exitCode=1});
