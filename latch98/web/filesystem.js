/* Latch 98 Virtual FAT-style drive — sandboxed per-installation disk image.
   The standalone build persists to localStorage. The Rust host stores the same
   JSON image in data/virtual_disk.json; it never accesses arbitrary host paths.
   Logical file paths are case-insensitive, as in Windows 98. */
(()=>{'use strict';
const STORAGE='latch98.virtual_disk.v1', LEGACY_SWARM='latch98.swarmwire.v1', LIMIT=2*1024*1024, ROOTS=['C:','A:','D:'];
let disk=null, mode='browser', writeChain=Promise.resolve(), lastError='', pendingServerError='', transactionDepth=0, blockedRecovery=false, lastPersisted=null;
const canonical=p=>{if(typeof p!=='string')throw Error('Invalid path');p=p.trim().replaceAll('\\','/').replace(/\/+$/,'');
 if(/^([cad]):$/i.test(p))return p.toUpperCase();
 if(!/^[cad]:\//i.test(p))throw Error('The specified drive does not exist');
 const seg=p.slice(3).split('/');if(seg.some(s=>!s||s==='.'||s==='..'||s.length>100||/[<>:"|?*\x00-\x1f]/.test(s)))throw Error('Invalid file or folder name');
 if(seg.length>16)throw Error('Path is too deep');return p.toUpperCase();};
const parent=p=>{const k=canonical(p);const i=k.lastIndexOf('/');return i<0?null:k.slice(0,i);};
const base=p=>p.split('/').pop();
const nameCheck=name=>{name=String(name).trim();if(!name||name==='.'||name==='..'||name.length>100||/[\\/<>:"|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name))throw Error('Invalid file name');return name;};
const get=p=>disk?.nodes[canonical(p)]||null;
const requireNode=p=>{const n=get(p);if(!n)throw Error('File or folder not found');return n;};
const isDir=p=>get(p)?.kind==='dir';
const list=p=>{const key=canonical(p);if(key==='A:'&&!disk?.media?.mounted)throw Error('Please insert a disk into drive A:.');if(key==='D:'&&!disk?.cdrom?.mounted)throw Error('Please insert a disc into drive D:.');if(!isDir(key))throw Error('Not a folder');return Object.entries(disk.nodes).filter(([k,n])=>n.parent===key).map(([path,n])=>({path,...n})).sort((a,b)=>(a.kind==='dir'?0:1)-(b.kind==='dir'?0:1)||a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));};
const display=p=>{const k=canonical(p);if(ROOTS.includes(k))return k+'\\'; const parts=[],visited=new Set();let cur=k;while(cur&&!ROOTS.includes(cur)&&!visited.has(cur)){visited.add(cur);const n=get(cur);parts.unshift(n?.name||base(cur));cur=parent(cur);}return (cur||'C:')+'\\'+parts.join('\\');};
const add=(path,kind,extra={})=>{const p=canonical(path),up=parent(p);assertWritable(p);if(!up||!isDir(up))throw Error('Parent folder does not exist');if(get(p))throw Error('A file or folder with that name already exists');if(Object.keys(disk.nodes).length>2000)throw Error('The disk has too many items');disk.nodes[p]={name:nameCheck(base(path.replaceAll('\\','/'))),parent:up,kind,modified:Date.now(),...extra};return p;};
const defaults=()=>{disk={version:1,nodes:{'C:':{name:'Local Disk (C:)',parent:null,kind:'dir',modified:Date.now()},'A:':{name:'3½ Floppy (A:)',parent:null,kind:'dir',modified:Date.now()},'D:':{name:'CD-ROM (D:)',parent:null,kind:'dir',modified:Date.now()}}};
 for(const dir of ['C:/WINDOWS','C:/WINDOWS/Desktop','C:/WINDOWS/System','C:/WINDOWS/Start Menu','C:/Program Files','C:/Program Files/Accessories','C:/Program Files/Latch Browser','C:/My Documents','C:/Recycled','C:/Downloads'])add(dir,'dir');
 add('C:/My Documents/Welcome to Latch 98.txt','text',{data:'Welcome to Latch 98!\n\nYour files are stored on your computer.\n\nDouble-click My Computer to browse C: and A:.\nUse File > New Folder, New Text Document, or the right-click menu.\nYou can rename, copy, cut, paste, move, delete, and restore files.\n\nOpen text documents in Notepad. Save with Ctrl+S.\nVisit PixelShelf and the Norn Observer through Latch Browser!\n'});
 add('C:/My Documents/Journal.txt','text',{data:'November 1998\n\nThe new Latch computer is finally set up. I should explore the network later.\n'});
 add('C:/WINDOWS/Desktop/Norn Observer.url','shortcut',{target:'site:norn'});
 add('C:/WINDOWS/Desktop/PixelShelf.url','shortcut',{target:'site:pixelshelf'});
 add('C:/WINDOWS/Start Menu/Solitaire.lnk','shortcut',{target:'solitaire'});
 add('C:/WINDOWS/Start Menu/Minesweeper.lnk','shortcut',{target:'minesweeper'});
 add('C:/Downloads/Read Me.txt','text',{data:'Software downloaded inside Latch 98 can be collected here.\n'});
 for(const dir of ['C:/WINDOWS/Start Menu/Programs','C:/WINDOWS/Start Menu/Programs/Accessories'])add(dir,'dir');
 return disk;};

// Latch removable-media tray: a mounted A: drive is a real, editable disk image
// within the Latch filesystem. No physical USB/CD prompts or fabricated device events.
const CHARACTER_MAP='charmap';
const KNOWN_SOFTWARE={charmap:{name:'Character Map',dir:'C:/PROGRAM FILES/ACCESSORIES/CHARACTER MAP',menu:'C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/CHARACTER MAP.LNK'},nornlab:{name:'Norn World Lab',dir:'C:/PROGRAM FILES/NORN WORLD LAB',menu:'C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK'},latchamp:{name:'LatchAmp',dir:'C:/PROGRAM FILES/LATCHAMP',menu:'C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/LATCHAMP.LNK'}};
function snapshotA(){const contents={};for(const [path,n] of Object.entries(disk.nodes))if(path.startsWith('A:/'))contents[path]={...n};return contents;}
function ensureSystem(){
 ensureSwarmwire();
 if(!disk.installed||typeof disk.installed!=='object')disk.installed={};
 if(!disk.preinstalledBloodline){
   // Seed Bloodline into both brand-new and existing Latch 98 disks exactly once.
   const ensureDir=path=>{if(!disk.nodes[canonical(path)])add(path,'dir');};
   ensureDir('C:/Program Files/Bloodline');
   ensureDir('C:/WINDOWS/Start Menu/Programs');
   ensureDir('C:/WINDOWS/Start Menu/Programs/Games');
   const sc=(path,target)=>{if(!get(path))add(path,'shortcut',{target});};
   sc('C:/Program Files/Bloodline/Bloodline.exe','bloodline');
   sc('C:/Program Files/Bloodline/Bloodline (Windowed).exe','bloodline-windowed');
   sc('C:/WINDOWS/Desktop/Bloodline.lnk','bloodline');
   sc('C:/WINDOWS/Desktop/Bloodline (Windowed).lnk','bloodline-windowed');
   sc('C:/WINDOWS/Start Menu/Programs/Games/Bloodline.lnk','bloodline');
   sc('C:/WINDOWS/Start Menu/Programs/Games/Bloodline (Windowed).lnk','bloodline-windowed');
   disk.preinstalledBloodline=true;
 }

 if(!disk.preinstalledExtraGames){
   const dir=p=>{if(!get(p))add(p,'dir');};
   dir('C:/WINDOWS/Start Menu/Programs');dir('C:/WINDOWS/Start Menu/Programs/Games');
   dir('C:/WINDOWS/Start Menu/Programs/Accessories');
   const shortcuts=[
    ['C:/WINDOWS/Start Menu/Programs/Games/Bloodline Wilds.lnk','wilds'],
    ['C:/WINDOWS/Start Menu/Programs/Games/Bloodline Catacombs.lnk','catacombs'],
    ['C:/WINDOWS/Start Menu/Programs/Games/Weed Warrior.lnk','weedwarrior'],
    ['C:/WINDOWS/Start Menu/Programs/Accessories/Latch Sound Studio.lnk','soundstudio'],
    ['C:/WINDOWS/Start Menu/Programs/Accessories/Audacity.lnk','audacity']
   ];
   for(const [path,target] of shortcuts)if(!get(path))add(path,'shortcut',{target});
   disk.preinstalledExtraGames=true;
 }
 if(!disk.preinstalledSpriteStudio){
   const dir=p=>{if(!get(p))add(p,'dir');};
   dir('C:/WINDOWS/Start Menu/Programs');dir('C:/WINDOWS/Start Menu/Programs/Accessories');
   if(!get('C:/WINDOWS/Start Menu/Programs/Accessories/Latch Sprite Studio.lnk'))
     add('C:/WINDOWS/Start Menu/Programs/Accessories/Latch Sprite Studio.lnk','shortcut',{target:'spritestudio'});
   disk.preinstalledSpriteStudio=true;
 }
 if(!disk.nodes['C:/WINDOWS/START MENU/PROGRAMS']){add('C:/WINDOWS/START MENU/PROGRAMS','dir');}
 if(!disk.nodes['C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES'])add('C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES','dir');
 if(!disk.nodes['D:'])disk.nodes['D:']={name:'CD-ROM (D:)',parent:null,kind:'dir',modified:Date.now()};
 if(!disk.cdrom||typeof disk.cdrom!=='object')disk.cdrom={mounted:null};
 if(disk.media?.disks)return;
 const original=snapshotA();
 const utilities={
  'A:/README.TXT':{name:'Readme.txt',parent:'A:',kind:'text',data:'Latch 98 Utilities Disk, Disk 1 of 1\n\nRun Setup.exe to install Character Map.\n\nTo change disks, open My Computer, select the floppy drive and choose Disk Tray.\n',modified:Date.now()},
  'A:/SETUP.EXE':{name:'Setup.exe',parent:'A:',kind:'installer',program:'charmap',modified:Date.now()}
 };
 disk.media={mounted:'original',disks:{original:{name:'Personal Disk',readOnly:false,nodes:original},utilities:{name:'Latch Utilities Disk',readOnly:true,nodes:utilities}}};
}
function assertWritable(p){
 if(p==='D:'||p.startsWith('D:/'))throw Error('The CD-ROM is read-only.');
 if(p==='A:'||p.startsWith('A:/')){
  if(!disk?.media)return; // migration of previous snapshots
  if(!disk.media.mounted)throw Error('Please insert a disk into drive A:.');
  if(disk.media.disks[disk.media.mounted]?.readOnly)throw Error('This disk is write-protected.');
 }
}
function mediaInfo(){return {mounted:disk.media?.mounted||null,disks:Object.entries(disk.media?.disks||{}).map(([id,item])=>({id,name:item.name,readOnly:!!item.readOnly}))};}
function switchMedia(id){
 ensureSystem();if(id!==null&&!Object.hasOwn(disk.media.disks,id))throw Error('The selected disk could not be found');
 const old=disk.media.mounted;if(old){disk.media.disks[old].nodes=snapshotA();}
 for(const path of Object.keys(disk.nodes))if(path.startsWith('A:/'))delete disk.nodes[path];
 disk.media.mounted=id;
 if(id)Object.assign(disk.nodes,JSON.parse(JSON.stringify(disk.media.disks[id].nodes)));
 save();return mediaInfo();
}
function createBlankDisk(name){
 if(Object.keys(disk.media.disks).length>=12)throw Error('The disk box is full');
 name=nameCheck(name);const id='disk_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
 disk.media.disks[id]={name,readOnly:false,nodes:{}};switchMedia(id);return id;
}
function createAppInstaller(id){
 if(id!=='latchamp')throw Error('This program cannot be downloaded by Latch Update');
 const path='C:/Downloads/LatchAmp-110.setup.exe';
 const old=get(path);if(old){if(old.kind!=='installer'||old.program!==id)throw Error('The setup filename is already in use');return path;}
 add(path,'installer',{program:id,version:'1.10'});save();return path;
}
function installSoftware(id){
 if(id==='charmap'&&(!disk.media?.mounted||get('A:/SETUP.EXE')?.program!=='charmap'))throw Error('Insert the Latch Utilities floppy and run A:\\Setup.exe first.');
 if(id==='nornlab'&&(!disk.cdrom?.mounted||get('D:/SETUP.EXE')?.program!=='nornlab'))throw Error('Insert the Norn World Lab disc into drive D: first.');
 if(id==='latchamp'&&get('C:/DOWNLOADS/LATCHAMP-110.SETUP.EXE')?.program!=='latchamp')throw Error('Download LatchAmp Setup from Latch Update first.');
 const def=KNOWN_SOFTWARE[id];if(!def)throw Error('This setup program is not compatible with Latch 98');
 if(disk.installed[id]){
  if(id!=='latchamp'||disk.installed[id].version==='1.10')throw Error(def.name+' is already installed');
  // Upgrade in place: retain existing virtual disk and shortcuts, and never delete user files.
  disk.installed[id].version='1.10';disk.installed[id].updated=Date.now();
  const readme=get(def.dir+'/README.TXT');if(readme?.kind==='text'){
    readme.data='LatchAmp 1.10\nUpdated through Latch Setup.\nYour device-local music library is unchanged.\n';readme.modified=Date.now();
  }
  save();return def;
 }
 const dir=def.dir;
 if(!isDir(dir))add(dir,'dir');
 add(dir+'/README.TXT','text',{data:id==='nornlab'?'Norn World Lab\n\nInstalled from NWLAB03.\nOriginal research application.\n':id==='latchamp'?'LatchAmp 1.10\nInstalled through Latch Setup.\n':''+def.name+'\nCopyright Latch Computer Co.\nInstalled using Latch Setup.\n'});
 add(dir+'/'+id.toUpperCase()+'.EXE','shortcut',{target:id});
 add(def.menu,'shortcut',{target:id});
 disk.installed[id]={name:def.name,dir,menu:def.menu,installed:Date.now(),...(id==='latchamp'?{version:'1.10'}:{})};save();return def;
}
function uninstallSoftware(id){
 const installed=disk.installed[id];if(!installed)throw Error('Program is not installed');
 const files=Object.keys(disk.nodes).filter(k=>k===installed.menu||k===installed.dir||k.startsWith(installed.dir+'/'));
 files.forEach(k=>delete disk.nodes[k]);delete disk.installed[id];save();
}
function createShortcut(where,name,target){
 const at=canonical(where),filename=nameCheck(name);if(typeof target!=='string'||target.length>260)throw Error('Invalid shortcut target');
 if(/^[ca]:/i.test(target)){target=canonical(target);const item=requireNode(target);if(item.kind==='shortcut')throw Error('Cannot create a shortcut to another shortcut');}
 else if(!/^(?:site:[a-z0-9_-]+|[a-z][a-z0-9_-]{1,32})$/i.test(target))throw Error('The shortcut target was not found');
 const p=add(at+'/'+filename,'shortcut',{target});save();return p;
}
function installedPrograms(){return Object.entries(disk.installed||{}).map(([id,value])=>({id,...value}));}
// The SwarmWire index is a compact Latch virtual file, not a claim of a real network transfer.
const NORN_TORRENT='C:/DOWNLOADS/NWLAB03.TORRENT';
const NORN_ISO='C:/DOWNLOADS/NornWorldLab.iso';
const TORRENT_META={format:'swarmwire-2003',release:'nwlab03',name:'NornWorldLab.iso',sizeMb:186.4,source:'swarm://relay-09/nwlab03',label:'NWLAB03'};
// Transfer state belongs to the virtual disk, so export/import, Rust persistence,
// and standalone localStorage all describe the same machine. Old SwarmWire builds
// stored this separately; migrate that record only once and only if its torrent
// actually exists on the disk being opened (never resurrect it after an import).
function cleanTransfer(value){
 if(!value||typeof value!=='object')return null;
 let path;try{path=canonical(value.path);}catch{return null;}
 if(get(path)?.kind!=='torrent')return null;
 try{torrentInfo(path);}catch{return null;}
 const percent=Number.isFinite(value.percent)?Math.max(0,Math.min(100,value.percent)):0;
 const state=['Stopped','Downloading','Finished','Error'].includes(value.state)?value.state:'Stopped';
 return {path,percent,state:state==='Finished'&&get(NORN_ISO)?.kind!=='iso'?'Stopped':state,
  ...(typeof value.error==='string'?{error:value.error.slice(0,240)}:{})};
}
function ensureSwarmwire(){
 if(disk.swarmwire?.version===1&&Object.hasOwn(disk.swarmwire,'job')){
  // A missing torrent must not destroy a completed transfer: the ISO is enough
  // to mount the recovered disc after its .torrent has been deleted.
  const job=disk.swarmwire.job;
  let hasTorrent=false;try{hasTorrent=!!job&&get(job.path)?.kind==='torrent';}catch{}
  if(job&&!hasTorrent&&get(NORN_ISO)?.kind==='iso'){
   disk.swarmwire.job={path:NORN_TORRENT,percent:100,state:'Finished'};
  }else disk.swarmwire.job=cleanTransfer(job);
  return;
 }
 let legacy=null;try{legacy=JSON.parse(localStorage.getItem(LEGACY_SWARM)||'null');}catch{}
 disk.swarmwire={version:1,job:cleanTransfer(legacy)};
}
function nornTransfer(){return disk.swarmwire?.job?{...disk.swarmwire.job}:null;}
function setNornTransfer(path,percent,state='Stopped',error=''){
 const p=canonical(path);torrentInfo(p);
 if(!Number.isFinite(percent)||percent<0||percent>100)throw Error('Invalid transfer progress');
 if(!['Stopped','Downloading','Finished','Error'].includes(state))throw Error('Invalid transfer state');
 if(state==='Finished'&&(percent!==100||get(NORN_ISO)?.kind!=='iso'))throw Error('The disc download is incomplete');
 disk.swarmwire={version:1,job:{path:p,percent,state,...(state==='Error'?{error:String(error).slice(0,240)}:{})}};
 save();return nornTransfer();
}

function saveNornTorrent(){
 const old=get(NORN_TORRENT);if(old){if(old.kind!=='torrent')throw Error('A file with that name already exists');return NORN_TORRENT;}
 add(NORN_TORRENT,'torrent',{data:JSON.stringify(TORRENT_META),displaySize:1536});save();return NORN_TORRENT;
}
function torrentInfo(path){
 const n=requireNode(path);if(n.kind!=='torrent')throw Error('Not a SwarmWire torrent file');
 let m;try{m=JSON.parse(n.data);}catch{throw Error('This torrent file is damaged');}
 if(m?.format!=='swarmwire-2003'||m.release!=='nwlab03')throw Error('Unknown tracker or unsupported torrent');
 return m;
}
function downloadNornDisc(torrentPath){
 torrentInfo(torrentPath);
 const transfer=nornTransfer();
 if(transfer&&transfer.path===canonical(torrentPath)&&transfer.percent<100)throw Error('SwarmWire must finish downloading the disc first.');
 const old=get(NORN_ISO);if(old){if(old.kind!=='iso')throw Error('The destination file already exists');
  if(transfer?.percent===100&&transfer.path===canonical(torrentPath)&&transfer.state!=='Finished'){disk.swarmwire.job={...transfer,state:'Finished'};save();}
  return NORN_ISO;}
 const m={format:'latch-disc-v1',release:'nwlab03',label:'NWLAB03',volumeName:'Norn World Lab',sizeMb:186.4};
 add(NORN_ISO,'iso',{data:JSON.stringify(m),displaySize:186400000});
 // Finalize the disc and the matching 100%-complete job in one disk commit.
 if(transfer?.path===canonical(torrentPath)&&transfer.percent===100)disk.swarmwire.job={...transfer,state:'Finished'};
 save();return NORN_ISO;
}
function discInfo(){return {mounted:disk.cdrom?.mounted||null,label:disk.cdrom?.mounted?'NWLAB03':null};}
function ejectDisc(){
 for(const p of Object.keys(disk.nodes))if(p.startsWith('D:/'))delete disk.nodes[p];
 disk.cdrom={mounted:null};save();return discInfo();
}
function mountDisc(path){
 const p=canonical(path),n=requireNode(p);if(n.kind!=='iso')throw Error('Please select a disc image');
 let m;try{m=JSON.parse(n.data);}catch{throw Error('This disc image is damaged');}
 if(m?.format!=='latch-disc-v1'||m.release!=='nwlab03')throw Error('This disc image cannot be mounted');
 for(const key of Object.keys(disk.nodes))if(key.startsWith('D:/'))delete disk.nodes[key];
 const t=Date.now();
 disk.nodes['D:/SETUP.EXE']={name:'Setup.exe',parent:'D:',kind:'installer',program:'nornlab',modified:t};
 disk.nodes['D:/README.TXT']={name:'Readme.txt',parent:'D:',kind:'text',data:'Norn World Lab\nVolume NWLAB03\n\nRun Setup.exe to install the laboratory program.\n',modified:t};
 disk.nodes['D:/DATA']={name:'DATA',parent:'D:',kind:'dir',modified:t};
 disk.nodes['D:/DATA/ARCHIVE.TXT']={name:'Archive.txt',parent:'D:/DATA',kind:'text',data:'LABORATORY ARCHIVE   /   NWLAB03\n\nInstrument access recovered from workstation 09.\nArchive index: specimens, training, observations.\n',modified:t};
 disk.cdrom={mounted:p};save();return discInfo();
}


function emit(){try{document.dispatchEvent(new CustomEvent('latchfschange'));}catch(e){console.error('Disk change notification:',e);}}
function revision(value){return Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0;}
// No public mutator may leave an unsaved memory-only edit behind. Internal
// operations (move -> remove, etc.) defer their commits to the outer action.
function atomic(fn){return (...args)=>{
 if(transactionDepth)return fn(...args);
 const prior=disk, backup=JSON.stringify(disk), priorRecovery=blockedRecovery;
 transactionDepth++;
 try{
  const result=fn(...args);
  transactionDepth--;
  save();
  if(fn===importDisk){try{document.dispatchEvent(new CustomEvent('latchfsimport'));}catch(e){console.error('Disk import notification:',e);}}
  return result;
 }catch(e){
  transactionDepth=0;
  disk=prior && JSON.parse(backup);
  blockedRecovery=priorRecovery;
  // Preserve the actionable cause, including when save() has already set it.
  lastError=String(e?.message||e);
  throw e;
 }
};}
function save(){
 if(transactionDepth)return; // only the outermost action may persist
 if(blockedRecovery){lastError='The saved disk is damaged. Import a valid backup before writing; the damaged image has not been overwritten.';throw Error(lastError);}
 // Compare the exact saved bytes, not only revision numbers: another tab may
 // import a different disk with the same revision. localStorage has atomic
 // individual setItem operations, but offers no cross-tab compare-and-swap.
 let existing;
 try{existing=localStorage.getItem(STORAGE);}catch(e){lastError='Cannot read saved disk before writing: '+(e?.message||e);throw Error(lastError);}
 if(existing!==lastPersisted){
  lastError='The disk was changed in another window. This file was not saved. Back up any unsaved work, then reopen the disk.';
  throw Error(lastError);
 }
 const oldRev=revision(disk);
 // Construct a commit candidate; no modification to the live disk until
 // localStorage has acknowledged the serialized record.
 const candidate={...disk,revision:oldRev+1};
 if(disk.media?.mounted){
  const disks={...disk.media.disks};
  disks[disk.media.mounted]={...disks[disk.media.mounted],nodes:snapshotA()};
  candidate.media={...disk.media,disks};
 }
 let data;
 try{data=JSON.stringify(candidate);}catch(e){lastError='Unable to prepare disk contents: '+e.message;throw Error(lastError);}
 validateDisk(candidate);
 if(data.length>LIMIT){lastError='The disk is full (2 MB capacity). No changes were saved.';throw Error(lastError);}
 try{localStorage.setItem(STORAGE,data);}catch(e){lastError='Unable to save changes to the disk: '+(e?.message||e)+'. No changes were saved.';throw Error(lastError);}
 disk=candidate;
 lastPersisted=data;
 lastError='';
 if(mode==='android'){
  // Android JNI writes the exact revision to private app storage, with an atomic rename.
  try{if(!window.LatchAndroid.writeDisk(data))throw Error('Native disk write failed');pendingServerError='';}
  catch(e){pendingServerError='Android disk save failed: '+e.message;lastError=pendingServerError;throw Error(lastError);}
 }
 if(mode==='rust'){
  // A local mirror is the durable recovery point until the Rust POST succeeds.
  // Writes remain ordered and failures are visible from error() and sync().
  writeChain=writeChain.catch(()=>{}).then(async()=>{
   const r=await fetch('/api/fs',{method:'POST',headers:{'Content-Type':'application/json'},body:data});
   if(!r.ok)throw Error('Rust disk save failed (HTTP '+r.status+'); the browser recovery copy is intact.');
   pendingServerError='';
   if(lastError.startsWith('Rust disk save failed'))lastError='';
  }).catch(e=>{pendingServerError=String(e?.message||e);lastError=pendingServerError;console.error('Disk persistence:',e);});
 }
 emit();
}
// Validate all imported keys and parent relationships before changing the
// current disk. JSON backups are untrusted; a reparse/broken media tree must
// never become executable D:\Setup.exe or overwrite user-owned data.
// No metadata can cross a backup boundary if it would be unsafe for other
// applications consuming LatchFS.get/list. Older snapshots may lack timestamps.
function metadataCheck(n){
 if(Object.keys(n).some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Unsafe disk-entry metadata');
 if(n.modified!==undefined&&(!Number.isSafeInteger(n.modified)||n.modified<0))throw Error('Invalid file modification time');
 if(n.displaySize!==undefined&&(!Number.isSafeInteger(n.displaySize)||n.displaySize<0))throw Error('Invalid file size metadata');
 if(n.original!==undefined){if(typeof n.original!=='string'||canonical(n.original)!==n.original)throw Error('Invalid original file path');}
 if(n.kind==='shortcut'){
  if(n.target.length>260)throw Error('Invalid shortcut target');
  if(/^[cad]:/i.test(n.target)){if(canonical(n.target)!==n.target)throw Error('Invalid shortcut target path');}
  else if(!/^(?:site:[a-z0-9_-]+|[a-z][a-z0-9_-]{1,32})$/i.test(n.target))throw Error('Invalid shortcut target');
 }
 if(n.kind==='installer'&&!/^[a-z][a-z0-9_-]{1,48}$/i.test(n.program))throw Error('Invalid installer identifier');
}
function validateNodes(nodes,driveScope){
 if(!nodes||typeof nodes!=='object'||Array.isArray(nodes))throw Error('Backup has invalid file entries');
 const keys=Object.keys(nodes);
 if(keys.length>2000)throw Error('Too many disk entries');
 for(const key of keys){
  if(canonical(key)!==key||(driveScope&&(!key.startsWith('A:/'))))throw Error('Backup contains an invalid path');
  const n=nodes[key];
  if(!n||typeof n!=='object'||Array.isArray(n)||!['dir','text','image','shortcut','installer','torrent','iso'].includes(n.kind)||typeof n.name!=='string')throw Error('Corrupted disk entry');
  if(ROOTS.includes(key)){
   if(driveScope||n.kind!=='dir'||n.parent!==null)throw Error('Backup has an invalid drive root');
  }else{
   nameCheck(n.name);
   if(n.name.toUpperCase()!==base(key)||n.parent!==parent(key))throw Error('Backup has mismatched file names or parents');
   if(!nodes[n.parent]&&!((driveScope&&n.parent==='A:')))throw Error('Backup has a broken folder tree');
   if(nodes[n.parent]&&nodes[n.parent].kind!=='dir')throw Error('Backup has a broken folder tree');
  }
  if(['text','image','torrent','iso'].includes(n.kind)&&typeof n.data!=='string')throw Error('Invalid file contents');
  if(n.kind==='shortcut'&&typeof n.target!=='string')throw Error('Invalid shortcut');
  if(n.kind==='installer'&&typeof n.program!=='string')throw Error('Invalid installer');
  metadataCheck(n);
 }
 return keys;
}
function validateDisk(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)throw Error('Not a Latch 98 disk image');
 const keys=validateNodes(value.nodes,false);
 if(!value.nodes['C:']||!value.nodes['A:'])throw Error('Not a Latch 98 disk image');
 if(value.revision!==undefined&&(!Number.isSafeInteger(value.revision)||value.revision<0))throw Error('Invalid disk revision');
 if(Object.keys(value).some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Unsafe disk image metadata');
 if(value.media!==undefined){
  const media=value.media;
  if(!media||typeof media!=='object'||!media.disks||typeof media.disks!=='object'||Array.isArray(media.disks))throw Error('Invalid floppy disk box');
  const disks=Object.keys(media.disks);
  if(disks.length>12)throw Error('Too many saved floppy disks');
  if(media.mounted!==null&&media.mounted!==undefined&&!Object.hasOwn(media.disks,media.mounted))throw Error('Mounted floppy disk is missing');
  for(const id of disks){
   if(!/^[a-z0-9_-]{1,48}$/i.test(id))throw Error('Invalid floppy disk identifier');
   const entry=media.disks[id];
   if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.name!=='string'||typeof entry.readOnly!=='boolean')throw Error('Invalid floppy disk');
   nameCheck(entry.name);if(entry.name!==entry.name.trim()||Object.keys(entry).some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid floppy metadata');validateNodes(entry.nodes,true);
  }
 }
 if(value.cdrom!==undefined){
  const mounted=value.cdrom?.mounted;
  if(mounted!==null&&mounted!==undefined){
   if(typeof mounted!=='string'||canonical(mounted)!==mounted)throw Error('Mounted disc path is invalid');
   let info;try{info=JSON.parse(value.nodes[mounted]?.data);}catch{}
   if(!value.nodes[mounted]||value.nodes[mounted].kind!=='iso'||info?.format!=='latch-disc-v1'||info?.release!=='nwlab03')throw Error('Mounted disc image is missing or invalid');
   const expected={'D:/SETUP.EXE':'installer','D:/README.TXT':'text','D:/DATA':'dir','D:/DATA/ARCHIVE.TXT':'text'};
   if(keys.filter(k=>k.startsWith('D:/')).length!==4||Object.entries(expected).some(([k,kind])=>value.nodes[k]?.kind!==kind)||value.nodes['D:/SETUP.EXE'].program!=='nornlab')throw Error('Mounted CD-ROM contents are invalid');
  }else if(keys.some(k=>k.startsWith('D:/')))throw Error('Unmounted CD-ROM contains unexpected files');
 }else if(keys.some(k=>k.startsWith('D:/')))throw Error('Backup contains a CD-ROM without mount metadata');
 if(value.installed!==undefined){
  if(!value.installed||typeof value.installed!=='object'||Array.isArray(value.installed))throw Error('Invalid installed programs');
  for(const [id,entry] of Object.entries(value.installed)){
   if(!/^[a-z0-9_-]{1,48}$/i.test(id)||!entry||typeof entry!=='object'||typeof entry.name!=='string')throw Error('Invalid installed program');
   if(typeof entry.dir!=='string'||typeof entry.menu!=='string'||canonical(entry.dir)!==entry.dir||canonical(entry.menu)!==entry.menu||!entry.dir.startsWith('C:/')||!entry.menu.startsWith('C:/'))throw Error('Invalid installation path');
   if(entry.installed!==undefined&&(!Number.isSafeInteger(entry.installed)||entry.installed<0))throw Error('Invalid installation time');
  }
 }
 if(value.swarmwire!==undefined){
  if(!value.swarmwire||typeof value.swarmwire!=='object'||value.swarmwire.version!==1||!Object.hasOwn(value.swarmwire,'job'))throw Error('Invalid transfer index');
  const job=value.swarmwire.job;
  if(job!==null){
   if(!job||typeof job!=='object'||Array.isArray(job)||typeof job.path!=='string'||canonical(job.path)!==job.path||!Number.isFinite(job.percent)||job.percent<0||job.percent>100||!['Stopped','Downloading','Finished','Error'].includes(job.state)||job.error!==undefined&&(typeof job.error!=='string'||job.error.length>240))throw Error('Invalid transfer state');
  }
 }
 return value;
}
const ready=(async()=>{
 let fromServer=false, corruptMirror=false;
 let mirror=null;
 try{const saved=localStorage.getItem(STORAGE);lastPersisted=saved;if(saved){if(saved.length>LIMIT)throw Error('Stored disk exceeds capacity');const raw=JSON.parse(saved);mirror=validateDisk(raw);}}catch(e){corruptMirror=true;lastError='Saved disk is damaged: '+e.message;}
 if(window.LatchAndroid){
  mode='android';
  try{const saved=window.LatchAndroid.readDisk();if(saved){const parsed=validateDisk(JSON.parse(saved));disk=parsed;fromServer=true;}}
  catch(e){blockedRecovery=true;lastError='Android disk could not be loaded: '+e.message;}
 }else try{const r=await fetch('/api/fs',{cache:'no-store'});
  if(r.ok&&r.headers.get('content-type')?.includes('application/json')){
   const raw=await r.json();try{disk=validateDisk(raw);fromServer=true;mode='rust';}catch(e){lastError='Rust disk image is invalid: '+e.message;}
  }else if(r.status===404&&r.headers.get('x-latch-backend')==='rust'){mode='rust';}
 }catch{}
 // The local mirror can be newer than the Rust server after a quick reload.
 // Prefer it only when it advertises a strictly newer disk revision.
 if(fromServer&&mirror&&revision(mirror)>revision(disk))disk=mirror;
 if(!disk){disk=mirror;if(!disk)defaults();}
 if(corruptMirror&&!fromServer){blockedRecovery=true;lastError='The saved disk is corrupt; it was not overwritten. Restore a valid disk backup to resume saving.';}
 const bootBackup=JSON.stringify(disk);
 try{const welcome=disk.nodes['C:/MY DOCUMENTS/WELCOME TO LATCH 98.TXT'];if(welcome?.kind==='text'&&welcome.data==='Welcome to Latch 98!\n\nThis computer has a working virtual disk.\n\nDouble-click My Computer to browse C: and A:.\nUse File > New Folder, New Text Document, or the right-click menu.\nYou can rename, copy, cut, paste, move, delete, and restore files.\n\nOpen text documents in Notepad. Save with Ctrl+S.\nThe Rust edition saves the disk image to data/virtual_disk.json.\nThe standalone HTML stores it in this browser.\n\nVisit PixelShelf and the other fictional sites through Latch Browser!\n')welcome.data='Welcome to Latch 98!\n\nYour files are stored on your computer.\n\nDouble-click My Computer to browse C: and A:.\nUse File > New Folder, New Text Document, or the right-click menu.\nYou can rename, copy, cut, paste, move, delete, and restore files.\n\nOpen text documents in Notepad. Save with Ctrl+S.\nVisit PixelShelf and the Norn Observer through Latch Browser!\n';ensureSystem();
const utilitiesNote=disk.media?.disks?.utilities?.nodes?.['A:/README.TXT'];
if(utilitiesNote?.kind==='text'&&utilitiesNote.data==='Latch 98 Utilities Disk, Disk 1 of 1\n\nRun Setup.exe to install Character Map.\n\nTo change disks, open My Computer, select the floppy drive and choose Disk Tray. No physical disk is required.\n'){
 utilitiesNote.data='Latch 98 Utilities Disk, Disk 1 of 1\n\nRun Setup.exe to install Character Map.\n\nTo change disks, open My Computer, select the floppy drive and choose Disk Tray.\n';
 if(disk.media.mounted==='utilities'&&disk.nodes['A:/README.TXT'])disk.nodes['A:/README.TXT'].data=utilitiesNote.data;
}
if(!blockedRecovery&&(JSON.stringify(disk)!==bootBackup||!lastPersisted||mode==='rust'||mode==='android'))save();if(mode==='rust')await writeChain;
 }catch(e){
 // A failed migration/initialization must not destroy the previously stored image.
 disk=JSON.parse(bootBackup);lastError='Disk startup could not be saved: '+(e?.message||e);
 }emit();})();
const mkdir=(where,name)=>{const p=add(canonical(where)+'/'+nameCheck(name),'dir');save();return p;};
const write=(path,content)=>{const p=canonical(path);assertWritable(p);content=String(content);if(content.length>130000)throw Error('Text file is too large (130 KB limit)');let n=get(p);if(n){if(n.kind!=='text')throw Error('This is not a text document');n.data=content;n.modified=Date.now();}else add(path,'text',{data:content});save();return p;};
const writeImage=(path,data)=>{const p=canonical(path);assertWritable(p);if(!/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(data)||data.length>300000)throw Error('Only PNG images under 225 KB can be saved');let n=get(p);if(n){if(n.kind!=='image')throw Error('An item with that name already exists');n.data=data;n.modified=Date.now();}else add(path,'image',{data});save();return p;};
const read=path=>{const n=requireNode(path);if(n.kind!=='text')throw Error('This file cannot be opened as text');return n.data||'';};
const rename=(p,name)=>move(p,canonical(parent(p))+'/'+nameCheck(name));
function copy(p,to,newName){const src=canonical(p),from=requireNode(src),copyName=nameCheck(newName||from.name),dst=canonical(to+'/'+copyName);assertWritable(dst);if(get(dst))throw Error('Destination already exists');if(from.kind==='dir'&&(dst===src||dst.startsWith(src+'/')))throw Error('Cannot copy a folder inside itself');
 const entries=Object.entries(disk.nodes).filter(([key])=>key===src||key.startsWith(src+'/')).sort((a,b)=>a[0].length-b[0].length);if(entries.length>300)throw Error('Too many items to copy at once');
 if(!isDir(parent(dst)))throw Error('Destination folder does not exist');for(const [key,node] of entries){const target=dst+key.slice(src.length);disk.nodes[target]={...node,name:key===src?copyName:node.name,parent:parent(target),modified:Date.now()};}save();return dst;}
function move(p,dest){const src=canonical(p),dst=canonical(dest),node=requireNode(src);assertWritable(src);assertWritable(dst);if(ROOTS.includes(src))throw Error('Cannot move a drive');if(src===dst)return dst;if(get(dst))throw Error('Destination already exists');if(node.kind==='dir'&&dst.startsWith(src+'/'))throw Error('Cannot move a folder into itself');if(!isDir(parent(dst)))throw Error('Destination folder does not exist');
 const old=Object.keys(disk.nodes).filter(k=>k===src||k.startsWith(src+'/')).sort((a,b)=>a.length-b.length);const moved=old.map(key=>[dst+key.slice(src.length),{...disk.nodes[key],parent:parent(dst+key.slice(src.length)),name:key===src?nameCheck(base(dest.replaceAll('\\','/'))):disk.nodes[key].name,modified:Date.now()}]);old.forEach(k=>delete disk.nodes[k]);moved.forEach(([k,n])=>disk.nodes[k]=n);save();return dst;}
function unique(where,name){const i=name.lastIndexOf('.'),stem=i>0?name.slice(0,i):name,ext=i>0?name.slice(i):'';let n=name,j=2;while(get(canonical(where)+'/'+n))n=`${stem} (${j++})${ext}`;return n;}
function remove(path,permanent=false){const p=canonical(path),n=requireNode(p);assertWritable(p);if(ROOTS.includes(p)||['C:/WINDOWS','C:/WINDOWS/DESKTOP','C:/MY DOCUMENTS','C:/RECYCLED','C:/PROGRAM FILES'].includes(p))throw Error('This is a protected system folder');if(permanent||parent(p)==='C:/RECYCLED'){
  Object.keys(disk.nodes).filter(k=>k===p||k.startsWith(p+'/')).forEach(k=>delete disk.nodes[k]);save();return;}
 const old=p,trash=move(p,'C:/RECYCLED/'+unique('C:/RECYCLED',n.name));disk.nodes[trash].original=old;save();return trash;}
function restore(p){const n=requireNode(p);if(parent(p)!=='C:/RECYCLED')throw Error('This item is not in the Recycle Bin');const old=n.original;let dest;if(old&&isDir(parent(old)))dest=parent(old)+'/'+unique(parent(old),n.name);else dest='C:/MY DOCUMENTS/'+unique('C:/MY DOCUMENTS',n.name);const moved=move(p,dest);delete disk.nodes[moved].original;save();return moved;}
function emptyBin(){list('C:/RECYCLED').forEach(n=>remove(n.path,true));}
const search=q=>{q=String(q).toLowerCase().trim();return q?Object.entries(disk.nodes).filter(([p,n])=>n.name.toLowerCase().includes(q)&&!p.startsWith('C:/RECYCLED/')).map(([path,n])=>({path,...n})).slice(0,120):[];};
function importDisk(raw){
 if(typeof raw!=='string')throw Error('Disk backup must be text');
 // Pretty-printed exports can exceed the compact disk size without exceeding
 // its capacity. Check the compact representation after parsing as well.
 if(raw.length>LIMIT*3)throw Error('Disk backup is too large');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('This is not a valid disk backup');}
 validateDisk(parsed);
 if(JSON.stringify(parsed).length>LIMIT)throw Error('Disk backup exceeds capacity');
 const previous=disk, recovery=blockedRecovery;
 disk=parsed;
 disk.revision=Math.max(revision(previous),revision(disk));
 if(!disk.swarmwire)disk.swarmwire={version:1,job:null};
 blockedRecovery=false;
 try{ensureSystem();save();}
 catch(e){disk=previous;blockedRecovery=recovery;throw e;}
}
function createText(where,name='New Text Document.txt'){return write(canonical(where)+'/'+unique(where,name),'');}
// Public API returns snapshots of individual nodes. A consumer cannot mutate
// shared disk data without going through a validated and persisted operation.
const inspect=p=>{const n=get(p);return n?{...n}:null;};
const sync=()=>writeChain.then(()=>{if(pendingServerError)throw Error(pendingServerError);});
const exportDisk=()=>{if(blockedRecovery)throw Error('Stored disk is damaged; use recoveryRaw() to preserve the original bytes, then import a valid backup.');
 // Verify exported state against the same validator used by import; do not label
 // an invalid in-memory disk a restorable backup.
 const compact=JSON.stringify(disk);if(compact.length>LIMIT)throw Error('Disk backup exceeds capacity');
 validateDisk(JSON.parse(compact));return JSON.stringify(disk,null,2);};
// Explicit recovery for multi-tab conflicts; never silently clobber an active
// instance after a storage event. A caller can export first if desired.
const reloadFromStorage=()=>{let raw;try{raw=localStorage.getItem(STORAGE);}catch(e){throw Error('Cannot read saved disk: '+e.message);}
 if(!raw)throw Error('No saved disk was found');
 if(raw.length>LIMIT)throw Error('The saved disk exceeds capacity');
 let parsed;try{parsed=validateDisk(JSON.parse(raw));}catch(e){throw Error('Saved disk is damaged: '+e.message);}
 const backup=disk,prior=lastPersisted,blocked=blockedRecovery;
disk=parsed;lastPersisted=raw;blockedRecovery=false;
 try{const original=JSON.stringify(disk);ensureSystem();if(JSON.stringify(disk)!==original)save();else {lastError='';emit();}}
 catch(e){disk=backup;lastPersisted=prior;blockedRecovery=blocked;throw e;}
 try{document.dispatchEvent(new CustomEvent('latchfsimport'));}catch{}return true;
};
const recoveryRaw=()=>blockedRecovery?localStorage.getItem(STORAGE):null;
window.LatchFS={ready,get:inspect,list,display,canonical,parent,rootPaths:ROOTS,mkdir:atomic(mkdir),write:atomic(write),writeImage:atomic(writeImage),read,rename:atomic(rename),move:atomic(move),copy:atomic(copy),remove:atomic(remove),restore:atomic(restore),emptyBin:atomic(emptyBin),search,unique,createText:atomic(createText),mode:()=>mode,error:()=>lastError||pendingServerError,sync,importDisk:atomic(importDisk),export:exportDisk,recoveryRaw,reloadFromStorage,nornTransfer,setNornTransfer:atomic(setNornTransfer),mediaInfo,switchMedia:atomic(switchMedia),createBlankDisk:atomic(createBlankDisk),discInfo,mountDisc:atomic(mountDisc),ejectDisc:atomic(ejectDisc),saveNornTorrent:atomic(saveNornTorrent),torrentInfo,downloadNornDisc:atomic(downloadNornDisc),installedPrograms,createAppInstaller:atomic(createAppInstaller),installSoftware:atomic(installSoftware),uninstallSoftware:atomic(uninstallSoftware),createShortcut:atomic(createShortcut)};
})();
