import { McpCatalogStatus } from "@pi-harness/agent-runtime/mcp-contract";
import { queryOptions } from "@tanstack/react-query";
import { getMcpCatalog, listMcpServers } from "./mcp-api";

export const mcpQueryKeys = {
  all: ["mcp"] as const,
  servers: () => ["mcp", "servers"] as const,
  catalog: (serverId: string) => ["mcp", "catalog", serverId] as const,
};
export const mcpServersQueryOptions = () =>
  queryOptions({
    queryKey: mcpQueryKeys.servers(),
    queryFn: ({ signal }) => listMcpServers(signal),
    refetchInterval: ({ state }) =>
      state.data?.some((server) => server.catalogStatus === McpCatalogStatus.LOADING)
        ? 1_000
        : false,
  });

export const mcpCatalogQueryOptions = (serverId: string) =>
  queryOptions({
    queryKey: mcpQueryKeys.catalog(serverId),
    queryFn: ({ signal }) => getMcpCatalog(serverId, signal),
    enabled: serverId.length > 0,
  });
