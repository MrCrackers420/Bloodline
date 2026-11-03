/* Latch 98 game sound coordination. No changes to existing game simulation files. */
(()=>{'use strict';
 const SHIM="/* The audio adapter runs first in a Latch-hosted game iframe. Game source remains unchanged.\n   Collects actual decoded WebAudio output and opt-in background <audio> channels. */\n(()=>{'use strict';\n let listening=false,suppress=false,mute=false;\n const parentOrigin=(()=>{try{const origin=new URL(document.baseURI).origin;return origin==='null'?'*':origin;}catch{return '*';}})();\n const ctxs=new Map(), tags=new Map(), soundtrack=new Set();\n try{\n  const original=AudioNode.prototype.connect;\n  const channels=ctx=>{let c=ctxs.get(ctx);if(c)return c;\n   const mixer=ctx.createGain(),meter=ctx.createAnalyser(),output=ctx.createGain();meter.fftSize=256;\n   original.call(mixer,meter);original.call(meter,output);original.call(output,ctx.destination);\n   c={mixer,meter,output,buf:new Uint8Array(meter.fftSize)};ctxs.set(ctx,c);return c;};\n  AudioNode.prototype.connect=function(dest,...args){\n   if(dest===this.context?.destination && ![...ctxs.values()].some(c=>c.output===this)){return original.call(this,channels(this.context).mixer,...args);}\n   return original.call(this,dest,...args);\n  };\n }catch{}\n const musicTag=el=>el instanceof HTMLAudioElement&&(el.loop||/music|bgm|soundtrack|theme|song/i.test((el.id||'')+' '+(el.className||'')+' '+(el.currentSrc||el.src||'')));\n function apply(){for(const c of ctxs.values()){c.output.gain.setTargetAtTime(listening&&mute?0:1,c.output.context.currentTime,.16);}\n   for(const g of soundtrack)try{g.gain.setTargetAtTime(listening&&(mute||suppress)?0:1,g.context.currentTime,.16);}catch{}\n   document.querySelectorAll('audio').forEach(el=>{if(!tags.has(el))tags.set(el,!!el.muted);if(listening&&(mute||(suppress&&musicTag(el))))el.muted=true;else if(tags.has(el))el.muted=tags.get(el);});}\n window.LatchSoundtrack={registerGainNode(g){if(g?.gain&&g.context){soundtrack.add(g);apply();}}};\n window.addEventListener('message',ev=>{if(ev.source!==window.parent||(parentOrigin!=='*'&&ev.origin!==parentOrigin))return;const x=ev.data;if(x?.type!=='latch98:other-audio')return;\n  listening=!!x.listening;suppress=!!x.suppressSoundtracks;mute=!!x.muteOtherGames;apply();});\n let ticks=0;setInterval(()=>{if(!document.hidden||listening){apply();let peak=0;\n  for(const c of ctxs.values()){try{c.meter.getByteTimeDomainData(c.buf);let rms=0;for(const v of c.buf){const f=(v-128)/128;rms+=f*f;}peak=Math.max(peak,Math.sqrt(rms/c.buf.length));}catch{}}\n  window.parent?.postMessage({type:'latch98:game-audio',level:Math.min(1,peak*3)},parentOrigin);}\n },250);\n})();";
 let state={listening:false,suppressSoundtracks:false,muteOtherGames:false},level=0;
 const frames=()=>[...document.querySelectorAll('iframe')].filter(f=>!f.closest('.l98-update-panel'));
 const isTrustedSource=src=>frames().some(f=>f.contentWindow===src);
 function emit(){const target=location.origin==='null'?'*':location.origin;for(const f of frames())try{f.contentWindow?.postMessage({type:'latch98:other-audio',...state},target);}catch{}}
 function toAmp(){const target=location.origin==='null'?'*':location.origin;for(const f of frames())if(f.closest('.window')?.dataset.id==='latchamp')try{f.contentWindow?.postMessage({type:'latch98:game-audio-level',level},target);}catch{}}
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!isTrustedSource(e.source))return;
  if(e.data?.type==='latchamp:audio-state'){
   state={listening:!!e.data.listening,suppressSoundtracks:!!e.data.suppressSoundtracks,muteOtherGames:!!e.data.muteOtherGames};emit();
  }else if(e.data?.type==='latch98:game-audio'){
   const source=frames().find(f=>f.contentWindow===e.source);
   if(source?.closest('.window')?.dataset.id==='latchamp')return;
   level=Math.max(0,Math.min(1,Number(e.data.level)||0));toAmp();
  }
 });
 function instrument(html,url){if(typeof html!=='string'||!/<head[\s>]/i.test(html))return html;
  const base=url?'<base href="'+String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">':'';
  const script='<script>'+SHIM+'</'+'script>';
  return html.replace(/<head([^>]*)>/i,(m)=>m+base+script);
 }
 setInterval(()=>{emit();level*=.8;toAmp();},900);
 window.LatchAudioBus={instrument,settings:()=>({...state})};
})();