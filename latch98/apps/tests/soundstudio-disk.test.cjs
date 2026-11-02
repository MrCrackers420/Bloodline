/* Run: node --test apps/tests/soundstudio-disk.test.cjs
 * Exercises the actual Sound Studio disk writer against a tiny LatchFS test double.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const source=readFileSync(require('node:path').join(__dirname,'../soundstudio/index.html'),'utf8');
const start=source.indexOf('async function diskWriteSong(');
const end=source.indexOf('async function diskDeleteSong(',start);
assert(start>=0 && end>start,'Find the actual Sound Studio writer');
const writerSource=source.slice(start,end);
const dir='C:/MY DOCUMENTS/MY MUSIC', path=dir+'/Test.l98s', parts=path+'.data';
function fakeDisk(){
 const nodes=new Map([[dir,{kind:'dir'}]]);
 return {
   nodes,
   get:p=>nodes.get(p)||null,
   list:p=>[...nodes.entries()].filter(([key])=>key.startsWith(p+'/')&&key.slice(p.length+1).indexOf('/')<0).map(([key,value])=>({...value,path:key,name:key.split('/').pop()})),
   mkdir:(p,n)=>{const to=p+'/'+n;nodes.set(to,{kind:'dir'});return to;},
   write:(p,data)=>{if(data.length>130000)throw Error('File too large');nodes.set(p,{kind:'text',data});},
   remove:(p)=>{for(const key of nodes.keys())if(key===p||key.startsWith(p+'/'))nodes.delete(key);},
   export:()=>JSON.stringify([...nodes]),
   sync:async()=>{},error:()=>null
 };
}
function writer(fs){return new Function('latchFS','ensureSongFolder','SONG_DIR','SONG_CHUNK_SIZE',`${writerSource};return diskWriteSong;`)(()=>fs,async()=>{},dir,65000);}
test('small -> split -> small save reclaims orphaned chunks, without losing the song',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 await save(path,{name:'Small'});
 assert.equal(JSON.parse(fs.get(path).data).name,'Small');
 await save(path,{name:'Large',payload:'sound'.repeat(38000)});
 assert.equal(JSON.parse(fs.get(path).data).format,'latch98-song-split-v1');
 assert.equal(fs.get(parts).kind,'dir');
 assert(fs.list(parts).length>=2);
 await save(path,{name:'Small Again'});
 assert.equal(JSON.parse(fs.get(path).data).name,'Small Again');
 assert.equal(fs.get(parts),null,'obsolete split data removed');
});
test('failed small replacement leaves existing split project intact',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 await save(path,{name:'Large',payload:'audio'.repeat(40000)});
 const old=fs.get(path).data;
 const originalWrite=fs.write;
 fs.write=()=>{throw Error('disk is full')};
 await assert.rejects(save(path,{name:'Smaller'}),/disk is full/);
 fs.write=originalWrite;
 assert.equal(fs.get(path).data,old);
 assert(fs.get(parts)?.kind==='dir');
});
test('unrelated folder is never deleted by a direct song save',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 fs.mkdir(dir,'Test.l98s.data');
 await save(path,{name:'New song'});
 assert(fs.get(parts));
});

test('interrupted split overwrite preserves previous chunks and manifest',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 await save(path,{name:'Original',payload:'12345'.repeat(33000)});
 const old=fs.get(path).data;
 const dir=JSON.parse(old).partsDir;
 const oldParts=fs.list(dir+'/'+dir).map(x=>[x.name,x.data]);
 const initialWrite=fs.write;
 let stageWrites=0;
 fs.write=(file,data)=>{if(file.includes('.r3a/')||file.includes('.r3b/')){
  if(++stageWrites===2)throw Error('Simulated quota failure during chunk write');
 }return initialWrite(file,data);};
 await assert.rejects(save(path,{name:'Replacement',payload:'98765'.repeat(33000)}),/Simulated quota/);
 fs.write=initialWrite;
 assert.equal(fs.get(path).data,old,'old manifest unchanged');
 assert.deepEqual(fs.list(dir+'/'+dir).map(x=>[x.name,x.data]),oldParts,'old PCM chunks unchanged');
 assert.equal(fs.get(dir+'/'+dir+'.r3a'),null,'partial staging folder cleaned up');
});
test('successful split replacement changes manifest after staged chunks and deletes obsolete data',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 await save(path,{name:'Original',payload:'data'.repeat(36000)});
 const prev=JSON.parse(fs.get(path).data),firstParts=dir+'/'+prev.partsDir;
 await save(path,{name:'Replacement',payload:'pcm'.repeat(49000)});
 const next=JSON.parse(fs.get(path).data);
 assert.notEqual(next.partsDir,prev.partsDir);
 assert.equal(fs.get(firstParts),null,'old chunk directory reclaimed');
 const chunks=Array.from({length:next.count},(_,i)=>fs.get(dir+'/'+next.partsDir+'/part'+String(i+1).padStart(3,'0')+'.txt').data);
 assert.equal(JSON.parse(chunks.join('')).name,'Replacement');
});
test('oversize attempted replacement fails rather than deleting saved song',async()=>{
 const fs=fakeDisk(),save=writer(fs);
 await save(path,{name:'Control'});
 const old=fs.get(path).data;
 await assert.rejects(save(path,{name:'Huge',payload:'x'.repeat(996000)}),/not enough free space|too large/i);
 assert.equal(fs.get(path).data,old);
});
