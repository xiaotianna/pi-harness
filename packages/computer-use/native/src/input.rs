use crate::protocol::{Action, AppError, Frame, KeyModifier, MouseButton, Point};
use axuielement::prelude::*;
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTapLocation, CGEventType, CGMouseButton, KeyCode, ScrollEventUnit,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use core_graphics::geometry::CGPoint;
use std::thread;
use std::time::Duration;

const AX_PRESS: &str = "AXPress";
const AX_VALUE: &str = "AXValue";

pub(crate) fn perform_action(
    elements: &[AXUIElement],
    frame: Option<Frame>,
    action: &Action,
) -> Result<(), AppError> {
    match action {
        Action::Press { element_id } => elements
            .get(*element_id)
            .ok_or_else(|| AppError::new("ELEMENT_NOT_FOUND", "elementId is outside the tree"))?
            .perform_action(AX_PRESS)
            .map_err(|error| AppError::new("ACTION_FAILED", error.to_string())),
        Action::SetValue { element_id, value } => {
            let element = elements.get(*element_id).ok_or_else(|| {
                AppError::new("ELEMENT_NOT_FOUND", "elementId is outside the tree")
            })?;
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
            click(*point, button)
        }
        Action::Drag {
            duration_ms,
            from,
            to,
        } => {
            verify_point(frame, *from)?;
            verify_point(frame, *to)?;
            drag(*from, *to, (*duration_ms).min(5_000))
        }
        Action::PressKey { key, modifiers } => press_key(key, modifiers),
        Action::Scroll {
            delta_x,
            delta_y,
            point,
        } => {
            verify_point(frame, *point)?;
            scroll(*point, *delta_x, *delta_y)
        }
        Action::TypeText { text } => type_text(text),
    }
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
    CGEventSource::new(CGEventSourceStateID::HIDSystemState)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create event source"))
}

fn mouse_event(kind: CGEventType, point: Point, button: CGMouseButton) -> Result<(), AppError> {
    CGEvent::new_mouse_event(
        event_source()?,
        kind,
        CGPoint::new(point.x, point.y),
        button,
    )
    .map_err(|_| AppError::new("ACTION_FAILED", "cannot create mouse event"))?
    .post(CGEventTapLocation::HID);
    Ok(())
}

fn click(point: Point, button: &MouseButton) -> Result<(), AppError> {
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
    mouse_event(down, point, button)?;
    mouse_event(up, point, button)
}

fn drag(from: Point, to: Point, duration_ms: u64) -> Result<(), AppError> {
    mouse_event(CGEventType::LeftMouseDown, from, CGMouseButton::Left)?;
    let steps = (duration_ms / 16).clamp(1, 120);
    for step in 1..=steps {
        let progress = step as f64 / steps as f64;
        let point = Point {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
        };
        mouse_event(CGEventType::LeftMouseDragged, point, CGMouseButton::Left)?;
        if duration_ms > 0 {
            thread::sleep(Duration::from_millis(duration_ms / steps));
        }
    }
    mouse_event(CGEventType::LeftMouseUp, to, CGMouseButton::Left)
}

fn scroll(point: Point, delta_x: i32, delta_y: i32) -> Result<(), AppError> {
    mouse_event(CGEventType::MouseMoved, point, CGMouseButton::Left)?;
    CGEvent::new_scroll_event(
        event_source()?,
        ScrollEventUnit::PIXEL,
        2,
        delta_y,
        delta_x,
        0,
    )
    .map_err(|_| AppError::new("ACTION_FAILED", "cannot create scroll event"))?
    .post(CGEventTapLocation::HID);
    Ok(())
}

fn type_text(text: &str) -> Result<(), AppError> {
    let down = CGEvent::new_keyboard_event(event_source()?, 0, true)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create keyboard event"))?;
    down.set_string(text);
    down.post(CGEventTapLocation::HID);
    let up = CGEvent::new_keyboard_event(event_source()?, 0, false)
        .map_err(|_| AppError::new("ACTION_FAILED", "cannot create keyboard event"))?;
    up.post(CGEventTapLocation::HID);
    Ok(())
}

fn press_key(key: &str, modifiers: &[KeyModifier]) -> Result<(), AppError> {
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
        event.post(CGEventTapLocation::HID);
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
