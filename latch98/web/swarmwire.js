/* SwarmWire — fictional 2003 transfer simulator for Latch's private archive.
   Its progress and the small virtual ISO manifest are saved in LatchFS. This
   offline app never contacts peers or downloads the advertised 186.4 MB. */
(()=>{'use strict';
const ISO='C:/Downloads/NornWorldLab.iso';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(root,{fs,showError=()=>{},openFolder=()=>{},mountDisc=()=>{},pickTorrent=()=>{}}){
 let timer=null,dead=false,activePath=null,lastPct=0,suspended=false;
 root.innerHTML=`<div class="sw-wrap"><div class="sw-header"><b>SwarmWire 1.1</b><span>Local archive transfer</span></div><div class="sw-toolbar"><button data-sw="add">Add Torrent...</button><button data-sw="start">▶ Start / Resume</button><button data-sw="pause">❚❚ Pause</button><button data-sw="folder">Open Downloads</button></div><div class="sw-table-wrap"><table class="sw-table"><thead><tr><th>Name</th><th>Virtual size</th><th>Done</th><th>Status</th></tr></thead><tbody class="sw-jobs"></tbody></table></div><div class="sw-detail"><div class="sw-status" role="status" aria-live="polite">No transfers.</div><div class="sw-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Simulated transfer progress"><div></div></div><p class="sw-detail-note"></p><button data-sw="disc" disabled>Mount Downloaded Disc...</button></div><div class="sw-foot">Simulated archive: 186.4 MB in-world · Real downloaded bytes: 0 · No network or BitTorrent peers needed</div></div>`;
 const jobs=root.querySelector('.sw-jobs'),status=root.querySelector('.sw-status'),progress=root.querySelector('.sw-progress'),bar=progress.querySelector('div'),note=root.querySelector('.sw-detail-note'),mountBtn=root.querySelector('[data-sw="disc"]');
 const getJob=()=>fs.nornTransfer();
 const isoReady=()=>fs.get(ISO)?.kind==='iso';
 function render(){
  const job=getJob(),iso=isoReady();
  if(!job){jobs.innerHTML='<tr><td colspan="4">No transfers. Choose Add Torrent to begin.</td></tr>';status.textContent='No transfers.';bar.style.width='0%';progress.setAttribute('aria-valuenow','0');note.textContent='Open the private NWLAB03.torrent attachment from Postbox to begin.';mountBtn.disabled=true;return;}
  let meta;try{meta=fs.torrentInfo(job.path);}catch{}
  const title=meta?.name||'NornWorldLab.iso',pct=Math.max(0,Math.min(100,Number(job.percent)||0)),done=iso&&pct>=100;
  const interrupted=job.state==='Downloading'&&activePath!==job.path;
  const state=suspended?'Save error — paused':done?'Finished':interrupted?'Interrupted':job.state==='Finished'?'Disc image missing':job.state;
  jobs.innerHTML=`<tr class="sw-current"><td>${esc(title)}</td><td>186.4 MB (sim.)</td><td>${pct.toFixed(1)}%</td><td>${esc(state)}</td></tr>`;
  status.textContent=state==='Error'?`Transfer error: ${job.error||'Unknown error'}`:`${title} — ${pct.toFixed(1)}% — ${state}`;
  bar.style.width=pct+'%';progress.setAttribute('aria-valuenow',String(pct));
  note.textContent=done?'Virtual ISO complete in C:\\Downloads. Mount it, then open D:\\Setup.exe to install.':
   suspended?`Progress is safe on disk at ${pct.toFixed(1)}%. Free storage or restore saving, then choose Start / Resume.`:
   interrupted?'Saved progress recovered after interruption. Choose Start / Resume; no progress was reset.':
   !meta?'Torrent file missing. Restore the attachment to resume.':
   `Offline simulated transfer from ${meta.source}. No actual torrent data or network bytes are downloaded.`;
  mountBtn.disabled=!done;
 }
 function failed(e,job){
  suspended=true;activePath=null; // stop the 300 ms timer from repeatedly reporting quota errors
  if(job){try{fs.setNornTransfer(job.path,job.percent,'Error',e.message||String(e));}catch{}}
  render();showError(e);
 }
 function complete(){const job=getJob();if(!job)return null;
  try{const out=fs.downloadNornDisc(job.path);activePath=null;suspended=false;
   // Filesystem finalizes ISO + job in a single transaction. Earlier disk
   // implementations may require a separate Finished update.
   if(getJob()?.state!=='Finished')fs.setNornTransfer(job.path,100,'Finished');
   render();return out;
  }catch(e){failed(e,job);return null;}
 }
 function addTorrent(path){try{
  path=fs.canonical(path);const info=fs.torrentInfo(path);
  if(info.release!=='nwlab03')throw Error('Unsupported torrent');
  const job=getJob();
  if(job&&job.path!==path&&job.state!=='Finished')throw Error('Finish the current transfer first.');
  if(!job||job.path!==path){const exists=isoReady();fs.setNornTransfer(path,exists?100:0,exists?'Finished':'Stopped');}
  activePath=null;suspended=false;render(); // Existing partial progress is preserved.
 }catch(e){showError(e);render();}}
 function start(){const job=getJob();if(!job)return showError('Open a torrent file first.');
  try{fs.torrentInfo(job.path);
   if(isoReady()&&job.percent>=100){fs.setNornTransfer(job.path,100,'Finished');activePath=null;suspended=false;return render();}
   if(job.percent>=100)return complete();
   fs.setNornTransfer(job.path,job.percent,'Downloading');activePath=job.path;lastPct=job.percent;suspended=false;render();
  }catch(e){failed(e,job);}
 }
 function tick(){if(dead||suspended||!activePath)return;
  const job=getJob();if(!job||job.path!==activePath||job.state!=='Downloading'||job.percent+0.0001<lastPct){activePath=null;return render();}
  try{const pct=Math.min(100,job.percent+1.5);fs.setNornTransfer(job.path,pct,'Downloading');lastPct=pct;
   if(pct>=100)complete();else render();
  }catch(e){failed(e,job);}
 }
 function onClick(e){const btn=e.target.closest('[data-sw]');if(!btn)return;const action=btn.dataset.sw;
  if(action==='add')pickTorrent(addTorrent,getJob()?.path||'C:\\Downloads\\NWLAB03.torrent');
  else if(action==='start')start();
  else if(action==='pause'){const job=getJob();activePath=null;if(job){try{fs.setNornTransfer(job.path,job.percent,'Stopped');suspended=false;}catch(e){failed(e,job);}}render();}
  else if(action==='folder')openFolder();
  else if(action==='disc'&&isoReady())mountDisc(ISO);
 }
 root.addEventListener('click',onClick);
 // Importing another backup refreshes UI immediately. Only an explicit Start
 // in this window is permitted to advance a saved 'Downloading' job.
 const onDiskChange=()=>{if(!dead)render();};
 const onDiskImport=()=>{activePath=null;suspended=false;if(!dead)render();};
 document.addEventListener('latchfschange',onDiskChange);
 document.addEventListener('latchfsimport',onDiskImport);
 render();timer=setInterval(tick,300);
 const active={addTorrent,destroy(){dead=true;clearInterval(timer);root.removeEventListener('click',onClick);document.removeEventListener('latchfschange',onDiskChange);document.removeEventListener('latchfsimport',onDiskImport);if(window.SwarmWire?.active===active)window.SwarmWire.active=null;}};
 window.SwarmWire=window.SwarmWire||{};window.SwarmWire.active=active;
 if(window.LATCH_PENDING_TORRENT){const path=window.LATCH_PENDING_TORRENT;window.LATCH_PENDING_TORRENT=null;addTorrent(path);}
 return active;
}
window.SwarmWire={mount,active:null};
})();
