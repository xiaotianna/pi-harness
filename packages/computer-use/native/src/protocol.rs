use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Deserialize)]
pub(crate) struct Request {
    pub(crate) id: String,
    pub(crate) method: String,
    pub(crate) params: Value,
}

#[derive(Debug)]
pub(crate) struct AppError {
    pub(crate) code: &'static str,
    pub(crate) message: String,
}

impl AppError {
    pub(crate) fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ObserveParams {
    pub(crate) include_screenshot: bool,
    pub(crate) max_depth: usize,
    pub(crate) max_nodes: usize,
    pub(crate) scope_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActParams {
    pub(crate) action: Action,
    pub(crate) observation_id: String,
    pub(crate) scope_id: String,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub(crate) enum Action {
    Press {
        #[serde(rename = "elementId")]
        element_id: usize,
    },
    SetValue {
        #[serde(rename = "elementId")]
        element_id: usize,
        value: String,
    },
    Click {
        #[serde(default)]
        button: MouseButton,
        point: Point,
    },
    Drag {
        #[serde(rename = "durationMs", default = "default_drag_duration")]
        duration_ms: u64,
        from: Point,
        to: Point,
    },
    PressKey {
        key: String,
        #[serde(default)]
        modifiers: Vec<KeyModifier>,
    },
    Scroll {
        #[serde(rename = "deltaX")]
        delta_x: i32,
        #[serde(rename = "deltaY")]
        delta_y: i32,
        point: Point,
    },
    TypeText {
        text: String,
    },
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum MouseButton {
    #[default]
    Left,
    Right,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum KeyModifier {
    Command,
    Control,
    Option,
    Shift,
}

#[derive(Clone, Copy, Deserialize)]
pub(crate) struct Point {
    pub(crate) x: f64,
    pub(crate) y: f64,
}

#[derive(Clone, Copy, Serialize)]
pub(crate) struct Frame {
    pub(crate) x: f64,
    pub(crate) y: f64,
    pub(crate) width: f64,
    pub(crate) height: f64,
    pub(crate) scale: f64,
}

fn default_drag_duration() -> u64 {
    300
}
