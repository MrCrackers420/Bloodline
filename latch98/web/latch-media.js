/* Latch 98 binary media store. IndexedDB is intentionally separate from the
   small FAT-style JSON metadata disk; no online stream is cached or extracted. */
(()=>{'use strict';
const DB='latch98-media-binaries-v1',STORE='files',MAX=256*1024*1024;
let dbp;
function database(){if(dbp)return dbp;dbp=new Promise((resolve,reject)=>{
 if(!('indexedDB' in window)){reject(Error('This browser does not support media storage'));return;}
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Media database unavailable'));
 });return dbp;}
async function request(mode,method,value){const db=await database();return new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),os=tx.objectStore(STORE),req=method==='getAllKeys'?os.getAllKeys():os[method](value);
 let out;req.onsuccess=()=>{out=req.result;};tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error||Error('Media storage operation failed'));tx.onabort=()=>reject(tx.error||Error('Media storage aborted'));
 });}
function mediaType(file){const name=String(file?.name||'');
 const aud=/\.(mp3|wav|m4a|aac|flac|ogg|opus|oga|weba)$/i.test(name),vid=/\.(mp4|webm|ogv|mov|m4v)$/i.test(name);
 const mime=String(file?.type||'').toLowerCase();if(mime.startsWith('audio/')||aud)return mime.startsWith('audio/')?mime:({mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',flac:'audio/flac'}[name.split('.').pop().toLowerCase()]||'audio/mpeg');
 if(mime.startsWith('video/')||vid)return mime.startsWith('video/')?mime:({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'}[name.split('.').pop().toLowerCase()]||'video/mp4');
 return null;}
async function importFile(file,folder='C:/MY DOCUMENTS/MY MUSIC'){
 const fs=window.LatchFS;await fs.ready;
 if(!file||typeof file.size!=='number'||file.size>MAX||file.size<=0)throw Error('Choose a media file between 1 byte and 256 MB');
 const mime=mediaType(file);if(!mime)throw Error('Only audio and video files can be imported');
 if(!fs.get(folder)||fs.get(folder).kind!=='dir')throw Error('Open an existing folder before importing');
 if(!/^C:/i.test(folder))throw Error('Binary media must be imported to the C: drive');
 const random=new Uint8Array(16);crypto.getRandomValues(random);const id='m-'+Array.from(random,b=>b.toString(16).padStart(2,'0')).join(''),name=fs.unique(folder,String(file.name||'Untitled.mp3').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100));
 try{await request('readwrite','put',{id,blob:file,mime,size:file.size,added:Date.now()});}
 catch(e){throw Error('Cannot store audio/video: '+e.message+'. Check storage quota.');}
 let committed=false;
 try{const path=fs.makeMedia(folder,name,id,file.size,mime);committed=true;
  await fs.sync();try{await navigator.storage?.persist?.();}catch{}return path;}
 catch(e){if(!committed){try{await request('readwrite','delete',id);}catch{}}
  // When the browser mirror saved but Rust POST failed, preserve the bytes:
  // deleting them here would leave a broken but otherwise valid file entry.
  throw e;}
}
async function blobInfo(id){const record=await request('readonly','get',String(id));if(!record||!(record.blob instanceof Blob))throw Error('The audio/video bytes are missing on this device. Restore a complete .l98backup or import the file again.');return {blob:record.blob,mime:record.mime||record.blob.type,size:record.size};}
async function blobFor(id){return (await blobInfo(id)).blob;}
async function hasBlob(id){if(!/^[a-z0-9-]{8,85}$/i.test(id))throw Error('Invalid media identifier');return !!(await request('readonly','get',id));}
async function putBackupBlob(id,blob,mime){if(!/^[a-z0-9-]{8,85}$/i.test(id)||!(blob instanceof Blob)||blob.size<=0||blob.size>MAX||! /^(audio|video)\/[a-z0-9.+-]+$/i.test(mime))throw Error('Invalid backup media');if(await hasBlob(id))throw Error('The media identifier is already stored');await request('readwrite','put',{id,blob,mime,size:blob.size,added:Date.now()});}
async function removeBackupBlob(id){if(!/^[a-z0-9-]{8,85}$/i.test(id))throw Error('Invalid media identifier');await request('readwrite','delete',id);}
async function exportFile(path){const fs=window.LatchFS,n=fs.get(path);if(!n||n.kind!=='media-local')throw Error('Select an imported media file');const blob=await blobFor(n.mediaId),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=n.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
async function prune(){const fs=window.LatchFS;await fs.ready;const keep=new Set(fs.mediaIds());for(const id of await request('readonly','getAllKeys'))if(!keep.has(id))await request('readwrite','delete',id);}
async function status(){const fs=window.LatchFS;await fs.ready;const ids=fs.mediaIds();const stored=new Set(await request('readonly','getAllKeys'));const missing=ids.filter(id=>!stored.has(id));
 let quota=null,used=null,persistent=null;
 try{const v=await navigator.storage?.estimate?.();if(v){used=Number(v.usage)||0;quota=Number(v.quota)||null;}}catch{}
 try{persistent=await navigator.storage?.persisted?.()??null;}catch{}
 return {referenced:ids.length,stored:stored.size,missing,used,quota,persistent};}
async function requestPersistence(){if(!navigator.storage?.persist)throw Error('Persistent storage is not supported by this browser');return !!(await navigator.storage.persist());}
window.LatchMedia={importFile,blobFor,blobInfo,hasBlob,putBackupBlob,removeBackupBlob,exportFile,prune,mediaType,status,requestPersistence};
})();
