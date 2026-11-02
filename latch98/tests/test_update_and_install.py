from __future__ import annotations
import importlib.util
from pathlib import Path
import pytest
import zipfile

BASE=Path(__file__).resolve().parents[1]

def module(path):
    spec=importlib.util.spec_from_file_location(path.stem,path)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod

up=module(BASE/'tools/latch_update.py')
patcher=module(BASE/'tools/apply_latch_update.py')

def opts(**kwargs):return type('Options',(),kwargs)()

def test_name_allowlist():
    for path in ('web/desktop.js','apps/latchamp/index.html','tools/release_check.py'):
        assert up.safe_name(path)==path
    for path in ('../outside','/etc/passwd','data/virtual_disk.json','apps/norn-world-lab/index.html','apps/bloodline/bloodline.html','src/../data/a','web//a','tools/latch_update.py'):
        with pytest.raises(ValueError):up.safe_name(path)


def test_signed_update_backup_tampering_and_recovery(tmp_path):
    source=tmp_path/'source';target=tmp_path/'target'
    for root in (source,target):(root/'web').mkdir(parents=True)
    (source/'web/index.html').write_text('new version')
    (target/'web/index.html').write_text('original')
    target.joinpath('data').mkdir()
    (target/'data/virtual_disk.json').write_text('valuable save')
    private=tmp_path/'signing.pem';public=tmp_path/'trusted.pub'
    up.keygen(opts(private=str(private),public=str(public)))
    pack=tmp_path/'update.l98update'
    up.pack(opts(root=str(source),version='0.9.1',private=str(private),output=str(pack),files=['web/index.html']))
    up.install(opts(root=str(target),public=str(public),package=str(pack)))
    assert (target/'web/index.html').read_text()=='new version'
    assert (target/'data/virtual_disk.json').read_text()=='valuable save'
    # Existing signed package can only change its declared file, never data/.
    with zipfile.ZipFile(pack) as original:
        corrupted=tmp_path/'corrupt.l98update'
        with zipfile.ZipFile(corrupted,'w') as z:
            for filename in original.namelist():
                raw=original.read(filename)
                if filename=='payload/web/index.html':raw=b'EVIL'
                z.writestr(filename,raw)
    with pytest.raises(ValueError,match='hash'):
        up.install(opts(root=str(target),public=str(public),package=str(corrupted)))
    assert (target/'web/index.html').read_text()=='new version'
    # Simulate interrupted install and verify restoration of previous state.
    journal=target/up.JOURNAL
    backup=target/'.latch-update-backups'/'test-recovery'/'web'
    backup.mkdir(parents=True)
    (backup/'index.html').write_text('original')
    journal.write_text('{"id":"test-recovery","files":{"web/index.html":true}}')
    assert up.recover(target)
    assert (target/'web/index.html').read_text()=='original'


def test_bad_signature_does_not_write(tmp_path):
    src=tmp_path/'src';dest=tmp_path/'dest';(src/'web').mkdir(parents=True);(dest/'web').mkdir(parents=True)
    (src/'web/desktop.js').write_text('new');(dest/'web/desktop.js').write_text('old')
    private=tmp_path/'private';public=tmp_path/'public'
    up.keygen(opts(private=str(private),public=str(public)))
    wrong_private=tmp_path/'another';wrong_pub=tmp_path/'another.pub'
    up.keygen(opts(private=str(wrong_private),public=str(wrong_pub)))
    archive=tmp_path/'release.l98update'
    up.pack(opts(root=str(src),version='1',private=str(private),output=str(archive),files=['web/desktop.js']))
    with pytest.raises(Exception):up.install(opts(root=str(dest),public=str(wrong_pub),package=str(archive)))
    assert (dest/'web/desktop.js').read_text()=='old'


def test_source_guard_and_app_not_preinstalled():
    code=(BASE/'web/latch-update.js').read_text()
    assert "fs.createAppInstaller(APP_ID)" in code
    assert "runSetup(APP_ID)" in code
    assert "installedPrograms().some" in code
    assert "function createAppInstaller(id)" in patcher.patch_filesystem("nornlab:{name:'Norn World Lab',dir:'C:/PROGRAM FILES/NORN WORLD LAB',menu:'C:/WINDOWS/START MENU/PROGRAMS/NORN WORLD LAB.LNK'}};\nfunction installSoftware(id){\nif(id==='nornlab'&&(!disk.cdrom?.mounted||get('D:/SETUP.EXE')?.program!=='nornlab'))throw Error('Insert the Norn World Lab disc into drive D: first.');\ninstalledPrograms,installSoftware:atomic(installSoftware),uninstallSoftware:atomic(uninstallSoftware)\ntry{const r=await fetch('/api/fs',{cache:'no-store'});\nif(!blockedRecovery&&(JSON.stringify(disk)!==bootBackup||!lastPersisted||mode==='rust'))save();\nif(mode==='rust'){\n  // A local mirror")
    assert 'preinstalledLatchamp' not in (BASE/'tools/apply_latch_update.py').read_text()


def test_missing_anchor_aborts():
    with pytest.raises(RuntimeError,match='Expected exactly one'):
        patcher.patch_index('<html>No source here</html>')
