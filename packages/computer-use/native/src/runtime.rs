use crate::accessibility::{observe_accessibility, AccessibilitySnapshot};
use crate::input::perform_action;
use crate::protocol::{ActParams, Action, AppError, Frame, ObserveParams};
use crate::screenshot::{
    capture_frontmost_window, frontmost_pid, verify_frontmost_pid, verify_window_frame,
};
use axuielement::prelude::*;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const MAX_OBSERVATION_AGE_MS: u128 = 120_000;
const MAX_SCOPES: usize = 128;

struct ScopeState {
    elements: Vec<AXUIElement>,
    frame: Option<Frame>,
    observed_at: u128,
    observation_id: String,
    pid: i32,
    window_id: Option<u32>,
}

#[derive(Default)]
pub(crate) struct Runtime {
    next_observation: u64,
    scopes: HashMap<String, ScopeState>,
}

impl Runtime {
    pub(crate) fn observe(&mut self, params: Value) -> Result<Value, AppError> {
        let params: ObserveParams = serde_json::from_value(params).map_err(invalid_request)?;
        if params.scope_id.is_empty()
            || !(1..=50).contains(&params.max_depth)
            || !(1..=5_000).contains(&params.max_nodes)
        {
            return Err(AppError::new(
                "INVALID_REQUEST",
                "invalid observation limits",
            ));
        }

        let screenshot = if params.include_screenshot {
            Some(capture_frontmost_window()?)
        } else {
            None
        };
        let pid = match screenshot.as_ref() {
            Some(screenshot) => screenshot.pid,
            None => frontmost_pid()?,
        };
        let AccessibilitySnapshot {
            elements,
            fallback_name,
            tree,
            truncated,
        } = observe_accessibility(pid, params.max_depth, params.max_nodes)?;
        self.next_observation += 1;
        let observation_id = format!("obs-{}-{}", std::process::id(), self.next_observation);
        let frame = screenshot.as_ref().map(|value| value.frame);
        let window_id = screenshot.as_ref().map(|value| value.window_id);
        let observed_at = now_ms();
        if !self.scopes.contains_key(&params.scope_id) && self.scopes.len() >= MAX_SCOPES {
            if let Some(oldest) = self
                .scopes
                .iter()
                .min_by_key(|(_, state)| state.observed_at)
                .map(|(scope_id, _)| scope_id.clone())
            {
                self.scopes.remove(&oldest);
            }
        }
        self.scopes.insert(
            params.scope_id,
            ScopeState {
                elements,
                frame,
                observed_at,
                observation_id: observation_id.clone(),
                pid,
                window_id,
            },
        );

        let mut result = json!({
            "accessibilityTree": tree,
            "application": {
                "bundleId": screenshot.as_ref().map(|value| value.bundle_id.as_str()).unwrap_or(""),
                "name": screenshot.as_ref().map(|value| value.application_name.as_str()).unwrap_or(&fallback_name),
                "pid": pid,
            },
            "observedAt": observed_at,
            "observationId": observation_id,
            "truncated": truncated,
        });
        if let Some(screenshot) = screenshot {
            result["screenshot"] = json!({
                "data": screenshot.data,
                "mimeType": "image/png",
                "type": "image",
            });
            result["screenshotFrame"] = serde_json::to_value(screenshot.frame)
                .map_err(|error| AppError::new("ENCODE_FAILED", error.to_string()))?;
            result["windowId"] = json!(screenshot.window_id);
            result["windowTitle"] = json!(screenshot.window_title);
        }
        Ok(result)
    }

    pub(crate) fn act(&mut self, params: Value) -> Result<Value, AppError> {
        let params: ActParams = serde_json::from_value(params).map_err(invalid_request)?;
        validate_action_params(&params)?;
        {
            let state = self
                .scopes
                .get(&params.scope_id)
                .ok_or_else(|| AppError::new("OBSERVATION_EXPIRED", "observe before acting"))?;
            if state.observation_id != params.observation_id {
                return Err(AppError::new(
                    "OBSERVATION_EXPIRED",
                    "observationId is not the latest observation for this scope",
                ));
            }
            if now_ms().saturating_sub(state.observed_at) > MAX_OBSERVATION_AGE_MS {
                return Err(AppError::new(
                    "OBSERVATION_EXPIRED",
                    "observation is older than 120 seconds",
                ));
            }
        }
        // Remove before dispatch so a partially completed native action can never be retried.
        let state = self.scopes.remove(&params.scope_id).ok_or_else(|| {
            AppError::new(
                "OBSERVATION_EXPIRED",
                "observation disappeared before action",
            )
        })?;
        verify_frontmost_pid(state.pid)?;
        if let (Some(frame), Some(window_id)) = (state.frame, state.window_id) {
            verify_window_frame(window_id, frame)?;
        }
        perform_action(&state.elements, state.frame, &params.action)?;
        thread::sleep(Duration::from_millis(75));
        Ok(json!({
            "observationId": params.observation_id,
            "performedAt": now_ms(),
        }))
    }
}

fn validate_action_params(params: &ActParams) -> Result<(), AppError> {
    if params.scope_id.is_empty()
        || params.scope_id.len() > 200
        || params.observation_id.is_empty()
        || params.observation_id.len() > 200
    {
        return Err(AppError::new(
            "INVALID_REQUEST",
            "invalid scope or observation ID",
        ));
    }
    match &params.action {
        Action::SetValue { value, .. } if value.len() > 20_000 => {
            Err(AppError::new("INVALID_REQUEST", "value exceeds 20 KB"))
        }
        Action::TypeText { text } if text.len() > 20_000 => {
            Err(AppError::new("INVALID_REQUEST", "text exceeds 20 KB"))
        }
        Action::PressKey { key, modifiers }
            if key.is_empty() || key.len() > 32 || modifiers.len() > 4 =>
        {
            Err(AppError::new("INVALID_REQUEST", "invalid key action"))
        }
        Action::Scroll {
            delta_x, delta_y, ..
        } if !(-10_000..=10_000).contains(delta_x) || !(-10_000..=10_000).contains(delta_y) => Err(
            AppError::new("INVALID_REQUEST", "scroll delta exceeds limit"),
        ),
        Action::Drag { duration_ms, .. } if *duration_ms > 5_000 => Err(AppError::new(
            "INVALID_REQUEST",
            "drag duration exceeds limit",
        )),
        _ => Ok(()),
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn invalid_request(error: impl std::fmt::Display) -> AppError {
    AppError::new("INVALID_REQUEST", error.to_string())
}
