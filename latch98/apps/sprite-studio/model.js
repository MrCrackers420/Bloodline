/* Latch Sprite Studio: deterministic bitmap/document model. No browser or network dependency. */
(function(root, factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LSSModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const FORMAT='latch-sprite-studio', VERSION=1, MAX_DIM=256, MAX_LAYERS=16, MAX_FRAMES=120, MAX_BYTES=24*1024*1024;
const DEFAULT_SWATCHES=['#000000ff','#ffffffff','#808080ff','#c0c0c0ff','#800000ff','#ff0000ff','#808000ff','#ffff00ff','#008000ff','#00ff00ff','#008080ff','#00ffffff','#000080ff','#0000ffff','#800080ff','#ff00ffff','#442c1aff','#885533ff','#cc8844ff','#ffcc88ff','#3c465aff','#6688aaff','#aabbddff','#ffd5e6ff'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function parseColor(s){if(Array.isArray(s)&&s.length===4&&s.every(v=>Number.isInteger(v)&&v>=0&&v<=255))return s.slice();if(typeof s!=='string')throw Error('RGBA color must be a hexadecimal string');const c=s.trim().replace(/^#/,'');if(!/^[\da-f]{6}([\da-f]{2})?$/i.test(c))throw Error('Enter #RRGGBB or #RRGGBBAA');return [0,2,4,6].map(i=>i===6&&c.length===6?255:parseInt(c.slice(i,i+2),16));}
function hex(rgba){return '#'+rgba.map(x=>clamp(Math.round(x),0,255).toString(16).padStart(2,'0')).join('');}
function blank(w,h){return new Uint8ClampedArray(w*h*4);}
function checkCapacity(w,h,layers,frames){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>MAX_DIM||h>MAX_DIM)throw Error('Canvas must be between 1 and 256 pixels in each dimension');if(!Number.isInteger(layers)||layers<1||layers>MAX_LAYERS)throw Error('Project supports 1–16 layers');if(!Number.isInteger(frames)||frames<1||frames>MAX_FRAMES)throw Error('Project supports 1–120 frames');if(w*h*4*layers*frames>MAX_BYTES)throw Error('Project exceeds the 24 MiB editable pixel budget');}
function makeProject(width=32,height=32){checkCapacity(width,height,1,1);return {name:'Untitled',width,height,palette:DEFAULT_SWATCHES.slice(),layers:[{id:1,name:'Layer 1',visible:true,opacity:1}],frames:[{duration:120,cels:[blank(width,height)]}],nextId:2};}
function clone(d){return {name:d.name,width:d.width,height:d.height,palette:d.palette.slice(),layers:d.layers.map(l=>({...l})),frames:d.frames.map(f=>({duration:f.duration,cels:f.cels.map(a=>new Uint8ClampedArray(a))})),nextId:d.nextId};}
function assertDocument(d){if(!d||typeof d!=='object')throw Error('Missing project');checkCapacity(d.width,d.height,d.layers?.length,d.frames?.length);if(typeof d.name!=='string'||d.name.length>100)throw Error('Invalid project name');if(!Array.isArray(d.palette)||d.palette.length<16||d.palette.length>128)throw Error('Project requires 16–128 palette colors');d.palette.forEach((p,i)=>{try{parseColor(p)}catch{throw Error('Invalid palette swatch '+(i+1));}});let ids=new Set();for(const l of d.layers){if(!Number.isInteger(l.id)||ids.has(l.id))throw Error('Duplicate or invalid layer ID');ids.add(l.id);if(typeof l.name!=='string'||!l.name.trim()||l.name.length>60||typeof l.visible!=='boolean'||typeof l.opacity!=='number'||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1)throw Error('Invalid layer settings');}if(!Number.isInteger(d.nextId)||d.nextId<=Math.max(...ids))throw Error('Invalid layer ID counter');for(let f=0;f<d.frames.length;f++){const frame=d.frames[f];if(!Number.isInteger(frame.duration)||frame.duration<20||frame.duration>60000)throw Error('Frame '+(f+1)+' duration must be 20–60000 ms');if(!Array.isArray(frame.cels)||frame.cels.length!==d.layers.length)throw Error('Frame '+(f+1)+' layer count mismatch');for(const pixels of frame.cels){if(!(pixels instanceof Uint8ClampedArray)||pixels.length!==d.width*d.height*4)throw Error('Frame '+(f+1)+' has damaged pixel data');}}return d;}
function pixel(d,frame,layer,x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=d.width||y>=d.height)return null;const p=d.frames[frame].cels[layer],k=(y*d.width+x)*4;return [p[k],p[k+1],p[k+2],p[k+3]];}
function pencil(d,frame,layer,x,y,color){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=d.width||y>=d.height)return false;const p=d.frames[frame].cels[layer],c=parseColor(color),k=(y*d.width+x)*4;if(p[k]===c[0]&&p[k+1]===c[1]&&p[k+2]===c[2]&&p[k+3]===c[3])return false;p.set(c,k);return true;}
function line(d,frame,layer,x0,y0,x1,y1,color){
 // Clip stylus/pointer paths before Bresenham: captured pointers can leave the canvas by many screens.
 if(![x0,y0,x1,y1].every(Number.isInteger))throw Error('Line endpoints must be integer pixels');
 const vx=x1-x0,vy=y1-y0,p=[-vx,vx,-vy,vy],q=[x0,d.width-1-x0,y0,d.height-1-y0];
 let enter=0,exit=1;
 for(let i=0;i<4;i++){
  if(!p[i]){if(q[i]<0)return false;continue;}
  const t=q[i]/p[i];if(p[i]<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
  if(enter>exit)return false;
 }
 const a=Math.max(0,Math.min(d.width-1,Math.round(x0+vx*enter))),b=Math.max(0,Math.min(d.height-1,Math.round(y0+vy*enter)));
 const c=Math.max(0,Math.min(d.width-1,Math.round(x0+vx*exit))),e=Math.max(0,Math.min(d.height-1,Math.round(y0+vy*exit)));
 let dx=Math.abs(c-a),sx=a<c?1:-1,dy=-Math.abs(e-b),sy=b<e?1:-1,err=dx+dy,changed=false,x=a,y=b;
 while(true){changed=pencil(d,frame,layer,x,y,color)||changed;if(x===c&&y===e)break;const twice=2*err;if(twice>=dy){err+=dy;x+=sx;}if(twice<=dx){err+=dx;y+=sy;}}
 return changed;
}
function rect(d,frame,layer,x0,y0,x1,y1,color,filled=false){const a=Math.min(x0,x1),b=Math.max(x0,x1),c=Math.min(y0,y1),e=Math.max(y0,y1);let changed=false;for(let y=Math.max(0,c);y<=Math.min(e,d.height-1);y++)for(let x=Math.max(0,a);x<=Math.min(b,d.width-1);x++)if(filled||x===a||x===b||y===c||y===e)changed=pencil(d,frame,layer,x,y,color)||changed;return changed;}
function bucket(d,frame,layer,x,y,color){if(x<0||y<0||x>=d.width||y>=d.height)return false;const p=d.frames[frame].cels[layer],rgba=parseColor(color),old=pixel(d,frame,layer,x,y);if(old.every((v,i)=>v===rgba[i]))return false;const w=d.width,h=d.height,visit=new Uint8Array(w*h),stack=[y*w+x];while(stack.length){const pos=stack.pop();if(visit[pos])continue;visit[pos]=1;const k=pos*4;if(p[k]!==old[0]||p[k+1]!==old[1]||p[k+2]!==old[2]||p[k+3]!==old[3])continue;p.set(rgba,k);const px=pos%w,py=Math.floor(pos/w);if(px>0)stack.push(pos-1);if(px<w-1)stack.push(pos+1);if(py>0)stack.push(pos-w);if(py<h-1)stack.push(pos+w);}return true;}
function composite(d,frameIndex){const n=d.width*d.height*4,out=blank(d.width,d.height);for(let l=0;l<d.layers.length;l++){const info=d.layers[l];if(!info.visible||info.opacity===0)continue;const src=d.frames[frameIndex].cels[l];for(let i=0;i<n;i+=4){const sa=src[i+3]/255*info.opacity;if(!sa)continue;const da=out[i+3]/255,oa=sa+da*(1-sa);for(let c=0;c<3;c++)out[i+c]=(src[i+c]*sa+out[i+c]*da*(1-sa))/oa;out[i+3]=oa*255;}}return out;}
function advanceFrame(d,index,elapsed,loop=true){let f=index,remain=Math.max(0,elapsed);if(!loop&&f===d.frames.length-1&&remain>=d.frames[f].duration)return {index:f,remaining:0,ended:true};const total=d.frames.reduce((s,x)=>s+x.duration,0);if(loop&&total>0)remain%=total;let guard=0;while(remain>=d.frames[f].duration&&guard++<=d.frames.length){remain-=d.frames[f].duration;if(f===d.frames.length-1){if(!loop)return {index:f,remaining:0,ended:true};f=0;}else f++;}return {index:f,remaining:remain,ended:false};}
function advanceFixedFrame(count,index,elapsed,fps,loop=true){
 if(!Number.isInteger(count)||count<1||!Number.isInteger(index)||index<0||index>=count||!Number.isFinite(fps)||fps<1||fps>60)throw Error('Invalid playback frame count or FPS');
 const duration=1000/fps,steps=Math.floor((Math.max(0,elapsed)+1e-9)/duration);
 if(!loop&&steps>=count-index)return {index:count-1,remaining:0,ended:true};
 return {index:loop?(index+steps)%count:index+steps,remaining:Math.max(0,elapsed-steps*duration),ended:false};
}
function createFrame(d,after,duplicate=false){checkCapacity(d.width,d.height,d.layers.length,d.frames.length+1);const source=d.frames[after],f={duration:source.duration,cels:source.cels.map(p=>duplicate?new Uint8ClampedArray(p):blank(d.width,d.height))};d.frames.splice(after+1,0,f);return after+1;}
function deleteFrame(d,index){if(d.frames.length===1)throw Error('You must keep at least one frame');d.frames.splice(index,1);return Math.min(index,d.frames.length-1);}
function moveFrame(d,index,offset){const to=index+offset;if(to<0||to>=d.frames.length)return index;d.frames.splice(to,0,d.frames.splice(index,1)[0]);return to;}
function addLayer(d,after){checkCapacity(d.width,d.height,d.layers.length+1,d.frames.length);const at=after+1;d.layers.splice(at,0,{id:d.nextId,name:'Layer '+d.nextId++,visible:true,opacity:1});for(const frame of d.frames)frame.cels.splice(at,0,blank(d.width,d.height));return at;}
function deleteLayer(d,index){if(d.layers.length===1)throw Error('You must keep at least one layer');d.layers.splice(index,1);d.frames.forEach(f=>f.cels.splice(index,1));return Math.min(index,d.layers.length-1);}
function moveLayer(d,index,offset){const to=index+offset;if(to<0||to>=d.layers.length)return index;d.layers.splice(to,0,d.layers.splice(index,1)[0]);for(const f of d.frames)f.cels.splice(to,0,f.cels.splice(index,1)[0]);return to;}
function frameSnapshot(d,index){
 return {width:d.width,height:d.height,layerIds:d.layers.map(l=>l.id),duration:d.frames[index].duration,cels:d.frames[index].cels.map(p=>new Uint8ClampedArray(p))};
}
function pasteFrameSnapshot(d,index,snapshot){
 if(!snapshot||snapshot.width!==d.width||snapshot.height!==d.height||snapshot.layerIds?.length!==d.layers.length||!snapshot.layerIds.every((id,i)=>id===d.layers[i].id)||!Number.isInteger(snapshot.duration)||snapshot.duration<20||snapshot.duration>60000||snapshot.cels?.length!==d.layers.length||snapshot.cels.some(p=>!(p instanceof Uint8ClampedArray)||p.length!==d.width*d.height*4))throw Error('Copied frame does not match the current canvas and layer arrangement');
 const target=d.frames[index];let changed=target.duration!==snapshot.duration;
 for(let i=0;i<d.layers.length;i++){
  const src=snapshot.cels[i],dst=target.cels[i];
  if(!changed&&src.some((v,j)=>v!==dst[j]))changed=true;
 }
 if(changed){target.duration=snapshot.duration;target.cels=snapshot.cels.map(p=>new Uint8ClampedArray(p));}
 return changed;
}
function mergeLayerDown(d,index){
 if(!Number.isInteger(index)||index<1||index>=d.layers.length)throw Error('Choose a layer above the bottom layer to merge');
 const top=d.layers[index],under=d.layers[index-1];
 if(!top.visible||!under.visible||top.opacity!==1||under.opacity!==1)throw Error('To merge reliably, both layers must be visible at 100% opacity');
 // Work on a clone: alpha rounding over deeper layers can alter RGBA by 1–2 levels.
 // Refuse the operation rather than silently changing the displayed animation.
 const next=clone(d);
 for(const f of next.frames){
  const src=f.cels[index],dst=f.cels[index-1];
  for(let k=0;k<src.length;k+=4){
   const sa=src[k+3]/255;if(sa===0)continue;
   const da=dst[k+3]/255,outA=sa+da*(1-sa);
   for(let c=0;c<3;c++)dst[k+c]=(src[k+c]*sa+dst[k+c]*da*(1-sa))/outA;
   dst[k+3]=outA*255;
  }
  f.cels.splice(index,1);
 }
 next.layers.splice(index,1);
 for(let i=0;i<d.frames.length;i++){
  const before=composite(d,i),after=composite(next,i);
  if(before.some((v,j)=>v!==after[j]))throw Error('Merge would change rendered pixels due to 8-bit alpha rounding. Flatten lower layers first, or adjust opacity. No changes were made.');
 }
 d.layers=next.layers;d.frames=next.frames;
 return index-1;
}
function resize(d,width,height){checkCapacity(width,height,d.layers.length,d.frames.length);for(const f of d.frames){f.cels=f.cels.map(old=>{const next=blank(width,height);for(let y=0;y<Math.min(height,d.height);y++){const cols=Math.min(width,d.width);next.set(old.subarray(y*d.width*4,y*d.width*4+cols*4),y*width*4);}return next;});}d.width=width;d.height=height;}
// All selection coordinates refer to source image cells, never CSS pixels.
function region(d,x,y,w,h){
 if(![x,y,w,h].every(Number.isInteger)||w<=0||h<=0)throw Error('Invalid rectangular selection');
 const left=clamp(x,0,d.width),top=clamp(y,0,d.height),right=clamp(x+w,0,d.width),bottom=clamp(y+h,0,d.height);
 if(right<=left||bottom<=top)throw Error('Selection lies outside the canvas');
 return {x:left,y:top,w:right-left,h:bottom-top};
}
function extractRegion(d,frame,layer,x,y,w,h){
 const r=region(d,x,y,w,h),src=d.frames[frame].cels[layer],pixels=blank(r.w,r.h);
 for(let yy=0;yy<r.h;yy++)pixels.set(src.subarray(((r.y+yy)*d.width+r.x)*4,((r.y+yy)*d.width+r.x+r.w)*4),yy*r.w*4);
 return {...r,pixels};
}
function clearRegion(d,frame,layer,r){
 const sel=region(d,r.x,r.y,r.w,r.h),src=d.frames[frame].cels[layer];let changed=false;
 for(let yy=sel.y;yy<sel.y+sel.h;yy++)for(let xx=sel.x;xx<sel.x+sel.w;xx++){const k=(yy*d.width+xx)*4;if(src[k]||src[k+1]||src[k+2]||src[k+3]){src.fill(0,k,k+4);changed=true;}}
 return changed;
}
function pasteRegion(d,frame,layer,part,x,y){
 if(!part||!Number.isInteger(part.w)||!Number.isInteger(part.h)||part.w<1||part.h<1||part.pixels?.length!==part.w*part.h*4||!Number.isInteger(x)||!Number.isInteger(y))throw Error('Invalid clipboard image');
 const dst=d.frames[frame].cels[layer];let changed=false;
 for(let yy=Math.max(0,-y);yy<Math.min(part.h,d.height-y);yy++)for(let xx=Math.max(0,-x);xx<Math.min(part.w,d.width-x);xx++){
  const from=(yy*part.w+xx)*4,to=((yy+y)*d.width+x+xx)*4;
  for(let k=0;k<4;k++)if(dst[to+k]!==part.pixels[from+k]){changed=true;break;}
  dst.set(part.pixels.subarray(from,from+4),to);
 }
 return changed;
}
function moveRegion(d,frame,layer,r,dx,dy){
 if(!Number.isInteger(dx)||!Number.isInteger(dy))throw Error('Move must use whole pixels');if(!dx&&!dy)return false;
 const part=extractRegion(d,frame,layer,r.x,r.y,r.w,r.h);const erased=clearRegion(d,frame,layer,part),drawn=pasteRegion(d,frame,layer,part,part.x+dx,part.y+dy);
 return erased||drawn;
}
function flipRegion(d,frame,layer,r,horizontal=true){
 const part=extractRegion(d,frame,layer,r.x,r.y,r.w,r.h),newPixels=blank(part.w,part.h);
 for(let y=0;y<part.h;y++)for(let x=0;x<part.w;x++){
  const src=(y*part.w+x)*4,dst=((horizontal?y:part.h-1-y)*part.w+(horizontal?part.w-1-x:x))*4;
  newPixels.set(part.pixels.subarray(src,src+4),dst);
 }
 return pasteRegion(d,frame,layer,{...part,pixels:newPixels},part.x,part.y);
}
function translateLayer(d,frame,layer,dx,dy){
 if(!Number.isInteger(dx)||!Number.isInteger(dy))throw Error('Layer movement must use whole pixels');if(!dx&&!dy)return false;
 const cel=d.frames[frame].cels[layer],result=blank(d.width,d.height);
 for(let y=Math.max(0,-dy);y<Math.min(d.height,d.height-dy);y++)for(let x=Math.max(0,-dx);x<Math.min(d.width,d.width-dx);x++){
  const a=(y*d.width+x)*4,b=((y+dy)*d.width+x+dx)*4;result.set(cel.subarray(a,a+4),b);
 }
 if(result.every((v,i)=>v===cel[i]))return false;d.frames[frame].cels[layer]=result;return true;
}
function bytesToBase64(p){if(typeof Buffer!=='undefined')return Buffer.from(p).toString('base64');let result='';for(let i=0;i<p.length;i+=8192)result+=String.fromCharCode.apply(null,p.subarray(i,i+8192));return btoa(result);}
function base64ToBytes(encoded,length){if(typeof encoded!=='string'||encoded.length>Math.ceil(length/3)*4+4||!/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(encoded))throw Error('Malformed base64 pixel data');let raw;if(typeof Buffer!=='undefined')raw=Buffer.from(encoded,'base64');else{try{const s=atob(encoded);raw=new Uint8Array(s.length);for(let i=0;i<s.length;i++)raw[i]=s.charCodeAt(i);}catch{throw Error('Malformed base64 pixel data');}}if(raw.length!==length)throw Error('Pixel data size does not match canvas');return new Uint8ClampedArray(raw);}
function serialize(d){assertDocument(d);return JSON.stringify({format:FORMAT,version:VERSION,name:d.name,width:d.width,height:d.height,palette:d.palette,layers:d.layers,frames:d.frames.map(f=>({duration:f.duration,cels:f.cels.map(bytesToBase64)})),nextId:d.nextId});}
function deserialize(json){let x;try{x=JSON.parse(json)}catch{throw Error('Not valid JSON: project could not be opened');}if(x?.format!==FORMAT||x?.version!==VERSION)throw Error('Unsupported project file format or version');if(!Array.isArray(x.layers)||!Array.isArray(x.frames))throw Error('Project is missing layers or animation frames');checkCapacity(x.width,x.height,x.layers.length,x.frames.length);const d={name:x.name,width:x.width,height:x.height,palette:x.palette,layers:x.layers,frames:x.frames.map(f=>({duration:f.duration,cels:Array.isArray(f.cels)?f.cels.map(c=>base64ToBytes(c,x.width*x.height*4)):null})),nextId:x.nextId};return assertDocument(d);}
class Editor{
 constructor(doc=makeProject()){this.doc=assertDocument(doc);this.past=[];this.future=[];this.before=null;this.modified=false;}
 begin(){if(this.before)return;this.before=clone(this.doc);this.modified=false;}
 mark(changed=true){if(changed)this.modified=true;}
 commit(){if(!this.before)return false;const modified=this.modified;if(modified){this.past.push(this.before);const bytes=this.doc.width*this.doc.height*this.doc.layers.length*this.doc.frames.length*4;const max=clamp(Math.floor(48*1024*1024/Math.max(bytes,1)),2,40);while(this.past.length>max)this.past.shift();this.future=[];}this.before=null;this.modified=false;return modified;}
 cancel(){if(this.before){this.doc=this.before;this.before=null;this.modified=false;}}
 transaction(fn){this.begin();try{const result=fn(this.doc);this.mark(result!==false);this.commit();return result;}catch(err){this.cancel();throw err;}}
 undo(){this.cancel();if(!this.past.length)return false;this.future.push(clone(this.doc));this.doc=this.past.pop();return true;}
 redo(){this.cancel();if(!this.future.length)return false;this.past.push(clone(this.doc));this.doc=this.future.pop();return true;}
 replace(d){this.doc=assertDocument(d);this.past=[];this.future=[];this.before=null;this.modified=false;}
}
return {FORMAT,VERSION,MAX_DIM,MAX_BYTES,DEFAULT_SWATCHES,clamp,hex,parseColor,blank,checkCapacity,makeProject,clone,assertDocument,pixel,pencil,line,rect,bucket,composite,advanceFrame,advanceFixedFrame,createFrame,deleteFrame,moveFrame,addLayer,deleteLayer,moveLayer,frameSnapshot,pasteFrameSnapshot,mergeLayerDown,resize,region,extractRegion,clearRegion,pasteRegion,moveRegion,flipRegion,translateLayer,serialize,deserialize,Editor};
});
