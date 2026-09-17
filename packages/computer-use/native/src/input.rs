use crate::accessibility::window_matches_frame;
use crate::protocol::{Action, AppError, Frame, KeyModifier, MouseButton, Point};
use axuielement::prelude::*;
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventType, CGMouseButton, EventField, KeyCode, ScrollEventUnit,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use core_graphics::geometry::CGPoint;
use std::thread;
use std::time::Duration;

const AX_PRESS: &str = "AXPress";
const AX_ROLE: &str = "AXRole";
const AX_SECURE_TEXT_FIELD: &str = "AXSecureTextField";
const AX_VALUE: &str = "AXValue";

fn reject_secure_field(element: &AXUIElement) -> Result<(), AppError> {
    if element
        .string_attribute(AX_ROLE)
        .ok()
        .flatten()
        .is_some_and(|role| role == AX_SECURE_TEXT_FIELD)
    {
        return Err(AppError::new(
            "SECURE_INPUT_PROTECTED",
            "computer use cannot enter or change passwords",
        ));
    }
    Ok(())
}

fn reject_focused_secure_field(pid: i32) -> Result<(), AppError> {
    let focused = AXUIElement::from_pid(pid)
        .ok_or_else(|| AppError::new("ACTION_FAILED", "target accessibility element unavailable"))?
        .element_attribute("AXFocusedUIElement")
        .map_err(|error| AppError::new("ACTION_FAILED", error.to_string()))?;
    let element = focused.ok_or_else(|| {
        AppError::new(
            "ACTION_FAILED",
            "cannot verify the target app's focused input",
        )
    })?;
    reject_secure_field(&element)
}

pub(crate) fn perform_action(
    elements: &[AXUIElement],
    frame: Option<Frame>,
    pid: i32,
    window_id: Option<u32>,
    action: &Action,
) -> Result<(), AppError> {
    match action {
        Action::Press { element_id } => elements
            .get(*element_id)
            .ok_or_else(|| AppError::new("ELEMENT_NOT_FOUND", "elementId is outside the tree"))?
            .perform_action(AX_PRESS)
            .map_err(|error| AppError::new("ACTION_FAILED", error.to_string())),
        Action::PerformAction { element_id, action } => {
            let element = elements.get(*element_id).ok_or_else(|| {
                AppError::new("ELEMENT_NOT_FOUND", "elementId is outside the tree")
            })?;
            let actions = element
                .action_names()
                .map_err(|error| AppError::new("ACTION_FAILED", error.to_string()))?;
            if !actions.iter().any(|candidate| candidate == action) {
                return Err(AppError::new(
                    "ACTION_UNSUPPORTED",
                    "action is not exposed by the accessibility element",
                ));
            }
            element
                .perform_action(action)
                .map_err(|error| AppError::new("ACTION_FAILED", error.to_string()))
        }
        Action::SetValue { element_id, value } => {
            let element = elements.get(*element_id).ok_or_else(|| {
                AppError::new("ELEMENT_NOT_FOUND", "elementId is outside the tree")
            })?;
            reject_secure_field(element)?;
            if !element
                .is_attribute_settable(AX_VALUE)
                .map_err(|error| AppError::new("ACTION_FAILED", error.to_string()))?
            {
                return Err(AppError::new(
                    "ACTION_UNSUPPORTED",
                    "AXValue is not settable",
                ));
            }
            element
                .set_string_attribute(AX_VALUE, value)
                .map_err(|error| AppError::new("ACTION_FAILED", error.to_string()))
        }
        Action::Click { button, point } => {
            verify_point(frame, *point)?;
            verify_target_input_window(pid, frame)?;
            click(pid, window_id, *point, button)
        }
        Action::Drag {
            duration_ms,
            from,
            to,
        } => {
            verify_point(frame, *from)?;
            verify_point(frame, *to)?;
            verify_target_input_window(pid, frame)?;
            drag(pid, window_id, *from, *to, (*duration_ms).min(5_000))
        }
        Action::PressKey { key, modifiers } => {
            verify_target_input_window(pid, frame)?;
            reject_focused_secure_field(pid)?;
            press_key(pid, key, modifiers)
        }
        Action::Scroll {
            delta_x,
            delta_y,
            point,
        } => {
            verify_point(frame, *point)?;
            verify_target_input_window(pid, frame)?;
            scroll(pid, window_id, *point, *delta_x, *delta_y)
        }
        Action::TypeText { text } => {
            verify_target_input_window(pid, frame)?;
            reject_focused_secure_field(pid)?;
            type_text(pid, text)
        }
    }
}

