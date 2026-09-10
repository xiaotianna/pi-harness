import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import type { FetchLike } from "@modelcontextprotocol/client";
import { McpError, McpErrorCode } from "../errors.js";
import {
  type McpNetworkPolicy,
  resolveMcpNetworkTarget,
  validateMcpNetworkUrl,
} from "../utils/network-target.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENT_REQUESTS = 16;
const MAX_TOTAL_REQUESTS = 64;
const MAX_REDIRECTS = 3;
const HEADERS_TIMEOUT_MS = 15_000;
const MAX_BYTES_PER_SECOND = 16 * 1024 * 1024;
let totalActiveRequests = 0;

/** 每次连接固定校验后的 IP，禁用代理与自动重定向；认证头仅在目标 origin 上装配。 */
export function createMcpHttpFetch(
  policy: McpNetworkPolicy,
  credentialHeaders: Readonly<Record<string, string>>,
  verifyContext: () => void,
): FetchLike {
  let activeRequests = 0;
  return async (input, init) => {
    verifyContext();
    if (activeRequests >= MAX_CONCURRENT_REQUESTS || totalActiveRequests >= MAX_TOTAL_REQUESTS)
      throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 网络请求数量达到上限");
    activeRequests += 1;
    totalActiveRequests += 1;
    let isReleased = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      if (isReleased) return;
      isReleased = true;
      if (deadline !== undefined) clearTimeout(deadline);
      activeRequests -= 1;
      totalActiveRequests -= 1;
    };
    const controller = new AbortController();
    let request: Request;
    try {
      request = new Request(input, init);
    } catch {
      release();
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP HTTP 请求无效");
    }
    const signal = AbortSignal.any([request.signal, controller.signal]);
    deadline = setTimeout(() => controller.abort(), policy.timeoutMs);
    deadline.unref();
    try {
      if (!["GET", "HEAD", "POST", "DELETE"].includes(request.method))
        throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP HTTP 方法不受支持");
      const body = await readRequestBody(request, signal);
      const headers = new Headers(request.headers);
      for (const name of [
        "host",
        "origin",
        "cookie",
        "connection",
        "content-length",
        "transfer-encoding",
        "proxy-authorization",
      ]) {
        if (headers.has(name))
          throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 请求包含受保护的 HTTP 头");
      }
      headers.set("accept-encoding", "identity");
      let url = validateMcpNetworkUrl(request.url, policy);
      for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
        signal.throwIfAborted();
        verifyContext();
        const resolved = await resolveMcpNetworkTarget(url, policy, signal);
        const outgoing = new Headers(headers);
        if (url.origin === policy.endpoint.origin) {
          for (const [name, value] of Object.entries(credentialHeaders)) outgoing.set(name, value);
        } else {
          // MCP 身份凭据不能随着重定向或 SSE endpoint 发送到另一 origin。
          outgoing.delete("authorization");
          for (const name of Object.keys(credentialHeaders)) outgoing.delete(name);
        }
        const response = await sendRequest(url, request.method, outgoing, body, resolved, signal);
        const status = response.statusCode ?? 502;
        if ([301, 302, 303, 307, 308].includes(status) && request.redirect !== "manual") {
          response.destroy();
          if (
            request.redirect === "error" ||
            !["GET", "HEAD"].includes(request.method) ||
            !response.headers.location ||
            redirects === MAX_REDIRECTS
          ) {
            throw new McpError(
              McpErrorCode.CONNECTION_FAILED,
              "MCP 重定向被拒绝，无法安全重发请求",
            );
          }
          url = validateMcpNetworkUrl(new URL(response.headers.location, url), policy);
          continue;
        }
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (name === "set-cookie" || value === undefined) continue;
          for (const item of Array.isArray(value) ? value : [value])
            responseHeaders.append(name, item);
        }
        const encoding = responseHeaders.get("content-encoding");
        if (encoding !== null && encoding !== "identity") {
          response.destroy();
          throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 返回了未请求的压缩编码");
        }
        if (
          responseHeaders.get("content-type")?.split(";")[0]?.trim() === "text/event-stream" &&
          (request.method === "GET" || request.headers.get("mcp-method") === "subscriptions/listen")
        ) {
          // 订阅按连接中止/空闲时间管理，不能被普通 RPC 的总耗时定时器定期掐断。
          clearTimeout(deadline);
          response.setTimeout(60_000, () =>
            response.destroy(new Error("MCP subscription idle timeout")),
          );
        }
        if (request.method === "HEAD" || [204, 205, 304].includes(status)) {
          response.destroy();
          release();
          return new Response(null, { status, headers: responseHeaders });
        }
        response.once("close", release);
        const stream = boundedResponseStream(response, responseHeaders, release);
        const result = new Response(stream, { status, headers: responseHeaders });
        Object.defineProperties(result, {
          url: { value: url.href },
          redirected: { value: redirects > 0 },
        });
        return result;
      }
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 重定向次数超限");
    } catch (error: unknown) {
      controller.abort();
      release();
      if (error instanceof McpError) throw error;
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 网络请求失败或已取消");
    }
  };
}

