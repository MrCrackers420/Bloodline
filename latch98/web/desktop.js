
(()=>{'use strict';
const $=id=>document.getElementById(id);
const icon=id=>`<svg class="small-icon" aria-hidden="true"><use href="#ico-${id}"></use></svg>`;
const el={startup:$('startup'),desktop:$('desktop'),start:$('start-menu'),submenu:$('submenu'),nested:$('nested-menu'),taskbar:$('task-buttons'),layer:$('window-layer'),overlay:$('dialog-overlay')};
const windows=new Map();let topZ=120,activeId=null,serial=0,startOpen=false,booting=false,audioContext=null,menuHoverTimer=null;
let submenuOwner=null,nestedOwner=null,dialogFocus=null,altTabCycle=null;

// Only Latch-owned shell jobs are stopped in fullscreen. Game/iframe clocks,
// audio, SwarmWire transfers and the virtual disk are NEVER globally patched.
const gamePerformance=(()=>{
 const owners=new Set(), jobs=new Map(), deferred=new Map(), cooperative=new Map();
 let transitions=0;
 const active=()=>owners.size>0;
 function startJob(job){if(job.timer!==null||active())return;
   job.timer=setInterval(()=>{const t=performance.now();try{job.run();}finally{job.calls++;job.hostMs+=performance.now()-t;}},job.period);
 }
 function stopJob(job){if(job.timer!==null){clearInterval(job.timer);job.timer=null;}}
 function shellInterval(name,run,period){if(jobs.has(name))throw Error('Duplicate Latch shell job: '+name);
   const job={run,period,timer:null,calls:0,hostMs:0};jobs.set(name,job);startJob(job);return job;
 }
 function resumeApp(item){if(item.state!=='paused')return;
   item.state='resuming';Promise.resolve().then(()=>item.hooks.resume({reason:'bloodline-fullscreen'})).catch(e=>{
     console.warn('Latch cooperative app resume failed:',item.id,e);
   }).finally(()=>{item.state='running';if(active()&&!item.disposed)pauseApp(item);});
 }
 function pauseApp(item){if(!active()||item.state!=='running')return;
   item.state='requesting';Promise.resolve().then(()=>item.hooks.pause({reason:'bloodline-fullscreen'})).then(result=>{
     // A pause is not assumed: only explicit acknowledgements mean suspended.
     item.state=(result===true||result?.paused===true)?'paused':'running';
     if(item.state==='paused'&&(!active()||item.disposed))resumeApp(item);
   }).catch(e=>{item.state='running';console.warn('Latch cooperative app pause failed:',item.id,e);});
 }
 function enter(owner){if(!owner||owners.has(owner))return;
   const wasActive=active();owners.add(owner);if(wasActive)return;
   transitions++;for(const job of jobs.values())stopJob(job);
   for(const item of cooperative.values())pauseApp(item);
 }
 function exit(owner){if(!owners.delete(owner)||active())return;
   transitions++;for(const job of jobs.values())startJob(job);
   // Filesystem events may continue during play; only hidden shell UI is coalesced.
   for(const action of deferred.values())try{action();}catch(e){console.warn('Latch shell refresh failed',e);}
   deferred.clear();for(const item of cooperative.values())resumeApp(item);
   // Interval resumption cannot leave the tray clock displaying an old time.
   setClock();
 }
 function defer(key,refresh){if(!active())return false;deferred.set(key,refresh);return true;}
 function registerCooperativeApp(id,hooks){if(!id||typeof hooks?.pause!=='function'||typeof hooks?.resume!=='function')throw Error('A cooperative app requires explicit pause/resume functions');
   if(cooperative.has(id))throw Error('Cooperative app is already registered: '+id);
   const item={id,hooks,state:'running'};cooperative.set(id,item);if(active())pauseApp(item);
   return ()=>{if(cooperative.get(id)!==item)return;cooperative.delete(id);item.disposed=true;if(item.state==='paused')resumeApp(item);};
 }
 function stats(){return {active:active(),owners:[...owners],transitions,deferred:[...deferred.keys()],
   jobs:Object.fromEntries([...jobs].map(([name,j])=>[name,{calls:j.calls,hostMs:Number(j.hostMs.toFixed(3)),scheduled:j.timer!==null,period:j.period}])),
   cooperative:Object.fromEntries([...cooperative].map(([id,item])=>[id,item.state]))};}
 return Object.freeze({enter,exit,defer,shellInterval,registerCooperativeApp,stats,isActive:active});
})();
window.LatchGamePerformance=gamePerformance;

const WINDOW_LAYOUT_KEY='latch98.desktop.window-layout.v1';
const savedWindowLayouts=(()=>{try{const data=JSON.parse(localStorage.getItem(WINDOW_LAYOUT_KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}})();
function persistWindowLayouts(){try{localStorage.setItem(WINDOW_LAYOUT_KEY,JSON.stringify(savedWindowLayouts));}catch{/* Full or unavailable browser storage must not break windows or saved files. */}}
function desktopBounds(){const r=el.layer.getBoundingClientRect();return {width:Math.max(1,r.width),height:Math.max(1,r.height)};}
function finiteDimension(v,min,max,fallback){return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:fallback;}
function layoutSlot(id){return id+(innerWidth<=650?'@compact':'@desktop');}
function saveWindowLayout(w){if(!w||w.maximized)return;const area=desktopBounds(),node=w.node;if(!node.offsetWidth||!node.offsetHeight||!area.width)return;
 savedWindowLayouts[layoutSlot(w.id)]={x:Math.round(parseFloat(node.style.left)||0),y:Math.round(parseFloat(node.style.top)||0),width:node.offsetWidth,height:node.offsetHeight};
 // Old layouts are expendable; never use virtual disk space or rewrite LatchFS data.
 const keys=Object.keys(savedWindowLayouts);for(const key of keys.slice(0,Math.max(0,keys.length-48)))delete savedWindowLayouts[key];persistWindowLayouts();
}
function boundWindow(w){if(!w||w.maximized)return;const node=w.node,area=desktopBounds();
 // Read the *computed* size: small-screen CSS can override inline window width.
 const width=node.offsetWidth,height=node.offsetHeight;if(!width||!height)return;
 if(height>area.height+1)node.style.height=Math.max(1,area.height-2)+'px';
 if(width>area.width+1&&innerWidth>650)node.style.width=Math.max(1,area.width-2)+'px';
 const usableWidth=Math.min(node.offsetWidth,area.width),usableHeight=Math.min(node.offsetHeight,area.height);
 const x=finiteDimension(parseFloat(node.style.left),-100000,100000,0),y=finiteDimension(parseFloat(node.style.top),-100000,100000,0);
 node.style.left=Math.round(Math.max(0,Math.min(area.width-usableWidth,x)))+'px';
 node.style.top=Math.round(Math.max(0,Math.min(area.height-usableHeight,y)))+'px';
}
function restoreWindowLayout(w){const saved=savedWindowLayouts[layoutSlot(w.id)];if(saved&&typeof saved==='object'){
 const area=desktopBounds();const width=finiteDimension(saved.width,120,5000,0),height=finiteDimension(saved.height,90,5000,0);
 if(width)w.node.style.width=Math.min(width,area.width-2)+'px';
 if(height)w.node.style.height=Math.min(height,area.height-2)+'px';
 w.node.style.left=finiteDimension(saved.x,-100000,100000,0)+'px';
 w.node.style.top=finiteDimension(saved.y,-100000,100000,0)+'px';
 }boundWindow(w);
}
function focusWindow(w){if(!w)return;const target=w.lastFocused?.isConnected&&w.node.contains(w.lastFocused)?w.lastFocused:w.node;
 try{target.focus({preventScroll:true});}catch{w.node.focus({preventScroll:true});}
}
function focusDesktop(){if(!el.desktop.classList.contains('hidden'))$('start-button').focus({preventScroll:true});}
let noteText='';let noteDirty=false;let notePath=null,fsClipboard=null;
function setClock(){const date=new Date();$('clock').textContent=date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});$('clock').title=date.toLocaleString();}
setClock();gamePerformance.shellInterval('clock',setClock,15000);
function restoreSavedWallpaper(){try{const saved=localStorage.getItem('latch98.wallpaper');if(['teal','blue','green','plum','gray'].includes(saved))el.desktop.dataset.wallpaper=saved;}catch{}}
restoreSavedWallpaper();
function playStartupChime(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    audioContext??=new AC();if(audioContext.state==='suspended')audioContext.resume();
    const now=audioContext.currentTime+.03,master=audioContext.createGain();master.gain.value=.36;master.connect(audioContext.destination);
    // Original four-chord startup sequence. No licensed system audio is used.
    const chords=[{t:0,f:[293.66,440,587.33],d:.64},{t:.36,f:[329.63,493.88,659.25],d:.72},{t:.78,f:[392,523.25,783.99],d:.82},{t:1.32,f:[349.23,523.25,698.46,880],d:1.2}];
    chords.forEach((c,j)=>c.f.forEach((f,i)=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),tone=audioContext.createBiquadFilter();
      osc.type=i===0?'triangle':'sine';osc.frequency.value=f;tone.type='lowpass';tone.frequency.value=1700;
      const start=now+c.t+i*.017;const vol=(i===0?.105:.060)*(j===3?1.03:1);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(vol,start+.055);gain.gain.exponentialRampToValueAtTime(.0001,start+c.d);
      osc.connect(tone);tone.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+c.d+.03);
    }));
  }catch(e){console.warn('Audio unavailable:',e);}
}
function boot(){if(booting)return;booting=true;el.startup.classList.remove('hidden');$('poweroff').classList.add('hidden');el.desktop.classList.add('hidden');el.startup.classList.add('booting');$('boot-button').disabled=true;$('boot-instruction').textContent='Initializing your desktop...';$('boot-status').textContent='Starting Latch 98...';playStartupChime();const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?650:2950;setTimeout(()=>{el.startup.classList.add('hidden');el.startup.classList.remove('booting');el.desktop.classList.remove('hidden');booting=false;$('boot-button').disabled=false;$('boot-instruction').textContent='Press the button to start your computer.';$('boot-status').textContent='Ready to start Latch 98';setClock();},duration);}
$('boot-button').addEventListener('click',()=>{
 const choice=$('boot-fullscreen');
 if(choice?.checked&&document.documentElement.requestFullscreen){
   document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
 }
 boot();
});$('restart-button').addEventListener('click',()=>{closeAll();boot();});$('sound-button').addEventListener('click',playStartupChime);
function closeMenus(){clearTimeout(menuHoverTimer);startOpen=false;submenuOwner=null;nestedOwner=null;el.start.classList.remove('l98-menu-under');el.submenu.classList.remove('l98-menu-under');el.start.classList.add('hidden');el.submenu.classList.add('hidden');el.nested.classList.add('hidden');$('context-menu').classList.add('hidden');$('start-button').classList.remove('pressed');$('start-button').setAttribute('aria-expanded','false');el.start.querySelectorAll('.menu-item').forEach(x=>x.classList.remove('active'));}
function toggleStart(focusMenu=false){if(startOpen){closeMenus();return;}closeMenus();startOpen=true;el.start.classList.remove('hidden');$('start-button').classList.add('pressed');$('start-button').setAttribute('aria-expanded','true');if(focusMenu)el.start.querySelector('.menu-item')?.focus({preventScroll:true});}
$('start-button').addEventListener('click',e=>{e.stopPropagation();toggleStart();});
const submenus={
 favorites:[['browser','LatchNet Directory','site:latchnet'],['browser','PixelShelf','site:pixelshelf'],['browser','The Norn Observer','site:norn'],['browser','TownWire','site:town']],
 programs:[['folder','Games','games'],['folder','Accessories','accessories'],['folder','Internet','internet'],['browser','Latch Browser','browser'],['settings','Latch Update','updates'],['computer','File Explorer','computer'],['run','MS-DOS Prompt','terminal']],
 games:[['bloodline','Bloodline','bloodline'],['bloodline','Bloodline (Windowed)','bloodline-windowed'],['solitaire','Solitaire','solitaire'],['minesweeper','Minesweeper','minesweeper'],['bloodline','Bloodline: Wilds','wilds'],['bloodline','Bloodline: Catacombs','catacombs'],['bloodline','Weed Warrior','weedwarrior']],
 internet:[['browser','Latch Browser','browser'],['network','SwarmWire','swarmwire'],['browser','LatchNet Directory','site:latchnet'],['browser','PixelShelf Downloads','site:pixelshelf'],['browser','Postbox WebMail','site:postbox'],['browser','TownWire News','site:town']],
 accessories:[['notepad','Notepad','notepad'],['paint','Paint','paint'],['calc','Calculator','calculator'],['help','Help','help'],['sound','Latch Sound Studio','soundstudio'],['sound','Audacity','audacity'],['paint','Latch Sprite Studio','spritestudio']],
 documents:[['documents','My Documents','documents']],
 settings:[['settings','Control Panel','control'],['disc','Floppy Disk Tray','disktray'],['settings','Display','display'],['sound','Sounds','sounds'],['about','About Latch 98','about']]
};
function showSubmenu(menu,source,depth=1){
  const target=depth===1?el.submenu:el.nested;
  if(depth===1){submenuOwner=source;nestedOwner=null;}else nestedOwner=source;
  el.start.classList.toggle('l98-menu-under',innerWidth<=600);
  el.submenu.classList.toggle('l98-menu-under',innerWidth<=600&&depth===2);
  const rows=[...(submenus[menu]||[])];
  if(menu==='accessories')for(const app of fs?.installedPrograms?.()||[])if(!['nornlab','bloodline'].includes(app.id))rows.push(['documents',app.name,app.id]);
  if(menu==='games'&&fs?.installedPrograms?.().some(p=>p.id==='nornlab'))rows.push(['documents','Norn World Lab','nornlab']);
  if(menu==='documents')for(const path of recentDocuments.filter(p=>fs?.get?.(p)).slice(0,9))rows.push(['notepad',fs.get(path).name,'file:'+path]);
  target.innerHTML=rows.map(([ico,label,key])=>`<div class="menu-item" tabindex="0" role="menuitem" ${submenus[key]?`data-sub="${key}"`:`data-app="${escapeHtml(key)}"`}>${icon(ico)}<span>${escapeHtml(label)}</span>${submenus[key]?'<span class="arrow">▶</span>':''}</div>`).join('');
  target.classList.remove('hidden');if(depth===1)el.nested.classList.add('hidden');
  const rect=source.getBoundingClientRect(),width=target.offsetWidth||185;
  let x=rect.right-1;if(x+width>innerWidth){const availableLeft=rect.left-width+1;x=availableLeft>=0?availableLeft:Math.max(0,innerWidth-width-4);}
  if(innerWidth<=600)x=Math.max(0,Math.min(innerWidth-width-3,depth===1?12:20));
  let y=rect.top-4;const maxY=innerHeight-45-target.offsetHeight;if(y>maxY)y=Math.max(0,maxY);
  target.style.left=`${x}px`;target.style.top=`${Math.max(0,y)}px`;
  el.start.querySelectorAll('.menu-item').forEach(it=>it.classList.toggle('active',depth===1&&it===source));
}
function menuAction(item){if(!item)return;const sub=item.dataset.sub,app=item.dataset.app,fsaction=item.dataset.fsaction;
 if(sub){const depth=el.start.contains(item)?1:2;showSubmenu(sub,item,depth);return;}
 if(fsaction){closeMenus();if(fsaction==='newfolder')desktopMake('folder');if(fsaction==='newtext')desktopMake('text');if(fsaction==='refresh')syncFilesystemDesktop();return;}
 if(app){closeMenus();launch(app);}
}
[el.start,el.submenu,el.nested,$('context-menu')].forEach(menu=>{menu.addEventListener('click',e=>{const item=e.target.closest('.menu-item');if(item){e.stopPropagation();menuAction(item);}});menu.addEventListener('keydown',e=>{
 const item=e.target.closest('.menu-item');if(!item)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();const entries=[...menu.querySelectorAll('.menu-item[tabindex]')];
   if(entries.length)entries[(entries.indexOf(item)+(e.key==='ArrowDown'?1:entries.length-1))%entries.length].focus();
 }else if(e.key==='ArrowRight'&&item.dataset.sub){e.preventDefault();menuAction(item);(menu===el.start?el.submenu:el.nested).querySelector('.menu-item')?.focus();}
 else if(e.key==='ArrowLeft'&&menu!==el.start){e.preventDefault();if(menu===el.nested){el.nested.classList.add('hidden');el.submenu.classList.remove('l98-menu-under');(nestedOwner?.isConnected?nestedOwner:el.submenu.querySelector('.menu-item'))?.focus();}else{el.submenu.classList.add('hidden');el.start.classList.remove('l98-menu-under');(submenuOwner?.isConnected?submenuOwner:el.start.querySelector('.menu-item'))?.focus();}}
 else if(e.key==='Enter'||e.key===' '){e.preventDefault();menuAction(item);if(item.dataset.sub)(menu===el.start?el.submenu:el.nested).querySelector('.menu-item')?.focus();}
 });});
