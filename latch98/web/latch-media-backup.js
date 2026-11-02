/* Latch 98 portable media backup v1. A .l98backup contains the validated
   virtual C: metadata plus every locally stored blob it references.
   YouTube links remain link metadata: never download or extract YouTube audio.

   Format: UTF-8 magic "L98BUNDLE1\n", uint32 big-endian manifest size,
   UTF-8 JSON manifest, then consecutive raw media blobs in manifest order.
   Each blob has a CRC32 (streaming, detects accidental truncation/corruption).
   Not encrypted; treat imported backup files as untrusted input.
*/
(()=>{'use strict';
const MAGIC='L98BUNDLE1\n',ENC=new TextEncoder(),DEC=new TextDecoder('utf-8',{fatal:true});
const HEADER=ENC.encode(MAGIC),MAX_MANIFEST=4*1024*1024,MAX_ITEM=256*1024*1024,MAX_TOTAL=1024*1024*1024;
let busy=false;
const idOK=id=>typeof id==='string'&&/^[a-z0-9-]{8,85}$/i.test(id);
const mimeOK=m=>typeof m==='string'&&m.length<=100&&/^(audio|video)\/[a-z0-9.+-]+$/i.test(m);
function ensure(cond,message){if(!cond)throw Error(message);}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
async function checksum(blob){let crc=0xffffffff;
 for(let pos=0;pos<blob.size;pos+=1024*1024){const bytes=new Uint8Array(await blob.slice(pos,Math.min(blob.size,pos+1024*1024)).arrayBuffer());for(let j=0;j<bytes.length;j++)crc=crcTable[(crc^bytes[j])&255]^(crc>>>8);}
 return ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function refs(disk){const ids=new Set();
 const visit=n=>{if(!n||typeof n!=='object')return;
   if(n.kind==='media-local')ids.add(n.mediaId);
   if(n.kind==='media-playlist'){const d=JSON.parse(n.data);for(const e of d.entries||[])if(e.type==='local')ids.add(e.mediaId);}
 };
 for(const n of Object.values(disk.nodes||{}))visit(n);
 for(const floppy of Object.values(disk.media?.disks||{}))for(const n of Object.values(floppy.nodes||{}))visit(n);
 return [...ids].sort();}
async function runExclusive(fn){if(busy)throw Error('A media backup or restore is already in progress');busy=true;try{return await fn();}finally{busy=false;}}
async function exportBundle(){return runExclusive(async()=>{
 const fs=window.LatchFS,media=window.LatchMedia;await fs.ready;await fs.sync();
 const raw=fs.export();const disk=JSON.parse(raw),ids=refs(disk),files=[],parts=[];
 let total=0;
 for(const id of ids){ensure(idOK(id),'Disk contains an invalid media ID');
   let info,blob;try{info=await media.blobInfo(id);blob=info.blob;}catch(e){throw Error('Cannot make a complete backup: media '+id+' is missing. '+e.message);}
   ensure(blob.size>0&&blob.size<=MAX_ITEM,'An imported media file exceeds the backup size limit');
   const mime=info.mime||blob.type||'application/octet-stream';
   // Source MIME is validated against its original file metadata where available.
   const node=Object.values(disk.nodes).find(n=>n.kind==='media-local'&&n.mediaId===id);
   const type=node?.mime||mime;ensure(mimeOK(type),'Media has an invalid MIME type');
   // A successful export must always be importable; refuse stale/corrupt metadata.
   for(const n of [...Object.values(disk.nodes||{}),...Object.values(disk.media?.disks||{}).flatMap(floppy=>Object.values(floppy.nodes||{}))]){
     if(n.kind==='media-local'&&n.mediaId===id)ensure(n.size===blob.size&&n.mime===type,'Stored bytes do not match disk metadata for media '+id);
   }
   total+=blob.size;ensure(total<=MAX_TOTAL,'Media backup exceeds 1 GB. Export large files individually.');
   files.push({id,size:blob.size,mime:type,crc32:await checksum(blob)});parts.push(blob);
 }
 const json=ENC.encode(JSON.stringify({format:'latch98-media-backup-v1',created:new Date().toISOString(),disk,files}));
 ensure(json.length<=MAX_MANIFEST,'The backup manifest is too large');
 const header=new Uint8Array(HEADER.length+4);header.set(HEADER);new DataView(header.buffer).setUint32(HEADER.length,json.length,false);
 return new Blob([header,json,...parts],{type:'application/octet-stream'});
 });}
async function inspectBundle(file){
 ensure(file&&typeof file.size==='number'&&typeof file.slice==='function','Select a .l98backup file');
 ensure(file.size>=HEADER.length+4&&file.size<=MAX_TOTAL+MAX_MANIFEST+HEADER.length+4,'Invalid or oversized media backup');
 const header=new Uint8Array(await file.slice(0,HEADER.length+4).arrayBuffer());
 ensure(HEADER.every((v,i)=>v===header[i]),'This is not a Latch 98 complete media backup');
 const size=new DataView(header.buffer).getUint32(HEADER.length,false);
 ensure(size>0&&size<=MAX_MANIFEST&&HEADER.length+4+size<=file.size,'Backup manifest is missing or too large');
 let manifest;try{manifest=JSON.parse(DEC.decode(await file.slice(HEADER.length+4,HEADER.length+4+size).arrayBuffer()));}catch{throw Error('Backup manifest is damaged');}
 ensure(manifest&&manifest.format==='latch98-media-backup-v1'&&manifest.disk&&Array.isArray(manifest.files),'Unsupported media backup version');
 ensure(manifest.files.length<=2000,'Backup contains too many media files');
 const fs=window.LatchFS;await fs.ready;
 const diskText=JSON.stringify(manifest.disk);fs.validateBackup(diskText);
 const required=refs(manifest.disk),given=manifest.files.map(x=>x.id);
 ensure(given.length===required.length&&required.every((id,i)=>given[i]===id),'Backup media list differs from the disk contents');
 let offset=HEADER.length+4+size,total=0;
 for(const entry of manifest.files){
   ensure(entry&&idOK(entry.id)&&mimeOK(entry.mime)&&Number.isSafeInteger(entry.size)&&entry.size>0&&entry.size<=MAX_ITEM&&/^[a-f0-9]{8}$/.test(entry.crc32),'Invalid media entry in backup');
   total+=entry.size;ensure(total<=MAX_TOTAL,'Backup exceeds the 1 GB media limit');
   // Cross-check source size/type for every file node (playlists can reference media without standalone files).
   for(const n of Object.values(manifest.disk.nodes))if(n.kind==='media-local'&&n.mediaId===entry.id)
     ensure(n.size===entry.size&&n.mime===entry.mime,'Backup media differs from virtual-disk metadata');
   entry._start=offset;offset+=entry.size;
 }
 ensure(offset===file.size,'Backup is truncated or contains unexpected data');
 return {manifest,diskText,files:manifest.files.length,bytes:total};
}
async function restoreBundle(file){return runExclusive(async()=>{
 const fs=window.LatchFS,media=window.LatchMedia;await fs.ready;
 const {manifest,diskText,files,bytes}=await inspectBundle(file);
 const staged=[];let diskCommitted=false;
 try{
   // Verify ALL binary data before changing any filesystem metadata.
   for(const e of manifest.files){const blob=file.slice(e._start,e._start+e.size,e.mime);
      ensure(await checksum(blob)===e.crc32,'Backup data is corrupt: '+e.id);
   }
   for(const e of manifest.files){const source=file.slice(e._start,e._start+e.size,e.mime);
     if(await media.hasBlob(e.id)){
       const existing=await media.blobFor(e.id);
       ensure(existing.size===e.size&&await checksum(existing)===e.crc32,'An existing media ID has different content; restore was not applied');
     }else{await media.putBackupBlob(e.id,source,e.mime);staged.push(e.id);}
   }
   // Only after every blob is safe, apply the validated disk transaction.
   fs.importDisk(diskText);diskCommitted=true;
   // A remote Rust write can fail after a local successful commit. In that case
   // leave newly restored binaries intact so disk references never break.
   await fs.sync();
   return {files,bytes};
 }catch(e){if(!diskCommitted){for(const id of staged)try{await media.removeBackupBlob(id);}catch(err){console.warn('Backup rollback cleanup',err);}}throw e;}
 });}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
window.LatchMediaBackup={exportBundle,inspectBundle,restoreBundle,download,checksum};
})();
