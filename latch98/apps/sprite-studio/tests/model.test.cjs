const assert=require('node:assert/strict');const M=require('../model.js');
let tested=0;const test=(name,fn)=>{try{fn();console.log('PASS',name);tested++}catch(e){console.error('FAIL',name);throw e;}};
test('pencil bounds and eraser transparency',()=>{const d=M.makeProject(4,4);assert.equal(M.pencil(d,0,0,-1,1,'#ff0000ff'),false);assert.equal(M.pencil(d,0,0,4,1,'#ff0000ff'),false);assert.equal(M.pencil(d,0,0,2,3,'#ff000080'),true);assert.deepEqual(M.pixel(d,0,0,2,3),[255,0,0,128]);M.pencil(d,0,0,2,3,'#00000000');assert.deepEqual(M.pixel(d,0,0,2,3),[0,0,0,0]);});
test('line Bresenham endpoints, rectangle outline and filled rectangle',()=>{const d=M.makeProject(8,8);M.line(d,0,0,0,0,7,7,'#cc0044ff');assert.deepEqual(M.pixel(d,0,0,4,4),[204,0,68,255]);assert.deepEqual(M.pixel(d,0,0,7,7),[204,0,68,255]);M.rect(d,0,0,1,2,4,5,'#00ff00ff',false);assert.deepEqual(M.pixel(d,0,0,2,3),[0,0,0,0]);assert.deepEqual(M.pixel(d,0,0,1,3),[0,255,0,255]);M.rect(d,0,0,4,5,5,6,'#0000ffff',true);assert.deepEqual(M.pixel(d,0,0,4,6),[0,0,255,255]);});
test('contiguous flood fill and transparent region separate',()=>{const d=M.makeProject(5,5);M.rect(d,0,0,1,1,3,3,'#ffffffff');assert.equal(M.bucket(d,0,0,2,2,'#ff0000ff'),true);assert.deepEqual(M.pixel(d,0,0,2,2),[255,0,0,255]);assert.deepEqual(M.pixel(d,0,0,0,0),[0,0,0,0]);M.bucket(d,0,0,0,0,'#00000044');assert.deepEqual(M.pixel(d,0,0,0,0),[0,0,0,68]);assert.deepEqual(M.pixel(d,0,0,2,2),[255,0,0,255]);});
test('alpha compositing and layer visibility/opacity',()=>{const d=M.makeProject(1,1);M.pencil(d,0,0,0,0,'#ff0000ff');const above=M.addLayer(d,0);M.pencil(d,0,above,0,0,'#0000ffff');d.layers[above].opacity=.5;let c=M.composite(d,0);assert.deepEqual(Array.from(c),[128,0,128,255]);d.layers[above].visible=false;c=M.composite(d,0);assert.deepEqual(Array.from(c),[255,0,0,255]);});
test('independent layers and reorder alignment',()=>{const d=M.makeProject(2,2),i=M.addLayer(d,0);M.pencil(d,0,i,0,0,'#44ee33ff');assert.deepEqual(M.pixel(d,0,0,0,0),[0,0,0,0]);M.moveLayer(d,i,-1);assert.deepEqual(M.pixel(d,0,0,0,0),[68,238,51,255]);assert.deepEqual(M.pixel(d,0,1,0,0),[0,0,0,0]);});
test('independent frames duplicate, duration, reorder and delete',()=>{const d=M.makeProject(2,2);M.pencil(d,0,0,1,1,'#ffffffff');const j=M.createFrame(d,0,true);M.pencil(d,j,0,1,1,'#ff0000ff');assert.deepEqual(M.pixel(d,0,0,1,1),[255,255,255,255]);const z=M.createFrame(d,j);assert.deepEqual(M.pixel(d,z,0,1,1),[0,0,0,0]);d.frames[z].duration=200;M.moveFrame(d,z,-1);assert.equal(d.frames[1].duration,200);M.deleteFrame(d,1);assert.equal(d.frames.length,2);});
test('timing honors per-frame durations, looping, non-looping termination',()=>{const d=M.makeProject(1,1);M.createFrame(d,0);d.frames[0].duration=100;d.frames[1].duration=250;assert.deepEqual(M.advanceFrame(d,0,100),{index:1,remaining:0,ended:false});assert.deepEqual(M.advanceFrame(d,0,380),{index:0,remaining:30,ended:false});assert.deepEqual(M.advanceFrame(d,1,260,false),{index:1,remaining:0,ended:true});});
test('undo and redo restores all layer and frame contents',()=>{const e=new M.Editor(M.makeProject(4,4));e.transaction(d=>M.pencil(d,0,0,1,1,'#12aabbcc'));assert.deepEqual(M.pixel(e.doc,0,0,1,1),[18,170,187,204]);assert.equal(e.undo(),true);assert.deepEqual(M.pixel(e.doc,0,0,1,1),[0,0,0,0]);assert.equal(e.redo(),true);assert.deepEqual(M.pixel(e.doc,0,0,1,1),[18,170,187,204]);e.begin();e.mark(M.pencil(e.doc,0,0,0,0,'#ffffffff'));e.cancel();assert.equal(M.pixel(e.doc,0,0,0,0)[3],0);});
test('native project roundtrip pixels/layers/frames/palette metadata lossless',()=>{const d=M.makeProject(3,2);d.name='My sprite';d.palette[5]='#12345678';M.pencil(d,0,0,1,1,'#ff00807f');const l=M.addLayer(d,0);d.layers[l].opacity=.33;d.layers[l].name='Highlights';M.pencil(d,0,l,0,0,'#eecc6688');const f=M.createFrame(d,0,true);d.frames[f].duration=789;M.pencil(d,f,l,2,1,'#76543210');const data=M.serialize(d),other=M.deserialize(data);assert.equal(M.serialize(other),data);assert.deepEqual(M.pixel(other,1,1,2,1),[118,84,50,16]);});
test('native validation rejects corrupt files and resource exhaustion',()=>{const d=M.makeProject(2,2);const p=JSON.parse(M.serialize(d));p.frames[0].cels[0]='aGVsbG8=';assert.throws(()=>M.deserialize(JSON.stringify(p)),/size does not match/);assert.throws(()=>M.deserialize('{broken'),/Not valid JSON/);assert.throws(()=>M.makeProject(257,1),/256/);assert.throws(()=>M.checkCapacity(256,256,16,50),/budget/);});
test('resize all cels retains top-left pixels, fills transparent',()=>{const d=M.makeProject(2,2);M.pencil(d,0,0,1,1,'#12345678');M.createFrame(d,0,true);M.resize(d,3,3);assert.deepEqual(M.pixel(d,1,0,1,1),[18,52,86,120]);assert.deepEqual(M.pixel(d,0,0,2,2),[0,0,0,0]);});