el.start.addEventListener('mouseover',e=>{const item=e.target.closest('[data-sub]');if(item&&el.start.contains(item)&&startOpen){clearTimeout(menuHoverTimer);menuHoverTimer=setTimeout(()=>{if(startOpen)showSubmenu(item.dataset.sub,item);},180);}});
el.submenu.addEventListener('mouseover',e=>{const item=e.target.closest('[data-sub]');if(item){clearTimeout(menuHoverTimer);menuHoverTimer=setTimeout(()=>{if(startOpen&&!el.submenu.classList.contains('hidden'))showSubmenu(item.dataset.sub,item,2);},170);}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.start-menu,.submenu,.start-button,.context-menu'))closeMenus();});
document.addEventListener('keydown',e=>{
 // The modular fullscreen host owns keys until Bloodline is closed.
 if(modularGame?.isOpen())return;
 if(e.altKey&&e.key==='Tab'){e.preventDefault();
   if(!altTabCycle)altTabCycle=[...windows.values()].sort((a,b)=>(+b.node.style.zIndex)-(+a.node.style.zIndex)).map(w=>w.id);
   if(altTabCycle.length){const current=altTabCycle.indexOf(activeId),step=e.shiftKey?-1:1,next=(current+step+altTabCycle.length)%altTabCycle.length;activateWindow(altTabCycle[next]);focusWindow(windows.get(altTabCycle[next]));}
 }
 else if(e.altKey&&e.key==='F4'){if(!el.overlay.classList.contains('hidden')){e.preventDefault();hideDialog();}else if(activeId){e.preventDefault();closeWindow(activeId);}}
 else if((e.ctrlKey&&e.key==='Escape')||e.key==='Meta'){e.preventDefault();toggleStart(true);}
 else if(e.key==='Escape'){
   if(!el.overlay.classList.contains('hidden')){e.preventDefault();hideDialog();}
   else if(startOpen){e.preventDefault();closeMenus();focusDesktop();}
   else document.querySelector('.shell-popup')?.remove();
 }
 else if(e.key==='F5'&&activeId&&isExplorer(activeId)){e.preventDefault();refreshExplorer(activeId);}
 else if(e.key==='F5'&&!e.target.closest('input,textarea')){e.preventDefault();syncFilesystemDesktop();}
 else if(e.ctrlKey&&e.key.toLowerCase()==='s'&&windows.has('notepad')){e.preventDefault();saveNotepad();}
 else if(e.ctrlKey&&e.key.toLowerCase()==='s'&&activeId==='paint'){e.preventDefault();savePaint();}
 else if(e.ctrlKey&&e.key.toLowerCase()==='o'&&activeId==='notepad'){e.preventDefault();openNotepadChooser();}
 else if(e.ctrlKey&&e.key.toLowerCase()==='n'&&activeId==='notepad'){e.preventDefault();newNotepad();}
});
document.addEventListener('keyup',e=>{if(e.key==='Alt')altTabCycle=null;});
window.addEventListener('blur',()=>{altTabCycle=null;});
const desktopIcons=$('desktop-icons');let desktopTouchTime=0;
desktopIcons.addEventListener('click',e=>{
 const item=e.target.closest('.desktop-icon');if(!item)return;
 desktopIcons.querySelectorAll('.desktop-icon').forEach(x=>x.classList.remove('selected'));item.classList.add('selected');
 if(e.detail===0||shellSettings.singleClick||matchMedia('(pointer:coarse)').matches||Date.now()-desktopTouchTime<400)item.dataset.path?openFilePath(item.dataset.path):launch(item.dataset.app);
});
desktopIcons.addEventListener('pointerup',e=>{if(e.pointerType==='touch')desktopTouchTime=Date.now();});
desktopIcons.addEventListener('dblclick',e=>{const item=e.target.closest('.desktop-icon');if(item)item.dataset.path?openFilePath(item.dataset.path):launch(item.dataset.app);});
desktopIcons.addEventListener('keydown',e=>{const item=e.target.closest('.desktop-icon');if(item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();item.dataset.path?openFilePath(item.dataset.path):launch(item.dataset.app);}});
document.querySelectorAll('[data-launch]').forEach(btn=>btn.addEventListener('click',()=>launch(btn.dataset.launch)));
el.desktop.addEventListener('click',e=>{if(e.target===el.desktop||e.target===desktopIcons)desktopIcons.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));});
el.desktop.addEventListener('contextmenu',e=>{
  if(e.target.closest('.window,.start-menu,.submenu,.shell-popup'))return;
  e.preventDefault();closeMenus();
  if(e.target.closest('.taskbar')){showTaskbarContext(e);return;}
  const item=e.target.closest('.desktop-icon');
  if(item){desktopIcons.querySelectorAll('.desktop-icon').forEach(i=>i.classList.toggle('selected',i===item));showDesktopIconContext(item,e.clientX,e.clientY);}
  else showDesktopContext(e.clientX,e.clientY);
});
function titleOf(id){const w=windows.get(id);if(w&&isExplorer(id))return w.node.querySelector('.titlebar .caption')?.textContent||'Explorer';if(id.startsWith('viewer:'))return fs.get(id.slice(7))?.name+' - Imaging';if(id.startsWith('explorer:'))return window.LatchFS?.display(id.slice(9))||'Explorer';return ({computer:'My Computer',documents:'My Documents',network:'Network Neighborhood',bin:'Recycle Bin',browser:'Latch Browser',notepad:'Untitled - Notepad',paint:'Paint',calculator:'Calculator',minesweeper:'Minesweeper',solitaire:'Solitaire',swarmwire:'SwarmWire',nornlab:'Norn World Lab',bloodline:'Bloodline', 'bloodline-windowed':'Bloodline (Windowed)',wilds:'Bloodline: Wilds',catacombs:'Bloodline: Catacombs',weedwarrior:'Weed Warrior',soundstudio:'Latch Sound Studio',audacity:'Audacity',spritestudio:'Latch Sprite Studio',latchamp:'LatchAmp',updates:'Latch Update',disktray:'3½ Floppy Disk (A:)',cdrom:'CD-ROM Drive (D:)',addremove:'Add/Remove Programs Properties',charmap:'Character Map',about:'About Latch 98',display:'Display Properties',control:'Control Panel',sounds:'Sounds',terminal:'MS-DOS Prompt',help:'Latch 98 Help',find:'Find: All Files'}[id]||id);}
function iconOf(id){if(id.startsWith('viewer:'))return 'paint';if(id.startsWith('explorer:'))return 'folder';return ({computer:'computer',documents:'documents',network:'network',bin:'bin',browser:'browser',notepad:'notepad',paint:'paint',calculator:'calc',minesweeper:'minesweeper',solitaire:'solitaire',swarmwire:'network',nornlab:'documents',bloodline:'bloodline','bloodline-windowed':'bloodline',wilds:'bloodline',catacombs:'bloodline',weedwarrior:'bloodline',soundstudio:'sound',audacity:'sound',spritestudio:'paint',latchamp:'sound',updates:'settings',cdrom:'disc',disktray:'disc',addremove:'settings',charmap:'documents',about:'computer',display:'settings',control:'settings',sounds:'sound',terminal:'run',help:'help',find:'run'}[id]||'folder');}
// The default Bloodline launcher leaves the Latch desktop completely.
// The same existing game file is also available in a separate Latch window.
function sourceAppPage(path){
 path=path.replace(/^apps\//,'');
 const here=new URL(document.baseURI);
 return new URL(/\/web\/(?:index\.html)?$/i.test(here.pathname)?'../apps/'+path:'apps/'+path,here).href;
}
function bloodlinePage(){
 const here=new URL(document.baseURI);
 if(/\/web\/(?:index\.html)?$/i.test(here.pathname))return sourceAppPage('bloodline/bloodline.html');
 return new URL(/\/latch98\/?(?:index\.html)?$/i.test(here.pathname)?'../game/bloodline.html':'game/bloodline.html',here).href;
}
// Unlike direct navigation, this modular launcher preserves all open Latch windows.
// Kept independent of LatchBundle, which is supplied by the single-file build.
const modularGame=(()=>{
 const host=$('l98-modular-game');if(!host)return null;
 const frame=host.querySelector('iframe');let lastFocus=null,comboSince=0,exitPoll=null;
 const opened=()=>!host.classList.contains('hidden');
 function closeFullscreenGame(){if(!opened())return;
   frame.removeAttribute('src');frame.onload=null;frame.onerror=null;host.classList.add('hidden');
   // Windows, taskbar and virtual filesystem are intentionally not recreated.
   el.desktop.classList.remove('hidden');comboSince=0;stopExitPoll();gamePerformance.exit('modular-bloodline');
   if(lastFocus?.isConnected&&lastFocus.getClientRects().length&&!lastFocus.closest('.hidden'))lastFocus.focus({preventScroll:true});
   else focusDesktop();
 }
 function launchBloodlineFull(){if(opened())return;
   closeMenus();lastFocus=document.activeElement;
   frame.removeAttribute('src');host.classList.remove('hidden');
   el.desktop.classList.add('hidden');gamePerformance.enter('modular-bloodline');startExitPoll();
   frame.onerror=()=>{closeFullscreenGame();showDialog('Bloodline','<p>Bloodline could not be loaded. Check the game files and try again.</p>');};
   frame.onload=()=>{try{
     // Same-origin frames don't send key events to the parent window.
     frame.contentWindow.addEventListener('keydown',onGameKey,true);frame.focus({preventScroll:true});
   }catch{/* A remote host may disallow in-frame keyboard listeners. */}};
   frame.src=bloodlinePage();frame.focus({preventScroll:true});
 }
 function onGameKey(e){if(e.ctrlKey&&e.shiftKey&&e.key==='Escape'){
   e.preventDefault();e.stopImmediatePropagation();closeFullscreenGame();
 }}
 host.querySelector('[data-l98-modular-return]').addEventListener('click',closeFullscreenGame);
 document.addEventListener('keydown',e=>{if(opened())onGameKey(e);},true);
 // Match the single-file build's console Back + Start hold shortcut.
 function pollGameExit(){if(!opened()){comboSince=0;return;}
   const pads=navigator.getGamepads?.()||[];
   const pressed=[...pads].some(p=>p&&p.buttons?.[8]?.pressed&&p.buttons?.[9]?.pressed);
   if(!pressed){comboSince=0;return;}
   if(!comboSince)comboSince=performance.now();
   else if(performance.now()-comboSince>1100){comboSince=0;closeFullscreenGame();}
 }
 function startExitPoll(){if(exitPoll===null)exitPoll=setInterval(pollGameExit,130);}
 function stopExitPoll(){if(exitPoll!==null){clearInterval(exitPoll);exitPoll=null;}}
 return {launchBloodlineFull,closeFullscreenGame,isOpen:opened};
})();
// Integration hook for browser-hosted builds; no conflict with LatchBundle.
window.LatchDesktop={launchBloodlineFull:()=>modularGame?.launchBloodlineFull(),closeFullscreenGame:()=>modularGame?.closeFullscreenGame()};
// Basic controller navigation of the shell (not game input). D-pad/stick selects
// visible desktop icons, task buttons and menus; A opens, B backs out, Start opens Start.
// When focus belongs to an app iframe, let that game handle its own controller.
(()=>{
 let lastStep=0,wasA=false,wasB=false,wasStart=false;
 const usable=()=>!el.desktop.classList.contains('hidden')&&$('poweroff').classList.contains('hidden')&&!modularGame?.isOpen();
 function targets(){
   if(startOpen){const menu=!el.nested.classList.contains('hidden')?el.nested:!el.submenu.classList.contains('hidden')?el.submenu:el.start;return [...menu.querySelectorAll('.menu-item[tabindex]')];}
   return [...desktopIcons.querySelectorAll('.desktop-icon:not(.hidden)'),$('start-button'),...el.taskbar.querySelectorAll('.task-btn')];
 }
 function move(direction){const all=targets();if(!all.length)return;
   const focus=document.activeElement,index=all.indexOf(focus),next=index===-1?0:(index+direction+all.length)%all.length;
   all[next].focus({preventScroll:true});
 }
 function select(){const target=document.activeElement;
   if(target?.matches('.desktop-icon,.menu-item,.task-btn,.start-button,.ctrl')){
     target.click();if(target.dataset.sub)(target.closest('.start-menu')?el.submenu:el.nested).querySelector('.menu-item')?.focus({preventScroll:true});
   }else if(target?.matches('button'))target.click();
   else move(1);
 }
 gamePerformance.shellInterval('desktop-controller',()=>{
   if(!usable()||document.activeElement?.tagName==='IFRAME'){lastStep=0;wasA=wasB=wasStart=false;return;}
   const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);if(!pad)return;
   const down=i=>!!pad.buttons?.[i]?.pressed;
   const start=down(9),a=down(0),b=down(1);
   if(start&&!wasStart&&!down(8)){toggleStart(true);}wasStart=start;
   if(b&&!wasB){if(startOpen){closeMenus();$('start-button').focus();}else if(!el.overlay.classList.contains('hidden'))hideDialog();else $('start-button').focus();}wasB=b;
   if(a&&!wasA)select();wasA=a;
   if(Date.now()-lastStep<190)return;
   const forward=down(13)||down(15)||pad.axes?.[1]>.65||pad.axes?.[0]>.65;
   const backward=down(12)||down(14)||pad.axes?.[1]<-.65||pad.axes?.[0]<-.65;
   if(forward!==backward){move(forward?1:-1);lastStep=Date.now();}
 },120);
})();
function launch(id){
 if(id==='bloodline'&&!window.LatchBundle?.isStandalone&&modularGame){modularGame.launchBloodlineFull();return;}
 if(id==='bloodline'){if(window.LatchBundle?.isStandalone){window.LatchBundle.launchBloodlineFull();return;}window.location.assign(bloodlinePage());return;}
 if(id.startsWith('file:')){openFilePath(id.slice(5));return;}
 if(id.startsWith('site:')){launch('browser');window.LatchNet?.active?.navigate(window.LatchNet.addresses[id.slice(5)]||window.LatchNet.home);return;}
 if(id==='nornlab'&&!fs.installedPrograms().some(p=>p.id==='nornlab')){showDialog('Norn World Lab','<p>Install Norn World Lab before starting the program.</p>');return;}
 if(id==='latchamp'&&!fs.installedPrograms().some(p=>p.id==='latchamp')){showDialog('LatchAmp','<p>Install LatchAmp with Latch Update before starting it.</p>');return;}
 if(id==='charmap'&&!fs.installedPrograms().some(p=>p.id==='charmap')){showDialog('Latch 98','<p>Character Map has not been installed.</p>');return;}
 if(id==='shutdown'){showShutdown();return;}if(id==='run'){showRun();return;}
 if(id.startsWith('explorer:'))id='explorer:'+LatchFS.canonical(id.slice(9));
 if(id.startsWith('viewer:'))id='viewer:'+LatchFS.canonical(id.slice(7));

 if(windows.has(id)){const w=windows.get(id);activateWindow(id);focusWindow(w);return;}
 const n=++serial,small=['about','calculator','sounds','display','control','help','find','disktray','addremove','charmap'].includes(id),size=({computer:[575,390],documents:[555,350],network:[470,330],bin:[450,290],browser:[760,560],swarmwire:[640,455],nornlab:[800,580],'bloodline-windowed':[920,635],wilds:[950,650],catacombs:[900,620],weedwarrior:[770,580],soundstudio:[920,620],audacity:[980,640],spritestudio:[1024,700],latchamp:[780,610],updates:[540,420],cdrom:[475,290],notepad:[530,380],paint:[655,465],calculator:[335,405],minesweeper:[320,405],solitaire:[790,580],explorer:[650,440],about:[390,300],display:[565,445],control:[490,340],sounds:[430,290],terminal:[550,325],disktray:[500,370],addremove:[510,385],charmap:[510,410],help:[480,365],find:[440,310]})[id]||[(id.startsWith('explorer:')?650:id.startsWith('viewer:')?480:(small?425:500)),(id.startsWith('explorer:')?440:id.startsWith('viewer:')?400:340)];
 const node=document.createElement('div');node.className='window';node.dataset.id=id;node.tabIndex=-1;node.setAttribute('role','region');node.setAttribute('aria-label',titleOf(id)+' window');node.style.width=Math.min(size[0],innerWidth-16)+'px';node.style.height=Math.min(innerWidth<=650&&id==='browser'?innerHeight-55:size[1],innerHeight-55)+'px';
 const left=Math.max(2,Math.min(innerWidth-size[0]-9,75+(n%7)*28));const top=Math.max(2,Math.min(innerHeight-size[1]-51,48+(n%7)*21));node.style.left=(innerWidth<=650?4:left)+'px';node.style.top=top+'px';
 node.innerHTML=`<div class="titlebar" data-drag="1">${icon(iconOf(id))}<span class="caption">${titleOf(id)}</span><div class="controls"><button class="ctrl" data-window-action="min" title="Minimize">_</button><button class="ctrl" data-window-action="max" title="Maximize">□</button><button class="ctrl" data-window-action="close" title="Close">×</button></div></div>${(['notepad','paint','computer','documents','network','bin','browser','terminal'].includes(id)||id.startsWith('explorer:'))?`<div class="window-menubar"><button data-window-menu="file">File</button><button data-window-menu="edit">Edit</button>${isExplorer(id)?`<button data-window-menu="view">View</button><button data-window-menu="go">Go</button>`:``}<button data-window-menu="help">Help</button></div>`:''}<div class="window-content">${appHtml(id)}</div>${(['computer','documents','network','bin','notepad','paint'].includes(id)||id.startsWith('explorer:'))?'<div class="statusbar"><span class="status-text">Ready</span></div>':''}`;
 el.layer.append(node);const w={id,node,minimized:false,maximized:false,previous:null,lastFocused:null};windows.set(id,w);restoreWindowLayout(w);
 node.querySelectorAll('[data-window-action]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const action=btn.dataset.windowAction;if(action==='close')closeWindow(id);if(action==='min')minimizeWindow(id);if(action==='max')maximizeWindow(id);}));
 node.querySelectorAll('[data-window-menu]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const menu=btn.dataset.windowMenu;
  if(id==='paint'){if(menu==='file')showPaintFileMenu(btn);else if(menu==='help')launch('help');}
  else if(id==='notepad'){if(menu==='file')showNotepadFileMenu(btn);else if(menu==='edit')node.querySelector('textarea')?.focus();else launch('help');}
  else if(isExplorer(id)){if(menu==='file')showExplorerFileMenu(id,btn);else if(menu==='edit')showExplorerEditMenu(id,btn);else if(menu==='view')showExplorerViewMenu(id,btn);else if(menu==='go')showExplorerGoMenu(id,btn);else launch('help');}
  else if(menu==='help')launch('help');else showDialog('File','<p>This program has no additional commands yet.</p>');
 }));
 node.addEventListener('focusin',e=>{if(e.target!==node)w.lastFocused=e.target;});
 node.addEventListener('pointerdown',()=>activateWindow(id));
 // Persist explicit user resize at pointer release, not responsive CSS changes.
 node.addEventListener('pointerdown',e=>{if(e.button!==0||w.maximized||innerWidth<=650)return;const r=node.getBoundingClientRect();
   if(r.right-e.clientX>20||r.bottom-e.clientY>20)return;
   const finish=()=>{window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);boundWindow(w);saveWindowLayout(w);};
   window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});
 });
 setupDrag(node,id);setupApp(id,node);activateWindow(id);focusWindow(w);
}
function appHtml(id){if(id.startsWith('viewer:'))return `<div class="image-viewer"><img alt="Picture" src="${escapeHtml(fs.get(id.slice(7))?.data||'')}"></div>`;if(id.startsWith('explorer:'))return fileExplorer(id.slice(9));switch(id){
 case 'computer':return fileExplorer('computer');
 case 'disktray':return `<div class="l98-panel"><h3>3½ Floppy Disk (A:)</h3><div class="l98-group"><p>Use the disk tray to exchange disks in drive A:.</p><div class="l98-status l98-media-status"></div><div class="l98-row"><label for="l98-disks">Disk:</label><select id="l98-disks"></select></div><div class="l98-row"><button class="classic-btn" data-media-action="insert">Insert Disk</button><button class="classic-btn" data-media-action="eject">Eject</button><button class="classic-btn" data-media-action="blank">Create Blank Disk...</button></div></div><p style="font-size:11px">The disk tray holds disks available to this computer. Use Insert Disk or Eject to change what is in drive A:.</p></div>`;
 case 'addremove':return `<div class="l98-panel"><h3>Add/Remove Programs Properties</h3><div class="l98-group"><p>To remove a program, select it from the list below.</p><div class="l98-file-list l98-installed"></div><div class="l98-row"><button class="classic-btn" data-uninstall="1">Add/Remove...</button><button class="classic-btn" data-add-software="1">Install...</button></div></div><p style="font-size:11px">Programs installed using Latch Setup appear in this list.</p></div>`;
 case 'charmap':return `<div class="l98-panel" style="display:flex;flex-direction:column;gap:8px"><label>Font: <select id="l98-charmap-font"><option>Times New Roman</option><option>Arial</option><option>Courier New</option></select></label><div class="l98-chars" aria-label="Character grid"></div><div class="l98-row">Characters to copy: <input id="l98-char-selection" class="retro-input" style="flex:1;min-width:100px"></div><div class="l98-row"><button class="classic-btn" data-copy-chars="1">Copy</button><button class="classic-btn" data-charmap-select="1">Select</button></div></div>`;
 case 'documents':return fileExplorer('C:/My Documents');
 case 'network':return `<div class="helper-panel">${icon('network')}<h3>Network Neighborhood</h3><p>Unable to browse the network.</p><p class="menu-tip">Check the network connection and try again.</p></div>`;
 case 'bin':return fileExplorer('C:/Recycled');
 case 'browser':return `<div class="latch-browser-root" style="height:100%;min-height:0"><div class="helper-panel">Connecting to LatchNet...</div></div>`;
 case 'swarmwire':return `<div class="swarmwire-root" style="height:100%"></div>`;
 case 'updates':return `<div class="l98-update-host" style="height:100%;overflow:hidden"></div>`;
 case 'cdrom':return `<div class="l98-panel"><h3>CD-ROM Drive (D:)</h3><div class="l98-group"><div class="l98-cd-status"></div><p>To insert a disc image, open an ISO file in Explorer.</p><button class="classic-btn" data-disc-eject="1">Eject Disc</button> <button class="classic-btn" data-disc-browse="1">Open Drive D:</button></div></div>`;
 case 'bloodline-windowed':return `<div class="bloodline-host"><span class="l98-game-loading">Starting Bloodline...</span></div>`;
 case 'wilds':case 'catacombs':case 'weedwarrior':case 'soundstudio':case 'audacity':case 'spritestudio':case 'latchamp':return `<div class="l98-extras-host">Starting ${escapeHtml(titleOf(id))}...</div>`;
 case 'nornlab':return `<div class="norn-loader"><strong>NORN WORLD LAB</strong><span>Initializing laboratory interface...</span><div class="norn-bars"><span></span><span></span><span></span></div></div>`;
 case 'notepad':return `<textarea class="notepad-box" spellcheck="false" aria-label="Notepad text" placeholder=""></textarea>`;
 case 'paint':return `<div class="paint-tools"><strong>Paint</strong> <label>Color <input aria-label="Paint color" id="paint-color" type="color" value="#000000"></label><button class="classic-btn" style="min-width:70px" data-action="clear-paint">Clear</button><span style="margin-left:auto;font-size:11px">Drag to draw</span></div><div class="paint-area"><canvas class="paint-canvas" width="900" height="550" aria-label="Drawing canvas"></canvas></div>`;
 case 'minesweeper':return `<div class="minesweeper-host"><div class="minesweeper-loading">Starting Minesweeper...</div></div>`;
 case 'solitaire':return `<div class="solitaire-host" aria-label="Solitaire game">Starting Solitaire...</div>`;
 case 'calculator':return `<div class="calculator"><div class="calc-display" aria-live="polite">0</div><div class="calc-buttons">${['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='].map(c=>`<button class="classic-btn ${'÷×−+='.includes(c)?'op':''}" data-calc="${c}">${c}</button>`).join('')}</div></div>`;
 case 'about':return `<div class="about-body"><div class="about-head"><svg class="mark" viewBox="0 0 100 100"><use href="#mark-latch"/></svg><div><strong>Latch 98</strong><br>Version 0.9.0<br>Second Edition</div></div><div class="bevel-in" style="width:100%"></div><p>Copyright © 1998 Latch Computer Co.<br>All rights reserved.</p><small>Registered to: Latch 98 User</small><button class="classic-btn" data-action="close-self">OK</button></div>`;
 case 'display':return `<div class="l98-display"><div class="l98-display-tabs" role="tablist">${['Background','Screen Saver','Appearance','Effects','Web','Settings'].map((tab,i)=>`<button type="button" class="l98-display-tab ${!i?'active':''}" role="tab" data-display-tab="${tab}" aria-selected="${!i}">${tab}</button>`).join('')}</div><div class="l98-display-page"></div><div class="l98-display-footer"><button class="classic-btn default" data-display-action="ok">OK</button><button class="classic-btn" data-display-action="cancel">Cancel</button><button class="classic-btn" data-display-action="apply">Apply</button></div></div>`;
 case 'control':return `<div class="file-view"><div class="file-item" data-launch="cdrom">${icon('disc')}<span>CD-ROM Drive (D:)</span></div><div class="file-item" data-launch="addremove">${icon('settings')}<span>Add/Remove Programs</span></div><div class="file-item" data-launch="disktray">${icon('disc')}<span>Floppy Disk (A:)</span></div><div class="file-item" data-launch="display">${icon('settings')}<span>Display</span></div><div class="file-item" data-launch="sounds">${icon('sound')}<span>Sounds</span></div><div class="file-item" data-launch="about">${icon('computer')}<span>System</span></div></div>`;
 case 'sounds':return `<div class="settings-body"><h3>Sound Properties</h3><p>Startup sound: <strong>Latch 98 Chime</strong></p><p>Sound event: Start Latch 98</p><div><button class="classic-btn" data-action="play-sound">▶ Preview</button> <button class="classic-btn" data-action="close-self">OK</button></div></div>`;
 case 'terminal':return `<div class="terminal dos-terminal"><div class="dos-output"></div><div class="dos-line"><span class="dos-prompt">C:\&gt;</span><input class="dos-input" aria-label="Command" spellcheck="false" autocomplete="off" autocapitalize="off"></div></div>`;
 case 'help':return `<div class="helper-panel"><h2 style="color:#000080;margin-top:0">Welcome to Latch 98 Help</h2><p>Your desktop is ready. Here's where to begin:</p><ul class="help-list"><li>Click <strong>Start</strong> for programs, settings and Shut Down.</li><li>Double-click desktop icons, or tap once on a phone.</li><li>Drag window title bars; use □ to maximize and _ to minimize. Window positions are remembered and fitted to the screen after resizing.</li><li><strong>Keyboard:</strong> Ctrl+Esc opens Start; use arrow keys, Enter and Escape to navigate. Alt+Tab switches windows, Alt+F4 closes the active window, and F5 refreshes Explorer.</li><li><strong>Bloodline:</strong> the normal shortcut opens fullscreen; the separate Windowed shortcut stays in Latch. Use the on-screen Return control, Ctrl+Shift+Esc, or hold controller Back+Start to leave fullscreen.</li><li><strong>Looking for unusual software?</strong> Some programs are shared privately rather than listed on public download sites. Check your mail and explore files and installers.</li><li>Double-click <strong>My Computer</strong> to browse C: and A:. Create and rename folders or files; use Copy, Cut, and Paste.<br><br>Open a text document in Notepad and save with <strong>Ctrl+S</strong>.</li><li>Use Start &gt; Settings &gt; Display to change the desktop background.</li><li>Open <strong>Latch Browser</strong> to explore the web, or type a <code>.l98</code> address into Run.</li></ul><p class="menu-tip">Choose Floppy Disk (A:) in Control Panel to exchange disks. Run Setup.exe on the Utilities disk to install Character Map. You can remove it from Add/Remove Programs.</p></div>`;
 case 'find':return `<div class="settings-body"><h3>Find: All Files</h3><label>Named: <input class="retro-input" id="find-query" placeholder="e.g. Journal.txt"></label><button class="classic-btn" data-action="find-app">Find Now</button><div id="find-result" class="bevel-in" style="background:white;padding:7px;min-height:58px">Enter a program name to search.</div></div>`;
 default:return `<div class="helper-panel">Latch 98</div>`;
}}
function oldFileExplorer(where,...names){const glyph=name=>name.includes('Floppy')?'disc':name.includes('Disk')?'disc':name.includes('Control')?'settings':name.endsWith('.txt')?'notepad':'folder';return `<div class="explorer-tools"><button data-action="up">⬆ Up</button><button data-action="refresh">↻ Refresh</button><button data-launch="help">? Help</button></div><div class="explorer-address"><label>Address</label><div class="address">${where}</div></div><div class="file-view" style="height:calc(100% - 61px)">${names.map(name=>`<div class="file-item" data-file="${name.replaceAll('"','&quot;')}">${icon(glyph(name))}<span>${name}</span></div>`).join('')}</div>`;}
function fileExplorer(path){return `<div class="explorer-shell" data-start-path="${escapeHtml(path)}"><div class="explorer-toolbar"><button data-fs-cmd="back" title="Back">◀ Back</button><button data-fs-cmd="forward" title="Forward">▶ Forward</button><button data-fs-cmd="up" title="Up One Level">⬆ Up</button><span class="toolbar-sep"></span><button data-fs-cmd="cut">✂ Cut</button><button data-fs-cmd="copy">▤ Copy</button><button data-fs-cmd="paste">▣ Paste</button><span class="toolbar-sep"></span><button data-fs-cmd="newfolder">📁 New Folder</button><button data-fs-cmd="folders">Folders</button><button data-fs-cmd="views" title="Change View">▦ Views</button><button data-fs-cmd="disktray" title="Exchange disks">${icon('disc')} A:</button><button data-fs-cmd="emptybin" class="empty-bin-btn">Empty Recycle Bin</button></div><div class="explorer-location"><label>Address</label><input class="fs-address" aria-label="Folder address" spellcheck="false"><button data-fs-cmd="go">Go</button></div><div class="explorer-main"><nav class="explorer-tree" aria-label="Folders"></nav><div class="explorer-filepane"><div class="explorer-headings" aria-hidden="true"><button data-fs-sort="name">Name</button><button data-fs-sort="size">Size</button><button data-fs-sort="type">Type</button><button data-fs-sort="modified">Modified</button></div><div class="explorer-results" tabindex="0" aria-label="Files"><div class="explorer-wait">Reading disk...</div></div></div></div></div>`;}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function isExplorer(id){return ['computer','documents','bin'].includes(id)||id.startsWith('explorer:');}
function setupApp(id,node){
 node.querySelectorAll('[data-launch]').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.launch)));
 node.querySelectorAll('[data-file]').forEach(b=>b.addEventListener('dblclick',()=>openFile(b.dataset.file)));
 node.querySelectorAll('[data-file]').forEach(b=>b.addEventListener('click',e=>{if(matchMedia('(pointer:coarse)').matches)openFile(b.dataset.file);}));
 node.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{
   const action=b.dataset.action;
   if(action==='close-self')closeWindow(id);else if(action==='play-sound')playStartupChime();else if(action==='clear-paint')clearPaint(node);else if(action==='find-app')doFind(node);else if(action==='up')launch('computer');else if(action==='home')launch('browser');else if(action==='refresh')node.querySelector('.status-text')&&(node.querySelector('.status-text').textContent='Updated');
 }));
 if(isExplorer(id))setupExplorer(id,node);
 if(id==='updates'){const api=window.LatchUpdater?.mount(node.querySelector('.l98-update-host'),{fs,showError:fsError,openFolder:path=>launch('explorer:'+path),runSetup:showSoftwareSetup});if(api)windows.get(id).cleanup=()=>api.destroy();}
 if(id==='swarmwire')setupSwarmWire(node);if(id==='bloodline-windowed')setupBloodlineWindow(node);if(id==='nornlab')setupNornWorldLab(node);if(id==='cdrom')setupCdrom(node);
 if(id==='disktray')setupDiskTray(node);if(id==='addremove')setupAddRemove(node);if(id==='charmap')setupCharMap(node);
 if(id==='terminal')setupTerminal(node);
 if(id==='browser'){const api=window.LatchNet?.mount(node.querySelector('.latch-browser-root'),{openApp:launch,saveAttachment:saveMailAttachment});if(api)windows.get(id).cleanup=()=>api.destroy();}
 if(id==='minesweeper')setupMinesweeper(node);
 if(id==='solitaire')setupSolitaire(node);
 if(['wilds','catacombs','weedwarrior','soundstudio','audacity','spritestudio','latchamp'].includes(id))setupExtraWindow(node,id);
 if(id==='notepad')setupNotepad(node);
 if(id==='calculator')setupCalculator(node);
 if(id==='paint')setupPaint(node);
 if(id==='display')setupDisplayProperties(node);
 if(false)node.querySelector('.status-text').textContent=`${node.querySelectorAll('[data-file]').length} object(s)`;
}
// File Explorer and Notepad share the same disk.
const fs=window.LatchFS;
function fsError(error){showDialog('Latch 98',`<p>${escapeHtml(error.message||error)}</p>`,[{label:'OK'}]);}
function prompt98(title,message,initial,callback){let value=initial||'';showDialog(title,`<p>${escapeHtml(message)}</p><input id="entry98" class="retro-input" value="${escapeHtml(value)}" spellcheck="false">`,[{label:'OK',action:()=>{try{callback(value);}catch(e){fsError(e);}}},{label:'Cancel'}]);const inp=$('entry98');inp.addEventListener('input',()=>value=inp.value);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();value=inp.value;hideDialog();try{callback(value);}catch(err){fsError(err);}}});inp.focus();inp.select();}
function ask98(title,message,doYes){showDialog(title,`<p>${escapeHtml(message)}</p>`,[{label:'Yes',action:doYes},{label:'No'}]);}

