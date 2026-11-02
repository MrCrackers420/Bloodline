//! Latch 98 — minimal Rust HTTP host for the HTML desktop.
//! No external crates. This is an application/simulator, not a real OS.
use std::{
    env,
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::Command,
    thread,
    time::Duration,
    sync::Mutex,
};

const HTML: &str = include_str!("../web/index.html");
const DESKTOP_CSS: &str = include_str!("../web/desktop.css");
const DESKTOP_JS: &str = include_str!("../web/desktop.js");
const LATCHNET_JS: &str = include_str!("../web/latchnet.js");
const LATCHNET_CSS: &str = include_str!("../web/latchnet.css");
const SHELL_CSS: &str = include_str!("../web/shell_v07.css");
const EXPLORER_CSS: &str = include_str!("../web/explorer_v08.css");
const SWARMWIRE_CSS: &str = include_str!("../web/swarmwire.css");
const SWARMWIRE_JS: &str = include_str!("../web/swarmwire.js");
const FILESYSTEM_JS: &str = include_str!("../web/filesystem.js");
const SOLITAIRE_HTML: &str = include_str!("../apps/solitaire/solitaire.html");
const SOLITAIRE_CSS: &str = include_str!("../apps/solitaire/solitaire.css");
const SOLITAIRE_ENGINE: &str = include_str!("../apps/solitaire/engine.js");
const SOLITAIRE_APP: &str = include_str!("../apps/solitaire/app.js");
const MINE_APP_JS: &str = include_str!("../apps/minesweeper/web/app.js");
const MINE_FALLBACK_JS: &str = include_str!("../apps/minesweeper/web/engine-fallback.js");
const MINE_CSS: &str = include_str!("../apps/minesweeper/web/style.css");
const MINE_INDEX: &str = include_str!("../apps/minesweeper/web/index.html");

const MAX_REQUEST_BODY: usize = 4 * 1024 * 1024;
static DISK_WRITE_LOCK: Mutex<()> = Mutex::new(());
const PORT: u16 = 3478;

fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|x| x == "--help" || x == "-h") {
        println!("Latch 98\n  cargo run --release                  Local desktop\n  cargo run --release -- --lan          Share on local Wi-Fi (no authentication)\n  cargo run --release -- --no-browser   Do not launch browser\n  cargo run --release -- --port 4000    Use another port");
        return Ok(());
    }
    let lan = args.iter().any(|x| x == "--lan");
    let no_browser = args.iter().any(|x| x == "--no-browser");
    let port = args.windows(2).find(|w| w[0] == "--port").and_then(|w| w[1].parse::<u16>().ok()).unwrap_or(PORT);
    let host = if lan { "0.0.0.0" } else { "127.0.0.1" };
    let listener = TcpListener::bind((host, port))?;
    let root = env::current_dir()?.join("data");
    fs::create_dir_all(&root)?;
    let url = format!("http://127.0.0.1:{port}");
    println!("\n  LATCH 98  —  Rust + HTML desktop\n  {url}\n  Virtual disk data: {}\n", root.display());
    if lan { println!("  LAN enabled: open http://YOUR-PC-LOCAL-IP:{port} on your phone.\n  Note: Anyone on this network can access/edit the note. Do not expose the port to the internet.\n"); }
    println!("  Press Ctrl+C to turn off the server.\n");
    if !no_browser {
        let launch_url = url.clone();
        thread::spawn(move || { thread::sleep(Duration::from_millis(550)); open_browser(&launch_url); });
    }
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let data_dir = root.clone();
                thread::spawn(move || { if let Err(err) = handle(stream, data_dir) { eprintln!("Request error: {err}"); } });
            }
            Err(err) => eprintln!("Connection error: {err}"),
        }
    }
    Ok(())
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    let result = Command::new("cmd").args(["/C", "start", "", url]).spawn();
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(url).spawn();
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(url).spawn();
    if result.is_err() { eprintln!("Could not launch browser; open {url} manually."); }
}

