use crate::protocol::AppError;
use crate::runtime::Runtime;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

const SCOPE_ID: &str = "mcp";

pub(crate) fn run(runtime: &mut Runtime) -> io::Result<()> {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.len() > 1_000_000 {
            write_message(&error_response(Value::Null, -32600, "request exceeds 1 MB"))?;
            continue;
        }
        let request: Value = match serde_json::from_str(&line) {
            Ok(request) => request,
            Err(_) => {
                write_message(&error_response(Value::Null, -32700, "invalid JSON"))?;
                continue;
            }
        };
        if let Some(response) = handle_request(request, runtime) {
            write_message(&response)?;
        }
    }
    Ok(())
}

fn handle_request(request: Value, runtime: &mut Runtime) -> Option<Value> {
    let object = match request.as_object() {
        Some(object) if object.get("jsonrpc") == Some(&Value::String("2.0".into())) => object,
        _ => {
            return Some(error_response(
                Value::Null,
                -32600,
                "invalid JSON-RPC request",
            ))
        }
    };
    let id = object.get("id").cloned();
    let method = match object.get("method").and_then(Value::as_str) {
        Some(method) => method,
        None => return id.map(|id| error_response(id, -32600, "method is required")),
    };
    if id.is_none() {
        return None;
    }
    let id = id.unwrap_or(Value::Null);
    let params = object.get("params").cloned().unwrap_or_else(|| json!({}));
    let result = match method {
        "initialize" => initialize(params),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({ "tools": tool_definitions() })),
        "tools/call" => call_tool(params, runtime),
        _ => return Some(error_response(id, -32601, "method not found")),
    };
    Some(match result {
        Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
        Err(error) => error_response(id, -32602, &error.message),
    })
}

fn initialize(params: Value) -> Result<Value, AppError> {
    let protocol_version = params
        .get("protocolVersion")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "protocolVersion is required"))?;
    Ok(json!({
        "capabilities": { "tools": { "listChanged": false } },
        "instructions": "Target an app directly when known. Observe before acting, use only the latest observationId, and observe again after every action.",
        "protocolVersion": protocol_version,
        "serverInfo": { "name": "computer-use", "version": "0.1.0" }
    }))
}

fn call_tool(params: Value, runtime: &mut Runtime) -> Result<Value, AppError> {
    let name = params
        .get("name")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "tool name is required"))?;
    let arguments = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));
    match name {
        "computer_list_apps" => list_apps(runtime),
        "computer_observe" => observe(arguments, runtime),
        "computer_act" => act(arguments, runtime),
        _ => Err(AppError::new("METHOD_NOT_FOUND", "unknown tool")),
    }
    .or_else(|error| {
        Ok(json!({
            "content": [{
                "type": "text",
                "text": format!("[{}] {}", error.code, error.message)
            }],
            "isError": true
        }))
    })
}

fn list_apps(runtime: &Runtime) -> Result<Value, AppError> {
    Ok(json!({
        "content": [{ "type": "text", "text": runtime.list_apps()?.to_string() }]
    }))
}

fn observe(arguments: Value, runtime: &mut Runtime) -> Result<Value, AppError> {
    let include_screenshot = arguments
        .get("includeScreenshot")
        .map(Value::as_bool)
        .unwrap_or(Some(true))
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "includeScreenshot must be a boolean"))?;
    let app = arguments.get("app").cloned().unwrap_or(Value::Null);
    let mut observation = runtime.observe(json!({
        "app": app,
        "includeScreenshot": include_screenshot,
        "maxDepth": 20,
        "maxNodes": 1000,
        "scopeId": SCOPE_ID
    }))?;
    let screenshot = observation
        .as_object_mut()
        .and_then(|object| object.remove("screenshot"));
    let mut content = Vec::new();
    if let Some(screenshot) = screenshot {
        content.push(screenshot);
    }
    content.push(json!({ "type": "text", "text": observation.to_string() }));
    Ok(json!({ "content": content }))
}

