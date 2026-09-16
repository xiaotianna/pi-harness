use crate::protocol::{AppError, PermissionKind, RequestPermissionParams};
use axuielement::prelude::{is_process_trusted, is_process_trusted_with_prompt};
use core_graphics::access::ScreenCaptureAccess;
use serde_json::{json, Value};

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
    let _ = match params.permission {
        PermissionKind::Accessibility => is_process_trusted_with_prompt(),
        PermissionKind::ScreenRecording => ScreenCaptureAccess.request(),
    };
    get_permissions()
}
