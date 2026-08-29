import type { FileHandle } from "node:fs/promises";
import { open } from "node:fs/promises";
import { resolveWorkspacePath } from "@pi-harness/policy";
import { SkillRegistry, type SkillSummary } from "@pi-harness/tools";

const MAX_AGENTS_BYTES = 128 * 1024;

export interface WorkspaceAgentContext {
  agentsInstructions: string | null;
  availableSkills: readonly SkillSummary[];
}

export interface WorkspaceAgentContextSource {
  globalRoot: string;
  isSkillEnabled?: (directory: string) => boolean;
  workspaceRoot: string;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

// 加载 AGENTS.md
async function readWorkspaceInstructions(workspaceRoot: string): Promise<string | null> {
  const path = await resolveWorkspacePath({
    allowMissing: true,
    path: "AGENTS.md",
    workspaceRoot,
  });

  let handle: FileHandle;
  try {
    handle = await open(path, "r");
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }

  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) throw new Error("WORKSPACE_CONTEXT_INVALID: AGENTS.md 不是普通文件");
    const buffer = Buffer.allocUnsafe(Math.min(metadata.size, MAX_AGENTS_BYTES));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const instructions = buffer.subarray(0, bytesRead).toString("utf8");
    return metadata.size > MAX_AGENTS_BYTES
      ? `${instructions}\n\n[AGENTS.md 已截断]`
      : instructions;
  } finally {
    await handle.close();
  }
}

/**
 * 在每次 Agent Run 开始前，加载当前工作区的“运行上下文”，并最终注入 System Prompt
 * 加载两个内容：
 *  1、工作区根目录的 AGENTS.md
 *    - 不存在时返回 null
      - 最大读取 128 KB，超过会截断
    2、可用 Skills
      - 通过 SkillRegistry.discover() 发现全局和项目 Skills
      - 此处只加载 Skill 摘要，真正需要时再由 Agent 调用 load_skill
 */
export async function loadWorkspaceAgentContext(
  source: WorkspaceAgentContextSource,
): Promise<WorkspaceAgentContext> {
  const [agentsInstructions, availableSkills] = await Promise.all([
    readWorkspaceInstructions(source.workspaceRoot),
    new SkillRegistry(source).discover(),
  ]);
  return { agentsInstructions, availableSkills };
}
