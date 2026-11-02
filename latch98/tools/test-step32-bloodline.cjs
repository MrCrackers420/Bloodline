const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const norn=fs.readFileSync(path.join(root,'apps/norn-world-lab/index.html'),'utf8');
const desk=fs.readFileSync(path.join(root,'web/desktop.js'),'utf8');
const server=fs.readFileSync(path.join(root,'src/main.rs'),'utf8');
assert(norn.includes('root.NornFiles=api'));
assert(norn.includes('parent.LatchFS')||norn.includes('host.LatchFS'));
assert(norn.includes('norn-latch98-single-shell'));
assert(desk.includes("if(id==='bloodline'){if(window.LatchBundle?.isStandalone){window.LatchBundle.launchBloodlineFull();return;}window.location.assign(bloodlinePage());return;}"));
assert(desk.includes("case 'bloodline-windowed':"));
assert(desk.includes("else iframe.src=remote||bloodlinePage()"));
assert(server.includes('"/game/bloodline.html"'));
assert(!desk.includes("case 'bloodline':return `<div"));
const x=desk.match(/function bloodlinePage\(\)\{([\s\S]*?)\n\}/);assert(x);
for(const [input,expected] of [
 ['https://x.github.io/Bloodline/','https://x.github.io/Bloodline/game/bloodline.html'],
 ['https://x.github.io/Bloodline/latch98/','https://x.github.io/Bloodline/game/bloodline.html'],
 ['https://x.github.io/Bloodline/latch98/index.html','https://x.github.io/Bloodline/game/bloodline.html'],
 ['http://localhost:3478/','http://localhost:3478/game/bloodline.html'],
]){
 const ctx={window:{},document:{baseURI:input},URL};vm.runInNewContext('function bloodlinePage(){'+x[1]+'}\nwindow.answer=bloodlinePage()',ctx);
 assert.equal(ctx.window.answer,expected,input);
}
console.log('PASS Step32 shared disk, one shell, Bloodline fullscreen URL + windowed iframe');
