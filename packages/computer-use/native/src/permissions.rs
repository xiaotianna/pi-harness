use crate::protocol::{AppError, PermissionKind, RequestPermissionParams};
use axuielement::prelude::{is_process_trusted, is_process_trusted_with_prompt};
use core_graphics::access::ScreenCaptureAccess;
use serde_json::{json, Value};
use std::process::Command;

pub(crate) fn get_permissions() -> Result<Value, AppError> {
    Ok(json!({
        "accessibility": is_process_trusted(),
        "screenRecording": ScreenCaptureAccess.preflight(),
        "supported": true,
    }))
}

pub(crate) fn request_permission(params: Value) -> Result<Value, AppError> {
    let params: RequestPermissionParams = serde_json::from_value(params)
        .map_err(|error| AppError::new("INVALID_REQUEST", error.to_string()))?;
    let (granted, settings_url) = match params.permission {
        PermissionKind::Accessibility => (
            is_process_trusted_with_prompt(),
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        ),
        PermissionKind::ScreenRecording => (
            ScreenCaptureAccess.request(),
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
        ),
    };
    if !granted {
        let status = Command::new("/usr/bin/open")
            .arg(settings_url)
            .status()
            .map_err(|error| AppError::new("OPEN_SYSTEM_SETTINGS_FAILED", error.to_string()))?;
        if !status.success() {
            return Err(AppError::new(
                "OPEN_SYSTEM_SETTINGS_FAILED",
                "cannot open macOS privacy settings",
            ));
        }
    }
    get_permissions()
}