function showDiskTrayPrompt(){showDialog('3½ Floppy Disk (A:)','<p>There is no disk in drive A:.</p><p>Insert a disk from the disk tray to continue.</p>',[{label:'Disk Tray...',action:()=>launch('disktray')},{label:'Cancel'}]);}
function setupDiskTray(node){
 const sel=node.querySelector('#l98-disks'),status=node.querySelector('.l98-media-status');
 function render(){const info=fs.mediaInfo();sel.innerHTML=info.disks.map(d=>`<option value="${escapeHtml(d.id)}" ${d.id===info.mounted?'selected':''}>${escapeHtml(d.name)}${d.readOnly?' (write-protected)':''}</option>`).join('');status.innerHTML=info.mounted?`Disk in drive A: <b>${escapeHtml(info.disks.find(d=>d.id===info.mounted)?.name||'Unknown')}</b>`:'Drive A: is empty.';}
 node.querySelector('[data-media-action="insert"]').onclick=()=>{try{fs.switchMedia(sel.value);render();}catch(e){fsError(e);}};
 node.querySelector('[data-media-action="eject"]').onclick=()=>{try{fs.switchMedia(null);render();}catch(e){fsError(e);}};
 node.querySelector('[data-media-action="blank"]').onclick=()=>prompt98('Format New Floppy Disk','Name for the new disk:','New Disk',name=>{fs.createBlankDisk(name);render();});
 render();node._l98Refresh=render;
}
function showSoftwareSetup(program){
 const def={charmap:'Character Map',nornlab:'Norn World Lab',latchamp:'LatchAmp'}[program];if(!def){fsError('This setup file cannot be opened.');return;}
 const installed=fs.installedPrograms().find(p=>p.id===program);const upgrading=program==='latchamp'&&!!installed&&installed.version!=='1.10';
 if(installed&&!upgrading){showDialog('Setup','<p>This program is already up to date.</p>');return;}
 showDialog(`${def} Setup`,`<div class="l98-installer-banner"><span class="l98-floppy">${icon('disc')}</span><div><strong>Welcome to the ${escapeHtml(def)} Setup program.</strong><p>This wizard will ${upgrading?'upgrade':'install'} ${escapeHtml(def)} on your computer.</p></div></div><p>Click Next to continue.</p>`,[{label:'Next >',action:()=>showDialog(`${def} Setup`,`<p>Setup will ${upgrading?'upgrade':'install'} ${escapeHtml(def)} in:</p><div class="l98-status">${program==='nornlab'?'C:\\Program Files\\Norn World Lab':program==='latchamp'?'C:\\Program Files\\LatchAmp':'C:\\Program Files\\Accessories\\Character Map'}</div><p>Click ${upgrading?'Upgrade':'Install'} to begin.</p>`,[{label:upgrading?'Upgrade':'Install',action:()=>{try{fs.installSoftware(program);showDialog('Setup Complete',`<p>${escapeHtml(def)} has been ${upgrading?'updated':'installed'} successfully.</p><p>You can find it in ${program==='nornlab'?'Start > Programs > Games':'Start > Programs > Accessories'}.</p>`,[{label:'Finish'}]);}catch(e){fsError(e);}}},{label:'Cancel'}])},{label:'Cancel'}]);
}
function setupAddRemove(node){let selected=null;const list=node.querySelector('.l98-installed');
 const render=()=>{const apps=fs.installedPrograms();list.innerHTML=apps.length?apps.map(a=>`<button class="l98-program-entry ${selected===a.id?'selected':''}" data-program-id="${escapeHtml(a.id)}">${icon('documents')} ${escapeHtml(a.name)}</button>`).join(''):'<p style="padding:10px">No additional programs are installed.</p>';list.querySelectorAll('[data-program-id]').forEach(b=>b.onclick=()=>{selected=b.dataset.programId;list.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});};
 node.querySelector('[data-uninstall]').onclick=()=>{if(!selected){showDialog('Add/Remove Programs','Select a program to remove.');return;}ask98('Uninstall',`Are you sure you want to remove ${escapeHtml(selected==='charmap'?'Character Map':selected)} and all of its components?`,()=>{try{fs.uninstallSoftware(selected);if(windows.has(selected))closeWindow(selected);selected=null;render();}catch(e){fsError(e);}});};
 node.querySelector('[data-add-software]').onclick=()=>showDialog('Install Program','<p>Insert the installation disk into drive A:, then run Setup.exe.</p>',[{label:'Disk Tray...',action:()=>launch('disktray')},{label:'Open Drive A:',action:()=>launch('explorer:A:')},{label:'Cancel'}]);
 render();node._l98Refresh=render;
}
function setupCharMap(node){const grid=node.querySelector('.l98-chars'),output=node.querySelector('#l98-char-selection'),font=node.querySelector('#l98-charmap-font');
 const cps=[...Array.from({length:95},(_,i)=>i+32),...Array.from({length:96},(_,i)=>i+160)];let chosen='';
 grid.innerHTML=cps.map(c=>`<button type="button" data-codepoint="${c}" title="U+${c.toString(16).toUpperCase().padStart(4,'0')}">${escapeHtml(String.fromCharCode(c))}</button>`).join('');
 font.onchange=()=>{grid.querySelectorAll('button').forEach(b=>b.style.fontFamily=font.value);};
 grid.onclick=e=>{const b=e.target.closest('[data-codepoint]');if(!b)return;chosen=String.fromCharCode(+b.dataset.codepoint);grid.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));};
 node.querySelector('[data-charmap-select]').onclick=()=>{output.value+=chosen;output.focus();};
 node.querySelector('[data-copy-chars]').onclick=async()=>{try{await navigator.clipboard.writeText(output.value);}catch{output.focus();output.select();showDialog('Character Map','<p>Select the characters and press Ctrl+C to copy.</p>');}};
}
// Mail attachment -> SwarmWire -> installed disc workflow.
function saveMailAttachment(action){fs.ready.then(()=>{try{
 const path=fs.saveNornTorrent();
 if(action==='open'){openSwarmTorrent(path);return;}
 showDialog('Postbox - Attachment Saved',`<p>Saved <b>NWLAB03.torrent</b> to:</p><div class="l98-status">C:\\Downloads</div><p>Open the file with SwarmWire when you are ready.</p>`,[{label:'Open Now',action:()=>openSwarmTorrent(path)},{label:'Close'}]);
 }catch(e){fsError(e);}});}
