import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolPolicy } from "@pi-harness/policy";
import { Compile } from "typebox/compile";
import { ToolExecutionGuard } from "../tool-execution-guard.js";

export interface ToolRegistration {
  readonly policy: ToolPolicy;
  readonly source: string;
  readonly timeoutMs: number;
  readonly tool: AgentTool;
}

export class ToolRegistry {
  public readonly executionGuard = new ToolExecutionGuard();
  private readonly registrations = new Map<string, ToolRegistration>();

  public constructor(registrations: readonly ToolRegistration[]) {
    this.add(registrations);
  }

  private add(registrations: readonly ToolRegistration[]): void {
    for (const registration of registrations) {
      const { tool } = registration;
      if (!tool.name.trim() || !tool.description.trim()) {
        throw new Error("工具 ID 和描述不能为空");
      }
      if (!registration.source.trim()) {
        throw new Error(`工具 ${tool.name} 缺少来源`);
      }
      if (tool.executionMode !== "parallel" && tool.executionMode !== "sequential") {
        throw new Error(`工具 ${tool.name} 缺少有效执行模式`);
      }
      if (this.registrations.has(tool.name)) {
        throw new Error(`工具 ID 重复: ${tool.name}`);
      }
      if (!Number.isInteger(registration.timeoutMs) || registration.timeoutMs < 1) {
        throw new Error(`工具 ${tool.name} 缺少有效超时`);
      }
      Compile(tool.parameters);
      this.registrations.set(tool.name, {
        ...registration,
        tool: this.executionGuard.guard(tool, registration.timeoutMs),
      });
    }
  }

  /** Called only while the owning Run is preparing or has finished. */
  public replaceExternal(registrations: readonly ToolRegistration[]): void {
    if (registrations.some((registration) => !registration.source.startsWith("mcp:")))
      throw new Error("外部工具缺少 MCP 来源");
    const next = new ToolRegistry(registrations);
    for (const name of next.registrations.keys()) {
      const current = this.registrations.get(name);
      if (current && !current.source.startsWith("mcp:")) throw new Error("外部工具名称冲突");
    }
    for (const [name, registration] of this.registrations) {
      if (registration.source.startsWith("mcp:")) this.registrations.delete(name);
    }
    this.add(registrations);
  }

  public get(toolName: string): ToolRegistration | undefined {
    return this.registrations.get(toolName);
  }

  public get tools(): AgentTool[] {
    return [...this.registrations.values()].map(({ tool }) => tool);
  }
}
