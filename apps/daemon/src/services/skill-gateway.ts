import type { PluginDefinition } from "@pi-harness/tools";
import type { SkillOAuthCredential } from "../storage/skill-credential-store.js";
import {
  SkillConnectionError,
  SkillConnectionErrorCode,
  type SkillGatewayResponse,
} from "./skill-connection-types.js";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_GATEWAY_RESPONSE_BYTES = 5 * 1024 * 1024;

function matchesPath(patterns: readonly string[], pathname: string): boolean {
  return patterns.some((pattern) => new RegExp(pattern).test(pathname));
}

function isAllowedRequest(plugin: PluginDefinition, target: URL): boolean {
  if (!matchesPath(plugin.gateway.allowedPaths, target.pathname)) return false;
  return Object.entries(plugin.gateway.deniedQueryValues ?? {}).every(([name, deniedValues]) =>
    target.searchParams.getAll(name).every((value) => !deniedValues.includes(value)),
  );
}

export async function requestSkillGateway(
  plugin: PluginDefinition,
  credential: SkillOAuthCredential | undefined,
  path: string,
  search: string,
  signal?: AbortSignal,
): Promise<SkillGatewayResponse> {
  const target = new URL(`/${path.replace(/^\/+/, "")}`, `${plugin.apiUrl}/`);
  target.search = search;
  if (!isAllowedRequest(plugin, target)) {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.BAD_GATEWAY_PATH,
      `${plugin.name} Skill 只能访问已允许的只读 API 路径`,
    );
  }

  const shouldPostJson = matchesPath(plugin.gateway.queryJsonPostPaths ?? [], target.pathname);
  const query = target.searchParams.get("query");
  const requestBody = shouldPostJson ? JSON.stringify(query === null ? {} : { query }) : undefined;
  if (shouldPostJson) target.search = "";

  let response: Response;
  try {
    response = await fetch(target, {
      ...(requestBody === undefined ? {} : { body: requestBody, method: "POST" }),
      headers: {
        Accept: "*/*",
        ...plugin.gateway.headers,
        Authorization: `Bearer ${credential?.accessToken ?? "test_token_admin"}`,
        ...(requestBody === undefined ? {} : { "Content-Type": "application/json" }),
        "User-Agent": "pi-harness-skill-gateway",
      },
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.UPSTREAM_FAILED,
      `${plugin.name} Skill 网关无法连接上游服务`,
    );
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_GATEWAY_RESPONSE_BYTES) {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.UPSTREAM_FAILED,
      `${plugin.name} Skill 网关响应过大`,
    );
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > MAX_GATEWAY_RESPONSE_BYTES) {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.UPSTREAM_FAILED,
      `${plugin.name} Skill 网关响应过大`,
    );
  }
  return {
    body,
    contentType: response.headers.get("content-type") ?? "application/json",
    statusCode: response.status,
  };
}
