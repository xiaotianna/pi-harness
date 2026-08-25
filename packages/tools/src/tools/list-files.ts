import { glob, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";

const MAX_ENTRIES = 500;

const ListFilesParameters = Type.Object({
  path: Type.Optional(Type.String({ description: "要列举的目录，默认为 workspace 根目录" })),
  pattern: Type.Optional(Type.String({ description: "相对于目录的 glob，默认为 *", minLength: 1 })),
});

export interface ListFilesDetails {
  count: number;
  path: string;
  pattern: string;
  truncated: boolean;
}

function validatePattern(pattern: string): void {
  if (isAbsolute(pattern) || pattern.split(/[\\/]/).includes("..")) {
    throw new Error("glob pattern 不能访问目标目录外部");
  }
}

/**
 * list_files 工具
 * 调度：并行（executionMode：parallel）
 * 实际执行：使用 Node 原生 fs.glob() 列举文件，忽略 .git、.pi-harness、node_modules，最多返回 500 项。
 */
export function createListFilesTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ListFilesParameters, ListFilesDetails> {
  return {
    name: "list_files",
    label: "List files",
    description: "列举 workspace 目录内容；可使用 glob pattern 发现文件。",
    parameters: ListFilesParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const requestedPath = input.path?.trim() || ".";
      const pattern = input.pattern ?? "*";
      validatePattern(pattern);
      const directory = await resolveToolPath(context, requestedPath);
      if (!(await stat(directory)).isDirectory()) throw new Error("list_files 的 path 必须是目录");
      const workspaceRoot = await resolveToolPath(context, ".");
      const entries: string[] = [];
      let truncated = false;

      for await (const entry of glob(pattern, {
        cwd: directory,
        exclude: ["**/.git/**", "**/.pi-harness/**", "**/node_modules/**"],
        withFileTypes: true,
      })) {
        if (signal?.aborted) throw new Error("目录列举已取消");
        if (entries.length === MAX_ENTRIES) {
          truncated = true;
          break;
        }
        const absolutePath = resolve(entry.parentPath, entry.name);
        const workspacePath = relative(workspaceRoot, absolutePath);
        if (workspacePath === ".." || workspacePath.startsWith(`..${sep}`)) continue;
        entries.push(`${workspacePath}${entry.isDirectory() ? "/" : ""}`);
      }

      entries.sort((left, right) => left.localeCompare(right));
      const suffix = truncated ? `\n\n[结果已限制为 ${MAX_ENTRIES} 项]` : "";
      return {
        content: [{ type: "text", text: entries.length ? entries.join("\n") + suffix : "(empty)" }],
        details: { count: entries.length, path: requestedPath, pattern, truncated },
      };
    },
  };
}
