/* Regression for the desktop-only v1.18 Sound Studio + media-directory release. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'web/filesystem.js'),'utf8');
async function disk(){const store=new Map(),win={};const sandbox={window:win,structuredClone,document:{dispatchEvent(){}},CustomEvent:class{constructor(t){this.type=t;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>({ok:false,status:404,headers:{get:()=>null}}),console};vm.runInNewContext(source,sandbox);await win.LatchFS.ready;return win.LatchFS;}
(async()=>{
 const d=await disk();assert.throws(()=>d.installSoftware('latchamp'),/Download LatchAmp Setup/);
 assert.equal(d.createAppInstaller('latchamp'),'C:/Downloads/LatchAmp-118.setup.exe');
 d.installSoftware('latchamp');assert.equal(d.installedPrograms().find(p=>p.id==='latchamp').version,'1.18');
 assert.throws(()=>d.installSoftware('latchamp'),/already installed/);
 d.write('C:/My Documents/My Music/Keep-me.txt','saved music metadata');
 assert.equal(d.read('C:/My Documents/My Music/Keep-me.txt'),'saved music metadata');
 const audio=fs.readFileSync(path.join(ROOT,'web/latch-audio.js'),'utf8');
 assert(!audio.includes('instanceof AudioGainNode'),'Invalid AudioGainNode check reintroduced');
 assert(audio.includes('some(c=>c.output===this)'),'Audio mixer needs an output identity bypass');
 const sound=fs.readFileSync(path.join(ROOT,'apps/soundstudio/index.html'),'utf8');
 assert(sound.includes('class="studio-applets"')&&sound.includes('id="footerStatus"'));
 assert(!sound.includes('id="startButton"')&&!sound.includes('id="startMenu"'),'Nested desktop should not be mounted');
 const amp=fs.readFileSync(path.join(ROOT,'apps/latchamp/index.html'),'utf8');
 assert(amp.includes('id="yt-home"')&&amp.includes('youtube/v3/search?')&&amp.includes('id="yt-home-saved"'));
 console.log('PASS v1.18 installer, audio shim, applets, and media directory source checks');
})().catch(err=>{console.error(err);process.exitCode=1});
