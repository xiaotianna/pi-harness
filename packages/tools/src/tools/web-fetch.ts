import { Buffer } from "node:buffer";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { parseDocumentText } from "../utils/document-text.js";

const DEFAULT_CHARACTER_LIMIT = 30_000;
const MAX_CHARACTER_LIMIT = 50_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const PRIVATE_NETWORKS = new BlockList();
const PROXY_FAKE_IP_NETWORKS = new BlockList();

PROXY_FAKE_IP_NETWORKS.addSubnet("198.18.0.0", 15, "ipv4");

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  PRIVATE_NETWORKS.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  PRIVATE_NETWORKS.addSubnet(network, prefix, "ipv6");
}

const WebFetchParameters = Type.Object({
  url: Type.String({
    description: "要读取的公开 HTTP(S) 网页 URL",
    maxLength: 2_048,
    minLength: 1,
  }),
  startIndex: Type.Optional(
    Type.Integer({ description: "从提取正文的第几个字符开始返回，默认 0", minimum: 0 }),
  ),
  maxCharacters: Type.Optional(
    Type.Integer({
      description: "本次最多返回的正文字符数，默认 30000",
      maximum: MAX_CHARACTER_LIMIT,
      minimum: 1_000,
    }),
  ),
});

export type WebFetchDetails =
  | { stage: "connecting" | "downloading" | "parsing"; url: string }
  | {
      contentType: string;
      endIndex: number;
      finalUrl: string;
      stage: "completed";
      startIndex: number;
      statusCode: number;
      title: string;
      totalCharacters: number;
      truncated: boolean;
      url: string;
    };

interface WebResponse {
  body: Buffer;
  contentType: string;
  finalUrl: URL;
  statusCode: number;
}

function parseWebUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("WEB_FETCH_INVALID_URL: URL 无效");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("WEB_FETCH_INVALID_URL: 仅支持不含凭据的 HTTP(S) URL");
  }
  return url;
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname.toLowerCase() === "localhost") {
    throw new Error("WEB_FETCH_PRIVATE_ADDRESS: 不允许访问本机或私有网络地址");
  }
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => {
      const addressFamily = family === 6 ? "ipv6" : "ipv4";
      return (
        PRIVATE_NETWORKS.check(address, addressFamily) &&
        (literalFamily !== 0 || !PROXY_FAKE_IP_NETWORKS.check(address, addressFamily))
      );
    })
  ) {
    throw new Error("WEB_FETCH_PRIVATE_ADDRESS: 不允许访问本机或私有网络地址");
  }
  const selected = addresses[0];
  if (!selected || (selected.family !== 4 && selected.family !== 6)) {
    throw new Error("WEB_FETCH_DNS_ERROR: 无法解析网页地址");
  }
  return { address: selected.address, family: selected.family };
}

function responseStream(response: Readable & { headers: Record<string, unknown> }): Readable {
  const encoding = response.headers["content-encoding"];
  if (encoding === undefined || encoding === "identity") return response;
  if (encoding === "br") return response.pipe(createBrotliDecompress());
  if (encoding === "gzip") return response.pipe(createGunzip());
  if (encoding === "deflate") return response.pipe(createInflate());
  throw new Error(`WEB_FETCH_ENCODING_UNSUPPORTED: 不支持 ${String(encoding)} 内容编码`);
}