function openSwarmTorrent(path){window.LATCH_PENDING_TORRENT=path;launch('swarmwire');window.SwarmWire?.active?.addTorrent(path);window.LATCH_PENDING_TORRENT=null;}
function mountNornDisc(path){try{fs.mountDisc(path);showDialog('CD-ROM Drive (D:)','<p>The Norn World Lab disc has been inserted into drive D:.</p>',[{label:'Open Disc',action:()=>launch('explorer:D:')},{label:'Close'}]);}catch(e){fsError(e);}}
function setupCdrom(node){function render(){const info=fs.discInfo();node.querySelector('.l98-cd-status').textContent=info.mounted?'Disc in drive: '+info.label:'The drive is empty.';}
 node.querySelector('[data-disc-eject]').onclick=()=>{try{fs.ejectDisc();render();}catch(e){fsError(e);}};
 node.querySelector('[data-disc-browse]').onclick=()=>{if(fs.discInfo().mounted)launch('explorer:D:');else launch('explorer:C:/Downloads');};render();}
function setupSwarmWire(node){const api=window.SwarmWire?.mount(node.querySelector('.swarmwire-root'),{fs,showError:fsError,openFolder:()=>launch('explorer:C:/Downloads'),mountDisc:mountNornDisc,pickTorrent:(add,initial)=>prompt98('Open Torrent File','Torrent filename:',initial,add)});if(api)windows.get('swarmwire').cleanup=()=>api.destroy();}
async function setupBloodlineWindow(node){
 const holder=node.querySelector('.bloodline-host');if(!holder)return;
 const embedded=window.LatchBundle?.isStandalone;
 const start=(html,remote)=>{
   const iframe=document.createElement('iframe');iframe.className='bloodline-frame';
   iframe.title='Bloodline';
   if(html)iframe.srcdoc=html;else iframe.src=remote||bloodlinePage();
   iframe.setAttribute('allow','fullscreen; gamepad');iframe.setAttribute('allowfullscreen','');
   holder.replaceChildren(iframe);
 };
 if(embedded){const html=await window.LatchBundle.bloodline();
   if(html)start(html);
   else await window.LatchBundle.showBloodlinePicker(holder,start);
 }else start(null,bloodlinePage());
}

function setupExtraWindow(node,id){
 const host=node.querySelector('.l98-extras-host');if(!host)return;
 const frame=document.createElement('iframe');frame.className='l98-extra-frame';
 frame.title=titleOf(id);frame.setAttribute('allow','fullscreen; gamepad; microphone');
 frame.setAttribute('allowfullscreen','');
 const source=window.LatchBundle?.get(id);
 if(source)frame.srcdoc=source;
 else frame.src=sourceAppPage(`${id==='spritestudio'?'sprite-studio':id}/index.html`);
 host.replaceChildren(frame);
 const w=windows.get(id);if(w)w.cleanup=()=>frame.remove();
}

async function setupNornWorldLab(node){const holder=node.querySelector('.norn-loader');if(!holder)return;
 const fail=()=>{holder.innerHTML=`<strong>NORN WORLD LAB</strong><div style="max-width:480px;line-height:1.6">Program files could not be found. Please check the installation and try again.</div><label style="margin-top:7px">Locate program: <input type="file" accept=".html,.htm" data-norn-import="1" style="max-width:210px"></label>`;
 holder.querySelector('[data-norn-import]').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const content=await f.text();const frame=document.createElement('iframe');frame.className='norn-frame';frame.title='Norn World Lab';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock');frame.srcdoc=content;node.querySelector('.window-content')?.replaceChildren(frame);if(holder.isConnected)holder.replaceWith(frame);}catch(err){fsError(err);}};};
 try{if(window.LatchBundle?.isStandalone){
 const html=window.LatchBundle.get('norn');if(!html)throw Error('Norn files missing');
 const frame=document.createElement('iframe');frame.className='norn-frame';frame.title='Norn World Lab';
 frame.srcdoc=html;frame.onload=()=>{if(holder.isConnected)holder.replaceWith(frame);};
 holder.append(frame);return;
 }
 const gameURL=new URL(sourceAppPage('apps/norn-world-lab/index.html'));const r=await fetch(gameURL,{cache:'no-store'});if(!r.ok||!((await r.text()).includes('Norn World Lab'))){fail();return;}
 const frame=document.createElement('iframe');frame.className='norn-frame';frame.title='Norn World Lab';frame.src=gameURL.href;frame.onload=()=>{if(holder.isConnected)holder.replaceWith(frame);};frame.onerror=fail;holder.append(frame);
 }catch{fail();}
}
// Shared Windows 98-style file chooser, backed by the same C:/A: disk as Explorer.
function fileChooser98({title='Open',type='text',save=false,initial=null,callback}){
 let dir=initial&&fs.get(fs.parent(initial))?fs.parent(initial):'C:/MY DOCUMENTS';
 let fileName=initial?fs.get(initial)?.name||initial.split('/').pop():type==='image'?'Picture.png':'Untitled.txt';
 const listFiles=()=>{let items=[];try{items=fs.list(dir).filter(n=>n.kind==='dir'||n.kind===type);}catch(e){if(dir==='A:'){showDiskTrayPrompt();return;}fsError(e);return;}
 const list=el.overlay.querySelector('.l98-file-list'),location=el.overlay.querySelector('#l98-chooser-dir');if(!list||!location)return;
 location.value=dir;list.innerHTML=`${dir==='C:'||dir==='A:'?'':`<button data-chooser-up="1">${icon('folder')} ..</button>`}`+items.map(n=>`<button data-chooser-path="${escapeHtml(n.path)}">${icon(n.kind==='dir'?'folder':type==='image'?'paint':'notepad')} ${escapeHtml(n.name)}</button>`).join('');
 list.querySelector('[data-chooser-up]')?.addEventListener('click',()=>{dir=fs.parent(dir)||'C:';listFiles();});
 list.querySelectorAll('[data-chooser-path]').forEach(b=>{b.onclick=()=>{const path=b.dataset.chooserPath;if(fs.get(path)?.kind==='dir'){dir=path;listFiles();}else{fileName=fs.get(path).name;el.overlay.querySelector('#l98-chooser-name').value=fileName;list.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));}};b.ondblclick=()=>{if(fs.get(b.dataset.chooserPath)?.kind===type){fileName=fs.get(b.dataset.chooserPath).name;commit();}};});
 };
 const commit=()=>{const entry=el.overlay.querySelector('#l98-chooser-name');if(entry)fileName=entry.value.trim();try{let path=fileName;
 if(!/^[ca]:[\\/]/i.test(path)){if(!path)throw Error('Please enter a file name');if(save&&!/\.[a-z0-9]+$/i.test(path))path+=type==='image'?'.png':'.txt';path=dir+'/'+path;}
 path=fs.canonical(path);const old=fs.get(path);
 if(!save&&old?.kind!==type)throw Error('File not found');
 if(save&&old){if(old.kind!==type)throw Error('A different kind of file already has this name');ask98('Confirm Save As',`The file ${escapeHtml(old.name)} already exists. Do you want to replace it?`,()=>callback(path));return;}
 hideDialog();callback(path);
 }catch(e){fsError(e);}};
 showDialog(title,`<div class="l98-file-choice"><label>Look in:</label><select id="l98-chooser-dir"><option value="C:/MY DOCUMENTS">My Documents</option><option value="C:">Local Disk (C:)</option><option value="A:">3½ Floppy (A:)</option><option value="C:/WINDOWS/DESKTOP">Desktop</option><option value="C:/DOWNLOADS">Downloads</option></select></div><div class="l98-file-list"></div><div class="l98-file-choice"><label>File name:</label><input id="l98-chooser-name" value="${escapeHtml(fileName)}"></div><div class="l98-file-choice"><label>Files of type:</label><select><option>${type==='image'?'PNG Images (*.png)':'Text Documents (*.txt)'}</option></select></div>`,[{label:save?'Save':'Open',action:()=>commit()},{label:'Cancel'}]);
 // showDialog closes before callbacks; reroute primary action to keep controls until validation.
 const controls=el.overlay.querySelectorAll('.dialog-buttons button');controls[0].replaceWith(controls[0].cloneNode(true));el.overlay.querySelector('.dialog-buttons button').addEventListener('click',commit);
 el.overlay.querySelector('.dialog-box')?.classList.add('l98-dialog-large');
 const loc=el.overlay.querySelector('#l98-chooser-dir');if(![...loc.options].some(o=>o.value===dir)){const opt=document.createElement('option');opt.value=dir;opt.textContent=fs.display(dir);loc.prepend(opt);}loc.value=dir;
 loc.onchange=()=>{dir=loc.value;listFiles();};el.overlay.querySelector('#l98-chooser-name').addEventListener('keydown',e=>{if(e.key==='Enter')commit();});listFiles();
}

