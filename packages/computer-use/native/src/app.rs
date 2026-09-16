use std::fs::{self, DirBuilder};
use std::io;
use std::net::Shutdown;
use std::os::unix::fs::{DirBuilderExt, PermissionsExt};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const APP_NAME: &str = "PI Harness Computer Use.app";

struct SocketDirectory(PathBuf);

impl Drop for SocketDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_file(self.0.join("helper.sock"));
        let _ = fs::remove_dir(&self.0);
    }
}

fn app_path() -> io::Result<PathBuf> {
    let executable = std::env::current_exe()?;
    let parent = executable
        .parent()
        .ok_or_else(|| io::Error::other("helper path is invalid"))?;
    let candidates = [
        parent.join(APP_NAME),
        parent.join("../Helpers").join(APP_NAME),
    ];
    candidates
        .into_iter()
        .find(|path| path.join("Contents/MacOS/pi-computer-use-helper").is_file())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "PI Harness Computer Use.app is missing; package the native helper first",
            )
        })
}

pub(crate) fn connect(path: &Path) -> io::Result<(UnixStream, UnixStream)> {
    let stream = UnixStream::connect(path)?;
    let input = stream.try_clone()?;
    Ok((input, stream))
}

pub(crate) fn launch() -> io::Result<()> {
    let app = app_path()?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(io::Error::other)?
        .as_nanos();
    // Keep the Unix socket path below macOS's 104-byte sockaddr_un limit.
    let directory_path =
        PathBuf::from(format!("/private/tmp/pi-cu-{}-{nonce}", std::process::id()));
    DirBuilder::new().mode(0o700).create(&directory_path)?;
    let directory = SocketDirectory(directory_path);
    let socket_path = directory.0.join("helper.sock");
    let listener = UnixListener::bind(&socket_path)?;
    fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600))?;
    listener.set_nonblocking(true)?;

    let mut command = Command::new("/usr/bin/open");
    command
        .args(["-n", "-g", "-a"])
        .arg(&app)
        .args(["--args", "--connect"])
        .arg(&socket_path);
    if std::env::args().any(|argument| argument == "--mcp") {
        command.arg("--mcp");
    }
    let mut launcher = command.stdout(Stdio::null()).spawn()?;
    let deadline = std::time::Instant::now() + Duration::from_secs(15);
    let mut stream = loop {
        match listener.accept() {
            Ok((stream, _)) => break stream,
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                if let Some(status) = launcher.try_wait()? {
                    if !status.success() {
                        return Err(io::Error::other(format!(
                            "Computer Use app failed to launch: {status}"
                        )));
                    }
                }
                if std::time::Instant::now() >= deadline {
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "Computer Use app did not connect",
                    ));
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(error),
        }
    };
    // Only accept is polled; the stdio relay must wait for complete responses.
    stream.set_nonblocking(false)?;
    let mut input = stream.try_clone()?;
    thread::spawn(move || {
        let _ = io::copy(&mut io::stdin(), &mut input);
        let _ = input.shutdown(Shutdown::Write);
    });
    io::copy(&mut stream, &mut io::stdout())?;
    Ok(())
}
