#!/usr/bin/env python3
"""Apply the LatchAmp + Update Center source overlay to a Latch 98 checkout.

Usage: python tools/apply_latch_update.py /path/to/Bloodline/latch98
Patches only Latch source and is idempotent. It never edits Norn/Bloodline games.
"""
from __future__ import annotations
import argparse
import pathlib
import shutil

OVERLAY = pathlib.Path(__file__).resolve().parent.parent


def replace_once(text: str, needle: str, replacement: str, path: str) -> str:
    if replacement in text:
        return text
    if text.count(needle) != 1:
        raise RuntimeError(f"Expected exactly one integration anchor in {path}: {needle[:80]!r} (found {text.count(needle)})")
    return text.replace(needle, replacement, 1)


def patch_filesystem(text: str) -> str:
    path='web/filesystem.js'
    text=replace_once(text,
       "nornlab:{name:'Norn World Lab',dir:'C:/PROGRAM FILES/NORN WORLD LAB',menu:'C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK'}};",
       "nornlab:{name:'Norn World Lab',dir:'C:/PROGRAM FILES/NORN WORLD LAB',menu:'C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK'},latchamp:{name:'LatchAmp',dir:'C:/PROGRAM FILES/LATCHAMP',menu:'C:/WINDOWS/START MENU/PROGRAMS/ACCESSORIES/LATCHAMP.LNK'}};",path)
    text=replace_once(text, "function installSoftware(id){",
       """function createAppInstaller(id){
 if(id!=='latchamp')throw Error('This program cannot be downloaded by Latch Update');
 const path='C:/Downloads/LatchAmp-103.setup.exe';
 const old=get(path);if(old){if(old.kind!=='installer'||old.program!==id)throw Error('The setup filename is already in use');return path;}
 add(path,'installer',{program:id});save();return path;
}
function installSoftware(id){""",path)
    text=replace_once(text,
      "if(id==='nornlab'&&(!disk.cdrom?.mounted||get('D:/SETUP.EXE')?.program!=='nornlab'))throw Error('Insert the Norn World Lab disc into drive D: first.');",
      "if(id==='nornlab'&&(!disk.cdrom?.mounted||get('D:/SETUP.EXE')?.program!=='nornlab'))throw Error('Insert the Norn World Lab disc into drive D: first.');\n if(id==='latchamp'&&get('C:/DOWNLOADS/LATCHAMP-103.SETUP.EXE')?.program!=='latchamp')throw Error('Download LatchAmp Setup from Latch Update first.');",path)
    text=replace_once(text,"installedPrograms,installSoftware:atomic(installSoftware),uninstallSoftware:atomic(uninstallSoftware)",
                       "installedPrograms,createAppInstaller:atomic(createAppInstaller),installSoftware:atomic(installSoftware),uninstallSoftware:atomic(uninstallSoftware)",path)
    # Native Android stores the same virtual disk through a Rust-backed JNI bridge.
    text=replace_once(text, "try{const r=await fetch('/api/fs',{cache:'no-store'});", """if(window.LatchAndroid){
  mode='android';
  try{const saved=window.LatchAndroid.readDisk();if(saved){const parsed=validateDisk(JSON.parse(saved));disk=parsed;fromServer=true;}}
  catch(e){blockedRecovery=true;lastError='Android disk could not be loaded: '+e.message;}
 }else try{const r=await fetch('/api/fs',{cache:'no-store'});""",path)
    text=replace_once(text, "if(!blockedRecovery&&(JSON.stringify(disk)!==bootBackup||!lastPersisted||mode==='rust'))save();", "if(!blockedRecovery&&(JSON.stringify(disk)!==bootBackup||!lastPersisted||mode==='rust'||mode==='android'))save();",path)
    text=replace_once(text, "if(mode==='rust'){\n  // A local mirror", """if(mode==='android'){
  // Android JNI writes the exact revision to private app storage, with an atomic rename.
  try{if(!window.LatchAndroid.writeDisk(data))throw Error('Native disk write failed');pendingServerError='';}
  catch(e){pendingServerError='Android disk save failed: '+e.message;lastError=pendingServerError;throw Error(lastError);}
 }
 if(mode==='rust'){
  // A local mirror""",path)
    return text


