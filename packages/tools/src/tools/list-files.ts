import { glob, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { truncateHead } from "@earendil-works/pi-agent-core";
import { isPathWithin, PathPolicyError } from "@pi-harness/policy";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { hasIgnoredWorkspaceDirectory } from "../utils/workspace-file-changes.js";

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
      if (hasIgnoredWorkspaceDirectory(relative(workspaceRoot, directory))) {
        throw new Error("list_files 不列举受忽略的目录");
      }
      const entries: string[] = [];
      let truncated = false;

      for await (const entry of glob(pattern, {
        cwd: directory,
        exclude: (entry) => {
          const absolutePath = resolve(entry.parentPath, entry.name);
          return (
            hasIgnoredWorkspaceDirectory(relative(directory, absolutePath)) ||
            (context.protectedPaths ?? []).some((path) => isPathWithin(resolve(path), absolutePath))
          );
        },
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
        try {
          await resolveToolPath(context, absolutePath);
        } catch (error: unknown) {
          if (error instanceof PathPolicyError) continue;
          throw error;
        }
        entries.push(`${workspacePath}${entry.isDirectory() ? "/" : ""}`);
      }

      entries.sort((left, right) => left.localeCompare(right));
      const output = truncateHead(entries.join("\n"));
      truncated ||= output.truncated;
      const suffix = truncated ? `\n\n[结果已截断]` : "";
      return {
        content: [{ type: "text", text: entries.length ? output.content + suffix : "(empty)" }],
        details: { count: output.outputLines, path: requestedPath, pattern, truncated },
      };
    },
  };
}
