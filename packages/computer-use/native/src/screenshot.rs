use crate::protocol::{AppError, Frame};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use core_graphics::window::{
    create_window_list, kCGNullWindowID, kCGWindowListExcludeDesktopElements,
    kCGWindowListOptionOnScreenOnly,
};
use objc2_app_kit::{NSRunningApplication, NSWorkspace, NSWorkspaceOpenConfiguration};
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

pub(crate) fn frontmost_pid() -> Result<i32, AppError> {
    Ok(frontmost_application()?.pid)
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

pub(crate) fn activate_app(target: &str) -> Result<(), AppError> {
    let target = target.trim();
    if target.is_empty() || target.len() > 500 {
        return Err(AppError::new("INVALID_REQUEST", "invalid app target"));
    }
    if frontmost_application().is_ok_and(|application| matches_app(&application, target)) {
        return Ok(());
    }

    let running = list_apps()?
        .into_iter()
        .find(|application| matches_app(application, target));
    if let Some(application) = &running {
        let app = NSRunningApplication::runningApplicationWithProcessIdentifier(application.pid)
            .ok_or_else(|| AppError::new("APP_NOT_FOUND", "running app exited"))?;
        let url = app
            .bundleURL()
            .ok_or_else(|| AppError::new("APP_NOT_FOUND", "running app has no bundle URL"))?;
        let configuration = NSWorkspaceOpenConfiguration::configuration();
        configuration.setActivates(true);
        configuration.setCreatesNewApplicationInstance(false);
        configuration.setAllowsRunningApplicationSubstitution(true);
        NSWorkspace::sharedWorkspace().openApplicationAtURL_configuration_completionHandler(
            &url,
            &configuration,
            None,
        );
    } else {
        let mut command = Command::new("/usr/bin/open");
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
        if frontmost_application().is_ok_and(|application| {
            running
                .as_ref()
                .is_some_and(|expected| expected.pid == application.pid)
                || matches_app(&application, target)
        }) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(AppError::new(
        "APP_NOT_FOCUSED",
        format!("app did not become active: {target}"),
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

pub(crate) fn capture_frontmost_window() -> Result<Screenshot, AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let window = frontmost_window(&content, frontmost_pid()?)?;
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
        .with_shows_cursor(true);
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

pub(crate) fn verify_frontmost_pid(expected: i32) -> Result<(), AppError> {
    if frontmost_pid()? != expected {
        return Err(AppError::new(
            "TARGET_CHANGED",
            "focused application changed after observation",
        ));
    }
    Ok(())
}

pub(crate) fn verify_window_frame(window_id: u32, expected: Frame) -> Result<(), AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    if frontmost_window(&content, frontmost_pid()?)?.window_id() != window_id {
        return Err(AppError::new(
            "TARGET_CHANGED",
            "focused window changed after observation",
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

fn frontmost_window(content: &SCShareableContent, pid: i32) -> Result<SCWindow, AppError> {
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
