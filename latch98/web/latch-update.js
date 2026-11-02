/* Latch Update -- offline-first, user-approved Latch 98 software setup.
   This utility does NOT pretend to replace compiled Rust/Android executables.
   Host releases use the separate transactional update tool. */
(()=>{'use strict';
const APP_ID='latchamp';
function mount(root,{fs,showError,openFolder,runSetup}){
  if(!root)throw Error('Latch Update mount target is missing');
  let disposed=false;
  const make=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;};
  root.replaceChildren();
  const pane=make('div','l98-update-panel');
  pane.style.cssText='padding:12px;overflow:auto;height:100%;font:12px Tahoma,Arial,sans-serif;color:#111;background:#d4d0c8';
  const head=make('h3','','Latch Update');head.style.cssText='font-size:15px;margin:0 0 10px';pane.append(head);
  const intro=make('p','','Choose a program to download or install. Setup files are saved to C:\\Downloads.');pane.append(intro);
  const catalog=make('section','');catalog.style.cssText='background:#fff;border:2px inset #999;padding:12px;margin:9px 0';
  const label=make('strong','','LatchAmp 1.14 — Portable Audio Player');catalog.append(label);
  catalog.append(make('p','','Plays local MP3, WAV and other supported audio files. YouTube Music opens in its official app or browser.'));
  const status=make('p','');status.setAttribute('role','status');
  const buttons=make('div','');buttons.style.cssText='display:flex;gap:7px;flex-wrap:wrap';
  function button(title,click){const b=make('button','classic-btn',title);b.type='button';b.addEventListener('click',click);buttons.append(b);return b;}
  const download=button('Download Setup',()=>{try{const path=fs.createAppInstaller(APP_ID);status.textContent='Saved: '+path.replaceAll('/','\\');refresh();}catch(e){showError(e);}});
  const install=button('Run Setup...',()=>{if(fs.installedPrograms().some(x=>x.id===APP_ID&&x.version==='1.14'))return;try{if(!fs.get('C:/Downloads/LatchAmp-114.setup.exe'))throw Error('Download LatchAmp Setup first.');runSetup(APP_ID);}catch(e){showError(e);}});
  button('Open Downloads',()=>openFolder('C:/Downloads'));
  catalog.append(status,buttons);pane.append(catalog);
  const system=make('section','');system.style.cssText='background:#eee;border:2px inset #999;padding:10px;line-height:1.5';
  system.append(make('strong','','Latch 98 System Updates'));
  system.append(make('p','','Program installers are managed inside Latch. Changes to the actual desktop executable or Android APK must be installed using a verified host release. Existing files and saves are backed up by the host updater.'));
  system.append(make('p','','Offline update packages can be installed with the included tools/latch_update.py utility on the host computer. Android uses its normal APK installer.'));
  pane.append(system);root.append(pane);
  function refresh(){if(disposed)return;const found=fs.installedPrograms().find(a=>a.id===APP_ID),installed=!!found,upToDate=installed&&found.version==='1.14',hasSetup=!!fs.get('C:/Downloads/LatchAmp-114.setup.exe');
    download.disabled=upToDate;install.disabled=upToDate||!hasSetup;
    status.textContent=upToDate?'LatchAmp 1.14 is installed. Find it in Start > Programs > Accessories.':installed?(hasSetup?'Update ready: run Setup to upgrade LatchAmp.':'A newer LatchAmp version is available.'):(hasSetup?'Setup file is ready in C:\\Downloads.':'Not installed.');}
  const onChange=()=>refresh();document.addEventListener('latchfschange',onChange);refresh();
  return {destroy(){disposed=true;document.removeEventListener('latchfschange',onChange);}};
}
window.LatchUpdater={mount};
})();
