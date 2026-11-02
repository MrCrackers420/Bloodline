/* Deterministic Latch shell activity/transition regression tests.
 * Run with: node tests/round4/desktop/performance.test.cjs
 * Optional baseline comparison: node .../performance.test.cjs --measure-only --root /path/to/base
 * Intentionally no global production timer monkeypatch: fake timers exist ONLY in this test VM.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=process.argv.includes('--root')?path.resolve(process.argv[process.argv.indexOf('--root')+1]):path.resolve(__dirname,'../../..');
const baseline=process.argv.includes('--measure-only');
const delay=()=>new Promise(r=>setImmediate(r));
class Classes {
 constructor(...names){this.s=new Set(names);}
 add(...x){x.forEach(v=>this.s.add(v));}
 remove(...x){x.forEach(v=>this.s.delete(v));}
 contains(x){return this.s.has(x);}
 toggle(x,v){if(v===undefined)v=!this.s.has(x);v?this.s.add(x):this.s.delete(x);return v;}
}
class Element {
 constructor(id='',owner=null){this.id=id;this.owner=owner;this.classList=new Classes(['startup','desktop','l98-modular-game','l98-standalone-game','l98-full-setup','submenu','nested-menu','start-menu','dialog-overlay','poweroff'].includes(id)?'hidden':'');
 this.classList.s.delete('');this.style={removeProperty(){},setProperty(){}};this.dataset={};this.listeners=new Map();this.children=[];this.parts=new Map();this.tabIndex=-1;this.textContent='';this.innerHTML='';this.offsetWidth=500;this.offsetHeight=350;this.isConnected=true;this.disabled=false;this.title='';this.value='';this.files=[];this._focus=0;}
 addEventListener(name,fn){let a=this.listeners.get(name);if(!a){a=[];this.listeners.set(name,a);}a.push(fn);}
 removeEventListener(name,fn){const a=this.listeners.get(name)||[];this.listeners.set(name,a.filter(x=>x!==fn));}
 dispatch(name,event={}){for(const callback of [...(this.listeners.get(name)||[])])callback({target:this,button:0,pointerId:1,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...event});}
 click(){this.dispatch('click');}
 focus(){if(this.owner)this.owner.activeElement=this;this._focus++;}
 setAttribute(k,v){this[k]=String(v);}
 removeAttribute(k){delete this[k];}
 getAttribute(k){return this[k]||null;}
 getClientRects(){return [{left:0,top:0,width:400,height:350}];}
 getBoundingClientRect(){return {left:0,top:0,right:900,bottom:730,width:900,height:730};}
 closest(selector){return selector.split(',').some(s=>s.trim()==='.desktop-icon'&&this.classList.contains('desktop-icon'))?this:null;}
 matches(selector){return selector.split(',').some(s=>s.trim()==='.desktop-icon'&&this.classList.contains('desktop-icon'));}
 contains(el){return this===el||this.children.includes(el);}
 querySelector(selector){if(!this.parts.has(selector))this.parts.set(selector,new Element(selector,this.owner));return this.parts.get(selector);}
 querySelectorAll(selector){if(this.id==='desktop-icons'&&selector==='.desktop-icon.fs-dynamic'){this.owner._refreshes++;return [];}return [];}
 append(...x){this.children.push(...x);}
 appendChild(x){this.append(x);return x;}
 replaceChildren(...x){this.children=[...x];}
 remove(){this.isConnected=false;}
}
function makeWorld({standalone=false}={}){
 let now=0, timerId=0;const timers=new Map(), fired={};let scriptName='';let intervalCreations=0;let diskWrites=0;
 const document={baseURI:'file:///tmp/latch/web/index.html',nodes:new Map(),activeElement:null,listenerMap:new Map(),_refreshes:0,
  getElementById(id){if(!this.nodes.has(id))this.nodes.set(id,new Element(id,this));return this.nodes.get(id);},
  querySelector(selector){return this.getElementById('query:'+selector);},querySelectorAll(){return [];},
  createElement(tag){return new Element(tag,this);},addEventListener(name,fn){let a=this.listenerMap.get(name);if(!a){a=[];this.listenerMap.set(name,a);}a.push(fn);},
  removeEventListener(name,fn){this.listenerMap.set(name,(this.listenerMap.get(name)||[]).filter(f=>f!==fn));},
  dispatch(name,extra={}){for(const fn of [...(this.listenerMap.get(name)||[])])fn({type:name,target:this,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...extra});},
  documentElement:new Element('html'),body:new Element('body')};
 const packed=document.getElementById('l98-packed-bloodline');packed.textContent=Buffer.from('<html><script>window.GAME_READY=true</script></html>').toString('base64');
 const desktop=document.getElementById('desktop');desktop.classList.remove('hidden');
 const modular=document.getElementById('l98-modular-game');modular.classList.add('hidden');
 const single=document.getElementById('l98-standalone-game');single.classList.add('hidden');
 const fsApi={ready:Promise.resolve(),list(){return [];},get(){return null;},installedPrograms(){return [];},display(x){return x;},canonical(x){return x;},read(){return '';},nornTransfer(){return null;},mediaInfo(){return {disks:[],mounted:null}},discInfo(){return {mounted:null}}};
 const listeners=new Map();const window={LatchFS:fsApi,location:{href:'file:///tmp/latch/web/index.html',pathname:'/web/index.html'},innerWidth:1250,innerHeight:850,
  addEventListener(name,fn){(listeners.get(name)||listeners.set(name,[]).get(name)).push(fn);},removeEventListener(){},
  dispatch(name){(listeners.get(name)||[]).forEach(fn=>fn());},matchMedia(){return {matches:true}},navigator:null,
  localStorage:{getItem(){return null},setItem(){diskWrites++}},getComputedStyle(){return {}},
  get innerHTML(){return undefined;}};
 const pads=[];const navigator={getGamepads(){return pads;}};window.navigator=navigator;
 const performance={now:()=>now};
 function interval(cb,ms){const id=++timerId;intervalCreations++;timers.set(id,{id,ms,next:now+ms,cb,origin:scriptName});return id;}
 function addTimer(cb,ms){const id=++timerId;timers.set(id,{id,ms,next:now+ms,cb,origin:scriptName,once:true});return id;}
 const ctx=vm.createContext({window,document,navigator,performance,Date,URL,Map,Set,Promise,Math,JSON,console,Buffer,TextDecoder,Uint8Array,
  atob: str=>Buffer.from(str,'base64').toString('binary'),setInterval:interval,clearInterval:id=>timers.delete(id),setTimeout:addTimer,clearTimeout:id=>timers.delete(id),
  innerWidth:1250,innerHeight:850,localStorage:window.localStorage,matchMedia:window.matchMedia,requestAnimationFrame:()=>{},Image:class{}});
 function load(name){scriptName=name;vm.runInContext(fs.readFileSync(path.join(ROOT,'web',name),'utf8'),ctx,{filename:name});scriptName='';}
 function run(ms){const limit=now+ms;while(true){let n=null;for(const t of timers.values())if(t.next<=limit&&(!n||t.next<n.next))n=t;
  if(!n)break;now=n.next;fired[n.origin]=(fired[n.origin]||0)+1;
  if(n.once)timers.delete(n.id);else n.next+=n.ms;
  n.cb();}now=limit;}
 function sample(ms=3000){const a={...fired},start=now;run(ms);return {durationMs:now-start,topLevelTimerCallbacks:Object.keys(fired).reduce((acc,k)=>(acc[k]=(fired[k]||0)-(a[k]||0),acc),{}),scheduledTimers:[...timers.values()].reduce((acc,t)=>(acc[t.origin]=(acc[t.origin]||0)+1,acc),{}),shellStats:window.LatchGamePerformance?.stats?.()||null};}
 return {load,run,sample,window,document,ctx,pads,timers,get diskWrites(){return diskWrites},get refreshes(){return document._refreshes},get intervalCreations(){return intervalCreations}};
}
async function test(){
 const w=makeWorld({standalone:false});w.load('desktop.js');await delay();
 assert(w.window.LatchGamePerformance,'Game performance API initialized');
 const perf=w.window.LatchGamePerformance;
 let initial=w.sample();assert.equal(initial.shellStats.jobs['desktop-controller'].calls,25);
 assert.equal(initial.shellStats.jobs['desktop-controller'].scheduled,true);
 w.window.LatchDesktop.launchBloodlineFull();assert.equal(perf.isActive(),true);
 assert.equal(w.document.getElementById('desktop').classList.contains('hidden'),true);
 assert.equal(w.document.getElementById('l98-modular-game').classList.contains('hidden'),false);
 const before=perf.stats().jobs['desktop-controller'].calls;
 const full=w.sample();assert.equal(full.shellStats.jobs['desktop-controller'].calls,before,'shell controller not polled while fullscreen');
 assert.equal(full.shellStats.jobs.clock.scheduled,false);assert.equal(full.shellStats.jobs['screen-saver'].scheduled,false);
 // Coalesce screen refreshes, while retaining all filesystem events and their data side effects.
 const previousRefresh=w.refreshes;
 for(let n=0;n<14;n++)w.document.dispatch('latchfschange');
 assert.equal(w.refreshes,previousRefresh,'hidden desktop not repeatedly rebuilt');
 assert(full.shellStats.active);
 // Unregistered apps (including Norn) are left alone; no messages sent to iframes.
 assert.deepEqual(Object.keys(perf.stats().cooperative),[]);
 const calls=[];const unregister=perf.registerCooperativeApp('synthetic-demo',{pause:async()=>{calls.push('pause');return {paused:true}},resume:async()=>{calls.push('resume');return true}});
 await delay();assert.equal(perf.stats().cooperative['synthetic-demo'],'paused');
 w.window.LatchDesktop.closeFullscreenGame();await delay();await delay();
 assert.equal(perf.isActive(),false);assert.deepEqual(calls,['pause','resume']);assert.equal(w.refreshes,previousRefresh+1);
 assert.equal(w.document.getElementById('desktop').classList.contains('hidden'),false);
 assert.equal(w.document.getElementById('start-button')._focus>0,true,'keyboard focus restored');
 const returned=w.sample();assert(returned.shellStats.jobs['desktop-controller'].calls>before);
 unregister();
 // Refused pause must never be reported as suspended, nor resumed.
 let mistakenResume=false;
 perf.registerCooperativeApp('not-cooperative',{pause:()=>false,resume:()=>{mistakenResume=true;}});
 w.window.LatchDesktop.launchBloodlineFull();await delay();assert.equal(perf.stats().cooperative['not-cooperative'],'running');
 w.window.LatchDesktop.closeFullscreenGame();await delay();assert.equal(mistakenResume,false);
 // Keyboard and visible Return control must remain working exit paths.
 w.window.LatchDesktop.launchBloodlineFull();w.document.dispatch('keydown',{ctrlKey:true,shiftKey:true,key:'Escape'});assert(!perf.isActive());
 w.window.LatchDesktop.launchBloodlineFull();w.document.getElementById('l98-modular-game').querySelector('[data-l98-modular-return]').click();assert(!perf.isActive());
 for(let i=0;i<4;i++){w.window.LatchDesktop.launchBloodlineFull();assert(perf.isActive());w.window.LatchDesktop.closeFullscreenGame();assert(!perf.isActive());}
 assert.equal(perf.stats().jobs['desktop-controller'].scheduled,true);
 const scheduled=[...w.timers.values()].filter(x=>[120,9000,15000].includes(x.ms));assert.equal(scheduled.length,3,'exactly 3 standard shell jobs after repeat opens');
 // Windowed modes retain their own desktop windows. The fullscreen-only policy must not activate.
 const openApp=id=>{const icon=new Element('app:'+id,w.document);icon.dataset.app=id;icon.classList.add('desktop-icon');w.document.getElementById('desktop-icons').dispatch('click',{target:icon,detail:0});};
 for(const id of ['bloodline-windowed','wilds','catacombs','weedwarrior']){openApp(id);await delay();assert.equal(perf.isActive(),false,id+' not fullscreen');assert(w.document.getElementById('window-layer').children.some(n=>n.dataset.id===id),id+' opened');}
 assert.equal(w.window.location.href,'file:///tmp/latch/web/index.html','launcher does not navigate page history');
 w.window.LatchDesktop.launchBloodlineFull();w.document.getElementById('l98-modular-game').querySelector('iframe').onerror();
 assert.equal(perf.isActive(),false,'unexpected iframe error returned to desktop');
 assert.equal(w.document.getElementById('desktop').classList.contains('hidden'),false);
 w.document.dispatch('keydown',{altKey:true,key:'F4'});assert.equal(perf.isActive(),false);
 w.document.dispatch('visibilitychange');assert.equal(perf.isActive(),false);
 // Simulated controller Back+Start hold, including no interception of game controls.
 w.pads.push({buttons:Array.from({length:18},(_,i)=>({pressed:i===8||i===9})),connected:true});
 w.window.LatchDesktop.launchBloodlineFull();w.run(1400);assert.equal(perf.isActive(),false,'controller hold returns to desktop');
 console.log('PASS modular fullscreen, background shell timers, filesystem coalescing, cooperative acknowledgements, windowed Bloodline/Wilds/Catacombs/Weed Warrior, controller hold, repeated returns');
 console.log('MEASURE modular:',JSON.stringify({idle:initial,fullscreen:full,returned}));
 const s=makeWorld({standalone:true});s.load('standalone_runtime.js');s.load('desktop.js');await delay();
 const sp=s.window.LatchGamePerformance;
 await s.window.LatchBundle.launchBloodlineFull();
 assert.equal(sp.isActive(),true);
 assert(s.document.getElementById('l98-standalone-game').classList.contains('hidden')===false);
 const prior=sp.stats().jobs['desktop-controller'].calls;s.sample();assert.equal(sp.stats().jobs['desktop-controller'].calls,prior);
 s.window.LatchBundle.closeFullscreenGame();assert.equal(sp.isActive(),false);
 // Document shortcut and the overlay's close button both return to desktop.
 await s.window.LatchBundle.launchBloodlineFull();s.document.dispatch('keydown',{ctrlKey:true,shiftKey:true,key:'Escape'});assert(!sp.isActive());
 await s.window.LatchBundle.launchBloodlineFull();const closeBtn=new Element('return',s.document);closeBtn.dataset.l98ExitGame='';closeBtn.closest=selector=>selector.includes('data-l98-exit-game')?closeBtn:null;s.document.dispatch('click',{target:closeBtn});assert(!sp.isActive());
 const priorTimers=s.timers.size;
 for(let j=0;j<5;j++){await s.window.LatchBundle.launchBloodlineFull();assert(sp.isActive());s.window.LatchBundle.closeFullscreenGame();assert(!sp.isActive());}
 assert.equal(s.timers.size,priorTimers,'no timer leaks after standalone repeated launch/return');
 // Closing before an asynchronous stored-game fetch resolves must not reopen the game.
 const oldBloodline=s.window.LatchBundle.bloodline;let release;
 s.window.LatchBundle.bloodline=()=>new Promise(resolve=>{release=resolve;});
 const pendingLaunch=s.window.LatchBundle.launchBloodlineFull();s.window.LatchBundle.closeFullscreenGame();release('<html>late</html>');await pendingLaunch;
 assert.equal(sp.isActive(),false);assert.equal(s.document.getElementById('l98-standalone-game').classList.contains('hidden'),true);
 s.window.LatchBundle.bloodline=oldBloodline;
 await s.window.LatchBundle.launchBloodlineFull();s.document.getElementById('l98-standalone-game').querySelector('iframe').onerror();assert(!sp.isActive(),'unexpected standalone load failure returns to desktop');
 s.document.dispatch('visibilitychange');
 const pressed=s.pads;s.pads.push({connected:true,buttons:Array.from({length:18},(_,i)=>({pressed:i===8||i===9}))});
 await s.window.LatchBundle.launchBloodlineFull();s.run(1600);assert.equal(sp.isActive(),false,'standalone controller exit');
 console.log('PASS standalone packaged game launch, quick return, repeated opens, controller hold');
 console.log('Windowed games are intentionally excluded: no global iframe suspension is attempted.');
}
async function measure(){const w=makeWorld();const single=process.argv.includes('--standalone');if(single)w.load('standalone_runtime.js');w.load('desktop.js');await delay();const idle=w.sample();if(single)await w.window.LatchBundle.launchBloodlineFull();else w.window.LatchDesktop.launchBloodlineFull();const fullscreen=w.sample();const before=w.refreshes;for(let n=0;n<14;n++)w.document.dispatch('latchfschange');const hiddenUiRefreshes=w.refreshes-before;if(single)w.window.LatchBundle.closeFullscreenGame();else w.window.LatchDesktop.closeFullscreenGame();const resumedUiRefreshes=w.refreshes-before-hiddenUiRefreshes;const returned=w.sample();const extra=new Element('windowed-app',w.document);extra.dataset.app='bloodline-windowed';extra.classList.add('desktop-icon');w.document.getElementById('desktop-icons').dispatch('click',{target:extra,detail:0});await delay();const windowed=w.sample();console.log(JSON.stringify({root:ROOT,mode:single?'standalone':'modular',idle,fullscreen,windowed,returned,hiddenUiRefreshes,resumedUiRefreshes},null,2));}
(baseline?measure():test()).catch(e=>{console.error(e);process.exitCode=1});
