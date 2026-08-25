import { relative, sep } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { truncateHead } from "@earendil-works/pi-agent-core";
import { execa } from "execa";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";

const SearchTextParameters = Type.Object({
  query: Type.String({ description: "ripgrep 正则表达式", minLength: 1 }),
  path: Type.Optional(Type.String({ description: "搜索路径，默认为 workspace 根目录" })),
  glob: Type.Optional(Type.String({ description: "可选的文件 glob，例如 **/*.ts" })),
});

export interface SearchTextDetails {
  matches: boolean;
  path: string;
  truncated: boolean;
}

/**
 * search_text 工具
 * 调度：并行（executionMode：parallel）
 * 实际执行：通过 execa 执行 rg，15 秒超时、1MB 输出上限；rg 退出码 1 被视为“没有匹配”。
 * execa 可以理解为 node:child_process 的封装，在这个工具中用来执行ripgrep（rg），类似grep来搜索内容的
 */
export function createSearchTextTool(
  context: WorkspaceToolContext,
): AgentTool<typeof SearchTextParameters, SearchTextDetails> {
  return {
    name: "search_text",
    label: "Search text",
    description: "使用 ripgrep 搜索 workspace 文件内容，返回相对路径、行号和匹配文本。",
    parameters: SearchTextParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const requestedPath = input.path?.trim() || ".";
      const searchPath = await resolveToolPath(context, requestedPath);
      const workspaceRoot = await resolveToolPath(context, ".");
      const args = ["--line-number", "--no-heading", "--color", "never"];
      if (input.glob !== undefined) args.push("--glob", input.glob);

      for (const protectedPath of context.protectedPaths ?? []) {
        const protectedFromWorkspace = relative(workspaceRoot, protectedPath);
        if (
          protectedFromWorkspace &&
          protectedFromWorkspace !== ".." &&
          !protectedFromWorkspace.startsWith(`..${sep}`)
        ) {
          args.push(
            "--glob",
            `!${protectedFromWorkspace}`,
            "--glob",
            `!${protectedFromWorkspace}/**`,
          );
        }
      }

      args.push("--", input.query, relative(workspaceRoot, searchPath) || ".");
      const result = await execa("rg", args, {
        all: true,
        cwd: workspaceRoot,
        maxBuffer: 1024 * 1024,
        reject: false,
        timeout: 15_000,
        ...(signal === undefined ? {} : { cancelSignal: signal }),
      });

      if (result.exitCode === 1) {
        return {
          content: [{ type: "text", text: "(no matches)" }],
          details: { matches: false, path: requestedPath, truncated: false },
        };
      }
      if (result.failed) throw new Error(result.shortMessage || "ripgrep 搜索失败");

      const output = truncateHead(result.all);
      return {
        content: [{ type: "text", text: output.content }],
        details: { matches: true, path: requestedPath, truncated: output.truncated },
      };
    },
  };
}