async function readResponseBody(
  response: Readable & { headers: Record<string, unknown> },
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of responseStream(response)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      throw new Error("WEB_FETCH_TOO_LARGE: 网页解压后超过 5 MiB 限制");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function requestPage(
  url: URL,
  signal?: AbortSignal,
): Promise<{
  body: Buffer;
  headers: Record<string, unknown>;
  location?: string;
  statusCode: number;
}> {
  const resolved = await resolvePublicAddress(url);
  const pinnedLookup: LookupFunction = (_hostname, options, callback) =>
    options.all ? callback(null, [resolved]) : callback(null, resolved.address, resolved.family);
  const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
  const response = await new Promise<Parameters<typeof readResponseBody>[0]>((resolve, reject) => {
    const request = requester(
      url,
      {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/json,application/pdf,text/plain,text/markdown,application/xml;q=0.9,*/*;q=0.1",
          "accept-encoding": "br, gzip, deflate",
          "user-agent": "PI-Harness/1.0 (+local agent web fetch)",
        },
        lookup: pinnedLookup,
        ...(signal === undefined ? {} : { signal }),
      },
      resolve,
    );
    request.once("error", reject);
    request.end();
  });
  const statusCode =
    "statusCode" in response && typeof response.statusCode === "number" ? response.statusCode : 0;
  const headers = response.headers;
  const location = typeof headers.location === "string" ? headers.location : undefined;
  if (statusCode >= 300 && statusCode < 400 && location) {
    response.resume();
    return { body: Buffer.alloc(0), headers, location, statusCode };
  }
  if (statusCode < 200 || statusCode >= 300) {
    response.resume();
    throw new Error(`WEB_FETCH_HTTP_ERROR: 网页返回 HTTP ${statusCode}`);
  }
  const contentLength = Number(headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    response.resume();
    throw new Error("WEB_FETCH_TOO_LARGE: 网页响应超过 5 MiB 限制");
  }
  return { body: await readResponseBody(response), headers, statusCode };
}

async function fetchWebResponse(url: URL, signal?: AbortSignal): Promise<WebResponse> {
  let currentUrl = url;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    signal?.throwIfAborted();
    const response = await requestPage(currentUrl, signal);
    if (response.location === undefined) {
      const rawContentType = response.headers["content-type"];
      return {
        body: response.body,
        contentType: typeof rawContentType === "string" ? rawContentType : "text/plain",
        finalUrl: currentUrl,
        statusCode: response.statusCode,
      };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error(`WEB_FETCH_REDIRECT_LIMIT: 网页重定向超过 ${MAX_REDIRECTS} 次`);
    }
    currentUrl = parseWebUrl(new URL(response.location, currentUrl).href);
  }
  throw new Error("WEB_FETCH_REDIRECT_LIMIT: 网页重定向过多");
}

function decodeHtmlEntities(value: string): string {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' } as const;
  return value
    .replace(/&#(x?[\da-f]+);/gi, (entity, code: string) => {
      const point = Number.parseInt(
        code.startsWith("x") || code.startsWith("X") ? code.slice(1) : code,
        code.toLowerCase().startsWith("x") ? 16 : 10,
      );
      return Number.isSafeInteger(point) ? String.fromCodePoint(point) : entity;
    })
    .replace(
      /&(amp|apos|gt|lt|nbsp|quot);/gi,
      (entity, name: string) => named[name.toLowerCase() as keyof typeof named] ?? entity,
    );
}

function htmlToText(html: string): { text: string; title: string } {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtmlEntities(titleMatch?.[1]?.replace(/<[^>]+>/g, " ") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const text = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|svg|template|noscript|head)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|hr)\b[^>]*\/?\s*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(
        /<\/(address|article|aside|blockquote|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tr|ul)>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, title };
}

function decodeText(buffer: Buffer, contentType: string): string {
  const charset = contentType.match(/charset=([^;\s]+)/i)?.[1]?.replace(/["']/g, "") ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder().decode(buffer);
  }
}

async function extractWebContent(
  response: WebResponse,
  signal?: AbortSignal,
): Promise<{ text: string; title: string }> {
  const mimeType = response.contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "text/plain";
  if (mimeType === "application/pdf" || response.body.subarray(0, 5).toString() === "%PDF-") {
    const text = await parseDocumentText(response.body, "pdf", signal);
    if (!text) throw new Error("WEB_FETCH_EMPTY: PDF 中没有可提取文字");
    return { text, title: response.finalUrl.pathname.split("/").at(-1) || "PDF document" };
  }
  if (
    mimeType === "text/html" ||
    mimeType === "application/xhtml+xml" ||
    mimeType === "application/xml" ||
    mimeType.endsWith("+xml")
  ) {
    return htmlToText(decodeText(response.body, response.contentType));
  }
  if (mimeType === "application/json") {
    const raw = decodeText(response.body, response.contentType);
    try {
      return { text: JSON.stringify(JSON.parse(raw), null, 2), title: response.finalUrl.hostname };
    } catch {
      return { text: raw.trim(), title: response.finalUrl.hostname };
    }
  }
  if (!mimeType.startsWith("text/")) {
    throw new Error(`WEB_FETCH_UNSUPPORTED_CONTENT: 不支持读取 ${mimeType || "未知"} 内容`);
  }
  return {
    text: decodeText(response.body, response.contentType).trim(),
    title: response.finalUrl.pathname.split("/").at(-1) || response.finalUrl.hostname,
  };
}

export function createWebFetchTool(): AgentTool<typeof WebFetchParameters, WebFetchDetails> {
  return {
    name: "web_fetch",
    label: "Web fetch",
    description:
      "读取公开 HTTP(S) 网页、文本、JSON 或 PDF 的正文。长内容可使用 startIndex 分页继续读取。",
    parameters: WebFetchParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal, onUpdate) {
      const requestedUrl = parseWebUrl(input.url.trim());
      const update = (stage: "connecting" | "downloading" | "parsing", text: string) =>
        onUpdate?.({
          content: [{ text, type: "text" }],
          details: { stage, url: requestedUrl.href },
        });

      update("connecting", "正在连接网页…");
      const response = await fetchWebResponse(requestedUrl, signal);
      update("downloading", "网页已响应，正在读取内容…");
      update("parsing", "正在提取网页正文…");
      const extracted = await extractWebContent(response, signal);
      if (!extracted.text) throw new Error("WEB_FETCH_EMPTY: 网页没有可读取的正文");

      const startIndex = input.startIndex ?? 0;
      if (startIndex >= extracted.text.length) {
        throw new Error(`WEB_FETCH_RANGE_ERROR: startIndex 超出正文长度 ${extracted.text.length}`);
      }
      const maxCharacters = input.maxCharacters ?? DEFAULT_CHARACTER_LIMIT;
      const endIndex = Math.min(extracted.text.length, startIndex + maxCharacters);
      const truncated = endIndex < extracted.text.length;
      const page = extracted.text.slice(startIndex, endIndex);
      const title = extracted.title || response.finalUrl.hostname;
      return {
        content: [
          {
            text: `# ${title}\n\n来源: ${response.finalUrl.href}\n\n${page}${
              truncated ? `\n\n[内容已截断；请从 startIndex=${endIndex} 继续读取]` : ""
            }`,
            type: "text",
          },
        ],
        details: {
          contentType: response.contentType,
          endIndex,
          finalUrl: response.finalUrl.href,
          stage: "completed",
          startIndex,
          statusCode: response.statusCode,
          title,
          totalCharacters: extracted.text.length,
          truncated,
          url: requestedUrl.href,
        },
      };
    },
  };
}
