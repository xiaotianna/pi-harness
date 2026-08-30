import { Buffer } from "node:buffer";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { parseDocumentText, resolveDocumentFileType } from "../utils/document-text.js";
import { readRegularFile } from "../utils/media-file.js";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_OUTPUT_BYTES = 64 * 1024;
const TRUNCATION_MARKER = "\n\n[文档内容已截断；请缩小文档范围或使用其他工具继续检查]";

const ReadDocumentParameters = Type.Object({
  path: Type.String({
    description: "Workspace 内的 PDF、DOCX、PPTX、XLSX、ODT、ODS、ODP、RTF 或 EPUB 路径",
    minLength: 1,
  }),
});

export interface ReadDocumentDetails {
  characters: number;
  format: string;
  path: string;
  truncated: boolean;
}

function truncateDocumentText(content: string): { content: string; truncated: boolean } {
  const buffer = Buffer.from(content, "utf8");
  if (buffer.byteLength <= MAX_DOCUMENT_OUTPUT_BYTES) return { content, truncated: false };

  let end = MAX_DOCUMENT_OUTPUT_BYTES - Buffer.byteLength(TRUNCATION_MARKER, "utf8");
  while (end > 0 && (buffer[end] ?? 0) >= 0x80 && (buffer[end] ?? 0) < 0xc0) end -= 1;
  return {
    content: `${buffer.subarray(0, end).toString("utf8")}${TRUNCATION_MARKER}`,
    truncated: true,
  };
}

export function createReadDocumentTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ReadDocumentParameters, ReadDocumentDetails> {
  return {
    name: "read_document",
    label: "Read document",
    description:
      "提取 workspace 内 PDF、Word、PowerPoint、Excel、OpenDocument、RTF 或 EPUB 的有界文字内容。PDF 页面布局、图表或扫描内容请使用 view_pdf_page。",
    parameters: ReadDocumentParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const fileType = resolveDocumentFileType(input.path, "");
      if (fileType === null) {
        throw new Error("read_document 仅支持 PDF、DOCX、PPTX、XLSX、ODT、ODS、ODP、RTF 和 EPUB");
      }
      const path = await resolveToolPath(context, input.path);
      const buffer = await readRegularFile(path, MAX_DOCUMENT_BYTES, signal);

      let parsed: string | null;
      try {
        parsed = await parseDocumentText(buffer, fileType, signal);
      } catch (error: unknown) {
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
        throw new Error(`无法解析 ${fileType.toUpperCase()} 文档`, { cause: error });
      }
      if (parsed === null) {
        if (fileType === "pdf") {
          throw new Error("PDF 中没有可提取文字，可能是扫描版；请使用 view_pdf_page 查看指定页面");
        }
        throw new Error(`${fileType.toUpperCase()} 文档中没有可提取文字`);
      }

      const output = truncateDocumentText(parsed);
      return {
        content: [{ text: output.content, type: "text" }],
        details: {
          characters: output.content.length,
          format: fileType,
          path: input.path,
          truncated: output.truncated,
        },
      };
    },
  };
}