function showPopupAt(x,y,commands){document.querySelector('.shell-popup')?.remove();const popup=document.createElement('div');popup.className='shell-popup';popup.style.left=Math.max(2,Math.min(x,innerWidth-205))+'px';popup.style.top=Math.max(2,Math.min(y,innerHeight-35-commands.length*25))+'px';popup.innerHTML=commands.map((c,i)=>c===null?'<div class="menu-sep"></div>':`<button data-popup-cmd="${i}" ${c.disabled?'disabled':''}>${escapeHtml(c.label)}</button>`).join('');el.desktop.append(popup);popup.querySelectorAll('[data-popup-cmd]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();popup.remove();commands[+btn.dataset.popupCmd].action?.();}));const dismiss=e=>{if(!popup.contains(e.target)){popup.remove();document.removeEventListener('pointerdown',dismiss,true);}};setTimeout(()=>document.addEventListener('pointerdown',dismiss,true),0);}
function showPopup(anchor,commands){const r=anchor.getBoundingClientRect();showPopupAt(r.left,r.bottom,commands);}
// Desktop shell commands use the same files and clipboard as File Explorer.
function selectedDesktopItem(){return desktopIcons.querySelector('.desktop-icon.selected');}
function desktopCopy(path,cut=false){fsClipboard={path,cut};}
function pasteInto(path){if(!fsClipboard)return;try{const from=fs.get(fsClipboard.path);if(!from)throw Error('The source item no longer exists');const name=fs.unique(path,from.name);const out=fsClipboard.cut?fs.move(fsClipboard.path,path+'/'+name):fs.copy(fsClipboard.path,path,name);if(fsClipboard.cut)fsClipboard=null;return out;}catch(e){fsError(e);}}
function desktopDelete(path){const n=fs.get(path);if(!n)return;ask98('Confirm File Delete',`Are you sure you want to send "${escapeHtml(n.name)}" to the Recycle Bin?`,()=>{try{fs.remove(path);}catch(e){fsError(e);}});}
function desktopRename(path){const n=fs.get(path);if(n)prompt98('Rename','Type a new name:',n.name,name=>fs.rename(path,name));}
function desktopShortcut(target){const folder='C:/WINDOWS/DESKTOP',name=fs.get(target)?.name||'Shortcut';try{fs.createShortcut(folder,fs.unique(folder,name.replace(/\.(lnk|url)$/i,'')+'.lnk'),target);}catch(e){fsError(e);}}
function showDesktopIconContext(item,x,y){
 const path=item.dataset.path,app=item.dataset.app,node=path?fs.get(path):null;
 showPopupAt(x,y,[
 {label:'Open',action:()=>path?openFilePath(path):launch(app)},null,
 {label:'Cut',action:()=>desktopCopy(path,true),disabled:!path},
 {label:'Copy',action:()=>desktopCopy(path),disabled:!path},
 {label:'Create Shortcut',action:()=>path?desktopShortcut(path):fs.createShortcut('C:/WINDOWS/DESKTOP',fs.unique('C:/WINDOWS/DESKTOP',titleOf(app)+'.lnk'),app)},
 {label:'Rename',action:()=>desktopRename(path),disabled:!path},
 {label:'Delete',action:()=>desktopDelete(path),disabled:!path},null,
 {label:'Properties',action:()=>path?showPathProperties(path):showDialog(titleOf(app)+' Properties',`<p>${escapeHtml(titleOf(app))}</p><p>Type: Application</p>`)}
 ]);
}
function fsNodeSize(n){if(!n)return 0;if(n.kind==='image'){const payload=(n.data||'').split(',').pop(),pad=(payload.match(/=+$/)||[''])[0].length;return Math.max(0,Math.floor(payload.length*3/4)-pad);};if(n.kind==='text')return new Blob([n.data||'']).size;if(n.kind==='torrent'||n.kind==='iso')return n.displaySize||new Blob([n.data||'']).size;return 0;}
function fsTreeSize(path){const node=fs.get(path);if(node?.kind!=='dir')return fsNodeSize(node);let sum=0;const visit=(p,depth)=>{if(depth>16)return;for(const n of fs.list(p)){if(n.kind==='dir')visit(n.path,depth+1);else sum+=fsNodeSize(n);}};try{visit(path,0);}catch{}return sum;}
function fsByteSize(size){return size<1024?size+' bytes':Math.max(1,Math.ceil(size/1024)).toLocaleString()+' KB';}
function fsKindName(n){return ({dir:'File Folder',text:'Text Document',image:'PNG Image',shortcut:'Shortcut',installer:'Application',torrent:'SwarmWire Torrent',iso:'CD-ROM Disc Image',drive:'Disk Drive'})[n.kind]||'File';}
function showPathProperties(path){const n=fs.get(path);if(!n)return;const isFolder=n.kind==='dir',bytes=isFolder?fsTreeSize(path):fsNodeSize(n),location=fs.parent(path)?fs.display(fs.parent(path)):fs.display(path);
const target=n.kind==='shortcut'?`<div class="l98-prop-row"><b>Target:</b> <span>${escapeHtml(n.target||'')}</span></div>`:'';
showDialog(escapeHtml(n.name)+' Properties',`<div class="l98-properties"><div class="l98-prop-heading">${icon(iconForFS(n))}<strong>${escapeHtml(n.name)}</strong></div><hr><div class="l98-prop-row"><b>Type:</b> <span>${fsKindName(n)}</span></div><div class="l98-prop-row"><b>Location:</b> <span>${escapeHtml(location)}</span></div><div class="l98-prop-row"><b>Size:</b> <span>${fsByteSize(bytes)}</span></div><div class="l98-prop-row"><b>Modified:</b> <span>${escapeHtml(new Date(n.modified||Date.now()).toLocaleString())}</span></div>${target}</div>`);}

function showDesktopContext(x,y){showPopupAt(x,y,[
 {label:'Arrange Icons by Name',action:()=>{const children=[...desktopIcons.children];children.sort((a,b)=>a.textContent.localeCompare(b.textContent));children.forEach(n=>desktopIcons.append(n));}},
 {label:'Line Up Icons',action:()=>{desktopIcons.style.gridAutoFlow='column';}},
 {label:'Refresh',action:()=>syncFilesystemDesktop()},null,
 {label:'Paste',action:()=>pasteInto('C:/WINDOWS/DESKTOP'),disabled:!fsClipboard},
 {label:'New Folder',action:()=>desktopMake('folder')},
 {label:'New Text Document',action:()=>desktopMake('text')},null,
 {label:'Properties',action:()=>launch('display')}
 ]);}
function visibleWindows(){return [...windows.values()].filter(w=>!w.minimized);}
function minimizeAll(){for(const w of visibleWindows())minimizeWindow(w.id);}
function arrangeWindows(mode){const arr=visibleWindows(),count=arr.length;if(!count)return;
 const areaW=innerWidth,areaH=innerHeight-42;
 arr.forEach((w,i)=>{
  w.maximized=false;w.node.classList.remove('maximized');w.node.classList.remove('minimized');
  if(mode==='cascade'){w.node.style.left=(10+(i%10)*29)+'px';w.node.style.top=(10+(i%10)*25)+'px';w.node.style.width=Math.min(590,areaW-15-(i%10)*29)+'px';w.node.style.height=Math.min(390,areaH-15-(i%10)*25)+'px';}
  else {const cols=mode==='vertical'?count:1,rows=mode==='vertical'?1:count;const width=areaW/cols,height=areaH/rows;w.node.style.left=(mode==='vertical'?i*width:0)+'px';w.node.style.top=(mode==='horizontal'?i*height:0)+'px';w.node.style.width=Math.max(100,width-2)+'px';w.node.style.height=Math.max(100,height-2)+'px';}
 });activateWindow(arr.at(-1).id);
}
function taskbarProperties(){
 showDialog('Taskbar Properties',`<p><b>Taskbar Options</b></p><label class="l98-check-line"><input type="checkbox" id="l98-tray-clock" ${shellSettings.clock?'checked':''}> Show clock</label><label class="l98-check-line"><input type="checkbox" id="l98-small-start" ${shellSettings.smallStart?'checked':''}> Show small icons in Start menu</label>`,[
 {label:'OK'},{label:'Cancel'}]);
 // Capture controls before the dialog closes.
 const ok=el.overlay.querySelector('.dialog-buttons button');ok?.addEventListener('click',()=>{const clock=$('l98-tray-clock'),small=$('l98-small-start');if(clock)shellSettings.clock=clock.checked;if(small)shellSettings.smallStart=small.checked;saveShellSettings();},true);
}
function showTaskbarContext(e){const onStart=!!e.target.closest('.start-button');if(onStart){showPopupAt(e.clientX,e.clientY,[{label:'Open',action:()=>toggleStart()},{label:'Explore',action:()=>launch('explorer:C:/WINDOWS/START MENU')},null,{label:'Properties',action:taskbarProperties}]);return;}
 showPopupAt(e.clientX,e.clientY,[{label:'Cascade Windows',action:()=>arrangeWindows('cascade'),disabled:!visibleWindows().length},{label:'Tile Windows Horizontally',action:()=>arrangeWindows('horizontal'),disabled:!visibleWindows().length},{label:'Tile Windows Vertically',action:()=>arrangeWindows('vertical'),disabled:!visibleWindows().length},{label:'Minimize All Windows',action:minimizeAll,disabled:!visibleWindows().length},null,{label:'Properties',action:taskbarProperties}]);}
// F2/Delete/Ctrl+C/X/V work for selected desktop documents, too.
desktopIcons.addEventListener('keydown',e=>{const item=selectedDesktopItem(),path=item?.dataset.path;
 if(!item||!path||e.target.closest('input,textarea'))return;
 if(e.key==='F2'){e.preventDefault();desktopRename(path);}
 if(e.key==='Delete'){e.preventDefault();desktopDelete(path);}
 if(e.ctrlKey&&e.key.toLowerCase()==='c'){e.preventDefault();desktopCopy(path);}
 if(e.ctrlKey&&e.key.toLowerCase()==='x'){e.preventDefault();desktopCopy(path,true);}
 if(e.ctrlKey&&e.key.toLowerCase()==='v'){e.preventDefault();pasteInto('C:/WINDOWS/DESKTOP');}
});
function selectionInfo(id){const w=windows.get(id);return w?.fsSelected?{path:w.fsSelected,node:fs.get(w.fsSelected)}:null;}
function explorerCurrentDir(id){const path=windows.get(id)?.fsPath;return path==='computer'?'C:':path;}
function fsMakeFolder(id){const w=windows.get(id);if(!w)return;const folder=explorerCurrentDir(id);prompt98('Create New Folder','Enter a name for the new folder:','New Folder',name=>{const path=fs.mkdir(folder,fs.unique(folder,name));w.fsSelected=path;refreshExplorer(id);});}
function fsMakeText(id){const w=windows.get(id);if(!w)return;const folder=explorerCurrentDir(id);prompt98('New Text Document','File name:','New Text Document.txt',name=>{const path=fs.write(folder+'/'+fs.unique(folder,name),'');w.fsSelected=path;refreshExplorer(id);});}
function fsRename(id){const s=selectionInfo(id);if(!s?.node)return;prompt98('Rename','Enter a new name:',s.node.name,name=>{const p=fs.rename(s.path,name);windows.get(id).fsSelected=p;refreshExplorer(id);});}
function fsCopySelected(id,cut=false){const s=selectionInfo(id);if(!s?.node)return;fsClipboard={path:s.path,cut};const w=windows.get(id);w.node.querySelector('.status-text').textContent=cut?'Ready to move — choose Paste':'Copied — choose Paste';}
function fsPaste(id){const w=windows.get(id);if(!w||!fsClipboard)return;try{const to=explorerCurrentDir(id),item=fs.get(fsClipboard.path);if(!item)throw Error('The source item no longer exists');const name=fs.unique(to,item.name),dest=to+'/'+name;const p=fsClipboard.cut?fs.move(fsClipboard.path,dest):fs.copy(fsClipboard.path,to,name);if(fsClipboard.cut)fsClipboard=null;w.fsSelected=p;refreshExplorer(id);}catch(e){fsError(e);}}
function fsDeleteSelected(id){const s=selectionInfo(id);if(!s?.node)return;const permanent=windows.get(id)?.fsPath==='C:/RECYCLED';ask98(permanent?'Delete File':'Confirm File Delete',`Are you sure you want to ${permanent?'permanently delete':'send to the Recycle Bin'} "${s.node.name}"?`,()=>{try{fs.remove(s.path,permanent);windows.get(id).fsSelected=null;refreshExplorer(id);}catch(err){fsError(err);}});}
function fsRestoreSelected(id){const s=selectionInfo(id);if(!s?.node)return;try{fs.restore(s.path);windows.get(id).fsSelected=null;refreshExplorer(id);}catch(e){fsError(e);}}
function openWithChoice(path){const n=fs.get(path);if(!n)return;if(n.kind==='image')showDialog('Open With',`<p>Choose the program you want to use to open <strong>${escapeHtml(n.name)}</strong>:</p>`,[{label:'Imaging',action:()=>launch('viewer:'+path)},{label:'Paint',action:()=>openPaintFromPath(path)},{label:'Cancel'}]);else if(n.kind==='text')showDialog('Open With',`<p>Choose the program you want to use to open <strong>${escapeHtml(n.name)}</strong>:</p>`,[{label:'Notepad',action:()=>openFilePath(path)},{label:'Cancel'}]);}
function fsProperties(id){const s=selectionInfo(id);if(s?.node)showPathProperties(s.path);}
function fsBackupDisk(){const blob=new Blob([fs.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Latch98-Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fsRestoreDisk(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;const raw=await f.text();ask98('Restore Disk Image','This will replace all current files and settings on this computer. Continue?',()=>{try{fs.importDisk(raw);}catch(e){fsError(e);}});});input.click();}
function fsExport(id){const s=selectionInfo(id);if(!s||s.node?.kind!=='text')return;const b=new Blob([fs.read(s.path)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=s.node.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fsImport(id){const folder=explorerCurrentDir(id),input=document.createElement('input');input.type='file';input.accept='.txt,.md,.csv,.json,text/*';input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>130000)throw Error('Only text files smaller than 130 KB can be imported');const name=fs.unique(folder,file.name.replace(/[\\/<>:"|?*]/g,'_'));fs.write(folder+'/'+name,await file.text());}catch(e){fsError(e);}});input.click();}
function showExplorerFileMenu(id,btn){const w=windows.get(id);const recycle=w?.fsPath==='C:/RECYCLED';showPopup(btn,[{label:'3½ Floppy Disk Tray...',action:()=>launch('disktray')},null,{label:'New ► Folder',action:()=>fsMakeFolder(id),disabled:recycle},{label:'New ► Text Document',action:()=>fsMakeText(id),disabled:recycle},null,{label:'Import Text File...',action:()=>fsImport(id),disabled:recycle},{label:'Export Selected Text File...',action:()=>fsExport(id)},null,{label:'Back Up Disk Image...',action:fsBackupDisk},{label:'Restore Disk Image...',action:fsRestoreDisk},null,{label:'Rename',action:()=>fsRename(id)},{label:'Delete',action:()=>fsDeleteSelected(id)},{label:'Properties',action:()=>fsProperties(id)}]);}
function explorerViewOptions(id){const w=windows.get(id);return ['large','small','list','details'].map((view,i)=>({label:(w.fsView===view?'● ':'   ')+['Large Icons','Small Icons','List','Details'][i],action:()=>setExplorerView(id,view)}));}
function showExplorerViewMenu(id,btn){const w=windows.get(id);showPopup(btn,[...explorerViewOptions(id),null,{label:'Arrange Icons by Name',action:()=>setExplorerSort(id,'name')},{label:'Arrange Icons by Type',action:()=>setExplorerSort(id,'type')},{label:'Arrange Icons by Size',action:()=>setExplorerSort(id,'size')},{label:'Arrange Icons by Date',action:()=>setExplorerSort(id,'modified')},null,{label:(w.fsTreeVisible?'✓ ':'   ')+'Explorer Bar ► Folders',action:()=>{w.fsTreeVisible=!w.fsTreeVisible;refreshExplorer(id);}},{label:'Refresh',action:()=>refreshExplorer(id)}]);}
function setExplorerView(id,view){const w=windows.get(id);if(!w||!['large','small','list','details'].includes(view))return;w.fsView=view;rememberExplorerPreferences(id);refreshExplorer(id);}
function setExplorerSort(id,sort){const w=windows.get(id);if(!w||!['name','size','type','modified'].includes(sort))return;w.fsSort=sort;rememberExplorerPreferences(id);refreshExplorer(id);}
function rememberExplorerPreferences(id){const w=windows.get(id);if(!w)return;explorerPreferences[w.fsPath||'computer']={view:w.fsView,sort:w.fsSort};try{fs.write(EXPLORER_PREFS_FILE,JSON.stringify(explorerPreferences));}catch(e){console.warn('Explorer preferences:',e.message);}}

function showExplorerGoMenu(id,btn){showPopup(btn,[{label:'CD-ROM (D:)',action:()=>fsNavigate(id,'D:')},{label:'3½ Floppy (A:)',action:()=>fsNavigate(id,'A:')},{label:'Disk Tray...',action:()=>launch('disktray')},null,{label:'Back',action:()=>{const w=windows.get(id),p=w.fsHistory?.pop();if(p){w.fsPath=p;refreshExplorer(id);}}},{label:'Up One Level',action:()=>fsNavigate(id,fs.parent(windows.get(id).fsPath)||'computer')},null,{label:'My Computer',action:()=>fsNavigate(id,'computer')},{label:'My Documents',action:()=>fsNavigate(id,'C:/MY DOCUMENTS')},{label:'Recycle Bin',action:()=>fsNavigate(id,'C:/RECYCLED')}]);}
function showExplorerEditMenu(id,btn){showPopup(btn,[{label:'Cut                 Ctrl+X',action:()=>fsCopySelected(id,true)},{label:'Copy             Ctrl+C',action:()=>fsCopySelected(id)},{label:'Paste             Ctrl+V',action:()=>fsPaste(id)},null,{label:'Move To Folder...',action:()=>explorerChooseDestination(id,false)},{label:'Copy To Folder...',action:()=>explorerChooseDestination(id,true)},null,{label:'Rename                    F2',action:()=>fsRename(id)},{label:'Delete                     Del',action:()=>fsDeleteSelected(id)}]);}
function iconForFS(n){if(n.kind==='shortcut'&&['bloodline','bloodline-windowed'].includes(n.target))return 'bloodline';return n.kind==='torrent'?'network':n.kind==='iso'?'disc':n.kind==='dir'?'folder':n.kind==='installer'?'disc':n.kind==='shortcut'?'browser':n.kind==='text'?'notepad':n.kind==='image'?'paint':'documents';}
const EXPLORER_PREFS_FILE='C:/WINDOWS/SYSTEM/EXPLORER.INI';let explorerPreferences={};let explorerDragActive=null;
fs.ready.then(()=>{try{const node=fs.get(EXPLORER_PREFS_FILE);if(node?.kind==='text'){const saved=JSON.parse(node.data||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))explorerPreferences=saved;}}catch{}});
function updateExplorerStatus(id,total){const w=windows.get(id);if(!w)return;const status=w.node.querySelector('.status-text');if(!status)return;const n=w.fsSelected?fs.get(w.fsSelected):null;status.textContent=`${total} object(s)${n?'     1 object selected   '+fsByteSize(n.kind==='dir'?fsTreeSize(w.fsSelected):fsNodeSize(n)):''}`;}
function explorerTreeItems(w){const current=w.fsPath||'computer',expanded=w.fsExpanded,parts=[];
function branch(path,name,ico,level){const children=path==='computer'?[{path:'C:',name:'(C:)',kind:'dir'},{path:'A:',name:'3½ Floppy (A:)',kind:'dir'},{path:'D:',name:'CD-ROM (D:)',kind:'dir'}]:((path==='A:'&&!fs.mediaInfo().mounted)?[]:(()=>{try{return fs.list(path).filter(n=>n.kind==='dir');}catch{return[];}})());
const isExpanded=expanded.has(path),hasChildren=children.length>0||path==='computer';
parts.push(`<div class="tree-line" style="padding-left:${Math.min(level,12)*13+3}px"><button type="button" class="tree-expander ${hasChildren?'':'tree-nochild'}" data-fs-toggle="${escapeHtml(path)}" aria-label="${isExpanded?'Collapse':'Expand'} ${escapeHtml(name)}">${hasChildren?(isExpanded?'−':'+'):''}</button><button type="button" class="tree-entry ${current===path?'current':''}" data-go-fs="${escapeHtml(path)}" draggable="${path!=='computer'}">${icon(ico)}<span>${escapeHtml(name)}</span></button></div>`);
if(isExpanded&&level<15){children.forEach(n=>branch(n.path,n.name,['A:','C:','D:'].includes(n.path)?'disc':'folder',level+1));}}
branch('computer','My Computer','computer',0);branch('C:/WINDOWS/DESKTOP','Desktop','computer',0);branch('C:/MY DOCUMENTS','My Documents','documents',0);branch('C:/RECYCLED','Recycle Bin','bin',0);
return parts.join('');}
function fsSortItems(items,sort){return [...items].sort((a,b)=>{if(a.kind==='dir'&&b.kind!=='dir')return -1;if(b.kind==='dir'&&a.kind!=='dir')return 1;let v=0;if(sort==='size')v=fsNodeSize(a)-fsNodeSize(b);if(sort==='type')v=fsKindName(a).localeCompare(fsKindName(b));if(sort==='modified')v=(a.modified||0)-(b.modified||0);return v||a.name.localeCompare(b.name,undefined,{sensitivity:'base'});});}
function refreshExplorer(id){const w=windows.get(id);if(!w)return;const shell=w.node.querySelector('.explorer-shell');if(!shell)return;const result=shell.querySelector('.explorer-results'),tree=shell.querySelector('.explorer-tree'),addr=shell.querySelector('.fs-address');const path=w.fsPath||'computer';let files=[];
shell.querySelector('.empty-bin-btn').classList.toggle('hidden',path!=='C:/RECYCLED');
try{files=path==='computer'?[{path:'C:',name:'Local Disk (C:)',kind:'drive'},{path:'A:',name:'3½ Floppy (A:)',kind:'drive'},{path:'D:',name:'CD-ROM (D:)',kind:'drive'},{path:'C:/MY DOCUMENTS',name:'My Documents',kind:'dir'},{path:'C:/WINDOWS',name:'Windows',kind:'dir'},{path:'C:/RECYCLED',name:'Recycle Bin',kind:'dir'}]:fs.list(path);}catch(e){result.innerHTML=`<div class="explorer-wait">${escapeHtml(e.message)}</div>`;return;}
const saved=explorerPreferences[path];if(!w.fsPreferencePath||w.fsPreferencePath!==path){w.fsView=['large','small','list','details'].includes(saved?.view)?saved.view:w.fsView;w.fsSort=['name','size','type','modified'].includes(saved?.sort)?saved.sort:'name';w.fsPreferencePath=path;}
files=fsSortItems(files,w.fsSort);addr.value=path==='computer'?'My Computer':fs.display(path);
tree.innerHTML=explorerTreeItems(w);
shell.classList.toggle('tree-hidden',!w.fsTreeVisible);result.className='explorer-results '+w.fsView+'-view';shell.classList.toggle('details-mode',w.fsView==='details');
if(!files.length)result.innerHTML='<div class="explorer-wait">This folder is empty.</div>';
else result.innerHTML=files.map(file=>`<div class="fs-item ${w.fsSelected===file.path?'selected':''}" tabindex="0" role="button" draggable="true" data-fs-path="${escapeHtml(file.path)}" title="${escapeHtml(file.name)}">${icon(file.kind==='drive'?'disc':iconForFS(file))}<span class="fs-item-name">${escapeHtml(file.name)}</span><span class="fs-item-size">${file.kind==='dir'||file.kind==='drive'?'':fsByteSize(fsNodeSize(file))}</span><span class="fs-item-type">${fsKindName(file)}</span><span class="fs-item-date">${file.modified?escapeHtml(new Date(file.modified).toLocaleDateString()):''}</span></div>`).join('');
w.node.querySelector('.titlebar .caption').textContent=path==='computer'?'My Computer':path==='C:/RECYCLED'?'Recycle Bin':path==='C:/MY DOCUMENTS'?'My Documents':fs.display(path);
updateExplorerStatus(id,files.length);updateTaskbar();}
function fsNavigate(id,path,history=true){const w=windows.get(id);if(!w)return;try{if(path!=='computer'){path=fs.canonical(path);if(path==='A:'&&!fs.mediaInfo().mounted){showDiskTrayPrompt();return;}if(path==='D:'&&!fs.discInfo().mounted){showDialog('CD-ROM Drive (D:)','<p>The drive is not ready. Insert a disc image.</p>',[{label:'Open Downloads',action:()=>launch('explorer:C:/Downloads')},{label:'Cancel'}]);return;}if(fs.get(path)?.kind!=='dir')throw Error('This folder does not exist');}w.fsHistory??=[];w.fsForward??=[];if(w.fsPath!==path&&history){w.fsHistory.push(w.fsPath);if(w.fsHistory.length>25)w.fsHistory.shift();w.fsForward=[];}w.fsPath=path;w.fsSelected=null;let parentPath=path;for(let i=0;parentPath&&i<20;i++,parentPath=fs.parent(parentPath))w.fsExpanded.add(parentPath);refreshExplorer(id);}catch(e){fsError(e);}}
function fsOpenIn(id,path){const n=fs.get(path);if(!n){fsError('The item was not found');return;}if(n.kind==='dir'){fsNavigate(id,path);return;}openFilePath(path);}
function explorerSelect(id,path){const w=windows.get(id);if(!w)return;w.fsSelected=path;const shell=w.node.querySelector('.explorer-shell');shell.querySelectorAll('.fs-item').forEach(el=>el.classList.toggle('selected',el.dataset.fsPath===path));updateExplorerStatus(id,shell.querySelectorAll('.fs-item').length);}
function explorerTransfer(src,dest,copy){try{const source=fs.get(src),folder=dest==='computer'?'C:':dest;if(!source)throw Error('The item no longer exists');if(!fs.get(folder)||fs.get(folder).kind!=='dir')throw Error('Drop files into a folder');if(['C:','A:','D:'].includes(src))throw Error('A disk cannot be moved');if(src===folder)return;
const sameDrive=src.slice(0,2)===folder.slice(0,2);let doCopy=copy===undefined?!sameDrive:copy;if(fs.parent(src)===folder&&!doCopy)return;
const newPath=folder+'/'+(fs.get(folder+'/'+source.name)?fs.unique(folder,source.name):source.name);
if(doCopy)fs.copy(src,folder,newPath.split('/').pop());else fs.move(src,newPath);
}catch(e){fsError(e);}}
function explorerChooseDestination(id,copy){const s=selectionInfo(id);if(!s?.node)return;prompt98(copy?'Copy To Folder':'Move To Folder','Destination folder (for example C:\\My Documents):','C:\\My Documents',target=>{try{const p=fs.canonical(target);if(fs.get(p)?.kind!=='dir')throw Error('Select an existing folder');explorerTransfer(s.path,p,copy);refreshExplorer(id);}catch(e){fsError(e);}});}
function setupExplorer(id,node){const w=windows.get(id),shell=node.querySelector('.explorer-shell');w.fsPath=id==='computer'?'computer':id==='documents'?'C:/MY DOCUMENTS':id==='bin'?'C:/RECYCLED':id.slice(9);w.fsHistory=[];w.fsForward=[];w.fsView='large';w.fsSort='name';w.fsExpanded=new Set(['computer','C:']);for(let initial=w.fsPath;initial&&initial!=='computer';initial=fs.parent(initial))w.fsExpanded.add(initial);w.fsTreeVisible=true;w.fsSelected=null;w.fsPreferencePath='';
shell.addEventListener('click',e=>{const sort=e.target.closest('[data-fs-sort]');if(sort){setExplorerSort(id,sort.dataset.fsSort);return;}const toggle=e.target.closest('[data-fs-toggle]');if(toggle){const p=toggle.dataset.fsToggle;w.fsExpanded.has(p)?w.fsExpanded.delete(p):w.fsExpanded.add(p);refreshExplorer(id);return;}
const to=e.target.closest('[data-go-fs]');if(to){fsNavigate(id,to.dataset.goFs);return;}
const item=e.target.closest('[data-fs-path]');if(item){explorerSelect(id,item.dataset.fsPath);if(shellSettings.singleClick||matchMedia('(pointer:coarse)').matches)fsOpenIn(id,w.fsSelected);return;}
const cmd=e.target.closest('[data-fs-cmd]');if(!cmd)return;
try{switch(cmd.dataset.fsCmd){case 'back':{const p=w.fsHistory.pop();if(p!==undefined){w.fsForward.push(w.fsPath);fsNavigate(id,p,false);}break;}
case 'forward':{const p=w.fsForward.pop();if(p!==undefined){w.fsHistory.push(w.fsPath);fsNavigate(id,p,false);}break;}
case 'up':fsNavigate(id,w.fsPath==='computer'?'computer':(fs.parent(w.fsPath)||'computer'));break;
case 'go':fsNavigate(id,shell.querySelector('.fs-address').value==='My Computer'?'computer':shell.querySelector('.fs-address').value);break;
case 'cut':fsCopySelected(id,true);break;case 'copy':fsCopySelected(id);break;case 'paste':fsPaste(id);break;
case 'disktray':launch('disktray');break;case 'newfolder':fsMakeFolder(id);break;
case 'newtext':fsMakeText(id);break;
case 'folders':w.fsTreeVisible=!w.fsTreeVisible;refreshExplorer(id);break;
case 'views':{const views=['large','small','list','details'];setExplorerView(id,views[(views.indexOf(w.fsView)+1)%4]);break;}
case 'emptybin':ask98('Empty Recycle Bin','Delete all items permanently?',()=>{fs.emptyBin();refreshExplorer(id);});break;}}
catch(err){fsError(err);}});
shell.querySelector('.fs-address').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fsNavigate(id,e.target.value);}});
shell.addEventListener('dblclick',e=>{const item=e.target.closest('[data-fs-path]');if(item)fsOpenIn(id,item.dataset.fsPath);});
shell.addEventListener('contextmenu',e=>{const item=e.target.closest('[data-fs-path]');if(!e.target.closest('.explorer-results'))return;e.preventDefault();e.stopPropagation();if(item)explorerSelect(id,item.dataset.fsPath);
showPopupAt(e.clientX,e.clientY,[{label:'Open',action:()=>{if(w.fsSelected)fsOpenIn(id,w.fsSelected);},disabled:!w.fsSelected},{label:'Open With...',action:()=>{if(w.fsSelected)openWithChoice(w.fsSelected);},disabled:!w.fsSelected||!['text','image'].includes(fs.get(w.fsSelected)?.kind)},{label:'Set as Wallpaper',action:()=>{shellSettings.wallpaper=w.fsSelected;saveShellSettings();},disabled:fs.get(w.fsSelected)?.kind!=='image'},null,{label:'Cut',action:()=>fsCopySelected(id,true)},{label:'Copy',action:()=>fsCopySelected(id)},{label:'Paste',action:()=>fsPaste(id),disabled:!fsClipboard},{label:'Move To Folder...',action:()=>explorerChooseDestination(id,false),disabled:!w.fsSelected},{label:'Copy To Folder...',action:()=>explorerChooseDestination(id,true),disabled:!w.fsSelected},null,{label:'New Folder',action:()=>fsMakeFolder(id)},{label:'New Text Document',action:()=>fsMakeText(id)},null,{label:w.fsPath==='C:/RECYCLED'?'Restore':'Rename',action:()=>w.fsPath==='C:/RECYCLED'?fsRestoreSelected(id):fsRename(id)},{label:'Delete',action:()=>fsDeleteSelected(id)},{label:'Properties',action:()=>fsProperties(id)}]);});
// Native drag and drop only moves or copies files already on the Latch disk.
// The host OS is never modified, nor is a physical device pretended to be connected.
shell.addEventListener('dragstart',e=>{const source=e.target.closest('[data-fs-path]');if(!source)return;w.fsDragging=source.dataset.fsPath;explorerDragActive=w.fsDragging;e.dataTransfer.effectAllowed='copyMove';e.dataTransfer.setData('text/plain',source.dataset.fsPath);explorerSelect(id,w.fsDragging);});
shell.addEventListener('dragover',e=>{if(!explorerDragActive)return;const dst=e.target.closest('[data-go-fs],[data-fs-path]');const path=dst?.dataset.goFs||dst?.dataset.fsPath||w.fsPath;if(path==='computer')return;const item=fs.get(path);if(item?.kind!=='dir')return;e.preventDefault();e.dataTransfer.dropEffect=e.ctrlKey?'copy':(explorerDragActive.slice(0,2)===path.slice(0,2)?'move':'copy');});
shell.addEventListener('drop',e=>{if(!explorerDragActive)return;const dst=e.target.closest('[data-go-fs],[data-fs-path]');const path=dst?.dataset.goFs||dst?.dataset.fsPath||w.fsPath;e.preventDefault();const dragged=explorerDragActive;explorerDragActive=null;explorerTransfer(dragged,path,e.ctrlKey?true:undefined);w.fsDragging=null;});
shell.addEventListener('dragend',()=>{w.fsDragging=null;explorerDragActive=null;});
shell.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.key==='Enter'&&w.fsSelected){fsOpenIn(id,w.fsSelected);e.preventDefault();}if(e.key==='F2'){fsRename(id);e.preventDefault();}if(e.key==='Delete'){fsDeleteSelected(id);e.preventDefault();}if(e.ctrlKey&&e.key.toLowerCase()==='c'){fsCopySelected(id);e.preventDefault();}if(e.ctrlKey&&e.key.toLowerCase()==='x'){fsCopySelected(id,true);e.preventDefault();}if(e.ctrlKey&&e.key.toLowerCase()==='v'){fsPaste(id);e.preventDefault();}});
fs.ready.then(()=>refreshExplorer(id));}

function openFilePath(path){fs.ready.then(()=>{try{const p=fs.canonical(path);if(p==='A:'&&!fs.mediaInfo().mounted){showDiskTrayPrompt();return;}if(p==='D:'&&!fs.discInfo().mounted){launch('cdrom');return;}const n=fs.get(p);if(!n)throw Error('File or folder not found');if(n.kind==='dir'){launch('explorer:'+p);return;}if(n.kind==='shortcut'){if(/^[cad]:/i.test(n.target))openFilePath(n.target);else launch(n.target);return;}if(n.kind==='installer'){showSoftwareSetup(n.program);return;}if(n.kind==='torrent'){openSwarmTorrent(p);return;}if(n.kind==='iso'){mountNornDisc(p);return;}if(n.kind==='image'){recordRecentDocument(p);launch('viewer:'+p);return;}if(n.kind==='text'){recordRecentDocument(p);if(windows.has('notepad')&&noteDirty){ask98('Notepad','Discard unsaved changes?',()=>loadTextInNotepad(p));}else loadTextInNotepad(p);return;}throw Error('No program is associated with this file');}catch(e){fsError(e);}});}
function syncFilesystemDesktop(){const old=desktopIcons.querySelectorAll('.desktop-icon.fs-dynamic');old.forEach(x=>x.remove());try{for(const item of fs.list('C:/WINDOWS/Desktop')){const d=document.createElement('div');d.className='desktop-icon fs-dynamic';d.dataset.path=item.path;d.tabIndex=0;d.setAttribute('role','button');d.innerHTML=`<svg class="pixel-icon"><use href="#ico-${iconForFS(item)}"></use></svg><span class="icon-label">${escapeHtml(item.name.replace(/\.(url|lnk)$/i,''))}</span>`;desktopIcons.append(d);}}catch{}}
function loadTextInNotepad(p){launch('notepad');const w=windows.get('notepad');if(!w)return;notePath=p;noteText=fs.read(p);noteDirty=false;w.node.querySelector('textarea').value=noteText;updateNoteStatus();updateNotepadTitle();}
function updateNotepadTitle(){const w=windows.get('notepad');if(w){const label=(notePath?fs.get(notePath)?.name:'Untitled')||'Untitled';w.node.querySelector('.titlebar .caption').textContent=label+' - Notepad';updateTaskbar();}}
function newNotepad(){if(noteDirty){ask98('Notepad','Discard unsaved changes?',()=>resetNotepad());}else resetNotepad();}
function resetNotepad(){notePath=null;noteText='';noteDirty=false;const w=windows.get('notepad');if(w){w.node.querySelector('textarea').value='';updateNoteStatus();updateNotepadTitle();}}
function showNotepadFileMenu(btn){showPopup(btn,[{label:'New                       Ctrl+N',action:newNotepad},{label:'Open...                  Ctrl+O',action:openNotepadChooser},null,{label:'Save                       Ctrl+S',action:()=>saveNotepad()},{label:'Save As...',action:()=>saveNotepad(true)},null,{label:'Close',action:()=>closeWindow('notepad')}]);}
function openNotepadChooser(){fileChooser98({title:'Open',type:'text',save:false,initial:notePath,callback:openFilePath});}
function saveNotepad(as=false){const w=windows.get('notepad');if(!w)return;if(!notePath||as){const initial=notePath?fs.display(notePath):'C:\\My Documents\\Untitled.txt';fileChooser98({title:'Save As',type:'text',save:true,initial:notePath||'C:/MY DOCUMENTS/Untitled.txt',callback:saveNotepadTo});}else saveNotepadTo(notePath);}
function saveNotepadTo(path){try{const p=fs.canonical(path),current=fs.get(p);if(current&&p!==notePath){ask98('Save As',`Replace existing file "${current.name}"?`,()=>writeText(p));}else writeText(p);}catch(e){fsError(e);}}
function writeText(p){try{const w=windows.get('notepad');if(!w)return;noteText=w.node.querySelector('textarea').value;notePath=fs.write(p,noteText);noteDirty=false;updateNoteStatus();updateNotepadTitle();}catch(e){fsError(e);}}
function refreshFilesystemShell(){syncFilesystemDesktop();for(const id of ['disktray','addremove'])windows.get(id)?.node._l98Refresh?.();for(const [id] of windows)if(isExplorer(id))refreshExplorer(id);}
document.addEventListener('latchfschange',()=>{if(!gamePerformance.defer('filesystem-ui',refreshFilesystemShell))refreshFilesystemShell();});
fs.ready.then(syncFilesystemDesktop);
// Desktop's right-click New entries create actual files under C:\WINDOWS\Desktop.
function desktopMake(kind){const dir='C:/WINDOWS/Desktop';if(kind==='folder')prompt98('New Folder','New folder name:','New Folder',name=>fs.mkdir(dir,fs.unique(dir,name)));else prompt98('New Text Document','New file name:','New Text Document.txt',name=>fs.write(dir+'/'+fs.unique(dir,name),''));}

// Limited 1998-style DOS prompt operating on the same virtual drives.
function setupTerminal(node){const fs=window.LatchFS,output=node.querySelector('.dos-output'),input=node.querySelector('.dos-input'),cwd={value:'C:'};let history=[],historyAt=0;
 function append(text=''){const line=document.createElement('div');line.className='dos-print';line.textContent=text;output.append(line);output.scrollTop=output.scrollHeight;}
 function prompt(){node.querySelector('.dos-prompt').textContent=fs.display(cwd.value)+'>';}
 function resolve(raw){raw=(raw||'').trim().replaceAll('\\','/');if(!raw||raw==='.')return cwd.value;if(raw==='..')return fs.parent(cwd.value)||cwd.value;
  if(/^[ca]:$/i.test(raw))return fs.canonical(raw);if(/^[ca]:\//i.test(raw))return fs.canonical(raw);return fs.canonical(cwd.value+'/'+raw);}
 function wordSplit(str){return (str.match(/"[^"]*"|[^\s]+/g)||[]).map(x=>x.replace(/^"|"$/g,''));}
 function execute(line){const args=wordSplit(line),cmd=(args.shift()||'').toLowerCase();if(!cmd)return;
  if(cmd==='cls'){output.textContent='';return;}if(cmd==='help'){append('Supported commands: DIR CD MD RD TYPE COPY MOVE DEL REN CLS ECHO VER HELP START EXIT');return;}
  if(cmd==='ver'){append('Latch 98  [Version 0.8]');return;}
  if(cmd==='echo'){append(args.join(' '));return;}
  if(cmd==='exit'){closeWindow('terminal');return;}
  if(cmd==='c:'||cmd==='a:'){cwd.value=cmd.toUpperCase();return;}
  if(cmd==='dir'){const path=resolve(args[0]);append(' Directory of '+fs.display(path));append('');const files=fs.list(path);for(const item of files)append(`${item.kind==='dir'?'\x3cDIR\x3e':'     '}   ${item.name}`);append('    '+files.length+' file(s) and folder(s)');return;}
  if(cmd==='cd'||cmd==='chdir'){const next=resolve(args[0]);if(fs.get(next)?.kind!=='dir')throw Error('The system cannot find the path specified');cwd.value=next;return;}
  if(cmd==='md'||cmd==='mkdir'){if(!args.length)throw Error('Missing directory name');const to=resolve(args[0]);fs.mkdir(fs.parent(to),args[0].replaceAll('\\','/').split('/').pop());return;}
  if(cmd==='rd'||cmd==='rmdir'){const p=resolve(args[0]);if(fs.list(p).length)throw Error('The directory is not empty');fs.remove(p,true);return;}
  if(cmd==='type'){append(fs.read(resolve(args[0])));return;}
  if(cmd==='del'||cmd==='erase'){const p=resolve(args[0]);fs.remove(p,true);return;}
  if(cmd==='ren'||cmd==='rename'){if(args.length<2)throw Error('Syntax: REN source newname');fs.rename(resolve(args[0]),args[1]);return;}
  if(cmd==='copy'||cmd==='move'){if(args.length<2)throw Error('Syntax: '+cmd.toUpperCase()+' source destination');const src=resolve(args[0]),dest=resolve(args[1]);const to=fs.get(dest)?.kind==='dir'?dest+'/'+fs.get(src).name:dest;
   if(cmd==='move')fs.move(src,to);else fs.copy(src,fs.parent(to),to.split('/').pop());return;}
  if(cmd==='start'){runCommand(args.join(' '));return;}
  if(cmd==='explorer'){launch('computer');return;}
  if(cmd==='notepad'){launch('notepad');return;}
  append(`Bad command or file name: ${cmd}`);
 }
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){const line=input.value;input.value='';append(fs.display(cwd.value)+'>'+line);if(line.trim()){history.push(line);historyAt=history.length;}try{execute(line);}catch(err){append(err.message);}prompt();e.preventDefault();}
 else if(e.key==='ArrowUp'){historyAt=Math.max(0,historyAt-1);input.value=history[historyAt]||'';e.preventDefault();}else if(e.key==='ArrowDown'){historyAt=Math.min(history.length,historyAt+1);input.value=history[historyAt]||'';e.preventDefault();}});
 node.querySelector('.terminal').addEventListener('click',()=>input.focus());fs.ready.then(()=>{append('Latch 98 [Version 0.6.0]');append('Copyright (C) Latch Computer Co.');append('Type HELP for commands.');append();prompt();});}
let paintPath=null;
function showPaintFileMenu(btn){showPopup(btn,[{label:'New',action:()=>{if(windows.has('paint')){clearPaint(windows.get('paint').node);paintPath=null;}}},{label:'Open...',action:openPaintChooser},null,{label:'Save                  Ctrl+S',action:savePaint},{label:'Save As...',action:()=>savePaint(true)}]);}
function openPaintChooserOLD(){prompt98('Open Picture','PNG picture path:','C:\\My Documents\\Picture.png',path=>{const p=fs.canonical(path),n=fs.get(p);if(!n||n.kind!=='image')throw Error('This is not a PNG picture');launch('paint');const img=new Image();img.onload=()=>{const canvas=windows.get('paint').node.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,Math.min(img.width,canvas.width),Math.min(img.height,canvas.height));paintPath=p;};img.src=n.data;});}
function openPaintChooser(){fileChooser98({title:'Open',type:'image',save:false,initial:paintPath,callback:openPaintFromPath});}
function openPaintFromPath(path){const n=fs.get(path);if(!n||n.kind!=='image')throw Error('This is not a PNG picture');launch('paint');const img=new Image();img.onload=()=>{const canvas=windows.get('paint').node.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,Math.min(img.width,canvas.width),Math.min(img.height,canvas.height));paintPath=path;};img.src=n.data;}
function savePaint(as=false){const w=windows.get('paint');if(!w)return;if(!paintPath||as){fileChooser98({title:'Save As',type:'image',save:true,initial:paintPath||'C:/MY DOCUMENTS/Picture.png',callback:savePaintTo});}else savePaintTo(paintPath);}
function savePaintTo(value){try{const p=fs.canonical(value);if(!p.toLowerCase().endsWith('.png'))throw Error('File name must end in .png');const w=windows.get('paint');if(!w)return;const data=w.node.querySelector('canvas').toDataURL('image/png');fs.writeImage(p,data);paintPath=p;}catch(e){fsError(e);}}

// Solitaire is a self-contained game with its own Win98-like Game/Help bar.
// Only the parent desktop creates OS chrome; Solitaire uses the same taskbar.
function setupSolitaire(node){
 const host=node.querySelector('.solitaire-host');if(!host)return;
 const frame=document.createElement('iframe');
 frame.className='solitaire-frame';frame.title='Solitaire — Klondike';
 const embedded=window.LATCH98_SOLITAIRE_B64;
 if(embedded){const bytes=Uint8Array.from(atob(embedded),ch=>ch.charCodeAt(0));frame.srcdoc=new TextDecoder().decode(bytes);}
 else frame.src='apps/solitaire/solitaire.html';
 host.replaceChildren(frame);
 const w=windows.get('solitaire');if(w)w.cleanup=()=>frame.remove();
}

// A Latch application mounts inside the window manager's client area. Minesweeper
// owns no OS chrome. Its Rust/WASM engine loads when built; otherwise the
// supplied preview engine runs (and offline HTML uses a self-contained iframe).
function setupMinesweeper(node){
 const host=node.querySelector('.minesweeper-host');
 const id='minesweeper';
 const isFile=location.protocol==='file:';
 if(isFile||!!window.LATCH98_MINESWEEPER_PREVIEW_B64){
   const frame=document.createElement('iframe');
   frame.className='minesweeper-frame';frame.title='Minesweeper game';
   const embedded=window.LATCH98_MINESWEEPER_PREVIEW_B64;
   if(embedded){
     // atob returns Latin-1; TextDecoder correctly restores all UTF-8 characters.
     const bytes=Uint8Array.from(atob(embedded),c=>c.charCodeAt(0));
     frame.srcdoc=new TextDecoder().decode(bytes);
   }else frame.src='apps/minesweeper/latch98-minesweeper-preview.html';
   host.replaceChildren(frame);
   const w=windows.get(id);if(w)w.cleanup=()=>{frame.remove();};
   return;
 }
 const w=windows.get(id);
 if(w)w.cleanup=()=>{};
 import('./apps/minesweeper/web/app.js').then(async ({mountMinesweeper})=>{
   if(!windows.has(id))return;
   const api=await mountMinesweeper(host);
   if(!windows.has(id)){api.destroy();return;}
   windows.get(id).cleanup=()=>api.destroy();
 }).catch(error=>{
   if(!windows.has(id))return;
   console.error('Minesweeper could not start:',error);
   host.textContent='Minesweeper could not load. Check that the Rust server and app files are installed.';
 });
 // The app reports field sizes in tiles; keep the host window useful for each
 // difficulty without stealing control from the Latch 98 window manager.
 node.addEventListener('latch98:content-resize',e=>{
   if(!windows.has(id))return;
   const w=windows.get(id);if(w.maximized)return;
   const cols=e.detail?.width||9,rows=e.detail?.height||9;
   node.style.width=Math.min(innerWidth-12,Math.max(284,cols*16+65))+'px';
   node.style.height=Math.min(innerHeight-51,Math.max(360,rows*16+172))+'px';
   if(node.getBoundingClientRect().right>innerWidth-4)node.style.left=Math.max(2,innerWidth-node.getBoundingClientRect().width-4)+'px';
   if(node.getBoundingClientRect().bottom>innerHeight-44)node.style.top=Math.max(2,innerHeight-node.getBoundingClientRect().height-45)+'px';
 });
}
function openFile(name){if(name.includes('Control'))launch('control');else if(name.includes('Documents'))launch('documents');else if(name.endsWith('.txt'))launch('notepad');else if(name.includes('Disk')||name.includes('Floppy'))showDialog(name,'<p>This disk is ready. Contents will appear in a later version of Latch 98.</p>',[{label:'OK'}]);}
async function doFind(node){await fs.ready;const q=node.querySelector('#find-query').value.trim();if(!q)return;const found=fs.search(q),apps=['notepad','paint','calculator','minesweeper','solitaire','computer','browser',...fs.installedPrograms().map(p=>p.id)].filter(s=>s.includes(q.toLowerCase()));
 const box=node.querySelector('#find-result');box.innerHTML=[...apps.map(a=>`<button class="find-hit" data-found="${a}">${icon(iconOf(a))} ${escapeHtml(titleOf(a))}</button>`),...found.map(n=>`<button class="find-hit" data-found-path="${escapeHtml(n.path)}">${icon(iconForFS(n))} ${escapeHtml(n.name)}</button>`)].join('')||'No matching items found.';
 box.querySelectorAll('[data-found]').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.found)));box.querySelectorAll('[data-found-path]').forEach(b=>b.addEventListener('click',()=>openFilePath(b.dataset.foundPath)));}