fn verify_target_input_window(pid: i32, frame: Option<Frame>) -> Result<(), AppError> {
    let frame = frame
        .ok_or_else(|| AppError::new("SCREENSHOT_REQUIRED", "observe the target window first"))?;
    let app = AXUIElement::from_pid(pid)
        .ok_or_else(|| AppError::new("TARGET_CHANGED", "target application exited"))?;
    let window = app
        .element_attribute("AXFocusedWindow")
        .map_err(|error| AppError::new("TARGET_CHANGED", error.to_string()))?
        .ok_or_else(|| AppError::new("TARGET_CHANGED", "target app has no focused window"))?;
    if !window_matches_frame(&window, frame) {
        return Err(AppError::new(
            "TARGET_CHANGED",
            "target app focused window no longer matches the observation",
        ));
    }
    Ok(())
}

fn verify_point(frame: Option<Frame>, point: Point) -> Result<(), AppError> {
    if !point.x.is_finite() || !point.y.is_finite() {
        return Err(AppError::new("INVALID_REQUEST", "point must be finite"));
    }
    let frame = frame.ok_or_else(|| {
        AppError::new(
            "SCREENSHOT_REQUIRED",
            "observe with a screenshot before coordinate actions",
        )
    })?;
    if point.x < frame.x
        || point.y < frame.y
        || point.x > frame.x + frame.width
        || point.y > frame.y + frame.height
    {
        return Err(AppError::new(
            "POINT_OUTSIDE_TARGET",
            "coordinate is outside the observed window",
        ));
    }
    Ok(())
}

fn event_source() -> Result<CGEventSource, AppError> {
    CGEventSource::new(CGEventSourceStateID::Private)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create event source"))
}

fn mouse_event(
    pid: i32,
    window_id: Option<u32>,
    kind: CGEventType,
    point: Point,
    button: CGMouseButton,
) -> Result<(), AppError> {
    let event = CGEvent::new_mouse_event(
        event_source()?,
        kind,
        CGPoint::new(point.x, point.y),
        button,
    )
    .map_err(|_| AppError::new("ACTION_FAILED", "cannot create mouse event"))?;
    if let Some(window_id) = window_id {
        event.set_integer_value_field(
            EventField::MOUSE_EVENT_WINDOW_UNDER_MOUSE_POINTER,
            i64::from(window_id),
        );
        event.set_integer_value_field(
            EventField::MOUSE_EVENT_WINDOW_UNDER_MOUSE_POINTER_THAT_CAN_HANDLE_THIS_EVENT,
            i64::from(window_id),
        );
    }
    event.post_to_pid(pid);
    Ok(())
}

fn click(
    pid: i32,
    window_id: Option<u32>,
    point: Point,
    button: &MouseButton,
) -> Result<(), AppError> {
    let (button, down, up) = match button {
        MouseButton::Left => (
            CGMouseButton::Left,
            CGEventType::LeftMouseDown,
            CGEventType::LeftMouseUp,
        ),
        MouseButton::Right => (
            CGMouseButton::Right,
            CGEventType::RightMouseDown,
            CGEventType::RightMouseUp,
        ),
    };
    mouse_event(pid, window_id, down, point, button)?;
    mouse_event(pid, window_id, up, point, button)
}

fn drag(
    pid: i32,
    window_id: Option<u32>,
    from: Point,
    to: Point,
    duration_ms: u64,
) -> Result<(), AppError> {
    mouse_event(
        pid,
        window_id,
        CGEventType::LeftMouseDown,
        from,
        CGMouseButton::Left,
    )?;
    let steps = (duration_ms / 16).clamp(1, 120);
    for step in 1..=steps {
        let progress = step as f64 / steps as f64;
        let point = Point {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
        };
        mouse_event(
            pid,
            window_id,
            CGEventType::LeftMouseDragged,
            point,
            CGMouseButton::Left,
        )?;
        if duration_ms > 0 {
            thread::sleep(Duration::from_millis(duration_ms / steps));
        }
    }
    mouse_event(
        pid,
        window_id,
        CGEventType::LeftMouseUp,
        to,
        CGMouseButton::Left,
    )
}

fn scroll(
    pid: i32,
    window_id: Option<u32>,
    point: Point,
    delta_x: i32,
    delta_y: i32,
) -> Result<(), AppError> {
    mouse_event(
        pid,
        window_id,
        CGEventType::MouseMoved,
        point,
        CGMouseButton::Left,
    )?;
    let event = CGEvent::new_scroll_event(
        event_source()?,
        ScrollEventUnit::PIXEL,
        2,
        delta_y,
        delta_x,
        0,
    )
    .map_err(|_| AppError::new("ACTION_FAILED", "cannot create scroll event"))?;
    event.set_location(CGPoint::new(point.x, point.y));
    event.post_to_pid(pid);
    Ok(())
}

