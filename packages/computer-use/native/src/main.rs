mod protocol;

#[cfg(target_os = "macos")]
mod accessibility;
#[cfg(target_os = "macos")]
mod input;
#[cfg(target_os = "macos")]
mod runtime;
#[cfg(target_os = "macos")]
mod screenshot;

#[cfg(target_os = "macos")]
use core_graphics::display::CGDisplay;
use protocol::AppError;
#[cfg(target_os = "macos")]
use protocol::Request;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

fn write_response(id: &str, result: Result<Value, AppError>) -> io::Result<()> {
    let value = match result {
        Ok(result) => json!({ "id": id, "ok": true, "result": result }),
        Err(error) => json!({
            "error": { "code": error.code, "message": error.message },
            "id": id,
            "ok": false
        }),
    };
    let stdout = io::stdout();
    let mut output = stdout.lock();
    serde_json::to_writer(&mut output, &value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    output.write_all(b"\n")?;
    output.flush()
}

#[cfg(not(target_os = "macos"))]
fn main() {
    eprintln!("pi-computer-use-helper only supports macOS");
    std::process::exit(1);
}

#[cfg(target_os = "macos")]
fn main() -> io::Result<()> {
    // Headless helpers must initialize the WindowServer connection on the main thread.
    let _ = CGDisplay::main();
    let stdin = io::stdin();
    let mut runtime = runtime::Runtime::default();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.len() > 1_000_000 {
            write_response(
                "unknown",
                Err(AppError::new("REQUEST_TOO_LARGE", "request exceeds 1 MB")),
            )?;
            continue;
        }
        let request: Request = match serde_json::from_str(&line) {
            Ok(request) => request,
            Err(error) => {
                write_response(
                    "unknown",
                    Err(AppError::new("INVALID_REQUEST", error.to_string())),
                )?;
                continue;
            }
        };
        let result = match request.method.as_str() {
            "ping" => Ok(json!({ "protocolVersion": 1 })),
            "observe" => runtime.observe(request.params),
            "act" => runtime.act(request.params),
            _ => Err(AppError::new("METHOD_NOT_FOUND", "unknown method")),
        };
        write_response(&request.id, result)?;
    }
    Ok(())
}
