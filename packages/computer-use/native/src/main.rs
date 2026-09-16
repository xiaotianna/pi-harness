mod protocol;

#[cfg(target_os = "macos")]
mod accessibility;
#[cfg(target_os = "macos")]
mod app;
#[cfg(target_os = "macos")]
mod input;
#[cfg(target_os = "macos")]
mod mcp;
#[cfg(target_os = "macos")]
mod permissions;
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

fn write_response(
    output: &mut impl Write,
    id: &str,
    result: Result<Value, AppError>,
) -> io::Result<()> {
    let value = match result {
        Ok(result) => json!({ "id": id, "ok": true, "result": result }),
        Err(error) => json!({
            "error": { "code": error.code, "message": error.message },
            "id": id,
            "ok": false
        }),
    };
    serde_json::to_writer(&mut *output, &value)
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
    let args: Vec<String> = std::env::args().skip(1).collect();
    let connected = match args.as_slice() {
        [flag, path] if flag == "--connect" => Some((path.as_str(), false)),
        [flag, path, mcp] if flag == "--connect" && mcp == "--mcp" => Some((path.as_str(), true)),
        [] => None,
        [flag] if flag == "--mcp" => None,
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid helper arguments",
            ))
        }
    };
    let Some((socket_path, is_mcp)) = connected else {
        return app::launch();
    };
    let (input, output) = app::connect(std::path::Path::new(socket_path))?;
    // Headless helpers must initialize the WindowServer connection on the main thread.
    let _ = CGDisplay::main();
    let mut runtime = runtime::Runtime::default();
    if is_mcp {
        return mcp::run(&mut runtime, io::BufReader::new(input), output);
    }
    let mut output = output;
    for line in io::BufReader::new(input).lines() {
        let line = line?;
        if line.len() > 1_000_000 {
            write_response(
                &mut output,
                "unknown",
                Err(AppError::new("REQUEST_TOO_LARGE", "request exceeds 1 MB")),
            )?;
            continue;
        }
        let request: Request = match serde_json::from_str(&line) {
            Ok(request) => request,
            Err(error) => {
                write_response(
                    &mut output,
                    "unknown",
                    Err(AppError::new("INVALID_REQUEST", error.to_string())),
                )?;
                continue;
            }
        };
        let result = match request.method.as_str() {
            "ping" => Ok(json!({ "protocolVersion": 1 })),
            "get_permissions" => permissions::get_permissions(),
            "list_apps" => runtime.list_apps(),
            "observe" => runtime.observe(request.params),
            "request_permission" => permissions::request_permission(request.params),
            "act" => runtime.act(request.params),
            _ => Err(AppError::new("METHOD_NOT_FOUND", "unknown method")),
        };
        write_response(&mut output, &request.id, result)?;
    }
    Ok(())
}
