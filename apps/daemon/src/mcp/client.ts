import { Client, InMemoryResponseCacheStore } from "@modelcontextprotocol/client";

const MAX_DISCOVERY_PAGES = 16;
const VERSION_PROBE_TIMEOUT_MS = 5_000;

/** 每个连接独占 SDK 缓存，避免服务器自报身份相同导致缓存跨服务复用。 */
export function createMcpClient(onCatalogChanged?: () => void): Client {
  return new Client(
    { name: "pi-harness", version: "0.0.0" },
    {
      capabilities: {},
      responseCacheStore: new InMemoryResponseCacheStore({ maxEntries: 64 }),
      ...(onCatalogChanged === undefined
        ? {}
        : {
            listChanged: {
              tools: { autoRefresh: false, debounceMs: 300, onChanged: onCatalogChanged },
              resources: { autoRefresh: false, debounceMs: 300, onChanged: onCatalogChanged },
              prompts: { autoRefresh: false, debounceMs: 300, onChanged: onCatalogChanged },
            },
          }),
      inputRequired: { autoFulfill: false },
      listMaxPages: MAX_DISCOVERY_PAGES,
      versionNegotiation: {
        mode: "auto",
        probe: { maxRetries: 0, timeoutMs: VERSION_PROBE_TIMEOUT_MS },
      },
    },
  );
}
