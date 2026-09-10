import { type Static, Type } from "typebox";

export const ComputerActionKind = {
  CLICK: "click",
  DRAG: "drag",
  PRESS: "press",
  PRESS_KEY: "press_key",
  SCROLL: "scroll",
  SET_VALUE: "set_value",
  TYPE_TEXT: "type_text",
} as const;

export const MouseButton = {
  LEFT: "left",
  RIGHT: "right",
} as const;

export const KeyModifier = {
  COMMAND: "command",
  CONTROL: "control",
  OPTION: "option",
  SHIFT: "shift",
} as const;

const PointSchema = Type.Object({
  x: Type.Number({ maximum: 100_000, minimum: -100_000 }),
  y: Type.Number({ maximum: 100_000, minimum: -100_000 }),
});

export const ComputerActionSchema = Type.Union([
  Type.Object({
    elementId: Type.Integer({ minimum: 0 }),
    kind: Type.Literal(ComputerActionKind.PRESS),
  }),
  Type.Object({
    elementId: Type.Integer({ minimum: 0 }),
    kind: Type.Literal(ComputerActionKind.SET_VALUE),
    value: Type.String({ maxLength: 20_000 }),
  }),
  Type.Object({
    button: Type.Optional(
      Type.Union([Type.Literal(MouseButton.LEFT), Type.Literal(MouseButton.RIGHT)]),
    ),
    kind: Type.Literal(ComputerActionKind.CLICK),
    point: PointSchema,
  }),
  Type.Object({
    durationMs: Type.Optional(Type.Integer({ maximum: 5_000, minimum: 0 })),
    from: PointSchema,
    kind: Type.Literal(ComputerActionKind.DRAG),
    to: PointSchema,
  }),
  Type.Object({
    key: Type.String({ maxLength: 32, minLength: 1 }),
    kind: Type.Literal(ComputerActionKind.PRESS_KEY),
    modifiers: Type.Optional(
      Type.Array(
        Type.Union([
          Type.Literal(KeyModifier.COMMAND),
          Type.Literal(KeyModifier.CONTROL),
          Type.Literal(KeyModifier.OPTION),
          Type.Literal(KeyModifier.SHIFT),
        ]),
        { maxItems: 4, uniqueItems: true },
      ),
    ),
  }),
  Type.Object({
    deltaX: Type.Integer({ maximum: 10_000, minimum: -10_000 }),
    deltaY: Type.Integer({ maximum: 10_000, minimum: -10_000 }),
    kind: Type.Literal(ComputerActionKind.SCROLL),
    point: PointSchema,
  }),
  Type.Object({
    kind: Type.Literal(ComputerActionKind.TYPE_TEXT),
    text: Type.String({ maxLength: 20_000 }),
  }),
]);

export type ComputerAction = Static<typeof ComputerActionSchema>;

export interface ImageContent {
  data: string;
  mimeType: "image/png";
  type: "image";
}

export interface ComputerApplication {
  bundleId: string;
  name: string;
  pid: number;
}

export interface ComputerScreenshotFrame {
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}

export interface ComputerObservation {
  accessibilityTree: string;
  application: ComputerApplication;
  observedAt: number;
  observationId: string;
  screenshot?: ImageContent;
  screenshotFrame?: ComputerScreenshotFrame;
  truncated: boolean;
  windowId?: number;
  windowTitle?: string;
}

export interface ComputerActionResult {
  observationId: string;
  performedAt: number;
}

export interface ObserveOptions {
  includeScreenshot?: boolean;
  maxDepth?: number;
  maxNodes?: number;
}

export interface ComputerUseRequest {
  id: string;
  method: "act" | "observe" | "ping";
  params: unknown;
}

export type ComputerUseResponse =
  | { id: string; ok: true; result: unknown }
  | { error: { code: string; message: string }; id: string; ok: false };

const ImageContentSchema = Type.Object({
  data: Type.String({ maxLength: 20_000_000 }),
  mimeType: Type.Literal("image/png"),
  type: Type.Literal("image"),
});

export const ComputerObservationSchema = Type.Object({
  accessibilityTree: Type.String({ maxLength: 200_000 }),
  application: Type.Object({
    bundleId: Type.String({ maxLength: 500 }),
    name: Type.String({ maxLength: 500 }),
    pid: Type.Integer({ minimum: 1 }),
  }),
  observedAt: Type.Integer({ minimum: 0 }),
  observationId: Type.String({ maxLength: 200, minLength: 1 }),
  screenshot: Type.Optional(ImageContentSchema),
  screenshotFrame: Type.Optional(
    Type.Object({
      height: Type.Number({ minimum: 0 }),
      scale: Type.Number({ minimum: 0 }),
      width: Type.Number({ minimum: 0 }),
      x: Type.Number(),
      y: Type.Number(),
    }),
  ),
  truncated: Type.Boolean(),
  windowId: Type.Optional(Type.Integer({ minimum: 0 })),
  windowTitle: Type.Optional(Type.String({ maxLength: 2_000 })),
});

export const ComputerActionResultSchema = Type.Object({
  observationId: Type.String({ maxLength: 200, minLength: 1 }),
  performedAt: Type.Integer({ minimum: 0 }),
});

export const ComputerUseResponseSchema = Type.Union([
  Type.Object({
    id: Type.String({ minLength: 1 }),
    ok: Type.Literal(true),
    result: Type.Unknown(),
  }),
  Type.Object({
    error: Type.Object({
      code: Type.String({ maxLength: 100, minLength: 1 }),
      message: Type.String({ maxLength: 2_000, minLength: 1 }),
    }),
    id: Type.String({ minLength: 1 }),
    ok: Type.Literal(false),
  }),
]);
