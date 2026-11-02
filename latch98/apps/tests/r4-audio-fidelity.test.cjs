/* Run from repository root: node --test apps/tests/r4-audio-fidelity.test.cjs
   Execute real function bodies extracted from the shipped standalone editors. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const aud=fs.readFileSync(path.join(__dirname,'../audacity/index.html'),'utf8');
const daw=fs.readFileSync(path.join(__dirname,'../soundstudio/index.html'),'utf8');
const segment=(code,start,end)=>{const a=code.indexOf(start),b=code.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return code.slice(a,b);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const readPCMwav=new Function('clamp','const MAX_FRAMES=44100*60*18;'+segment(aud,'function readPCMwav(', 'async function importFiles(')+';return readPCMwav;')(clamp);
const samplePeaks=new Function('clamp',segment(aud,'const peakCache=new WeakMap()', 'function drawWave(')+';return samplePeaks;')(clamp);
const exactWavePeak=new Function('clamp',segment(daw,'const wavePeaks=new WeakMap()', 'function drawProcessedWave(')+';return exactWavePeak;')(clamp);
const makeWav=(rate,bits,channels,frames,type=1)=>{
 const sz=bits/8,block=sz*channels,buf=new ArrayBuffer(44+frames*block),v=new DataView(buf);
 for(const [pos,str] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<str.length;i++)v.setUint8(pos+i,str.charCodeAt(i));
 v.setUint32(4,buf.byteLength-8,true);v.setUint32(16,16,true);v.setUint16(20,type,true);v.setUint16(22,channels,true);
 v.setUint32(24,rate,true);v.setUint32(28,rate*block,true);v.setUint16(32,block,true);v.setUint16(34,bits,true);v.setUint32(40,frames*block,true);
 for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){
  const x=(c===0?.5:-.25)*Math.sin(2*Math.PI*440*i/rate),at=44+(i*channels+c)*sz;
  if(type===3)v.setFloat32(at,x,true);
  else if(bits===16)v.setInt16(at,Math.round(x*32767),true);
  else if(bits===24){let z=Math.round(x*8388607);v.setUint8(at,z&255);v.setUint8(at+1,(z>>>8)&255);v.setUint8(at+2,(z>>>16)&255);}
  else if(bits===8)v.setUint8(at,Math.round(128+x*127));
  else v.setInt32(at,Math.round(x*2147483647),true);
 }
 return buf;
};
for(const [rate,bits,ch,type] of [[48000,16,2,1],[22050,8,1,1],[96000,24,2,1],[32000,32,2,3],[44100,32,1,1]]){
 test(`WAV PCM ${bits}-bit ${rate}Hz ${ch}ch preserves frames/sample rate`,()=>{
  const data=readPCMwav(makeWav(rate,bits,ch,1234,type));assert.equal(data.rate,rate);assert.equal(data.data.length,ch);
  assert.equal(data.data[0].length,1234);assert(data.data.every(a=>a.every(Number.isFinite)));
  const rms=Math.sqrt(data.data[0].reduce((n,x)=>n+x*x,0)/1234);
  assert(rms>.25&&rms<.37,`non-silent RMS ${rms}`);
 });
}
test('Truncated WAV rejects safely instead of interpreting partial audio as zeros',()=>{
 const valid=makeWav(48000,16,2,1000);assert.throws(()=>readPCMwav(valid.slice(0,100)),/Truncated/);
});
test('Exact overview detects 1-frame impulses that sampling strides used to miss',()=>{
 const large=new Float32Array(22050*40);large[187513]=.9375;large[187514]=-.8125;
 for(const peak of [samplePeaks,exactWavePeak]){
  const [a,b]=peak(large,187000,190000);assert.equal(a,-.8125);assert.equal(b,.9375);
  assert.deepEqual(peak(large,0,100),[0,0]);
  assert.deepEqual(peak(large,large.length,large.length),[0,0]);
 }
});
test('Audacity timeline paste is frame-exact for gaps, early offsets and stereo->mono conversion',()=>{
 const code=segment(aud,'function clipboardForTrack(', 'function effect(');
 const init=(start,clip,channels=1,rate=48000)=>{
  const t={data:Array.from({length:channels},(_,i)=>Float32Array.from({length:10},(_,n)=>n+1+i*100)),rate,offset:start};
  const setup=new Function('clamp','track','clip',`let clipboard=clip,cursor=0,selA=0,selB=0,undos=0;const MAX_FRAMES=200000;function selected(){return track;}function remember(){undos++}function changed(){}function status(){}function timeFmt(){}${code};return {paste,clipboardForTrack,setCursor:v=>cursor=v,state:()=>({data:track.data,offset:track.offset,cursor,undos})};`);
  return setup(clamp,t,clip);
 };
 const stereo={data:[new Float32Array([.5,.6]),new Float32Array([-.1,.2])],rate:48000};
 const early=init(1,stereo);early.setCursor(1-2/48000);early.paste();let r=early.state();
 assert.equal(r.data[0].length,14);assert.equal(r.offset,1-2/48000);assert(Math.abs(r.data[0][0]-.2)<1e-6);
 assert.equal(r.data[0][4],1);assert.equal(r.undos,1);
 const later=init(0,stereo,2);later.setCursor(14/48000);later.paste();r=later.state();
 assert.equal(r.data[0].length,16);assert.deepEqual([...r.data[0].slice(10,14)],[0,0,0,0]);
 assert(Math.abs(r.data[0][14]-.5)<1e-6);assert(Math.abs(r.data[1][15]-.2)<1e-6);
 const converted=init(0,{data:[Float32Array.from([0,1,0])],rate:24000},1,48000);
 converted.setCursor(5/48000);converted.paste();r=converted.state();assert.equal(r.data[0].length,16);
 assert(Math.abs(r.data[0][7]-1)<1e-6,'48k sample aligned after resampling');
});
test('Sound Studio WAV writer uses the actual AudioBuffer sample rate',()=>{
 const encode=new Function('clamp',segment(daw,'function sampleBufferWavBase64(', 'function stretchPCM(')+';return sampleBufferWavBase64;')(clamp);
 const data=Float32Array.from([0,.5,-.5,1]);
 const bytes=Buffer.from(encode({length:4,sampleRate:32000,getChannelData:()=>data}),'base64');
 assert.equal(bytes.readUInt32LE(24),32000);assert.equal(bytes.readUInt32LE(28),64000);
 assert.equal(bytes.readUInt32LE(40),8);assert.equal(bytes.readInt16LE(44+6),32767);
});
const transforms=new Function('clamp',segment(aud,'function tapeResampleChannels(','function changeDuration(')+';return {tapeResampleChannels,stretchChannels};')(clamp);
function frequency(data,rate){const a=Math.round(data.length*.25),b=Math.round(data.length*.75);let crossings=0;
 for(let i=a+1;i<b;i++)if(data[i-1]<=0&&data[i]>0)crossings++;return crossings*rate/(b-a);}
for(const rate of [22050,32000,48000])for(const speed of [.5,1.5]){
 test(`Audacity stereo ${rate} Hz WSOLA ${speed}x preserves channels and approximate pitch`,()=>{
  const n=Math.round(rate*1.2),src=Float32Array.from({length:n},(_,i)=>.55*Math.sin(2*Math.PI*440*i/rate));
  const doubled=src.map(x=>x*.7),t=transforms.stretchChannels([src,doubled],speed),tape=transforms.tapeResampleChannels([src,doubled],speed);
  assert.equal(t[0].length,Math.round(n/speed));assert.equal(t[1].length,t[0].length);
  for(const ch of t){assert(ch.every(Number.isFinite));assert(ch.every(x=>Math.abs(x)<=1.0001));}
  assert(Math.abs(frequency(t[0],rate)-440)<48,`WSOLA pitch ${frequency(t[0],rate)}`);
  assert(Math.abs(frequency(tape[0],rate)-440*speed)<20,`Tape pitch ${frequency(tape[0],rate)}`);
  for(let i=0;i<t[0].length;i+=29)assert(Math.abs(t[1][i]-t[0][i]*.7)<2e-5,'stereo grains have no separate per-channel phase shift');
 });
}
test('Floating-point WAV with nonfinite data fails rather than spreading NaNs',()=>{
 const bytes=makeWav(32000,32,1,128,3),v=new DataView(bytes);v.setFloat32(44+10*4,NaN,true);
 assert.throws(()=>readPCMwav(bytes),/non-finite/);
});