// Display Properties: changes are staged until Apply/OK, matching the Control Panel.
const SHELL_FILE='C:/WINDOWS/SYSTEM/LATCH.INI';
const SHELL_KEY='latch98.shell.v07';
const wallpaperColors={teal:'#008080',blue:'#174c9c',green:'#227650',plum:'#655379',gray:'#5a6266'};
const defaultShellSettings=()=>({tone:'teal',wallpaper:'',wallpaperMode:'center',scheme:'standard',saver:'none',wait:5,animations:true,singleClick:false,showBrowser:true,clock:true,smallStart:false});
let shellSettings=defaultShellSettings();
try{const saved=JSON.parse(localStorage.getItem(SHELL_KEY)||'null');if(saved&&typeof saved==='object')Object.assign(shellSettings,saved);}catch{}
try{const old=localStorage.getItem('latch98.wallpaper');if(old&&!localStorage.getItem(SHELL_KEY)&&wallpaperColors[old])shellSettings.tone=old;}catch{}
const recentDocuments=(()=>{try{return JSON.parse(localStorage.getItem('latch98.recent')||'[]').filter(x=>typeof x==='string').slice(0,9);}catch{return [];}})();
function recordRecentDocument(path){const i=recentDocuments.indexOf(path);if(i!==-1)recentDocuments.splice(i,1);recentDocuments.unshift(path);recentDocuments.length=Math.min(9,recentDocuments.length);try{localStorage.setItem('latch98.recent',JSON.stringify(recentDocuments));}catch{}}
function normalizeShell(st){
 st.tone=wallpaperColors[st.tone]?st.tone:'teal';st.wallpaper=typeof st.wallpaper==='string'?st.wallpaper:'';
 st.wallpaperMode=['center','tile','stretch'].includes(st.wallpaperMode)?st.wallpaperMode:'center';
 st.scheme=['standard','slate','contrast'].includes(st.scheme)?st.scheme:'standard';
 st.saver=['none','blank','starfield'].includes(st.saver)?st.saver:'none';st.wait=Math.max(1,Math.min(60,Number(st.wait)||5));
 for(const key of ['animations','singleClick','showBrowser','clock','smallStart'])st[key]=!!st[key];return st;
}
function applyShellSettings(){
 normalizeShell(shellSettings);el.desktop.dataset.wallpaper=shellSettings.tone;
 document.documentElement.dataset.scheme=shellSettings.scheme;
 el.desktop.classList.toggle('l98-no-animations',!shellSettings.animations);
 el.desktop.classList.toggle('l98-small-start',shellSettings.smallStart);
 el.desktop.classList.toggle('l98-small-icons',shellSettings.smallStart);
 el.desktop.classList.toggle('l98-single-click',shellSettings.singleClick);
 $('clock').classList.toggle('hidden',!shellSettings.clock);
 desktopIcons.querySelectorAll('[data-app="browser"]').forEach(i=>i.classList.toggle('hidden',!shellSettings.showBrowser));
 const n=shellSettings.wallpaper?fs.get(shellSettings.wallpaper):null;
 if(n?.kind==='image'&&/^data:image\/png;base64,/i.test(n.data||'')){
  el.desktop.style.backgroundImage=`url("${n.data}")`;
  el.desktop.style.backgroundRepeat=shellSettings.wallpaperMode==='tile'?'repeat':'no-repeat';
  el.desktop.style.backgroundSize=shellSettings.wallpaperMode==='stretch'?'100% 100%':'auto';
  el.desktop.style.backgroundPosition='center';
 }else el.desktop.style.removeProperty('background-image');
}
function saveShellSettings(){
 const serialized=JSON.stringify(shellSettings);try{fs.write(SHELL_FILE,serialized);}catch(e){fsError(e);return;}
 try{localStorage.setItem(SHELL_KEY,serialized);}catch{}applyShellSettings();
}
function setupDisplayProperties(node){
 const stage=structuredClone(normalizeShell({...shellSettings})),page=node.querySelector('.l98-display-page');let tab='Background';
 const images=()=>{try{return fs.search('.png').filter(n=>n.kind==='image').sort((a,b)=>a.name.localeCompare(b.name));}catch{return [];}};
 const preview=()=>{const monitor=page.querySelector('.l98-monitor-desktop');if(!monitor)return;
 monitor.style.background=wallpaperColors[stage.tone];const img=stage.wallpaper&&fs.get(stage.wallpaper);
 monitor.style.backgroundImage=img?.kind==='image'?`url("${img.data}")`:'';
 monitor.style.backgroundSize=stage.wallpaperMode==='stretch'?'100% 100%':stage.wallpaperMode==='tile'?'45% auto':'auto 72%';
 monitor.style.backgroundRepeat=stage.wallpaperMode==='tile'?'repeat':'no-repeat';monitor.style.backgroundPosition='center';
 };
 const render=()=>{
  node.querySelectorAll('[data-display-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.displayTab===tab);b.setAttribute('aria-selected',String(b.dataset.displayTab===tab));});
  let html='';
  if(tab==='Background')html=`<div class="l98-monitor"><div class="l98-monitor-desktop"><div class="l98-monitor-window"><b>Latch 98</b><p>My Computer</p></div></div></div><div class="l98-panel-fields"><label>Wallpaper:<select data-setting="wallpaper"><option value="">(None)</option>${images().map(n=>`<option value="${escapeHtml(n.path)}" ${stage.wallpaper===n.path?'selected':''}>${escapeHtml(n.name)}</option>`).join('')}</select></label><label>Display:<select data-setting="wallpaperMode">${[['center','Center'],['tile','Tile'],['stretch','Stretch']].map(([v,l])=>`<option value="${v}" ${stage.wallpaperMode===v?'selected':''}>${l}</option>`).join('')}</select></label><div class="l98-color-picker">${Object.entries(wallpaperColors).map(([v,c])=>`<button type="button" style="background:${c}" title="${v}" aria-label="${v}" class="${stage.tone===v?'selected':''}" data-tone="${v}"></button>`).join('')}</div></div>`;
  if(tab==='Screen Saver')html=`<div class="l98-monitor"><div class="l98-monitor-desktop l98-saver-thumbnail ${stage.saver==='starfield'?'stars':''}" style="background:${stage.saver==='blank'?'#000':'#008080'}"></div></div><div class="l98-panel-fields"><label>Screen saver:<select data-setting="saver">${[['none','(None)'],['blank','Blank Screen'],['starfield','Starfield']].map(([v,l])=>`<option value="${v}" ${stage.saver===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Wait: <input type="number" min="1" max="60" data-setting="wait" value="${stage.wait}" style="width:65px"> minutes</label><button type="button" class="classic-btn" data-preview-saver="1">Preview</button></div>`;
  if(tab==='Appearance')html=`<div class="l98-appearance-sample"><div class="l98-preview-title">Active Window <span>□ ×</span></div><div class="l98-preview-body">Window text <button class="classic-btn" type="button">OK</button></div></div><div class="l98-panel-fields"><label>Scheme:<select data-setting="scheme">${[['standard','Windows Standard'],['slate','Slate'],['contrast','High Contrast']].map(([v,l])=>`<option value="${v}" ${stage.scheme===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`;
  if(tab==='Effects')html=`<div class="l98-panel-fields l98-settings-checks"><label><input type="checkbox" data-setting="animations" ${stage.animations?'checked':''}> Animate windows, menus, and lists</label><p>Turn off animation effects for faster display.</p></div>`;
  if(tab==='Web')html=`<div class="l98-panel-fields l98-settings-checks"><label><input type="checkbox" data-setting="singleClick" ${stage.singleClick?'checked':''}> Single-click to open desktop items</label><label><input type="checkbox" data-setting="showBrowser" ${stage.showBrowser?'checked':''}> Show Latch Browser on the desktop</label></div>`;
  if(tab==='Settings')html=`<div class="l98-monitor"><div class="l98-monitor-desktop"><div class="l98-resolution">${Math.round(innerWidth)} by ${Math.round(innerHeight)} pixels</div></div></div><div class="l98-panel-fields"><strong>Display information</strong><p>Desktop area: ${Math.round(innerWidth)} by ${Math.round(innerHeight)} pixels</p><p>Colors: True Color</p><p>The desktop uses the current screen area.</p></div>`;
  page.innerHTML=html;page.querySelectorAll('[data-setting]').forEach(control=>control.addEventListener('change',()=>{const field=control.dataset.setting;stage[field]=control.type==='checkbox'?control.checked:control.type==='number'?Number(control.value):control.value;render();}));
  page.querySelectorAll('[data-tone]').forEach(control=>control.addEventListener('click',()=>{stage.tone=control.dataset.tone;render();}));
  page.querySelector('[data-preview-saver]')?.addEventListener('click',()=>startScreenSaver(stage.saver,true));
  preview();
 };
 node.querySelectorAll('[data-display-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.displayTab;render();});
 const commit=()=>{Object.assign(shellSettings,normalizeShell(stage));saveShellSettings();};
 node.querySelector('[data-display-action="apply"]').onclick=commit;
 node.querySelector('[data-display-action="ok"]').onclick=()=>{commit();closeWindow('display');};
 node.querySelector('[data-display-action="cancel"]').onclick=()=>closeWindow('display');
 render();
}
let lastActivity=Date.now(),saverActive=false;
function stopScreenSaver(){const saver=$('l98-screen-saver');if(saver){saver.remove();saverActive=false;}lastActivity=Date.now();}
function startScreenSaver(mode=shellSettings.saver,preview=false){
 if(mode==='none')return;
 stopScreenSaver();const overlay=document.createElement('div');overlay.id='l98-screen-saver';overlay.className='l98-screen-saver '+(mode==='starfield'?'l98-stars':'');overlay.tabIndex=-1;
 if(preview)overlay.innerHTML='<span class="l98-saver-hint">Move the mouse or press a key to return</span>';
 el.desktop.append(overlay);saverActive=true;overlay.focus({preventScroll:true});
}
['pointermove','pointerdown','keydown','touchstart'].forEach(name=>document.addEventListener(name,()=>{if(saverActive)stopScreenSaver();else lastActivity=Date.now();},{capture:true,passive:true}));
gamePerformance.shellInterval('screen-saver',()=>{if(shellSettings.saver!=='none'&&!saverActive&&!el.desktop.classList.contains('hidden')&&Date.now()-lastActivity>=shellSettings.wait*60000)startScreenSaver();},9000);
fs.ready.then(()=>{
 const file=fs.get(SHELL_FILE);
 if(file?.kind==='text'){try{const loaded=JSON.parse(file.data);if(loaded&&typeof loaded==='object')Object.assign(shellSettings,loaded);}catch{}}
 applyShellSettings();
});
document.addEventListener('latchfschange',()=>{if(shellSettings.wallpaper&&!gamePerformance.defer('wallpaper-ui',applyShellSettings))applyShellSettings();});
async function setupNotepad(node){await fs.ready;node.querySelector('textarea').value=noteText;
 node.querySelector('textarea').addEventListener('input',()=>{noteText=node.querySelector('textarea').value;noteDirty=true;updateNoteStatus();});updateNotepadTitle();updateNoteStatus();}
function updateNoteStatus(){const w=windows.get('notepad');if(!w)return;const count=w.node.querySelector('.status-text');if(count)count.textContent=`${noteDirty?'Modified — ':''}${noteText.length} characters | ${notePath?fs.display(notePath):'Unsaved'} | Ctrl+S`;}
function setupCalculator(node){const display=node.querySelector('.calc-display');let current='0',held=null,op=null,overwrite=false;
 const get=()=>Number(current)||0;const show=()=>{display.textContent=current.slice(0,17);};
 node.querySelectorAll('[data-calc]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.calc;
 if(/^\d$/.test(key)){current=(overwrite||current==='0')?key:current+key;overwrite=false;}
 else if(key==='.'){if(overwrite){current='0';overwrite=false;}if(!current.includes('.'))current+='.';}
 else if(key==='C'){current='0';held=null;op=null;overwrite=false;}
 else if(key==='⌫'){current=current.length>1?current.slice(0,-1):'0';}
 else if(key==='±'){current=String(-get());}
 else if(key==='%'){current=String(get()/100);}
 else if(['+','−','×','÷'].includes(key)){if(op&&!overwrite)compute();held=get();op=key;overwrite=true;}
 else if(key==='='){compute();held=null;op=null;overwrite=true;}show();
 }));
 function compute(){if(held===null||!op)return;const a=held,b=get(),out=op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:b===0?'Error':a/b;current=typeof out==='number'?String(Number(out.toPrecision(12))):out;}
}
function setupPaint(node){const canvas=node.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';let painting=false;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
 canvas.addEventListener('pointerdown',e=>{painting=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();const p=point(e);ctx.moveTo(p.x,p.y);ctx.strokeStyle=node.querySelector('#paint-color').value;ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();});
 canvas.addEventListener('pointermove',e=>{if(!painting)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(evt,()=>painting=false);
}
function clearPaint(node){const c=node.querySelector('canvas');if(!c)return;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);}
function activateWindow(id){const w=windows.get(id);if(!w)return;
 if(w.minimized){w.minimized=false;w.node.classList.remove('minimized');boundWindow(w);}
 activeId=id;w.node.style.zIndex=++topZ;windows.forEach(x=>x.node.classList.toggle('inactive',x.id!==id));updateTaskbar();
}
function topVisibleWindow(){return [...windows.values()].filter(w=>!w.minimized).sort((a,b)=>(+b.node.style.zIndex)-(+a.node.style.zIndex))[0]||null;}
function closeWindow(id){const w=windows.get(id);if(!w)return;saveWindowLayout(w);try{w.cleanup?.();}catch(error){console.warn('App cleanup failed',error);}w.node.remove();windows.delete(id);if(id==='notepad'){noteDirty=false;}if(id==='paint')paintPath=null;
 if(activeId===id){const next=topVisibleWindow();activeId=null;if(next){activateWindow(next.id);focusWindow(next);}else{windows.forEach(x=>x.node.classList.add('inactive'));updateTaskbar();focusDesktop();}}
 else{updateTaskbar();if(!document.activeElement?.isConnected)focusWindow(windows.get(activeId));}
}
function closeAll(){[...windows.keys()].forEach(closeWindow);hideDialog();closeMenus();}
function minimizeWindow(id){const w=windows.get(id);if(!w)return;saveWindowLayout(w);w.minimized=true;w.node.classList.add('minimized');if(activeId===id){activeId=null;const other=topVisibleWindow();if(other){activateWindow(other.id);focusWindow(other);}else{windows.forEach(x=>x.node.classList.add('inactive'));updateTaskbar();focusDesktop();}}else updateTaskbar();}
function maximizeWindow(id){const w=windows.get(id);if(!w)return;if(!w.maximized)saveWindowLayout(w);w.maximized=!w.maximized;w.node.classList.toggle('maximized',w.maximized);if(!w.maximized){restoreWindowLayout(w);boundWindow(w);}activateWindow(id);focusWindow(w);}
function updateTaskbar(){const focusId=document.activeElement?.dataset?.task;
 el.taskbar.innerHTML=[...windows.values()].map(w=>`<button type="button" class="task-btn ${activeId===w.id&&!w.minimized?'active':''}" data-task="${escapeHtml(w.id)}" aria-label="${escapeHtml(titleOf(w.id))}${w.minimized?' (minimized)':''}" aria-pressed="${activeId===w.id&&!w.minimized}" title="${escapeHtml(titleOf(w.id))}">${icon(iconOf(w.id))}<span>${escapeHtml(titleOf(w.id))}</span></button>`).join('');
 el.taskbar.querySelectorAll('[data-task]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.task,w=windows.get(id);if(!w)return;if(activeId===id&&!w.minimized)minimizeWindow(id);else{activateWindow(id);focusWindow(w);}}));
 if(focusId){const button=[...el.taskbar.querySelectorAll('[data-task]')].find(b=>b.dataset.task===focusId);button?.focus({preventScroll:true});}
}
function setupDrag(node,id){const bar=node.querySelector('.titlebar');bar.addEventListener('dblclick',e=>{if(!e.target.closest('.controls'))maximizeWindow(id);});bar.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('button')||windows.get(id).maximized)return;
 activateWindow(id);const startX=e.clientX,startY=e.clientY,rect=node.getBoundingClientRect(),origX=rect.left,origY=rect.top;
 bar.setPointerCapture(e.pointerId);let moved=false;
 const move=ev=>{if(ev.pointerId!==e.pointerId)return;const area=desktopBounds(),w=Math.min(rect.width,area.width),h=Math.min(rect.height,area.height);
  const x=Math.max(0,Math.min(area.width-w,origX+ev.clientX-startX)),y=Math.max(0,Math.min(area.height-h,origY+ev.clientY-startY));node.style.left=Math.round(x)+'px';node.style.top=Math.round(y)+'px';moved=true;};
 const stop=ev=>{if(ev?.pointerId!==undefined&&ev.pointerId!==e.pointerId)return;bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',stop);bar.removeEventListener('pointercancel',stop);try{bar.releasePointerCapture(e.pointerId);}catch{}if(moved){boundWindow(windows.get(id));saveWindowLayout(windows.get(id));}};
 bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',stop);bar.addEventListener('pointercancel',stop);
 });}
window.addEventListener('resize',()=>{closeMenus();windows.forEach(boundWindow);});
function showDialog(title,body,actions=[{label:'OK'}]){
 if(el.overlay.classList.contains('hidden'))dialogFocus=document.activeElement;
 el.overlay.innerHTML=`<div class="dialog-box" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="dialog-bar">${escapeHtml(title)}</div><div class="dialog-main">${body}<div class="dialog-buttons"></div></div></div>`;el.overlay.classList.remove('hidden');const footer=el.overlay.querySelector('.dialog-buttons');actions.forEach(action=>{const b=document.createElement('button');b.className='classic-btn';b.textContent=action.label;b.addEventListener('click',()=>{hideDialog();action.action?.();});footer.append(b);});
 (el.overlay.querySelector('input:not([type="hidden"]),select,textarea')||footer.querySelector('button'))?.focus({preventScroll:true});
}
function hideDialog(){if(el.overlay.classList.contains('hidden'))return;el.overlay.classList.add('hidden');el.overlay.innerHTML='';
 const previous=dialogFocus;dialogFocus=null;if(previous?.isConnected&&previous.getClientRects().length&&!previous.closest('.minimized,.hidden'))previous.focus({preventScroll:true});
 else if(activeId)focusWindow(windows.get(activeId));else focusDesktop();
}
function showRun(){let command='';showDialog('Run',`<p>Type the name of a program, folder, or document, and Latch 98 will open it for you.</p><input class="retro-input" id="run-input" placeholder="notepad" autocomplete="off"><p class="menu-tip" style="margin-top:9px">Try: latchnet, www.townwire.l98, winmine, sol, notepad, calc, cmd</p>`,[{label:'OK',action:()=>runCommand(command)},{label:'Cancel'}]);
 const input=$('run-input');input.addEventListener('input',()=>command=input.value);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();command=input.value;hideDialog();runCommand(command);}});input.focus();}
