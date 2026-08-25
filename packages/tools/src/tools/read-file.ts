import type { AgentTool } from "@earendil-works/pi-agent-core";
import { truncateHead } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { readTextFile } from "../utils/file.js";

const ReadFileParameters = Type.Object({
  path: Type.String({ description: "Workspace 内的文件路径", minLength: 1 }),
  offset: Type.Optional(Type.Integer({ description: "起始行号，从 1 开始", minimum: 1 })),
  limit: Type.Optional(Type.Integer({ description: "最多读取的行数", maximum: 2_000, minimum: 1 })),
});

export interface ReadFileDetails {
  endLine: number;
  path: string;
  startLine: number;
  totalLines: number;
  truncated: boolean;
}

/**
 * read_file 工具
 * 调度：并行（executionMode：parallel）
 * 实际执行：校验路径，读取不超过 1MB 的 UTF-8 文件，支持按行分页并截断输出。
 */
export function createReadFileTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ReadFileParameters, ReadFileDetails> {
  return {
    name: "read_file",
    label: "Read file",
    description: "读取 workspace 内的 UTF-8 文本文件。大文件请使用 offset 和 limit 分页读取。",
    parameters: ReadFileParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const path = await resolveToolPath(context, input.path);
      const content = await readTextFile(path, signal);
      const lines = content.split("\n");
      const startIndex = (input.offset ?? 1) - 1;
      if (startIndex >= lines.length) {
        throw new Error(`offset 超出文件范围，文件共 ${lines.length} 行`);
      }

      const endIndex = Math.min(startIndex + (input.limit ?? lines.length), lines.length);
      const truncated = truncateHead(lines.slice(startIndex, endIndex).join("\n"));
      const endLine = startIndex + truncated.outputLines;
      const hasMore = endIndex < lines.length || truncated.truncated;
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
          totalLines: lines.length,
          truncated: hasMore,
        },
      };
    },
  };
}