fn handle(mut stream: TcpStream, root: PathBuf) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut first = String::new();
    if reader.read_line(&mut first)? == 0 { return Ok(()); }
    let parts: Vec<&str> = first.split_whitespace().collect();
    if parts.len() != 3 { return send(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", b"Malformed request"); }
    let method = parts[0];
    let path = parts[1].split('?').next().unwrap_or("/");
    let mut length = 0usize;
    loop {
        let mut line = String::new();
        reader.read_line(&mut line)?;
        if line == "\r\n" || line == "\n" || line.is_empty() { break; }
        if let Some((k, v)) = line.split_once(':') {
            if k.eq_ignore_ascii_case("content-length") {
                length = v.trim().parse().unwrap_or(usize::MAX);
            }
        }
    }
    if length > MAX_REQUEST_BODY { return send(&mut stream, "413 Payload Too Large", "text/plain", b"Note is too large"); }
    match (method, path) {
        ("GET", "/") | ("GET", "/index.html") => send(&mut stream, "200 OK", "text/html; charset=utf-8", HTML.as_bytes()),
        ("GET", "/desktop.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", DESKTOP_CSS.as_bytes()),
        ("GET", "/desktop.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", DESKTOP_JS.as_bytes()),
        ("GET", "/latchnet.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", LATCHNET_JS.as_bytes()),
        ("GET", "/latchnet.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", LATCHNET_CSS.as_bytes()),
        ("GET", "/shell_v07.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", SHELL_CSS.as_bytes()),
        ("GET", "/explorer_v08.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", EXPLORER_CSS.as_bytes()),
        ("GET", "/swarmwire.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", SWARMWIRE_CSS.as_bytes()),
        ("GET", "/swarmwire.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", SWARMWIRE_JS.as_bytes()),
        ("GET", "/filesystem.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", FILESYSTEM_JS.as_bytes()),
        ("GET", "/apps/solitaire/solitaire.html") => send(&mut stream, "200 OK", "text/html; charset=utf-8", SOLITAIRE_HTML.as_bytes()),
        ("GET", "/apps/solitaire/solitaire.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", SOLITAIRE_CSS.as_bytes()),
        ("GET", "/apps/solitaire/engine.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", SOLITAIRE_ENGINE.as_bytes()),
        ("GET", "/apps/solitaire/app.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", SOLITAIRE_APP.as_bytes()),
        ("GET", "/apps/minesweeper/web/index.html") => send(&mut stream, "200 OK", "text/html; charset=utf-8", MINE_INDEX.as_bytes()),
        ("GET", "/apps/minesweeper/web/app.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", MINE_APP_JS.as_bytes()),
        ("GET", "/apps/minesweeper/web/style.css") => send(&mut stream, "200 OK", "text/css; charset=utf-8", MINE_CSS.as_bytes()),
        ("GET", "/apps/minesweeper/web/engine-fallback.js") => send(&mut stream, "200 OK", "text/javascript; charset=utf-8", MINE_FALLBACK_JS.as_bytes()),
        // wasm-pack output is optional until `tools/build.sh` runs. The game
        // automatically falls back to JS before that build exists.
        ("GET", "/apps/minesweeper/pkg/latch98_minesweeper.js") =>
            send_optional_asset(&mut stream, &root, "latch98_minesweeper.js", "text/javascript; charset=utf-8"),
        ("GET", "/apps/minesweeper/pkg/latch98_minesweeper_bg.wasm") =>
            send_optional_asset(&mut stream, &root, "latch98_minesweeper_bg.wasm", "application/wasm"),
        ("GET", "/api/info") => send(&mut stream, "200 OK", "application/json; charset=utf-8", b"{\"name\":\"Latch 98\",\"version\":\"0.9.0\",\"backend\":\"Rust\",\"virtualDisk\":true}"),
        // The only persistent disk endpoint: a bounded JSON *virtual* disk image.
        // The client never supplies a host path. No host file browsing is exposed.
        ("GET", "/api/fs") => match fs::read(root.join("virtual_disk.json")) {
            Ok(bytes) => send(&mut stream, "200 OK", "application/json; charset=utf-8", &bytes),
            Err(err) if err.kind() == std::io::ErrorKind::NotFound =>
                send(&mut stream, "404 Not Found", "text/plain; charset=utf-8", b"No virtual disk created yet"),
            Err(err) => { eprintln!("Disk read error: {err}"); send(&mut stream, "500 Internal Server Error", "text/plain", b"Unable to read disk") },
        },
        ("POST", "/api/fs") => {
            let mut body = vec![0; length];
            reader.read_exact(&mut body)?;
            let valid = std::str::from_utf8(&body).ok().map(str::trim)
                .map(|s| s.starts_with('{') && s.ends_with('}') && s.contains("\"nodes\"") && s.contains("\"version\""))
                .unwrap_or(false);
            if !valid { return send(&mut stream, "400 Bad Request", "text/plain", b"Invalid virtual disk image"); }
            let _guard = DISK_WRITE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
            let temp = root.join("virtual_disk.pending");
            if let Err(err) = fs::write(&temp, &body).and_then(|_| fs::rename(&temp, root.join("virtual_disk.json"))) {
                eprintln!("Disk write error: {err}");
                return send(&mut stream, "500 Internal Server Error", "text/plain", b"Unable to write disk");
            }
            send(&mut stream, "200 OK", "application/json; charset=utf-8", b"{\"saved\":true}")
        }
        ("GET", "/api/notepad") => {
            let bytes = fs::read(root.join("notepad.txt")).unwrap_or_default();
            send(&mut stream, "200 OK", "text/plain; charset=utf-8", &bytes)
        }
        ("POST", "/api/notepad") => {
            let mut body = vec![0; length];
            reader.read_exact(&mut body)?;
            if std::str::from_utf8(&body).is_err() { return send(&mut stream, "400 Bad Request", "text/plain", b"Text must be UTF-8"); }
            fs::write(root.join("notepad.txt"), body)?;
            send(&mut stream, "200 OK", "application/json; charset=utf-8", b"{\"saved\":true}")
        }
        ("GET", "/api/nornlab-status") => {
            let available = root.parent().unwrap_or(&root).join("apps/norn-world-lab/index.html").is_file();
            let msg = if available { b"{\"available\":true}".as_slice() } else { b"{\"available\":false}".as_slice() };
            send(&mut stream, "200 OK", "application/json; charset=utf-8", msg)
        }
        ("GET", "/game/bloodline.html") => {
            let file=root.parent().unwrap_or(&root).join("game").join("bloodline.html");
            match fs::read(file){
                Ok(bytes)=>send(&mut stream,"200 OK","text/html; charset=utf-8",&bytes),
                Err(_)=>send(&mut stream,"404 Not Found","text/plain; charset=utf-8",b"Copy Bloodline source to game/bloodline.html to enable this shortcut."),
            }
        },
        ("GET", "/favicon.ico") => send(&mut stream, "204 No Content", "image/x-icon", b""),
        ("GET", path) if path.starts_with("/apps/norn-world-lab/") => serve_norn_asset(&mut stream,&root,path),
        _ => send(&mut stream, "404 Not Found", "text/plain; charset=utf-8", b"Not found"),
    }
}

fn send_optional_asset(stream: &mut TcpStream, data_dir: &std::path::Path, filename: &str, mime: &str) -> std::io::Result<()> {
    // Exact allowlist above; no user-controlled filesystem paths.
    let cwd = data_dir.parent().unwrap_or(data_dir);
    let file = cwd.join("apps").join("minesweeper").join("pkg").join(filename);
    match fs::read(file) {
        Ok(bytes) => send(stream, "200 OK", mime, &bytes),
        Err(_) => send(stream, "404 Not Found", "text/plain; charset=utf-8", b"Build Minesweeper WASM with wasm-pack to enable Rust game rules"),
    }
}

fn send(stream: &mut TcpStream, status: &str, mime: &str, body: &[u8]) -> std::io::Result<()> {
    let headers = format!("HTTP/1.1 {status}\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Latch-Backend: rust\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n", body.len());
    stream.write_all(headers.as_bytes())?;
    stream.write_all(body)?;
    stream.flush()
}

/// Serve user-supplied Norn World Lab assets, with a strict directory boundary.
/// No Norn World Lab game assets are bundled with Latch 98.
fn serve_norn_asset(stream: &mut TcpStream, data_dir: &std::path::Path, url: &str) -> std::io::Result<()> {
    use std::path::Component;
    let raw_suffix = url.trim_start_matches("/apps/norn-world-lab/");
    let mut buf=Vec::with_capacity(raw_suffix.len());
    let bytes=raw_suffix.as_bytes();let mut i=0;
    while i<bytes.len(){
        if bytes[i]==b'%' {
            if i+2>=bytes.len(){return send(stream,"400 Bad Request","text/plain",b"Invalid filename");}
            let hex=|b:u8|->Option<u8>{match b{b'0'..=b'9'=>Some(b-b'0'),b'a'..=b'f'=>Some(b-b'a'+10),b'A'..=b'F'=>Some(b-b'A'+10),_=>None}};
            let (a,b)=(hex(bytes[i+1]),hex(bytes[i+2]));
            match (a,b){(Some(a),Some(b))=>buf.push(a*16+b),_=>return send(stream,"400 Bad Request","text/plain",b"Invalid filename")};
            i+=3;
        }else{buf.push(bytes[i]);i+=1;}
    }
    let suffix=match String::from_utf8(buf){Ok(v)=>v,Err(_)=>return send(stream,"400 Bad Request","text/plain",b"Invalid filename")};
    if suffix.is_empty() || suffix.len()>512 || suffix.contains('\\') || suffix.bytes().any(|c| c < 32) {
        return send(stream,"400 Bad Request","text/plain",b"Invalid filename");
    }
    let path=std::path::Path::new(&suffix);
    if !path.components().all(|c| matches!(c,Component::Normal(_))) {
        return send(stream,"400 Bad Request","text/plain",b"Invalid filename");
    }
    let base=data_dir.parent().unwrap_or(data_dir).join("apps/norn-world-lab");
    let base_abs=match base.canonicalize(){Ok(v)=>v,Err(_)=>return send(stream,"404 Not Found","text/plain",b"Application not found")};
    let absolute=match base.join(path).canonicalize(){Ok(v)=>v,Err(_)=>return send(stream,"404 Not Found","text/plain",b"File not found")};
    if !absolute.starts_with(&base_abs) || !absolute.is_file() {
        return send(stream,"403 Forbidden","text/plain",b"Access denied");
    }
    let mime=match absolute.extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase().as_str(){
        "htm"|"html"=>"text/html; charset=utf-8", "js"|"mjs"=>"text/javascript; charset=utf-8", "css"=>"text/css; charset=utf-8",
        "png"=>"image/png", "jpg"|"jpeg"=>"image/jpeg", "gif"=>"image/gif", "webp"=>"image/webp",
        "json"=>"application/json; charset=utf-8", "svg"=>"image/svg+xml", "wasm"=>"application/wasm", "woff"=>"font/woff", "woff2"=>"font/woff2",
        "mp3"=>"audio/mpeg", "ogg"=>"audio/ogg", "wav"=>"audio/wav", "mp4"=>"video/mp4", _=>"application/octet-stream"
    };
    match fs::read(&absolute) {
        Ok(bytes)=>send(stream,"200 OK",mime,&bytes),
        Err(_)=>send(stream,"404 Not Found","text/plain",b"File not found")
    }
}
