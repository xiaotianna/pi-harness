import { toast } from "@heroui/react";
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
  DISCOVER: "discover",
  TEST: "test",
  REVOKE: "revoke",
  DELETE: "delete",
  ENABLE: "enable",
  DISABLE: "disable",
} as const;
type Action = (typeof McpAction)[keyof typeof McpAction];

interface ActionInput {
  server: McpServer;
  kind: Action;
  signal: AbortSignal;
  onSuccess?: () => void;
}

interface ToggleContext {
  previousServer?: McpServer;
}

export function useMcpServers() {
  const [results, setResults] = useState<ReadonlyMap<string, McpTestResult>>(new Map());
  const [pendingActions, setPendingActions] = useState<ReadonlyMap<string, Action>>(new Map());
  const controllers = useRef(new Map<string, AbortController>());
  const client = useQueryClient();
  const servers = useQuery(mcpServersQueryOptions());
  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
    },
    [],
  );
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: mcpQueryKeys.all });
    setResults(new Map());
  };
  const action = useMutation<McpServer | McpTestResult | null, Error, ActionInput, ToggleContext>({
    retry: false,
    mutationFn: async ({ server, kind, signal }: ActionInput) => {
      if (kind === McpAction.ENABLE || kind === McpAction.DISABLE)
        return setMcpEnabled(server, kind === McpAction.ENABLE);
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
        signal.throwIfAborted();
        await trustMcpServer(current);
      }
      signal.throwIfAborted();
      return testMcpServer(current, signal);
    },
    onError: (error, input, context) => {
      if (
        (input.kind === McpAction.ENABLE || input.kind === McpAction.DISABLE) &&
        context?.previousServer
      ) {
        client.setQueryData<readonly McpServer[]>(mcpQueryKeys.servers(), (servers) =>
          servers?.map((server) =>
            server.id === context.previousServer?.id ? context.previousServer : server,
          ),
        );
      }
      if (error.name !== "AbortError") toast.danger(error.message);
    },
    onSuccess: (data, input) => {
      if (data && "serverId" in data) {
        setResults(new Map([[data.serverId, data]]));
        if (input.kind === McpAction.CONNECT || input.kind === McpAction.TEST)
          toast.success(`${input.server.name} 连接测试成功`);
      } else if (data) {
        client.setQueryData<readonly McpServer[]>(mcpQueryKeys.servers(), (servers) =>
          servers?.map((server) => (server.id === data.id ? data : server)),
        );
      }
      input.onSuccess?.();
    },
    onMutate: async (input) => {
      if (input.kind !== McpAction.ENABLE && input.kind !== McpAction.DISABLE) return {};
      await client.cancelQueries({ queryKey: mcpQueryKeys.servers() });
      const previousServer = client
        .getQueryData<readonly McpServer[]>(mcpQueryKeys.servers())
        ?.find((server) => server.id === input.server.id);
      const enabled = input.kind === McpAction.ENABLE;
      client.setQueryData<readonly McpServer[]>(mcpQueryKeys.servers(), (servers) =>
        servers?.map((server) => (server.id === input.server.id ? { ...server, enabled } : server)),
      );
      return previousServer ? { previousServer } : {};
    },
    onSettled: async (_data, _error, input) => {
      controllers.current.delete(input.server.id);
      setPendingActions((current) => {
        const next = new Map(current);
        next.delete(input.server.id);
        return next;
      });
      if (
        input.kind === McpAction.CONNECT ||
        input.kind === McpAction.DELETE ||
        input.kind === McpAction.REVOKE
      ) {
        await client.invalidateQueries({ queryKey: mcpQueryKeys.all });
      }
    },
  });
  const run = (server: McpServer, kind: Action, onSuccess?: () => void) => {
    if (controllers.current.has(server.id)) return;
    const controller = new AbortController();
    controllers.current.set(server.id, controller);
    setPendingActions((current) => new Map(current).set(server.id, kind));
    if (kind !== McpAction.DISCOVER && kind !== McpAction.TEST) {
      setResults((current) => {
        const next = new Map(current);
        next.delete(server.id);
        return next;
      });
    }
    action.mutate({
      server,
      kind,
      signal: controller.signal,
      ...(onSuccess ? { onSuccess } : {}),
    });
  };
  return {
    servers,
    results,
    pendingActions,
    run,
    refresh,
    cancelTest: (serverId: string) => controllers.current.get(serverId)?.abort(),
  };
}
