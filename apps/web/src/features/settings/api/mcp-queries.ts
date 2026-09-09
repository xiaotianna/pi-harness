import { queryOptions } from "@tanstack/react-query";
import { listMcpServers } from "./mcp-api";

export const mcpQueryKeys = {
  all: ["mcp"] as const,
  servers: () => ["mcp", "servers"] as const,
};
export const mcpServersQueryOptions = () =>
  queryOptions({
    queryKey: mcpQueryKeys.servers(),
    queryFn: ({ signal }) => listMcpServers(signal),
  });
