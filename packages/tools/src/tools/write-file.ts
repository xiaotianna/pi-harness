import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { createPatch } from "diff";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import {
  assertTextFileSize,
  type FileChangeDetails,
  MAX_FILE_BYTES,
  readTextFile,
  writeTextFileAtomic,
} from "../utils/file.js";

const WriteFileParameters = Type.Object({
  path: Type.String({ description: "要创建或覆盖的 workspace 文件路径", minLength: 1 }),
  content: Type.String({ description: "完整文件内容", maxLength: MAX_FILE_BYTES }),
});

async function readPreviousContent(path: string, signal?: AbortSignal) {
  try {
    const metadata = await stat(path);
    return {
      before: await readTextFile(path, signal),
      mode: metadata.mode,
    };
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { before: null, mode: undefined };
    }
    throw error;
  }
}

/**
 * write_file 工具
 * 调度：串行（executionMode：sequential）
 * 实际执行：创建或完整覆盖文件，保留原文件权限，写入后返回完整变更和 diff。
 * ---------
 * 该工具和 edit_file 有部分2功能是一样的，但是使用场景不同：
 * - write_file：创建新文件或完整覆盖现有文件
 * - edit_file：修改现有文件中的一小段内容
 */
export function createWriteFileTool(
  context: WorkspaceToolContext,
): AgentTool<typeof WriteFileParameters, FileChangeDetails> {
  return {
    name: "write_file",
    label: "Write file",
    description: "创建或完整覆盖 workspace 文件，并返回 before、after 和 Diff。",
    parameters: WriteFileParameters,
    executionMode: "sequential",
    async execute(_toolCallId, input, signal) {
      assertTextFileSize(input.content);
      let path = await resolveToolPath(context, input.path, true);
      const { before, mode } = await readPreviousContent(path, signal);
      if (before === input.content) throw new Error("写入前后内容相同");

      // 创建父目录后再次解析真实路径，避免审批与执行之间通过符号链接越界。
      await mkdir(dirname(path), { recursive: true });
      path = await resolveToolPath(context, input.path, true);
      await writeTextFileAtomic(path, input.content, mode, signal);
      path = await resolveToolPath(context, input.path);
      const diff = createPatch(input.path, before ?? "", input.content, "before", "after");

      return {
        content: [{ type: "text", text: `已写入 ${input.path}\n\n${diff}` }],
        details: { after: input.content, before, diff, path: input.path },
      };
    },
  };
}
