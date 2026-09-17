use crate::protocol::{AppError, Frame};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use core_graphics::window::{
    create_window_list, kCGNullWindowID, kCGWindowListExcludeDesktopElements,
    kCGWindowListOptionOnScreenOnly,
};
use objc2_app_kit::{NSRunningApplication, NSWorkspace};
use objc2_foundation::{NSDate, NSDefaultRunLoopMode, NSRunLoop};
use screencapturekit::prelude::*;
use screencapturekit::screenshot_manager::{CGImageExt, SCScreenshotManager};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Application {
    pub(crate) bundle_id: String,
    pub(crate) is_running: bool,
    pub(crate) name: String,
    pub(crate) pid: i32,
}

pub(crate) struct Screenshot {
    pub(crate) application_name: String,
    pub(crate) bundle_id: String,
    pub(crate) data: String,
    pub(crate) frame: Frame,
    pub(crate) pid: i32,
    pub(crate) window_id: u32,
    pub(crate) window_title: String,
}

pub(crate) fn list_apps() -> Result<Vec<Application>, AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let mut applications = content
        .applications()
        .into_iter()
        .filter_map(|application| {
            let name = application.application_name();
            let bundle_id = application.bundle_identifier();
            if name.trim().is_empty() || bundle_id.trim().is_empty() {
                return None;
            }
            Some(Application {
                bundle_id,
                is_running: true,
                name,
                pid: application.process_id(),
            })
        })
        .collect::<Vec<_>>();
    applications.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(applications)
}

pub(crate) fn resolve_app(target: &str) -> Result<Application, AppError> {
    let target = target.trim();
    if target.is_empty() || target.len() > 500 {
        return Err(AppError::new("INVALID_REQUEST", "invalid app target"));
    }
    let running = list_apps()?
        .into_iter()
        .find(|application| matches_app(application, target));
    if let Some(application) = running {
        if let Some(app) =
            NSRunningApplication::runningApplicationWithProcessIdentifier(application.pid)
        {
            if app.isHidden() && !app.unhide() {
                return Err(AppError::new(
                    "APP_NOT_FOUND",
                    "target app could not be shown in the background",
                ));
            }
        }
        return Ok(application);
    }
    {
        let mut command = Command::new("/usr/bin/open");
        command.arg("-g");
        if target.ends_with(".app") {
            command.arg("--").arg(target);
        } else if target.contains('.') && !target.contains(char::is_whitespace) {
            command.args(["-b", target]);
        } else {
            command.args(["-a", target]);
        }
        let status = command
            .status()
            .map_err(|error| AppError::new("APP_LAUNCH_FAILED", error.to_string()))?;
        if !status.success() {
            return Err(AppError::new(
                "APP_NOT_FOUND",
                format!("cannot open app: {target}"),
            ));
        }
    }

    for _ in 0..50 {
        if let Some(application) = list_apps()?
            .into_iter()
            .find(|app| matches_app(app, target))
        {
            return Ok(application);
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(AppError::new(
        "APP_NOT_FOUND",
        format!("app did not start: {target}"),
    ))
}

pub(crate) fn frontmost_application() -> Result<Application, AppError> {
    // NSWorkspace updates dynamic app state on the main run loop, not during sleep.
    let until = NSDate::dateWithTimeIntervalSinceNow(0.01);
    NSRunLoop::currentRunLoop().runMode_beforeDate(unsafe { NSDefaultRunLoopMode }, &until);
    let application = NSWorkspace::sharedWorkspace()
        .frontmostApplication()
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "no active application"))?;
    let bundle_id = application
        .bundleIdentifier()
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "active app has no bundle ID"))?;
    Ok(Application {
        bundle_id,
        is_running: true,
        name: application
            .localizedName()
            .map(|value| value.to_string())
            .unwrap_or_default(),
        pid: application.processIdentifier(),
    })
}

fn matches_app(application: &Application, target: &str) -> bool {
    matches_app_target(&application.bundle_id, &application.name, target)
}

