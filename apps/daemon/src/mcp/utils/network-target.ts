import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { classifyNetworkAddress, NetworkAddressKind } from "@pi-harness/policy";
import { McpError, McpErrorCode } from "../errors.js";

export interface McpNetworkPolicy {
  endpoint: URL;
  allowedOrigins: readonly string[];
  allowPrivateNetwork: boolean;
  protectedLocalPorts: readonly number[];
  timeoutMs: number;
}

export function validateMcpNetworkUrl(value: string | URL, policy: McpNetworkPolicy): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 网络地址无效");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    (url.origin !== policy.endpoint.origin && !policy.allowedOrigins.includes(url.origin)) ||
    (policy.endpoint.protocol === "https:" && url.protocol !== "https:")
  ) {
    throw new McpError(McpErrorCode.TRUST_REQUIRED, "MCP 请求地址超出已授权的网络范围");
  }
  return url;
}

export async function resolveMcpNetworkTarget(
  url: URL,
  policy: McpNetworkPolicy,
  signal: AbortSignal,
): Promise<{ address: string; family: 4 | 6 }> {
  signal.throwIfAborted();
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const family = isIP(hostname);
  let addresses: { address: string; family: number }[];
  if (family !== 0) addresses = [{ address: hostname, family }];
  else if (hostname.toLowerCase() === "localhost")
    addresses = [{ address: "127.0.0.1", family: 4 }];
  else {
    const resolver = new Resolver({ timeout: 5_000, tries: 1 });
    const cancel = () => resolver.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const results = await Promise.allSettled([
        resolver.resolve4(hostname),
        resolver.resolve6(hostname),
      ]);
      addresses = results.flatMap((result, index) =>
        result.status === "fulfilled"
          ? result.value.map((address) => ({ address, family: index === 0 ? 4 : 6 }))
          : [],
      );
    } finally {
      signal.removeEventListener("abort", cancel);
    }
  }
  signal.throwIfAborted();
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (
    addresses.length === 0 ||
    addresses.length > 32 ||
    addresses.some(({ address }) => {
      const kind = classifyNetworkAddress(address);
      return (
        kind !== NetworkAddressKind.PUBLIC &&
        !(
          kind === NetworkAddressKind.PRIVATE &&
          policy.allowPrivateNetwork &&
          !policy.protectedLocalPorts.includes(port)
        )
      );
    })
  ) {
    throw new McpError(McpErrorCode.TRUST_REQUIRED, "MCP 目标地址不可用或不符合网络访问策略");
  }
  const selected = addresses[0];
  if (selected === undefined || (selected.family !== 4 && selected.family !== 6)) {
    throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP DNS 解析失败");
  }
  return { address: selected.address, family: selected.family };
}
