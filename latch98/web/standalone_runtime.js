/* Single HTML Latch 98 runtime. Games stay in the artifact, not the virtual hard disk.
   Installing Norn World Lab still requires its original SwarmWire -> ISO -> Setup route. */
(()=>{'use strict';
 const cache=new Map();let fullscreenPriorFocus=null,fullscreenOpening=false;
 function get(name){
   if(cache.has(name))return cache.get(name);
   const node=document.getElementById('l98-packed-'+name);
   if(!node)return null;
   const raw=node.textContent.replace(/\s/g,'');
   const text=new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0)));
   cache.set(name,text);return text;
 }
 const dbName='latch98.singlefile.imports.v1';
 function database(){return new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('Browser file storage unavailable'));return;}
   const req=indexedDB.open(dbName,1);
   req.onupgradeneeded=()=>req.result.createObjectStore('games');
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });}
 async function stored(key){
   try{const db=await database();return await new Promise((resolve,reject)=>{
     const tx=db.transaction('games','readonly'),req=tx.objectStore('games').get(key);
     req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
     tx.oncomplete=()=>db.close();
   });}catch{try{return localStorage.getItem('latch98.singlefile.game.'+key);}catch{return null;}}
 }
 async function store(key,html){let db;try{db=await database();}catch{localStorage.setItem('latch98.singlefile.game.'+key,html);return;}return await new Promise((resolve,reject)=>{
   const tx=db.transaction('games','readwrite');tx.objectStore('games').put(html,key);
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
 });}
 const onlineBloodline='https://mrcrackers420.github.io/Bloodline/game/bloodline.html';
 const bloodlineRaw='https://raw.githubusercontent.com/MrCrackers420/Bloodline/main/game/bloodline.html';
 const bundle={get, isStandalone:true, onlineBloodline,
   async bloodline(){return get('bloodline')||await stored('bloodline');},
   async importBloodline(file){const html=await file.text();
     if(file.size>15*1024*1024||!/<html\b/i.test(html)||!/<script\b/i.test(html))throw Error('Select the complete Bloodline HTML game (under 15 MB).');
     await store('bloodline',html);return html;
   },
   async showBloodlinePicker(host,onHtml){
     host.replaceChildren();
     const panel=document.createElement('div');panel.className='l98-import-game';
     panel.innerHTML='<h2>Bloodline</h2><p>To make Bloodline available offline, load the original game HTML once. It will be saved in this browser. You can also fetch the current game from GitHub if connected.</p><label class="classic-btn l98-import-label">Choose Bloodline HTML<input type="file" accept=".html,.htm,text/html" hidden></label><button type="button" class="classic-btn l98-fetch-game">Fetch &amp; save from GitHub</button><button type="button" class="classic-btn l98-online-game">Play hosted version</button><p class="l98-import-status" role="status"></p>';
     host.append(panel);
     const input=panel.querySelector('input'),status=panel.querySelector('.l98-import-status');
     input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;status.textContent='Importing...';try{const html=await bundle.importBloodline(file);onHtml(html);}
       catch(e){status.textContent='Import failed: '+e.message;}});
     panel.querySelector('.l98-fetch-game').onclick=async()=>{
       const button=panel.querySelector('.l98-fetch-game');button.disabled=true;
       status.textContent='Retrieving Bloodline from GitHub...';
       try{const r=await fetch(bloodlineRaw,{mode:'cors',cache:'no-store'});
         if(!r.ok)throw Error('HTTP '+r.status);
         const text=await r.text();
         if(!/<html\b/i.test(text)||!/<script\b/i.test(text))throw Error('Invalid game source');
         await store('bloodline',text);onHtml(text);
       }catch(e){status.textContent='Could not fetch the game: '+e.message+'. Use Choose Bloodline HTML, or Play hosted version.';}
       finally{button.disabled=false;}
     };
     panel.querySelector('.l98-online-game').onclick=()=>onHtml(null,onlineBloodline);
   },
   fullscreenGame(html=null,url=null){
     const layer=document.getElementById('l98-standalone-game');
     const frame=layer.querySelector('iframe');frame.classList.remove('hidden');layer.querySelector('.l98-full-setup').classList.add('hidden');frame.removeAttribute('src');frame.removeAttribute('srcdoc');
     // Key events in a same-origin iframe never bubble to the desktop window.
     frame.onload=()=>{frame.focus({preventScroll:true});try{frame.contentWindow.addEventListener('keydown',e=>{
       if(e.ctrlKey&&e.shiftKey&&e.key==='Escape'){
         e.preventDefault();e.stopImmediatePropagation();bundle.closeFullscreenGame();
       }
     },true);}catch{}};
     if(html)frame.srcdoc=html;else if(url)frame.src=url;
     if(layer.classList.contains('hidden'))fullscreenPriorFocus=document.activeElement;
     layer.classList.remove('hidden');document.getElementById('desktop').classList.add('hidden');
     frame.focus({preventScroll:true});
   },
   closeFullscreenGame(){const layer=document.getElementById('l98-standalone-game');if(!layer||layer.classList.contains('hidden'))return;
     const frame=layer.querySelector('iframe');frame.removeAttribute('srcdoc');frame.removeAttribute('src');
     layer.classList.add('hidden');document.getElementById('desktop').classList.remove('hidden');
     if(fullscreenPriorFocus?.isConnected&&fullscreenPriorFocus.getClientRects().length&&!fullscreenPriorFocus.closest('.hidden'))fullscreenPriorFocus.focus({preventScroll:true});
     else document.getElementById('start-button')?.focus({preventScroll:true});
     fullscreenPriorFocus=null;fullscreenOpening=false;
   },
   async launchBloodlineFull(){
     if(fullscreenOpening||!document.getElementById('l98-standalone-game')?.classList.contains('hidden'))return;
     fullscreenOpening=true;fullscreenPriorFocus=document.activeElement;
     let html;try{html=await bundle.bloodline();}catch{html=null;}
     fullscreenOpening=false;
     if(html){bundle.fullscreenGame(html);return;}
     const layer=document.getElementById('l98-standalone-game');layer.classList.remove('hidden');
     document.getElementById('desktop').classList.add('hidden');
     const setup=layer.querySelector('.l98-full-setup');setup.classList.remove('hidden');
     const frame=layer.querySelector('iframe');frame.classList.add('hidden');
     await bundle.showBloodlinePicker(setup,(source,remote)=>{setup.classList.add('hidden');frame.classList.remove('hidden');bundle.fullscreenGame(source,remote);});
     setup.querySelector('input[type="file"]')?.focus({preventScroll:true});
   }
 };
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key==='Escape'){
   bundle.closeFullscreenGame();e.preventDefault();e.stopImmediatePropagation();
 }},true);
 document.addEventListener('click',e=>{if(e.target.closest('[data-l98-exit-game]'))bundle.closeFullscreenGame();});
 // Console-friendly exit: hold Back/Select + Start together for over a second.
 let comboSince=0;
 setInterval(()=>{
   const screen=document.getElementById('l98-standalone-game');
   if(!screen||screen.classList.contains('hidden')){comboSince=0;return;}
   const pads=navigator.getGamepads?.()||[];
   const pressed=[...pads].some(p=>p&&p.buttons?.[8]?.pressed&&p.buttons?.[9]?.pressed);
   if(!pressed){comboSince=0;return;}
   if(!comboSince)comboSince=performance.now();
   else if(performance.now()-comboSince>1100){comboSince=0;bundle.closeFullscreenGame();}
 },130);
 window.LatchBundle=bundle;
})();
