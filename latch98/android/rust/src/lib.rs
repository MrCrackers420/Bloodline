use jni::{objects::{JClass,JString},sys::{jboolean,jstring},JNIEnv};
use std::{fs,io::Write,path::{Path,PathBuf}};
const LIMIT: usize = 2*1024*1024;
fn disk_path(folder:&str)->PathBuf { Path::new(folder).join("virtual_disk.json") }

#[no_mangle]
pub extern "system" fn Java_com_latch98_mobile_RustDisk_readDisk(mut env:JNIEnv,_class:JClass,folder:JString)->jstring{
    let path:String=match env.get_string(&folder){Ok(x)=>x.into(),Err(_)=>return std::ptr::null_mut()};
    let content=fs::read_to_string(disk_path(&path)).unwrap_or_default();
    env.new_string(content).map(|x|x.into_raw()).unwrap_or(std::ptr::null_mut())
}
#[no_mangle]
pub extern "system" fn Java_com_latch98_mobile_RustDisk_writeDisk(mut env:JNIEnv,_class:JClass,folder:JString,json:JString)->jboolean{
    let dir:String=match env.get_string(&folder){Ok(x)=>x.into(),Err(_)=>return 0};
    let body:String=match env.get_string(&json){Ok(x)=>x.into(),Err(_)=>return 0};
    if body.len()>LIMIT || body.is_empty(){return 0}
    let valid=serde_json::from_str::<serde_json::Value>(&body).ok().map(|x|x.get("version").and_then(|x|x.as_i64())==Some(1)&&x.get("nodes").map(|x|x.is_object()).unwrap_or(false)).unwrap_or(false);
    if !valid{return 0}
    let root=Path::new(&dir);
    if !root.is_dir(){return 0}
    let target=disk_path(&dir);let temp=root.join("virtual_disk.tmp");
    let success=(||->std::io::Result<()> {
        let mut f=fs::File::create(&temp)?;f.write_all(body.as_bytes())?;f.sync_all()?;drop(f);
        // Same-directory rename avoids a partially written active disk.
        fs::rename(&temp,&target)?;Ok(())
    })().is_ok();
    if !success{let _=fs::remove_file(temp);}if success{1}else{0}
}
