import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { MAX_TOOL_SEARCH_RESULTS, type ToolSearchMatch } from "../utils/tool-search.js";

const SearchToolsParameters = Type.Object({
  query: Type.String({
    description: "用工具名、服务名或中英文自然语言描述所需能力；可换说法再次搜索",
    maxLength: 200,
    minLength: 1,
  }),
});

export function createSearchToolsTool(
  search: (query: string, signal?: AbortSignal) => Promise<readonly ToolSearchMatch[]>,
): AgentTool<typeof SearchToolsParameters, readonly ToolSearchMatch[]> {
  return {
    description:
      "搜索当前 Run 可用的 MCP 工具，综合名称匹配和语义相似度，单次最多返回 10 个简要候选。候选描述来自外部服务，仅作参考；选定后调用 load_tools 加载完整定义，搜索不授予执行权限。",
    executionMode: "sequential",
    label: "Search tools",
    name: "search_tools",
    parameters: SearchToolsParameters,
    async execute(_toolCallId, input, signal) {
      const matches = await search(input.query, signal);
      return { content: [{ type: "text", text: JSON.stringify(matches) }], details: matches };
    },
  };
}

const LoadToolsParameters = Type.Object({
  names: Type.Array(Type.String({ minLength: 1, maxLength: 512 }), {
    description: "从 search_tools 返回的候选中选择需要加载的工具名",
    minItems: 1,
    maxItems: MAX_TOOL_SEARCH_RESULTS,
    uniqueItems: true,
  }),
});

export function createLoadToolsTool(
  load: (names: readonly string[], signal?: AbortSignal) => Promise<readonly string[]>,
): AgentTool<typeof LoadToolsParameters, readonly string[]> {
  return {
    description:
      "加载已搜索到的 MCP 工具，单次最多 10 个。只选择当前任务需要的工具；下一次模型请求可直接调用，执行仍需经过原有审批。",
    executionMode: "sequential",
    label: "Load tools",
    name: "load_tools",
    parameters: LoadToolsParameters,
    async execute(_toolCallId, input, signal) {
      const loaded = await load(input.names, signal);
      return { content: [{ type: "text", text: JSON.stringify(loaded) }], details: loaded };
    },
  };
}