function runCommand(value){const key=(value||'').trim().toLowerCase().replace(/\.exe$/,'');if(/^[cad]:/i.test(value.trim())){openFilePath(value.trim());return;}if(value&&(/^(https?:\/\/|www\.)/i.test(value.trim())||/\.l98(\/|$)/i.test(value.trim()))){launch('browser');window.LatchNet?.active?.navigate(value.trim());return;}const programs={swarmwire:'swarmwire',swarm:'swarmwire',nornlab:'nornlab',cdrom:'cdrom',charmap:'charmap',disktray:'disktray',appwiz:'addremove',iexplore:'browser',internet:'browser',latchnet:'browser',winmine:'minesweeper',minesweeper:'minesweeper',sol:'solitaire',solitaire:'solitaire',wilds:'wilds',catacombs:'catacombs',weedwarrior:'weedwarrior',studio:'soundstudio',soundstudio:'soundstudio',audacity:'audacity',spritestudio:'spritestudio',sprite:'spritestudio',latchamp:'latchamp',updates:'updates',update:'updates',notepad:'notepad',calc:'calculator',calculator:'calculator',mspaint:'paint',paint:'paint',explorer:'computer',computer:'computer',winver:'about',control:'control',cmd:'terminal',help:'help',display:'display'};if(['postbox','mail','email','inbox'].includes(key))launch('site:postbox');else if(programs[key])launch(programs[key]);else showDialog('Run',`<p>Latch 98 cannot find the specified program.</p><p class="menu-tip">Use a program name listed in Start &gt; Programs.</p>`,[{label:'OK'}]);}
function showShutdown(){showDialog('Shut Down Latch 98',`<div class="shutdown-grid"><svg class="mark" viewBox="0 0 100 100"><use href="#mark-latch"/></svg><div>What do you want the computer to do?<div class="shutdown-option"><label><input type="radio" name="powerchoice" value="off" checked> Shut down</label></div><div class="shutdown-option"><label><input type="radio" name="powerchoice" value="restart"> Restart</label></div></div></div>`,[{label:'OK',action:()=>{const mode=window._latchPowerChoice||'off';window._latchPowerChoice=null;closeAll();if(mode==='restart')boot();else{el.desktop.classList.add('hidden');$('poweroff').classList.remove('hidden');}}},{label:'Cancel'}]);
 const inputs=el.overlay.querySelectorAll('input[name="powerchoice"]');window._latchPowerChoice='off';inputs.forEach(i=>i.addEventListener('change',()=>{window._latchPowerChoice=i.value;}));}
})();

