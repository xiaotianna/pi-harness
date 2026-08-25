import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolPolicy } from "@pi-harness/policy";
import { Compile } from "typebox/compile";

export interface ToolRegistration {
  readonly policy: ToolPolicy;
  readonly source: string;
  readonly tool: AgentTool;
}

export class ToolRegistry {
  private readonly registrations = new Map<string, ToolRegistration>();

  public constructor(registrations: readonly ToolRegistration[]) {
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
      Compile(tool.parameters);
      this.registrations.set(tool.name, registration);
    }
  }

  public get(toolName: string): ToolRegistration | undefined {
    return this.registrations.get(toolName);
  }

  public get tools(): AgentTool[] {
    return [...this.registrations.values()].map(({ tool }) => tool);
  }
}
