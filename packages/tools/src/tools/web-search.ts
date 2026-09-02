import type { AgentTool } from "@earendil-works/pi-agent-core";
import { isPlainObject } from "es-toolkit";
import { Type } from "typebox";
import type { WorkspaceToolContext } from "../lib/tool-context.js";

const DEFAULT_RESULT_LIMIT = 8;

const WebSearchParameters = Type.Object({
  query: Type.String({
    description: "要搜索的网页查询词，支持 site: 等搜索语法",
    maxLength: 500,
    minLength: 1,
  }),
  limit: Type.Optional(
    Type.Integer({ description: "返回结果数量，默认 8", maximum: 10, minimum: 1 }),
  ),
  language: Type.Optional(
    Type.String({ description: "搜索语言，例如 zh-CN、en 或 all", maxLength: 20, minLength: 2 }),
  ),
  timeRange: Type.Optional(
    Type.Union([Type.Literal("day"), Type.Literal("month"), Type.Literal("year")], {
      description: "可选的结果时间范围",
    }),
  ),
});

export interface WebSearchResult {
  content: string;
  title: string;
  url: string;
}

export type WebSearchDetails =
  | { query: string; results: readonly WebSearchResult[]; stage: "completed" }
  | { query: string; results: readonly WebSearchResult[]; stage: "processing" }
  | { query: string; results: readonly []; stage: "searching" };

function readSearchResults(value: unknown, limit: number): WebSearchResult[] {
  if (!isPlainObject(value) || !Array.isArray(value.results)) {
    throw new Error("WEB_SEARCH_INVALID_RESPONSE: SearXNG 返回了无效响应");
  }

  const seenUrls = new Set<string>();
  const results: WebSearchResult[] = [];
  for (const item of value.results) {
    if (!isPlainObject(item) || typeof item.title !== "string" || typeof item.url !== "string") {
      continue;
    }
    let url: URL;
    try {
      url = new URL(item.url);
    } catch {
      continue;
    }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || seenUrls.has(url.href)) {
      continue;
    }
    seenUrls.add(url.href);
    results.push({
      content: typeof item.content === "string" ? item.content.replace(/\s+/g, " ").trim() : "",
      title: item.title.replace(/\s+/g, " ").trim() || url.hostname,
      url: url.href,
    });
    if (results.length === limit) break;
  }
  return results;
}

function formatSearchResults(query: string, results: readonly WebSearchResult[]): string {
  if (results.length === 0) return `没有找到与“${query}”相关的网页结果。`;
  return results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\nURL: ${result.url}${
          result.content ? `\n摘要: ${result.content}` : ""
        }`,
    )
    .join("\n\n");
}

export function createWebSearchTool(
  context: WorkspaceToolContext,
): AgentTool<typeof WebSearchParameters, WebSearchDetails> {
  return {
    name: "web_search",
    label: "Web search",
    description:
      "通过本机 SearXNG 搜索公开网页，返回标题、URL 和摘要。需要网页正文时继续使用 web_fetch。",
    parameters: WebSearchParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal, onUpdate) {
      const query = input.query.trim();
      onUpdate?.({
        content: [{ text: `正在搜索“${query}”…`, type: "text" }],
        details: { query, results: [], stage: "searching" },
      });

      const searchUrl = new URL("/search", context.webSearchUrl);
      searchUrl.searchParams.set("categories", "general");
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("language", input.language ?? "all");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("safesearch", "1");
      if (input.timeRange !== undefined) searchUrl.searchParams.set("time_range", input.timeRange);

      const response = await fetch(searchUrl, {
        headers: { accept: "application/json" },
        ...(signal === undefined ? {} : { signal }),
      });
      if (!response.ok) {
        throw new Error(`WEB_SEARCH_HTTP_ERROR: SearXNG 返回 HTTP ${response.status}`);
      }

      const results = readSearchResults(await response.json(), input.limit ?? DEFAULT_RESULT_LIMIT);
      onUpdate?.({
        content: [{ text: `已找到 ${results.length} 个来源，正在整理结果…`, type: "text" }],
        details: { query, results, stage: "processing" },
      });
      return {
        content: [{ text: formatSearchResults(query, results), type: "text" }],
        details: { query, results, stage: "completed" },
      };
    },
  };
}