def patch_desktop(text: str) -> str:
    p='web/desktop.js'
    text=replace_once(text, "['browser','Latch Browser','browser'],['computer','File Explorer','computer']", "['browser','Latch Browser','browser'],['settings','Latch Update','updates'],['computer','File Explorer','computer']",p)
    text=replace_once(text, "const def={charmap:'Character Map',nornlab:'Norn World Lab'}[program]", "const def={charmap:'Character Map',nornlab:'Norn World Lab',latchamp:'LatchAmp'}[program]",p)
    text=replace_once(text, "${program==='nornlab'?'C:\\\\Program Files\\\\Norn World Lab':'C:\\\\Program Files\\\\Accessories\\\\Character Map'}", "${program==='nornlab'?'C:\\\\Program Files\\\\Norn World Lab':program==='latchamp'?'C:\\\\Program Files\\\\LatchAmp':'C:\\\\Program Files\\\\Accessories\\\\Character Map'}",p)
    text=replace_once(text, "if(id==='charmap'&&!fs.installedPrograms().some(p=>p.id==='charmap'))", "if(id==='latchamp'&&!fs.installedPrograms().some(p=>p.id==='latchamp')){showDialog('LatchAmp','<p>Install LatchAmp with Latch Update before starting it.</p>');return;}\n if(id==='charmap'&&!fs.installedPrograms().some(p=>p.id==='charmap'))",p)
    text=replace_once(text, "spritestudio:'Latch Sprite Studio',disktray", "spritestudio:'Latch Sprite Studio',latchamp:'LatchAmp',updates:'Latch Update',disktray",p)
    text=replace_once(text, "spritestudio:'paint',cdrom", "spritestudio:'paint',latchamp:'sound',updates:'settings',cdrom",p)
    text=replace_once(text, "spritestudio:[1024,700],cdrom", "spritestudio:[1024,700],latchamp:[780,610],updates:[540,420],cdrom",p)
    text=replace_once(text, "case 'swarmwire':return `<div class=\"swarmwire-root\" style=\"height:100%\"></div>`;", "case 'swarmwire':return `<div class=\"swarmwire-root\" style=\"height:100%\"></div>`;\n case 'updates':return `<div class=\"l98-update-host\" style=\"height:100%;overflow:hidden\"></div>`;",p)
    text=replace_once(text, "case 'wilds':case 'catacombs':case 'weedwarrior':case 'soundstudio':case 'audacity':case 'spritestudio':return", "case 'wilds':case 'catacombs':case 'weedwarrior':case 'soundstudio':case 'audacity':case 'spritestudio':case 'latchamp':return",p)
    text=replace_once(text, "if(id==='swarmwire')setupSwarmWire(node);", "if(id==='updates'){const api=window.LatchUpdater?.mount(node.querySelector('.l98-update-host'),{fs,showError:fsError,openFolder:path=>launch('explorer:'+path),runSetup:showSoftwareSetup});if(api)windows.get(id).cleanup=()=>api.destroy();}\n if(id==='swarmwire')setupSwarmWire(node);",p)
    text=replace_once(text, "'audacity','spritestudio'].includes(id))setupExtraWindow", "'audacity','spritestudio','latchamp'].includes(id))setupExtraWindow",p)
    text=replace_once(text, "spritestudio:'spritestudio',sprite:'spritestudio'", "spritestudio:'spritestudio',sprite:'spritestudio',latchamp:'latchamp',updates:'updates',update:'updates'",p)
    return text


def patch_index(text: str) -> str:
    p='web/index.html'
    text=replace_once(text,'data-app="site:pixelshelf"><svg class="pixel-icon"><use href="#ico-browser"/></svg>Latch Update', 'data-app="updates"><svg class="pixel-icon"><use href="#ico-browser"/></svg>Latch Update',p)
    text=replace_once(text,'<script src="desktop.js"></script>','<script src="latch-update.js"></script>\n<script src="desktop.js"></script>',p)
    return text


