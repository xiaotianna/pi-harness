import type { AgentTool } from "@earendil-works/pi-agent-core";
import { truncateHead } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { readTextFilePage } from "../utils/file.js";

const DEFAULT_LINE_LIMIT = 2_000;

const ReadFileParameters = Type.Object({
  path: Type.String({ description: "Workspace 内的文件路径", minLength: 1 }),
  offset: Type.Optional(Type.Integer({ description: "起始行号，从 1 开始", minimum: 1 })),
  limit: Type.Optional(Type.Integer({ description: "最多读取的行数", maximum: 2_000, minimum: 1 })),
});

export interface ReadFileDetails {
  endLine: number;
  path: string;
  startLine: number;
  totalLines: number | null;
  truncated: boolean;
}

/**
 * read_file 工具
 * 调度：并行（executionMode：parallel）
 * 实际执行：校验路径，流式读取 UTF-8 文件，支持按行分页并截断输出。
 */
export function createReadFileTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ReadFileParameters, ReadFileDetails> {
  return {
    name: "read_file",
    label: "Read file",
    description: "读取 workspace 内的 UTF-8 文本文件，支持使用 offset 和 limit 分页读取大文件。",
    parameters: ReadFileParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const path = await resolveToolPath(context, input.path);
      const startIndex = (input.offset ?? 1) - 1;
      const page = await readTextFilePage(
        path,
        startIndex + 1,
        input.limit ?? DEFAULT_LINE_LIMIT,
        signal,
      );
      if (page.lines.length === 0) {
        throw new Error(`offset 超出文件范围，文件共 ${page.totalLines ?? 0} 行`);
      }

      const truncated = truncateHead(page.lines.join("\n"));
      if (truncated.firstLineExceedsLimit) {
        throw new Error("单行内容超过输出限制，请使用 run_command 按字节读取");
      }
      const endLine = startIndex + truncated.outputLines;
      const hasMore = page.hasMore || truncated.truncated;
      const nextOffset = endLine + 1;
      const output = hasMore
        ? `${truncated.content}\n\n[还有更多内容，请从 offset=${nextOffset} 继续读取]`
        : truncated.content;

      return {
        content: [{ type: "text", text: output }],
        details: {
          endLine,
          path: input.path,
          startLine: startIndex + 1,
          totalLines: page.totalLines,
          truncated: hasMore,
        },
      };
    },
  };
}
