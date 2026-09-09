import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  deleteMcpServer,
  type McpServer,
  type McpTestResult,
  revokeMcpTrust,
  setMcpEnabled,
  testMcpServer,
  trustMcpServer,
} from "../api/mcp-api";
import { mcpQueryKeys, mcpServersQueryOptions } from "../api/mcp-queries";

export const McpAction = {
  CONNECT: "connect",
  TEST: "test",
  REVOKE: "revoke",
  DELETE: "delete",
  DISABLE: "disable",
} as const;
type Action = (typeof McpAction)[keyof typeof McpAction];

export function useMcpServers(onCloseDialog: () => void) {
  const [result, setResult] = useState<McpTestResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const client = useQueryClient();
  const servers = useQuery(mcpServersQueryOptions());
  useEffect(() => () => controller.current?.abort(), []);
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: mcpQueryKeys.all });
    setResult(null);
  };
  const action = useMutation({
    retry: false,
    mutationFn: async ({ server, kind }: { server: McpServer; kind: Action }) => {
      const abort = new AbortController();
      controller.current = abort;
      if (kind === McpAction.DISABLE) {
        await setMcpEnabled(server, false);
        return null;
      }
      if (kind === McpAction.DELETE) {
        await deleteMcpServer(server);
        return null;
      }
      if (kind === McpAction.REVOKE) {
        await revokeMcpTrust(server);
        return null;
      }
      let current = server;
      if (kind === McpAction.CONNECT) {
        if (!current.enabled) current = await setMcpEnabled(current, true);
        abort.signal.throwIfAborted();
        await trustMcpServer(current);
        onCloseDialog();
      }
      abort.signal.throwIfAborted();
      try {
        return await testMcpServer(current, abort.signal);
      } finally {
        if (controller.current === abort) controller.current = null;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      onCloseDialog();
    },
    onSettled: async () => {
      controller.current = null;
      await client.invalidateQueries({ queryKey: mcpQueryKeys.all });
    },
  });
  const run = (server: McpServer, kind: Action) => {
    action.reset();
    setResult(null);
    action.mutate({ server, kind });
  };
  return {
    servers,
    result,
    action,
    run,
    refresh,
    cancelTest: () => controller.current?.abort(),
  };
}