def patch_standalone(text: str) -> str:
    p='tools/build_standalone.py'
    text=replace_once(text, "('wilds','catacombs','weedwarrior','soundstudio','audacity','spritestudio')", "('wilds','catacombs','weedwarrior','soundstudio','audacity','spritestudio','latchamp')",p)
    # The bundle contains app code, but that code is NOT installed on the virtual disk.
    text=replace_once(text, "source=source.replace('<script src=\"desktop.js\"></script>',", "source=source.replace('<script src=\"latch-update.js\"></script>',script_inline(read('web/latch-update.js')))\nsource=source.replace('<script src=\"desktop.js\"></script>',",p)
    return text


def patch_rust(text: str) -> str:
    p='src/main.rs'
    text=replace_once(text, 'const FILESYSTEM_JS: &str = include_str!("../web/filesystem.js");', 'const FILESYSTEM_JS: &str = include_str!("../web/filesystem.js");\nconst UPDATE_JS: &str = include_str!("../web/latch-update.js");',p)
    text=replace_once(text, '("GET", "/filesystem.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", FILESYSTEM_JS.as_bytes()),', '("GET", "/filesystem.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", FILESYSTEM_JS.as_bytes()),\n        ("GET", "/latch-update.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", UPDATE_JS.as_bytes()),',p)
    text=replace_once(text, 'const UPDATE_JS: &str = include_str!("../web/latch-update.js");', 'const UPDATE_JS: &str = include_str!("../web/latch-update.js");\nconst LATCHAMP_HTML: &str = include_str!("../apps/latchamp/index.html");',p)
    text=replace_once(text, '("GET", "/latch-update.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", UPDATE_JS.as_bytes()),', '("GET", "/latch-update.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", UPDATE_JS.as_bytes()),\n        ("GET", "/apps/latchamp/index.html") => send(&mut stream, "200 OK", "text/html; charset=utf-8", LATCHAMP_HTML.as_bytes()),',p)
    return text


def main():
    ap=argparse.ArgumentParser();ap.add_argument('latchroot',type=pathlib.Path);a=ap.parse_args()
    root=a.latchroot.resolve()
    expected=['web/desktop.js','web/filesystem.js','web/index.html','tools/build_standalone.py','src/main.rs']
    for f in expected:
        if not (root/f).is_file():raise SystemExit('Missing expected Latch source: '+str(root/f))
    transforms={'web/desktop.js':patch_desktop,'web/filesystem.js':patch_filesystem,'web/index.html':patch_index,'tools/build_standalone.py':patch_standalone,'src/main.rs':patch_rust}
    # Validate all transformations before touching any file.
    output={f:transforms[f]((root/f).read_text(encoding='utf-8')) for f in expected}
    for f in expected:
        original=(root/f).read_text(encoding='utf-8')
        if output[f]!=original:
            bak=root/(f+'.pre-latchamp.bak')
            if not bak.exists():bak.write_text(original,encoding='utf-8')
            (root/f).write_text(output[f],encoding='utf-8')
            print('Updated',f)
    for relative in ('web/latch-update.js','apps/latchamp/index.html','apps/latchamp/PLAYER_NOTES.md','tools/latch_update.py','tools/apply_latch_update.py'):
        dest=root/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(OVERLAY/relative,dest);print('Installed package asset',relative)
    # Android project is placed under Latch; GitHub workflow belongs to repo root.
    android_source=OVERLAY/'android';android_target=root/'android'
    if android_target.exists():
        # Preserve user-generated Gradle files and build outputs; copy only source.
        for f in android_source.rglob('*'):
            if f.is_file() and '__pycache__' not in f.parts:
                out=android_target/f.relative_to(android_source);out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,out)
    else:shutil.copytree(android_source,android_target,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    workflow_dir=root.parent/'.github'/'workflows'
    if (root.parent/'.github').is_dir():
        workflow_dir.mkdir(parents=True,exist_ok=True)
        shutil.copy2(OVERLAY/'.github/workflows/latch98-android.yml',workflow_dir/'latch98-android.yml')
    print('Installed Latch Update utility and LatchAmp availability. LatchAmp is NOT preinstalled on virtual disks.')

if __name__=='__main__':main()