pub(crate) fn matches_app_target(bundle_id: &str, name: &str, target: &str) -> bool {
    let path_name = target
        .ends_with(".app")
        .then(|| {
            Path::new(target)
                .file_stem()
                .and_then(|value| value.to_str())
        })
        .flatten();
    bundle_id.eq_ignore_ascii_case(target)
        || name.eq_ignore_ascii_case(target)
        || path_name.is_some_and(|path_name| name.eq_ignore_ascii_case(path_name))
}

pub(crate) fn capture_window(pid: i32) -> Result<Screenshot, AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let window = top_window(&content, pid)?;
    let application = window
        .owning_application()
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "window has no owning application"))?;
    let frame = window.frame();
    let point_width = frame.size.width.max(1.0);
    let point_height = frame.size.height.max(1.0);
    let scale = (1920.0 / point_width)
        .min(1200.0 / point_height)
        .min(1.0)
        .max(0.25);
    let width = (point_width * scale).round() as u32;
    let height = (point_height * scale).round() as u32;
    let filter = SCContentFilter::create().with_window(&window).build();
    let config = SCStreamConfiguration::new()
        .with_width(width)
        .with_height(height)
        .with_shows_cursor(false);
    let image = SCScreenshotManager::capture_image(&filter, &config)
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let mut rgba = image
        .bgra_data()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    for pixel in rgba.chunks_exact_mut(4) {
        pixel.swap(0, 2);
    }
    let mut png = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|error| AppError::new("ENCODE_FAILED", error.to_string()))?;
        writer
            .write_image_data(&rgba)
            .map_err(|error| AppError::new("ENCODE_FAILED", error.to_string()))?;
    }
    Ok(Screenshot {
        application_name: application.application_name(),
        bundle_id: application.bundle_identifier(),
        data: BASE64.encode(png),
        frame: Frame {
            x: frame.origin.x,
            y: frame.origin.y,
            width: point_width,
            height: point_height,
            scale,
        },
        pid: application.process_id(),
        window_id: window.window_id(),
        window_title: window.title().unwrap_or_default(),
    })
}

pub(crate) fn verify_window_frame(
    pid: i32,
    window_id: u32,
    expected: Frame,
) -> Result<(), AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    if top_window(&content, pid)?.window_id() != window_id {
        return Err(AppError::new(
            "TARGET_CHANGED",
            "target app window changed after observation",
        ));
    }
    let current = content
        .windows()
        .into_iter()
        .find(|window| window.window_id() == window_id && is_user_window(window))
        .ok_or_else(|| AppError::new("TARGET_CHANGED", "observed window is no longer visible"))?
        .frame();
    let changed = (current.origin.x - expected.x).abs() > 2.0
        || (current.origin.y - expected.y).abs() > 2.0
        || (current.size.width - expected.width).abs() > 2.0
        || (current.size.height - expected.height).abs() > 2.0;
    if changed {
        return Err(AppError::new(
            "TARGET_CHANGED",
            "observed window moved, resized, or changed before action",
        ));
    }
    Ok(())
}

fn top_window(content: &SCShareableContent, pid: i32) -> Result<SCWindow, AppError> {
    let window_ids = create_window_list(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID,
    )
    .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "cannot read window order"))?;
    let z_order = window_ids
        .iter()
        .enumerate()
        .map(|(index, window_id)| (*window_id, index))
        .collect::<HashMap<_, _>>();

    content
        .windows()
        .into_iter()
        .filter(|window| {
            is_user_window(window)
                && window
                    .owning_application()
                    .is_some_and(|application| application.process_id() == pid)
        })
        .min_by_key(|window| {
            z_order
                .get(&window.window_id())
                .copied()
                .unwrap_or(usize::MAX)
        })
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "no visible user window"))
}

fn is_user_window(window: &SCWindow) -> bool {
    if !window.is_on_screen() || window.window_layer() != 0 {
        return false;
    }
    let frame = window.frame();
    if frame.size.width < 2.0 || frame.size.height < 2.0 {
        return false;
    }
    window.owning_application().is_some_and(|application| {
        application.process_id() > 0
            && !application.application_name().trim().is_empty()
            && !application.bundle_identifier().trim().is_empty()
    })
}
