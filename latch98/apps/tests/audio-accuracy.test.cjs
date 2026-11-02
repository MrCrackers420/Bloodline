/* Run: node --test apps/tests/audio-accuracy.test.cjs
 * Uses the functions from the shipping standalone HTML (not a rewritten model).
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const aud=fs.readFileSync(path.join(__dirname,'../audacity/index.html'),'utf8');
const daw=fs.readFileSync(path.join(__dirname,'../soundstudio/index.html'),'utf8');
const segment=(code,start,end)=>{const a=code.indexOf(start),b=code.indexOf(end,a+start.length);assert(a>=0&&b>a,`Function segment ${start}`);return code.slice(a,b);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pcm=new Function('clamp',segment(aud,'function tapeResampleChannels(','function changeDuration(')+';return {tapeResampleChannels,stretchChannels};')(clamp);
const sampler=new Function('clamp',segment(daw,'function stretchPCM(','function createMonoBuffer(')+';return {stretchPCM,tapeResample};')(clamp);
const sine=(rate,freq,length)=>Float32Array.from({length},(_,i)=>.6*Math.sin(i*2*Math.PI*freq/rate));
function measureHz(ch,rate){let count=0;const start=Math.round(ch.length*.25),end=Math.round(ch.length*.75);for(let i=start+1;i<end;i++)if(ch[i-1]<=0&&ch[i]>0)count++;return count*rate/(end-start);}
for(const [name,algo,mono] of [
 ['Audacity',pcm,false],['Sound Studio',sampler,true]
])for(const speed of [.5,2]){
 test(`${name}: ${speed}× changes tape pitch but stretch approximately preserves original pitch`,()=>{
  const input=sine(22050,440,22050*2),wanted=Math.round(input.length/speed);
  const tape=mono?algo.tapeResample(input,speed):algo.tapeResampleChannels([input],speed)[0];
  const stretch=mono?algo.stretchPCM(input,speed):algo.stretchChannels([input],speed)[0];
  assert.equal(tape.length,wanted);assert.equal(stretch.length,wanted);
  assert(Math.abs(measureHz(tape,22050)-440*speed)<30,`tape pitch ${measureHz(tape,22050)}`);
  assert(Math.abs(measureHz(stretch,22050)-440)<45,`stretch pitch ${measureHz(stretch,22050)}`);
  assert(stretch.every(Number.isFinite));
 });
}
test('Audacity stretch shares grain alignment across stereo channels',()=>{
 const input=sine(22050,440,22050),a=pcm.stretchChannels([input,input.slice()],.75);
 assert.equal(a[0].length,29400);assert.equal(a[1].length,29400);
 for(let i=0;i<a[0].length;i++)assert.equal(a[0][i],a[1][i]);
});
test('Sound Studio splice uses integer half-open frame boundaries',()=>{
 const code=segment(daw,'function spliceSelection(','function b64ToBuffer(');
 const fake={length:100,sampleRate:1000,numberOfChannels:1,duration:.1,getChannelData:()=>Float32Array.from({length:100},(_,i)=>i/100)};
 let stored;
 const ctx={createBuffer:(n,len,sr)=>({numberOfChannels:n,length:len,sampleRate:sr,duration:len/sr,getChannelData:()=>stored??=(new Float32Array(len))})};
 const state={original:fake,start:.01,end:.035,name:'test'};
 const func=new Function('clamp','sampleState','window','audio','sampleView','$','rebuildSample','status','dialog',`const SAMPLE_MAX_SECONDS=10;let sampleUndo=null;${code};return spliceSelection;`)(clamp,state,{AudioContext:class {createBuffer(...args){return ctx.createBuffer(...args)}}},null,{},()=>({}),()=>{},()=>{},()=>{throw Error('Unexpected dialog')});
 func('crop');assert.equal(state.original.length,25);assert(Math.abs(stored[0]-.1)<1e-7);assert(Math.abs(stored[24]-.34)<1e-7);
});
