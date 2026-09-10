use crate::protocol::AppError;
use axuielement::prelude::*;

const AX_DESCRIPTION: &str = "AXDescription";
const AX_ENABLED: &str = "AXEnabled";
const AX_FOCUSED_WINDOW: &str = "AXFocusedWindow";
const AX_IDENTIFIER: &str = "AXIdentifier";
const AX_POSITION: &str = "AXPosition";
const AX_ROLE: &str = "AXRole";
const AX_SECURE_TEXT_FIELD: &str = "AXSecureTextField";
const AX_SIZE: &str = "AXSize";
const AX_SUBROLE: &str = "AXSubrole";
const AX_TITLE: &str = "AXTitle";
const AX_VALUE: &str = "AXValue";
const AX_VALUE_DESCRIPTION: &str = "AXValueDescription";
const MAX_TREE_CHARS: usize = 200_000;

pub(crate) struct AccessibilitySnapshot {
    pub(crate) elements: Vec<AXUIElement>,
    pub(crate) fallback_name: String,
    pub(crate) tree: String,
    pub(crate) truncated: bool,
}

pub(crate) fn observe_accessibility(
    pid: i32,
    max_depth: usize,
    max_nodes: usize,
) -> Result<AccessibilitySnapshot, AppError> {
    if !is_process_trusted() {
        return Err(AppError::new(
            "ACCESSIBILITY_PERMISSION_REQUIRED",
            "grant Accessibility permission to the helper in System Settings",
        ));
    }

    let app = AXUIElement::from_pid(pid).ok_or_else(|| {
        AppError::new(
            "ACCESSIBILITY_UNAVAILABLE",
            "focused application AX element is unavailable",
        )
    })?;
    app.set_timeout(2.0)
        .map_err(|error| ax_read_error("set accessibility timeout", error))?;
    let (root, used_application_root) = match app.element_attribute(AX_FOCUSED_WINDOW) {
        Ok(Some(window)) => (window, false),
        Ok(None)
        | Err(AXError::CannotComplete)
        | Err(AXError::AttributeUnsupported(_))
        | Err(AXError::NoValue) => (app, true),
        Err(error) => return Err(ax_read_error("read focused window", error)),
    };

    let mut elements = Vec::new();
    let mut tree = String::new();
    let mut truncated = used_application_root;
    collect_tree(
        root,
        0,
        max_depth,
        max_nodes,
        &mut elements,
        &mut tree,
        &mut truncated,
    );
    let fallback_name = read_string(elements.first(), AX_TITLE).unwrap_or_default();

    Ok(AccessibilitySnapshot {
        elements,
        fallback_name,
        tree,
        truncated,
    })
}

fn collect_tree(
    element: AXUIElement,
    depth: usize,
    max_depth: usize,
    max_nodes: usize,
    elements: &mut Vec<AXUIElement>,
    output: &mut String,
    truncated: &mut bool,
) {
    if elements.len() >= max_nodes || output.len() >= MAX_TREE_CHARS {
        *truncated = true;
        return;
    }
    let children = if depth < max_depth {
        match element.children() {
            Ok(children) => children,
            Err(_) => {
                *truncated = true;
                Vec::new()
            }
        }
    } else {
        if element.attribute_value_count("AXChildren").unwrap_or(0) > 0 {
            *truncated = true;
        }
        Vec::new()
    };
    let id = elements.len();
    let line = describe_element(&element, id, depth);
    if output.len() + line.len() > MAX_TREE_CHARS {
        *truncated = true;
        return;
    }
    output.push_str(&line);
    elements.push(element);
    for child in children {
        collect_tree(
            child,
            depth + 1,
            max_depth,
            max_nodes,
            elements,
            output,
            truncated,
        );
        if elements.len() >= max_nodes || output.len() >= MAX_TREE_CHARS {
            *truncated = true;
            break;
        }
    }
}

fn ax_read_error(stage: &str, error: AXError) -> AppError {
    AppError::new(
        "AX_READ_FAILED",
        format!("{stage}: {error} ({})", error.raw_code()),
    )
}

fn describe_element(element: &AXUIElement, id: usize, depth: usize) -> String {
    let raw_role = element
        .string_attribute(AX_ROLE)
        .ok()
        .flatten()
        .unwrap_or_else(|| "AXUnknown".into());
    let role = readable_role(&raw_role);
    let title = element.string_attribute(AX_TITLE).ok().flatten();
    let description = element.string_attribute(AX_DESCRIPTION).ok().flatten();
    let value = if raw_role == AX_SECURE_TEXT_FIELD {
        None
    } else {
        element
            .string_attribute(AX_VALUE_DESCRIPTION)
            .ok()
            .flatten()
            .or_else(|| element.string_attribute(AX_VALUE).ok().flatten())
    };
    let name = title
        .filter(|value| !value.is_empty())
        .or_else(|| description.filter(|value| !value.is_empty()))
        .or_else(|| value.filter(|value| !value.is_empty()));
    let enabled = element.bool_attribute(AX_ENABLED).ok().flatten();
    let identifier = element.string_attribute(AX_IDENTIFIER).ok().flatten();
    let subrole = element.string_attribute(AX_SUBROLE).ok().flatten();
    let position = element.point_attribute(AX_POSITION).ok().flatten();
    let size = element.size_attribute(AX_SIZE).ok().flatten();

    let mut line = format!("{}{} {}", "  ".repeat(depth), id, role);
    if let Some(name) = name {
        line.push_str(&format!(" \"{}\"", escape_text(&name)));
    }
    if let Some(identifier) = identifier.filter(|value| !value.is_empty()) {
        line.push_str(&format!(" id=\"{}\"", escape_text(&identifier)));
    }
    if let Some(subrole) = subrole.filter(|value| !value.is_empty()) {
        line.push_str(&format!(" subrole={}", readable_role(&subrole)));
    }
    if enabled == Some(false) {
        line.push_str(" disabled");
    }
    if let (Some(position), Some(size)) = (position, size) {
        line.push_str(&format!(
            " [x={:.0} y={:.0} width={:.0} height={:.0}]",
            position.x, position.y, size.width, size.height
        ));
    }
    line.push('\n');
    line
}

fn read_string(element: Option<&AXUIElement>, attribute: &str) -> Option<String> {
    element?.string_attribute(attribute).ok().flatten()
}

fn escape_text(value: &str) -> String {
    value
        .chars()
        .take(500)
        .flat_map(|character| character.escape_default())
        .collect()
}

fn readable_role(value: &str) -> String {
    match value {
        "AXApplication" => "application".into(),
        "AXButton" => "button".into(),
        "AXCheckBox" => "checkbox".into(),
        "AXComboBox" => "combobox".into(),
        "AXGroup" => "group".into(),
        "AXImage" => "image".into(),
        "AXLink" => "link".into(),
        "AXList" => "list".into(),
        "AXMenu" => "menu".into(),
        "AXMenuItem" => "menu-item".into(),
        "AXRadioButton" => "radio-button".into(),
        "AXScrollArea" => "scroll-area".into(),
        "AXSecureTextField" => "secure-text-field".into(),
        "AXSlider" => "slider".into(),
        "AXStaticText" => "text".into(),
        "AXTabGroup" => "tab-group".into(),
        "AXTextArea" => "text-area".into(),
        "AXTextField" => "text-field".into(),
        "AXToolbar" => "toolbar".into(),
        "AXWindow" => "window".into(),
        other => other
            .strip_prefix("AX")
            .unwrap_or(other)
            .to_ascii_lowercase(),
    }
}
