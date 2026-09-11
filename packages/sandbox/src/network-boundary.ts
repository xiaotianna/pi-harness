import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { matchesDomainPatternWithPort } from "@anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js";
import { classifyNetworkAddress, NetworkAddressKind } from "@pi-harness/policy";

export const SandboxNetworkErrorCode = {
  INVALID_URL: "invalid_url",
  TARGET_NOT_ALLOWED: "target_not_allowed",
  DNS_FAILED: "dns_failed",
} as const;

export type SandboxNetworkErrorCode =
  (typeof SandboxNetworkErrorCode)[keyof typeof SandboxNetworkErrorCode];

export class SandboxNetworkError extends Error {
  public constructor(
    public readonly code: SandboxNetworkErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface SandboxNetworkPolicy {
  endpoint: URL;
  allowedOrigins: readonly string[];
  allowPrivateNetwork: boolean;
  protectedLocalPorts: readonly number[];
  allowedDomains: readonly string[];
  deniedDomains: readonly string[];
  timeoutMs: number;
}

/** 远程 transport 没有本机子进程；复用 SRT 域名规则，并固定已校验的 DNS 目标。 */
export function validateSandboxNetworkUrl(value: string | URL, policy: SandboxNetworkPolicy): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SandboxNetworkError(SandboxNetworkErrorCode.INVALID_URL, "网络地址无效");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    (url.origin !== policy.endpoint.origin && !policy.allowedOrigins.includes(url.origin)) ||
    (policy.endpoint.protocol === "https:" && url.protocol !== "https:")
  ) {
    throw new SandboxNetworkError(
      SandboxNetworkErrorCode.TARGET_NOT_ALLOWED,
      "请求地址超出已授权的网络范围",
    );
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (
    policy.deniedDomains.some((pattern) => matchesDomainPatternWithPort(host, port, pattern)) ||
    (policy.allowedDomains.length > 0 &&
      !policy.allowedDomains.some((pattern) => matchesDomainPatternWithPort(host, port, pattern)))
  ) {
    throw new SandboxNetworkError(
      SandboxNetworkErrorCode.TARGET_NOT_ALLOWED,
      "请求目标未被沙箱联网规则允许",
    );
  }
  return url;
}

export async function resolveSandboxNetworkTarget(
  url: URL,
  policy: SandboxNetworkPolicy,
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
        !(family === 0 && kind === NetworkAddressKind.PROXY_FAKE) &&
        !(
          kind === NetworkAddressKind.PRIVATE &&
          policy.allowPrivateNetwork &&
          !policy.protectedLocalPorts.includes(port)
        )
      );
    })
  ) {
    throw new SandboxNetworkError(
      SandboxNetworkErrorCode.TARGET_NOT_ALLOWED,
      "目标地址不可用或不符合网络访问策略",
    );
  }
  const selected = addresses[0];
  if (selected === undefined || (selected.family !== 4 && selected.family !== 6)) {
    throw new SandboxNetworkError(SandboxNetworkErrorCode.DNS_FAILED, "DNS 解析失败");
  }
  return { address: selected.address, family: selected.family };
}
