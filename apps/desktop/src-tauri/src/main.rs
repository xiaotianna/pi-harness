#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(debug_assertions))]
use std::{fs, io::Read, net::TcpListener};
use std::{
    io::Write,
    net::{SocketAddr, TcpStream},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, RunEvent};
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct ManagedDaemon {
    child: CommandChild,
    is_running: Arc<AtomicBool>,
    port: u16,
    token: String,
}

type DaemonProcess = Mutex<Option<ManagedDaemon>>;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DaemonProcess::default())
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("main window is missing")?;

            #[cfg(debug_assertions)]
            window.show()?;

            #[cfg(not(debug_assertions))]
            {
                let daemon = start_daemon(app.handle())?;
                let url = tauri::Url::parse(&format!(
                    "http://127.0.0.1:{}/__desktop/bootstrap#{}",
                    daemon.port, daemon.token
                ))?;
                *app.state::<DaemonProcess>()
                    .lock()
                    .expect("daemon lock poisoned") = Some(daemon);
                window.navigate(url)?;
                window.show()?;
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build PI Harness desktop app");

    app.run(|app, event| {
        if let RunEvent::ExitRequested { .. } = event {
            if let Some(daemon) = app
                .state::<DaemonProcess>()
                .lock()
                .expect("daemon lock poisoned")
                .take()
            {
                let _ = request_shutdown(daemon.port, &daemon.token);
                let deadline = Instant::now() + Duration::from_secs(5);
                while daemon.is_running.load(Ordering::Acquire) && Instant::now() < deadline {
                    thread::sleep(Duration::from_millis(50));
                }
                if daemon.is_running.load(Ordering::Acquire) {
                    let _ = daemon.child.kill();
                }
            }
        }
    });
}

#[cfg(not(debug_assertions))]
fn start_daemon(app: &tauri::AppHandle) -> Result<ManagedDaemon, Box<dyn std::error::Error>> {
    let port = reserve_port()?;
    let token = random_token()?;
    let resource_dir = app.path().resource_dir()?;
    let daemon_dir = resource_dir.join("daemon");
    let web_dir = resource_dir.join("web");
    let data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&data_dir)?;

    let (mut events, mut child) = app
        .shell()
        .sidecar("pi-harness-node")?
        .args(["--import", "tsx", "src/bootstrap.ts"])
        .current_dir(&daemon_dir)
        .env("PI_HARNESS_HOST", "127.0.0.1")
        .env("PI_HARNESS_PORT", port.to_string())
        .env("PI_HARNESS_DATABASE_PATH", data_dir.join("harness.sqlite"))
        .env("PI_HARNESS_DESKTOP_TOKEN", &token)
        .env("PI_HARNESS_WEB_DIST_PATH", &web_dir)
        .env("PI_HARNESS_WEB_URL", format!("http://127.0.0.1:{port}"))
        .spawn()?;

    let is_running = Arc::new(AtomicBool::new(true));
    let process_state = Arc::clone(&is_running);
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    eprintln!("[daemon] {}", String::from_utf8_lossy(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    eprintln!("[daemon] {}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
        process_state.store(false, Ordering::Release);
    });

    if let Err(error) = wait_until_ready(port) {
        let _ = child.kill();
        return Err(error);
    }

    Ok(ManagedDaemon {
        child,
        is_running,
        port,
        token,
    })
}

#[cfg(not(debug_assertions))]
fn reserve_port() -> std::io::Result<u16> {
    // ponytail: this tiny release/spawn race is acceptable; use inherited sockets if it occurs.
    Ok(TcpListener::bind(("127.0.0.1", 0))?.local_addr()?.port())
}

#[cfg(not(debug_assertions))]
fn random_token() -> Result<String, getrandom::Error> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes)?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

#[cfg(not(debug_assertions))]
fn wait_until_ready(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < deadline {
        if health_check(address).unwrap_or(false) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err("daemon did not become ready within 15 seconds".into())
}

#[cfg(not(debug_assertions))]
fn health_check(address: SocketAddr) -> std::io::Result<bool> {
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(250))?;
    stream.set_read_timeout(Some(Duration::from_millis(250)))?;
    stream.write_all(
        format!("GET /api/health HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n")
            .as_bytes(),
    )?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    Ok(response.starts_with("HTTP/1.1 200") && response.contains("\"status\":\"ok\""))
}

fn request_shutdown(port: u16, token: &str) -> std::io::Result<()> {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(250))?;
    stream.write_all(
        format!(
            "POST /__desktop/shutdown HTTP/1.1\r\nHost: {address}\r\nAuthorization: Bearer {token}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        )
        .as_bytes(),
    )
}
