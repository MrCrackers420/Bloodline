/* Sprite-sheet PNG + manifest loader, without browser dependencies. Composite-only import. */
(function(root,factory){const api=factory(root.LSSModel);if(typeof module==='object'&&module.exports)module.exports=api;root.LSSSheet=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){'use strict';
function decode(manifest,image){
 let data;try{data=typeof manifest==='string'?JSON.parse(manifest):manifest;}catch{throw Error('Sprite sheet manifest is not valid JSON');}
 if(!data||data.format!=='latch-sprite-sheet'||data.version!==1||!Array.isArray(data.frames))throw Error('Unsupported sprite sheet manifest');
 if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.pixels?.length!==image.width*image.height*4)throw Error('Invalid sheet PNG pixel data');
 if(data.width!==image.width||data.height!==image.height)throw Error('Sheet PNG dimensions do not match manifest');
 if(!Number.isInteger(data.columns)||data.columns<1||data.columns>data.frames.length)throw Error('Invalid sheet column count');
 const frames=data.frames.slice();if(!frames.length||frames.length>120)throw Error('Sheet must have 1–120 frames');
 const first=frames[0];if(!first||!Number.isInteger(first.width)||!Number.isInteger(first.height))throw Error('Invalid sprite size');
 M.checkCapacity(first.width,first.height,1,frames.length);
 const used=new Set();for(const f of frames){
  if(!f||![f.index,f.x,f.y,f.width,f.height,f.duration].every(Number.isInteger)||f.index<0||f.index>=frames.length||used.has(f.index)||f.width!==first.width||f.height!==first.height||f.x<0||f.y<0||f.x+f.width>image.width||f.y+f.height>image.height||f.duration<20||f.duration>60000)throw Error('Invalid frame region, index, or timing in sheet');
  used.add(f.index);
 }
 frames.sort((a,b)=>a.index-b.index);
 const d=M.makeProject(first.width,first.height);d.name=typeof data.name==='string'?data.name.slice(0,100):'Imported Sheet';
 d.frames=frames.map((f)=>{const cel=M.blank(first.width,first.height);for(let y=0;y<f.height;y++)cel.set(image.pixels.subarray(((f.y+y)*image.width+f.x)*4,((f.y+y)*image.width+f.x+f.width)*4),y*f.width*4);return {duration:f.duration,cels:[cel]};});
 return M.assertDocument(d);
}
return {decode};
});
