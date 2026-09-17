use crate::protocol::{Action, AppError, Frame, Point};
use axuielement::prelude::*;
use serde_json::json;
use std::io::Write;
use std::process::{Child, ChildStdin, Command, Stdio};

pub(crate) struct Overlay {
    child: Child,
    input: ChildStdin,
}

impl Overlay {
    pub(crate) fn start() -> Result<Self, AppError> {
        let executable = std::env::current_exe().map_err(overlay_error)?;
        let path = executable
            .parent()
            .ok_or_else(|| AppError::new("OVERLAY_UNAVAILABLE", "invalid helper location"))?
            .join("../Helpers/pi-computer-use-overlay");
        let mut child = Command::new(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(overlay_error)?;
        let input = child.stdin.take().ok_or_else(|| {
            AppError::new("OVERLAY_UNAVAILABLE", "AI cursor overlay has no input")
        })?;
        Ok(Self { child, input })
    }

    pub(crate) fn show(&mut self, frame: Frame, point: Option<Point>) -> Result<(), AppError> {
        if self.child.try_wait().map_err(overlay_error)?.is_some() {
            return Err(AppError::new(
                "OVERLAY_UNAVAILABLE",
                "AI cursor overlay exited",
            ));
        }
        serde_json::to_writer(&mut self.input, &json!({ "frame": frame, "point": point.map(|point| json!({ "x": point.x, "y": point.y })) }))
            .map_err(overlay_error)?;
        self.input.write_all(b"\n").map_err(overlay_error)?;
        self.input.flush().map_err(overlay_error)
    }
}

impl Drop for Overlay {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

pub(crate) fn action_point(action: &Action, elements: &[AXUIElement]) -> Option<Point> {
    match action {
        Action::Click { point, .. } | Action::Scroll { point, .. } => Some(*point),
        Action::Drag { to, .. } => Some(*to),
        Action::Press { element_id }
        | Action::PerformAction { element_id, .. }
        | Action::SetValue { element_id, .. } => {
            let element = elements.get(*element_id)?;
            let position = element.point_attribute("AXPosition").ok()??;
            let size = element.size_attribute("AXSize").ok()??;
            Some(Point {
                x: position.x + size.width / 2.0,
                y: position.y + size.height / 2.0,
            })
        }
        Action::PressKey { .. } | Action::TypeText { .. } => None,
    }
}

fn overlay_error(error: impl std::fmt::Display) -> AppError {
    AppError::new("OVERLAY_UNAVAILABLE", format!("AI cursor overlay: {error}"))
}
