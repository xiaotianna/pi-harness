import { stat } from "node:fs/promises";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { createPatch } from "diff";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import {
  assertTextFileSize,
  type FileChangeDetails,
  readTextFile,
  writeTextFileAtomic,
} from "../utils/file.js";

const EditFileParameters = Type.Object({
  path: Type.String({ description: "要修改的 workspace 文件路径", minLength: 1 }),
  oldText: Type.String({ description: "必须在原文件中唯一匹配的文本", minLength: 1 }),
  newText: Type.String({ description: "替换后的文本" }),
});

/**
 * edit_file 工具
 * 调度：串行（executionMode：sequential）
 * 实际执行：要求 oldText 在文件中唯一出现，替换后原子写入，并生成 before、after 和 unified diff。
 * 使用的是unified diff格式
 */
export function createEditFileTool(
  context: WorkspaceToolContext,
): AgentTool<typeof EditFileParameters, FileChangeDetails> {
  return {
    name: "edit_file",
    label: "Edit file",
    description: "精确替换 workspace 文件中唯一匹配的一段文本，并返回 before、after 和 Diff。",
    parameters: EditFileParameters,
    executionMode: "sequential",
    async execute(_toolCallId, input, signal) {
      const path = await resolveToolPath(context, input.path);
      const metadata = await stat(path);
      const before = await readTextFile(path, signal);
      const matchIndex = before.indexOf(input.oldText);
      if (matchIndex === -1) throw new Error("oldText 在文件中不存在");
      if (before.indexOf(input.oldText, matchIndex + input.oldText.length) !== -1) {
        throw new Error("oldText 在文件中不唯一，请提供更多上下文");
      }

      const after = `${before.slice(0, matchIndex)}${input.newText}${before.slice(
        matchIndex + input.oldText.length,
      )}`;
      if (after === before) throw new Error("修改前后内容相同");
      assertTextFileSize(after);
      await writeTextFileAtomic(path, after, metadata.mode, signal);
      const diff = createPatch(input.path, before, after, "before", "after");

      return {
        content: [{ type: "text", text: `已更新 ${input.path}\n\n${diff}` }],
        details: { after, before, diff, path: input.path },
      };
    },
  };
}
