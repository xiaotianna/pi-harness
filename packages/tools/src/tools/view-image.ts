import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import {
  detectImageMimeType,
  expectedImageMimeType,
  readRegularFile,
} from "../utils/media-file.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ViewImageParameters = Type.Object({
  path: Type.String({
    description: "Workspace 内的 PNG、JPEG、GIF 或 WebP 图片路径",
    minLength: 1,
  }),
});

export interface ViewImageDetails {
  mimeType: string;
  path: string;
  size: number;
}

export function createViewImageTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ViewImageParameters, ViewImageDetails> {
  return {
    name: "view_image",
    label: "View image",
    description:
      "查看 workspace 内的 PNG、JPEG、GIF 或 WebP 图片。仅用于视觉内容；文本文件请使用 read_file。",
    parameters: ViewImageParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      if (context.supportsImageInput?.() !== true) {
        throw new Error("当前模型不支持图片输入，无法使用 view_image");
      }
      const path = await resolveToolPath(context, input.path);
      const buffer = await readRegularFile(path, MAX_IMAGE_BYTES, signal);
      const mimeType = detectImageMimeType(buffer);
      if (mimeType === null) {
        throw new Error("view_image 仅支持有效的 PNG、JPEG、GIF 或 WebP 图片");
      }
      const expectedMimeType = expectedImageMimeType(input.path);
      if (expectedMimeType !== null && expectedMimeType !== mimeType) {
        throw new Error("图片扩展名与实际 MIME 类型不一致");
      }

      return {
        content: [{ data: buffer.toString("base64"), mimeType, type: "image" }],
        details: { mimeType, path: input.path, size: buffer.byteLength },
      };
    },
  };
}