fn act(arguments: Value, runtime: &mut Runtime) -> Result<Value, AppError> {
    let object = arguments
        .as_object()
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "arguments must be an object"))?;
    let action = object
        .get("action")
        .cloned()
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "action is required"))?;
    let app = object
        .get("app")
        .cloned()
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "app is required"))?;
    let observation_id = object
        .get("observationId")
        .cloned()
        .ok_or_else(|| AppError::new("INVALID_REQUEST", "observationId is required"))?;
    let result = runtime.act(json!({
        "action": action,
        "app": app,
        "observationId": observation_id,
        "scopeId": SCOPE_ID
    }))?;
    Ok(json!({
        "content": [{ "type": "text", "text": result.to_string() }]
    }))
}

fn tool_definitions() -> Vec<Value> {
    vec![
        json!({
            "name": "computer_list_apps",
            "description": "List running Mac apps that can be targeted by computer_observe. Call this only when the requested app cannot be identified directly.",
            "inputSchema": {
                "type": "object",
                "additionalProperties": false,
                "properties": {}
            }
        }),
        json!({
            "name": "computer_observe",
            "description": "Observe a Mac app by display name or bundle ID, launching and focusing it when needed. Returns a screenshot and Accessibility Tree. Observe again after every action.",
            "inputSchema": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "app": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500,
                        "description": "App display name or bundle ID. Omit only to inspect the current foreground app."
                    },
                    "includeScreenshot": {
                        "type": "boolean",
                        "description": "Return a screenshot with the Accessibility Tree. Defaults to true."
                    }
                }
            }
        }),
        json!({
            "name": "computer_act",
            "description": "Control the observed Mac app using the latest observationId. Prefer press, set_value, or perform_action with Accessibility element IDs, then observe again.",
            "inputSchema": {
                "type": "object",
                "additionalProperties": false,
                "required": ["action", "app", "observationId"],
                "properties": {
                    "app": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500,
                        "description": "Display name or bundle ID returned by the observation. It must match the observed app."
                    },
                    "observationId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 200,
                        "description": "The observationId returned by the latest computer_observe call."
                    },
                    "action": action_schema()
                }
            }
        }),
    ]
}

fn action_schema() -> Value {
    json!({
        "oneOf": [
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "elementId"],
                "properties": {
                    "kind": { "const": "press" },
                    "elementId": { "type": "integer", "minimum": 0 }
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "elementId", "action"],
                "properties": {
                    "kind": { "const": "perform_action" },
                    "elementId": { "type": "integer", "minimum": 0 },
                    "action": { "type": "string", "minLength": 1, "maxLength": 200 }
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "elementId", "value"],
                "properties": {
                    "kind": { "const": "set_value" },
                    "elementId": { "type": "integer", "minimum": 0 },
                    "value": { "type": "string", "maxLength": 20000 }
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "point"],
                "properties": {
                    "kind": { "const": "click" },
                    "button": { "enum": ["left", "right"] },
                    "point": point_schema()
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "from", "to"],
                "properties": {
                    "kind": { "const": "drag" },
                    "durationMs": { "type": "integer", "minimum": 0, "maximum": 5000 },
                    "from": point_schema(),
                    "to": point_schema()
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "key"],
                "properties": {
                    "kind": { "const": "press_key" },
                    "key": { "type": "string", "minLength": 1, "maxLength": 32 },
                    "modifiers": {
                        "type": "array",
                        "maxItems": 4,
                        "uniqueItems": true,
                        "items": { "enum": ["command", "control", "option", "shift"] }
                    }
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "point", "deltaX", "deltaY"],
                "properties": {
                    "kind": { "const": "scroll" },
                    "point": point_schema(),
                    "deltaX": { "type": "integer", "minimum": -10000, "maximum": 10000 },
                    "deltaY": { "type": "integer", "minimum": -10000, "maximum": 10000 }
                }
            },
            {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "text"],
                "properties": {
                    "kind": { "const": "type_text" },
                    "text": { "type": "string", "maxLength": 20000 }
                }
            }
        ]
    })
}

fn point_schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["x", "y"],
        "properties": {
            "x": { "type": "number", "minimum": -100000, "maximum": 100000 },
            "y": { "type": "number", "minimum": -100000, "maximum": 100000 }
        }
    })
}

fn error_response(id: Value, code: i32, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message }
    })
}

fn write_message(value: &Value) -> io::Result<()> {
    let stdout = io::stdout();
    let mut output = stdout.lock();
    serde_json::to_writer(&mut output, value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    output.write_all(b"\n")?;
    output.flush()
}