fn type_text(pid: i32, text: &str) -> Result<(), AppError> {
    let down = CGEvent::new_keyboard_event(event_source()?, 0, true)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create keyboard event"))?;
    down.set_string(text);
    down.post_to_pid(pid);
    let up = CGEvent::new_keyboard_event(event_source()?, 0, false)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create keyboard event"))?;
    up.post_to_pid(pid);
    Ok(())
}

fn press_key(pid: i32, key: &str, modifiers: &[KeyModifier]) -> Result<(), AppError> {
    let keycode = keycode(key).ok_or_else(|| {
        AppError::new(
            "KEY_UNSUPPORTED",
            "key must be a letter, digit, or supported named key",
        )
    })?;
    let flags = modifiers
        .iter()
        .fold(CGEventFlags::CGEventFlagNull, |flags, modifier| {
            flags
                | match modifier {
                    KeyModifier::Command => CGEventFlags::CGEventFlagCommand,
                    KeyModifier::Control => CGEventFlags::CGEventFlagControl,
                    KeyModifier::Option => CGEventFlags::CGEventFlagAlternate,
                    KeyModifier::Shift => CGEventFlags::CGEventFlagShift,
                }
        });
    for down in [true, false] {
        let event = CGEvent::new_keyboard_event(event_source()?, keycode, down)
            .map_err(|_| AppError::new("ACTION_FAILED", "cannot create keyboard event"))?;
        event.set_flags(flags);
        event.post_to_pid(pid);
    }
    Ok(())
}

fn keycode(key: &str) -> Option<u16> {
    let key = key.to_ascii_lowercase();
    Some(match key.as_str() {
        "a" => KeyCode::ANSI_A,
        "b" => KeyCode::ANSI_B,
        "c" => KeyCode::ANSI_C,
        "d" => KeyCode::ANSI_D,
        "e" => KeyCode::ANSI_E,
        "f" => KeyCode::ANSI_F,
        "g" => KeyCode::ANSI_G,
        "h" => KeyCode::ANSI_H,
        "i" => KeyCode::ANSI_I,
        "j" => KeyCode::ANSI_J,
        "k" => KeyCode::ANSI_K,
        "l" => KeyCode::ANSI_L,
        "m" => KeyCode::ANSI_M,
        "n" => KeyCode::ANSI_N,
        "o" => KeyCode::ANSI_O,
        "p" => KeyCode::ANSI_P,
        "q" => KeyCode::ANSI_Q,
        "r" => KeyCode::ANSI_R,
        "s" => KeyCode::ANSI_S,
        "t" => KeyCode::ANSI_T,
        "u" => KeyCode::ANSI_U,
        "v" => KeyCode::ANSI_V,
        "w" => KeyCode::ANSI_W,
        "x" => KeyCode::ANSI_X,
        "y" => KeyCode::ANSI_Y,
        "z" => KeyCode::ANSI_Z,
        "0" => KeyCode::ANSI_0,
        "1" => KeyCode::ANSI_1,
        "2" => KeyCode::ANSI_2,
        "3" => KeyCode::ANSI_3,
        "4" => KeyCode::ANSI_4,
        "5" => KeyCode::ANSI_5,
        "6" => KeyCode::ANSI_6,
        "7" => KeyCode::ANSI_7,
        "8" => KeyCode::ANSI_8,
        "9" => KeyCode::ANSI_9,
        "backspace" | "delete" => KeyCode::DELETE,
        "down" | "arrowdown" => KeyCode::DOWN_ARROW,
        "end" => KeyCode::END,
        "enter" | "return" => KeyCode::RETURN,
        "escape" | "esc" => KeyCode::ESCAPE,
        "forwarddelete" => KeyCode::FORWARD_DELETE,
        "home" => KeyCode::HOME,
        "left" | "arrowleft" => KeyCode::LEFT_ARROW,
        "pagedown" => KeyCode::PAGE_DOWN,
        "pageup" => KeyCode::PAGE_UP,
        "right" | "arrowright" => KeyCode::RIGHT_ARROW,
        "space" => KeyCode::SPACE,
        "tab" => KeyCode::TAB,
        "up" | "arrowup" => KeyCode::UP_ARROW,
        _ => return None,
    })
}
