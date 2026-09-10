use crate::protocol::{AppError, Frame};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use core_graphics::window::{
    create_window_list, kCGNullWindowID, kCGWindowListExcludeDesktopElements,
    kCGWindowListOptionOnScreenOnly,
};
use screencapturekit::prelude::*;
use screencapturekit::screenshot_manager::{CGImageExt, SCScreenshotManager};
use std::collections::HashMap;

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
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let window = frontmost_window(&content)?;
    Ok(window
        .owning_application()
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "window has no owning application"))?
        .process_id())
}

pub(crate) fn capture_frontmost_window() -> Result<Screenshot, AppError> {
    let content = SCShareableContent::get()
        .map_err(|error| AppError::new("SCREEN_CAPTURE_FAILED", error.to_string()))?;
    let window = frontmost_window(&content)?;
    let application = window
        .owning_application()
        .ok_or_else(|| AppError::new("WINDOW_NOT_FOUND", "window has no owning application"))?;
    let frame = window.frame();
    let point_width = frame.size.width.max(1.0);
    let point_height = frame.size.height.max(1.0);
    let scale = (1920.0 / point_width)
        .min(1200.0 / point_height)
        .min(2.0)
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

fn frontmost_window(content: &SCShareableContent) -> Result<SCWindow, AppError> {
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
        .filter(is_user_window)
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
