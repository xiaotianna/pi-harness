import type {
  Client,
  Implementation,
  Prompt,
  Resource,
  ResourceTemplateType,
  ServerCapabilities,
  Tool,
} from "@modelcontextprotocol/client";
import type { McpClientLease } from "./client-manager.js";
import { McpError, McpErrorCode } from "./errors.js";

const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
const MAX_CATALOG_ITEMS = 512;

export interface McpCatalog {
  generation: number;
  discoveredAt: number;
  protocolEra: "modern" | "legacy";
  serverName: string;
  serverVersion: string;
  serverInfo: Implementation;
  instructions?: string;
  capabilities: ServerCapabilities;
  tools: readonly Tool[];
  resources: readonly Resource[];
  resourceTemplates: readonly ResourceTemplateType[];
  prompts: readonly Prompt[];
}

/** cache 只跟随具体 Client，不按服务器自报的名称复用到其他账号或 Session。 */
export class McpDiscovery {
  private readonly catalogs = new WeakMap<Client, McpCatalog>();

  public async discover(
    lease: McpClientLease,
    signal: AbortSignal,
    shouldRefresh = false,
  ): Promise<McpCatalog> {
    signal.throwIfAborted();
    lease.signal.throwIfAborted();
    const cached = this.catalogs.get(lease.client);
    if (!shouldRefresh && cached !== undefined && cached.generation === lease.catalogGeneration) {
      return structuredClone(cached);
    }
    const generation = lease.catalogGeneration;
    const options = {
      signal: AbortSignal.any([signal, lease.signal]),
      timeout: 15_000,
      cacheMode: "refresh" as const,
    };
    const capabilities = lease.client.getServerCapabilities() ?? {};
    const results = await Promise.allSettled([
      capabilities.tools
        ? lease.client.listTools(undefined, options)
        : Promise.resolve({ tools: [] }),
      capabilities.resources
        ? lease.client.listResources(undefined, options)
        : Promise.resolve({ resources: [] }),
      capabilities.resources
        ? lease.client.listResourceTemplates(undefined, options)
        : Promise.resolve({ resourceTemplates: [] }),
      capabilities.prompts
        ? lease.client.listPrompts(undefined, options)
        : Promise.resolve({ prompts: [] }),
    ] as const);
    const [tools, resources, templates, prompts] = results;
    if (
      tools.status !== "fulfilled" ||
      resources.status !== "fulfilled" ||
      templates.status !== "fulfilled" ||
      prompts.status !== "fulfilled"
    ) {
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 能力发现失败，请重试或检查服务状态");
    }
    options.signal.throwIfAborted();
    if (generation !== lease.catalogGeneration)
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 能力在发现期间已变更，请刷新重试");
    const server = lease.client.getServerVersion();
    const protocolEra = lease.client.getProtocolEra();
    if (protocolEra === undefined)
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 协议协商尚未完成");
    const serverInfo = server ?? { name: "", version: "" };
    const instructions = lease.client.getInstructions();
    const catalog: McpCatalog = {
      generation,
      discoveredAt: Date.now(),
      protocolEra,
      serverName: serverInfo.name,
      serverVersion: serverInfo.version,
      serverInfo,
      ...(instructions ? { instructions } : {}),
      capabilities,
      tools: tools.value.tools,
      resources: resources.value.resources,
      resourceTemplates: templates.value.resourceTemplates,
      prompts: prompts.value.prompts,
    };
    if (
      [catalog.tools, catalog.resources, catalog.resourceTemplates, catalog.prompts].some(
        (items) => items.length > MAX_CATALOG_ITEMS,
      ) ||
      Buffer.byteLength(JSON.stringify(catalog)) > MAX_CATALOG_BYTES
    ) {
      throw new McpError(
        McpErrorCode.LIMIT_EXCEEDED,
        "MCP 能力目录超过 Host 限额，请缩小服务暴露范围",
      );
    }
    if (
      new Set(catalog.tools.map((tool) => tool.name)).size !== catalog.tools.length ||
      new Set(catalog.prompts.map((prompt) => prompt.name)).size !== catalog.prompts.length
    ) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 服务返回了重名的工具或模板");
    }
    this.catalogs.set(lease.client, structuredClone(catalog));
    return catalog;
  }
}