test('pixel-space selection extracts exact unpremultiplied RGBA and preserves transparent RGB',()=>{
 const d=M.makeProject(5,5);M.pencil(d,0,0,1,1,'#12345600');M.pencil(d,0,0,2,1,'#aabbcc80');
 const part=M.extractRegion(d,0,0,1,1,2,1);assert.equal(part.w,2);assert.equal(part.h,1);
 assert.deepEqual(Array.from(part.pixels),[18,52,86,0,170,187,204,128]);
 assert.equal(M.clearRegion(d,0,0,part),true);assert.deepEqual(M.pixel(d,0,0,2,1),[0,0,0,0]);
 assert.equal(M.pasteRegion(d,0,0,part,3,4),true);assert.deepEqual(M.pixel(d,0,0,4,4),[170,187,204,128]);
 assert.throws(()=>M.extractRegion(d,0,0,8,8,2,2),/outside/);
});
test('selection move handles overlapping positions, clipping, horizontal/vertical flips',()=>{
 const d=M.makeProject(4,3);M.pencil(d,0,0,0,0,'#ff0000ff');M.pencil(d,0,0,1,0,'#0000ffff');
 assert.equal(M.moveRegion(d,0,0,{x:0,y:0,w:2,h:1},1,1),true);
 assert.deepEqual(M.pixel(d,0,0,0,0),[0,0,0,0]);assert.deepEqual(M.pixel(d,0,0,1,1),[255,0,0,255]);
 M.flipRegion(d,0,0,{x:1,y:1,w:2,h:1});assert.deepEqual(M.pixel(d,0,0,1,1),[0,0,255,255]);
 M.flipRegion(d,0,0,{x:1,y:0,w:2,h:2},false);assert.deepEqual(M.pixel(d,0,0,1,0),[0,0,255,255]);
 M.moveRegion(d,0,0,{x:1,y:0,w:2,h:1},3,0);assert.deepEqual(M.pixel(d,0,0,1,0),[0,0,0,0]);
});
test('cel translation changes one frame and one layer and undo preserves all metadata',()=>{
 const e=new M.Editor(M.makeProject(4,4));M.createFrame(e.doc,0);const top=M.addLayer(e.doc,0);
 e.doc.frames[1].duration=320;e.doc.palette[3]='#01020304';M.pencil(e.doc,1,top,0,0,'#12345678');
 e.transaction(d=>M.translateLayer(d,1,top,2,1));
 assert.deepEqual(M.pixel(e.doc,1,top,2,1),[18,52,86,120]);assert.deepEqual(M.pixel(e.doc,1,top,0,0),[0,0,0,0]);
 assert.equal(M.pixel(e.doc,0,top,2,1)[3],0);e.undo();assert.deepEqual(M.pixel(e.doc,1,top,0,0),[18,52,86,120]);
 assert.equal(e.doc.frames[1].duration,320);assert.equal(e.doc.palette[3],'#01020304');e.redo();assert.deepEqual(M.pixel(e.doc,1,top,2,1),[18,52,86,120]);
});
test('reads a saved project from the unchanged Round-3 baseline schema',()=>{const fs=require('node:fs'),p=require('node:path');const raw=fs.readFileSync(p.join(__dirname,'fixtures','prior-v1-project.lss.json'),'utf8');const d=M.deserialize(raw);assert.equal(d.name,'Prior Sprite Studio v1');assert.equal(d.frames.length,2);assert.equal(d.frames[1].duration,270);assert.deepEqual(M.pixel(d,1,0,1,1),[254,253,252,4]);assert.equal(d.palette[4],'#11223344');assert.equal(M.serialize(d),raw.trim());});
console.log(`All ${tested} model tests passed.`);
