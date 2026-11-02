/* Run: node tests/round4/sprite/model_round4.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const M=require('../../../apps/sprite-studio/model.js');
const P=require('../../../apps/sprite-studio/png.js');
const S=require('../../../apps/sprite-studio/sheet.js');
const test=(name,fn)=>{fn();console.log('PASS',name);};
test('clip pointer lines crossing a distant outside edge, never paint unrelated outside-only strokes',()=>{
 const d=M.makeProject(16,16),red='#ff0000ff';
 assert.equal(M.line(d,0,0,-100000,4,-20000,4,red),false);
 assert.equal(M.line(d,0,0,2,5,999999,5,red),true);
 for(let x=0;x<16;x++) assert.deepEqual(M.pixel(d,0,0,x,5),x>=2?[255,0,0,255]:[0,0,0,0]);
 assert.equal(M.line(d,0,0,999999,20,1000000,25,red),false);
 assert.equal(M.line(d,0,0,0,0,15,15,red),true);
 assert.deepEqual(M.pixel(d,0,0,15,15),[255,0,0,255]);
 assert.throws(()=>M.line(d,0,0,1.5,0,2,2,red),/integer/);
});
test('copied whole frame transfers RGBA, all layers and timing; mismatch refuses changes',()=>{
 const d=M.makeProject(3,2);M.addLayer(d,0);M.createFrame(d,0);
 d.frames[0].duration=85;d.frames[1].duration=300;
 M.pencil(d,0,0,1,0,'#ff000083');M.pencil(d,0,1,2,1,'#00448899');
 const snap=M.frameSnapshot(d,0);
 assert.equal(M.pasteFrameSnapshot(d,1,snap),true);
 assert.deepEqual(Array.from(d.frames[1].cels[0]),Array.from(snap.cels[0]));
 assert.deepEqual(Array.from(d.frames[1].cels[1]),Array.from(snap.cels[1]));
 assert.equal(d.frames[1].duration,85);
 snap.cels[0][0]=255;assert.equal(d.frames[1].cels[0][0],0,'pasted data does not alias clipboard');
 assert.equal(M.pasteFrameSnapshot(d,1,M.frameSnapshot(d,0)),false,'no-op paste must not create history');
 M.addLayer(d,1);
 assert.throws(()=>M.pasteFrameSnapshot(d,1,snap),/layer arrangement/);
});
test('merge down across three frames, preserves composite and allows undo/redo',()=>{
 const d=M.makeProject(4,4),e=new M.Editor(d);
 e.transaction(doc=>{M.addLayer(doc,0);M.createFrame(doc,0);M.createFrame(doc,1);for(let f=0;f<3;f++){
  M.pencil(doc,f,0,2,2,'#224466ff');M.pencil(doc,f,1,f,2,'#ff8800ff');
 }return true;});
 const before=d.frames.map((_,f)=>Array.from(M.composite(d,f)));
 e.transaction(doc=>{M.mergeLayerDown(doc,1);return true;});
 assert.equal(d.layers.length,1);
 before.forEach((b,i)=>assert.deepEqual(Array.from(M.composite(d,i)),b));
 assert.equal(e.undo(),true);assert.equal(e.doc.layers.length,2);
 assert.equal(e.redo(),true);assert.equal(e.doc.layers.length,1);
 assert.throws(()=>M.mergeLayerDown(e.doc,0),/above the bottom/);
 const x=M.makeProject(1,1);M.addLayer(x,0);x.layers[1].opacity=.5;
 assert.throws(()=>M.mergeLayerDown(x,1),/100% opacity/);
 const three=M.makeProject(1,1);M.addLayer(three,0);M.addLayer(three,1);
 [[242,118,88,164],[63,195,45,85],[198,169,235,102]].forEach((rgba,l)=>three.frames[0].cels[l].set(rgba));
 const untouched=M.serialize(three);
 assert.throws(()=>M.mergeLayerDown(three,2),/alpha rounding/);
 assert.equal(M.serialize(three),untouched,'rejected merge is atomic');
});
test('fixed-rate playback counts large elapsed jumps and respects end/loop',()=>{
 assert.deepEqual(M.advanceFixedFrame(3,0,250,10,true),{index:2,remaining:50,ended:false});
 assert.deepEqual(M.advanceFixedFrame(3,1,800,10,true),{index:0,remaining:0,ended:false});
 assert.deepEqual(M.advanceFixedFrame(3,1,200,10,false),{index:2,remaining:0,ended:true});
 assert.deepEqual(M.advanceFixedFrame(3,0,50,10,true),{index:0,remaining:50,ended:false});
 assert.throws(()=>M.advanceFixedFrame(3,0,100,0),/Invalid/);
 assert.throws(()=>M.advanceFixedFrame(3,0,100,1000),/Invalid/);
});
test('frame snapshot, layer merge and rapid multi-frame history preserve serialized projects',()=>{
 const d=M.makeProject(5,5),e=new M.Editor(d);
 for(let j=0;j<3;j++)e.transaction(doc=>{M.createFrame(doc,doc.frames.length-1);return true;});
 for(let f=0;f<4;f++)e.transaction(doc=>M.pencil(doc,f,0,f,f,'#11223380'));
 const json=M.serialize(e.doc);
 for(let j=0;j<4;j++)assert.equal(e.undo(),true);
 for(let j=0;j<4;j++)assert.equal(e.redo(),true);
 assert.equal(M.serialize(e.doc),json);
 const fixture=fs.readFileSync(path.join(__dirname,'../../../apps/sprite-studio/tests/fixtures/prior-v1-project.lss.json'),'utf8');
 assert.equal(M.deserialize(M.serialize(M.deserialize(fixture))).frames.length,M.deserialize(fixture).frames.length);
 assert.throws(()=>M.deserialize('{bad'),/JSON/);
 assert.throws(()=>M.deserialize(JSON.stringify({...JSON.parse(json),frames:[]})),/frame/i);
});
(async()=>{
 const valid=P.encode(2,1,Uint8Array.from([255,0,0,128,0,255,0,0]));
 assert.deepEqual(Array.from((await P.decode(valid)).pixels),[255,0,0,128,0,255,0,0]);
 const corrupt=new Uint8Array(valid);corrupt[corrupt.length-13]^=0xff;
 await assert.rejects(P.decode(corrupt),/PNG|CRC|checksum|truncated|unknown|Damaged|chunk/i);
 assert.throws(()=>S.decode('{bad',{}),/JSON/);
 console.log('PASS valid/corrupt PNG and malformed sprite sheet are rejected with clear errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