/** OAuth 发现目标由受保护资源声明；每个请求仍执行 DNS 固定、私网与响应大小检查。 */
export function createMcpOAuthFetch(
  policy: Omit<McpNetworkPolicy, "endpoint" | "allowedOrigins">,
  verifyContext: () => void,
): FetchLike {
  return async (input, init) => {
    let endpoint: URL;
    try {
      endpoint = new URL(new Request(input, init).url);
    } catch {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP OAuth 请求地址无效");
    }
    return createMcpHttpFetch(
      { ...policy, endpoint, allowedOrigins: [] },
      {},
      verifyContext,
    )(input, init);
  };
}

async function readRequestBody(request: Request, signal: AbortSignal): Promise<Buffer | undefined> {
  if (request.body === null) return undefined;
  const reader = request.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BODY_BYTES)
        throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 请求体超过限额");
      chunks.push(part.value);
    }
    signal.throwIfAborted();
    return Buffer.concat(chunks, bytes);
  } finally {
    await reader.cancel();
    reader.releaseLock();
    signal.removeEventListener("abort", cancel);
  }
}

async function sendRequest(
  url: URL,
  method: string,
  headers: Headers,
  body: Buffer | undefined,
  address: { address: string; family: 4 | 6 },
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const lookup: LookupFunction = (_hostname, options, callback) =>
    options.all ? callback(null, [address]) : callback(null, address.address, address.family);
  return new Promise((resolve, reject) => {
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requester(
      url,
      {
        method,
        headers: Object.fromEntries(headers),
        lookup,
        signal,
        agent: false,
        maxHeaderSize: 32 * 1024,
      },
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("MCP response headers timeout")),
      HEADERS_TIMEOUT_MS,
    );
    request.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    request.end(body);
  });
}

function boundedResponseStream(
  response: IncomingMessage,
  headers: Headers,
  release: () => void,
): ReadableStream<Uint8Array> {
  const isSse = headers.get("content-type")?.split(";")[0]?.trim() === "text/event-stream";
  let bytes = 0;
  let frameBytes = 0;
  let previousWasNewline = false;
  let previousWasCarriageReturn = false;
  let windowStartedAt = performance.now();
  let windowBytes = 0;
  let windowFrames = 0;
  const iterator = response[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      try {
        const result = await iterator.next();
        if (result.done) {
          release();
          controller.close();
          return;
        }
        const chunk: unknown = result.value;
        if (!Buffer.isBuffer(chunk)) throw new Error("invalid response chunk");
        bytes += chunk.byteLength;
        if (performance.now() - windowStartedAt >= 1000) {
          windowStartedAt = performance.now();
          windowBytes = 0;
          windowFrames = 0;
        }
        windowBytes += chunk.byteLength;
        if (windowBytes > MAX_BYTES_PER_SECOND || (!isSse && bytes > MAX_RESPONSE_BYTES))
          throw new Error("response limit");
        if (isSse)
          for (const byte of chunk) {
            frameBytes += 1;
            if (frameBytes > MAX_RESPONSE_BYTES) throw new Error("SSE frame limit");
            if (byte === 10 || byte === 13) {
              if (byte === 10 && previousWasCarriageReturn) {
                previousWasCarriageReturn = false;
                continue;
              }
              if (previousWasNewline) {
                frameBytes = 0;
                windowFrames += 1;
                if (windowFrames > 1_024) throw new Error("SSE event rate limit");
              }
              previousWasNewline = true;
              previousWasCarriageReturn = byte === 13;
            } else {
              previousWasNewline = false;
              previousWasCarriageReturn = false;
            }
          }
        controller.enqueue(chunk);
      } catch {
        response.destroy();
        release();
        controller.error(
          new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 响应中断、无效或超过限额"),
        );
      }
    },
    cancel() {
      response.destroy();
      release();
    },
  });
}
