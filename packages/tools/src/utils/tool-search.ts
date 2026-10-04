import { isPlainObject } from "es-toolkit";
import type { ToolRegistration } from "../lib/tool-registry.js";

export const TOOL_SEARCH_TOOL_NAME = "tool_search";
export const DEFAULT_TOOL_SEARCH_LIMIT = 8;
export const MAX_TOOL_SEARCH_RESULTS = 10;
export const MAX_VISIBLE_TOOLS = 64;
const MAX_CACHED_TOOL_VECTORS = 4_000;
const SEMANTIC_BATCH_SIZE = 32;
const SEMANTIC_CANDIDATES = 60;
const SEMANTIC_SCORE_DROP = 0.05;
const SEMANTIC_TIMEOUT_MS = 18_000;
const RANK_FUSION_K = 60;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

export interface ToolSearchMatch {
  description: string;
  label: string;
  name: string;
  source: string;
}

export interface ToolSearchEmbedder {
  embed(
    purpose: "document" | "query",
    inputs: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly (readonly number[])[]>;
}

interface SearchCandidate {
  exact: boolean;
  key: string;
  match: ToolSearchMatch;
  score: number;
  text: string;
}

function normalizeName(value: string): string {
  return value
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .toLocaleLowerCase()
    .replace(/[_/-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parameterSearchText(parameters: unknown): string {
  const pending: unknown[] = [parameters];
  const visited = new Set<object>();
  const text: string[] = [];
  while (pending.length > 0) {
    const schema = pending.pop();
    if (!isPlainObject(schema) || visited.has(schema)) continue;
    visited.add(schema);
    if (typeof schema.description === "string") text.push(schema.description);
    if (isPlainObject(schema.properties)) {
      for (const [name, property] of Object.entries(schema.properties)) {
        text.push(name);
        pending.push(property);
      }
    }
    if (isPlainObject(schema.items)) pending.push(schema.items);
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      if (Array.isArray(schema[keyword])) pending.push(...schema[keyword]);
    }
  }
  return text.join(" ");
}

function searchTerms(text: string): string[] {
  const chunks =
    normalizeName(text)
      .replace(/([\p{Script=Han}]+)/gu, " $1 ")
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  return chunks.flatMap((chunk) => {
    if (/^[\p{Script=Han}]+$/u.test(chunk)) {
      const characters = Array.from(chunk);
      if (characters.length <= 2) return [chunk];
      return characters.slice(1).map((character, index) => `${characters[index]}${character}`);
    }
    // 仅归一化常见英语复数，避免把 status、analysis 等单词截断。
    if (/^[a-z]+$/.test(chunk) && chunk.length > 3) {
      if (chunk.length > 4 && chunk.endsWith("ies")) return [`${chunk.slice(0, -3)}y`];
      if (/(ches|shes|sses|xes|zes)$/.test(chunk)) return [chunk.slice(0, -2)];
      if (chunk.endsWith("s") && !/(ss|us|is|as)$/.test(chunk)) return [chunk.slice(0, -1)];
    }
    return [chunk];
  });
}

function candidates(registrations: readonly ToolRegistration[], query: string): SearchCandidate[] {
  const normalizedQuery = normalizeName(query);
  const queryTerms = [...new Set(searchTerms(query))];
  const documentFrequencies = new Map<string, number>();
  const documents = registrations.map(({ searchDescription, source, tool }) => {
    const description = searchDescription ?? tool.description;
    const parameters = parameterSearchText(tool.parameters);
    const match = {
      description: description.slice(0, 160),
      label: tool.label,
      name: tool.name,
      source: source.startsWith("mcp:") ? "mcp" : source,
    };
    const text = `${tool.label}. ${description.slice(0, 900)}. Parameters: ${parameters.slice(0, 900)}`;
    // 普通索引使用上游名称，模型别名中的服务器散列只参与完整名称匹配。
    const terms = searchTerms(`${tool.label} ${description} ${parameters}`);
    const frequencies = new Map<string, number>();
    for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    for (const term of frequencies.keys()) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
    return {
      candidate: {
        exact:
          normalizeName(tool.name) === normalizedQuery ||
          normalizeName(tool.label.split(" / ").at(-1) ?? tool.label) === normalizedQuery,
        key: JSON.stringify([source, tool.name, text]),
        match,
        text,
      },
      frequencies,
      length: terms.length,
    };
  });
  const averageLength =
    documents.reduce((total, document) => total + document.length, 0) / documents.length || 1;
  return documents.map(({ candidate, frequencies, length }) => ({
    ...candidate,
    score: queryTerms.reduce((score, term) => {
      const frequency = frequencies.get(term) ?? 0;
      if (frequency === 0) return score;
      const documentFrequency = documentFrequencies.get(term) ?? 0;
      const inverseDocumentFrequency = Math.log1p(
        (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      return (
        score +
        (inverseDocumentFrequency * frequency * (BM25_K1 + 1)) /
          (frequency + BM25_K1 * (1 - BM25_B + (BM25_B * length) / averageLength))
      );
    }, 0),
  }));
}

function lexicalCandidates(values: readonly SearchCandidate[]): SearchCandidate[] {
  return values
    .filter(({ exact, score }) => exact || score > 0)
    .sort(
      (left, right) =>
        Number(right.exact) - Number(left.exact) ||
        right.score - left.score ||
        left.match.name.localeCompare(right.match.name),
    );
}

function dotProduct(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) return Number.NEGATIVE_INFINITY;
  return left.reduce((score, value, index) => score + value * (right[index] ?? 0), 0);
}

function fuseCandidates(
  lexical: readonly SearchCandidate[],
  semantic: readonly SearchCandidate[],
): ToolSearchMatch[] {
  const ranks = new Map<string, { candidate: SearchCandidate; score: number }>();
  for (const [index, candidate] of lexical.entries()) {
    ranks.set(candidate.match.name, {
      candidate,
      score: 1 / (RANK_FUSION_K + index + 1),
    });
  }
  for (const [index, candidate] of semantic.entries()) {
    const entry = ranks.get(candidate.match.name);
    ranks.set(candidate.match.name, {
      candidate,
      score: (entry?.score ?? 0) + 1 / (RANK_FUSION_K + index + 1),
    });
  }
  return [...ranks.values()]
    .sort(
      (left, right) =>
        Number(right.candidate.exact) - Number(left.candidate.exact) ||
        right.score - left.score ||
        left.candidate.match.name.localeCompare(right.candidate.match.name),
    )
    .slice(0, MAX_TOOL_SEARCH_RESULTS)
    .map(({ candidate }) => candidate.match);
}

/** 检索只处理候选摘要；tool_search 加载后由 Runtime 在下一次模型请求中提供完整 schema。 */
export class HybridToolSearch {
  private readonly vectors = new Map<string, readonly number[]>();

  public constructor(private readonly embedder?: ToolSearchEmbedder) {}

  public async search(
    registrations: readonly ToolRegistration[],
    query: string,
    signal?: AbortSignal,
  ): Promise<ToolSearchMatch[]> {
    signal?.throwIfAborted();
    const phrase = query.trim();
    if (!phrase) return [];
    const available = candidates(registrations, phrase);
    const lexical = lexicalCandidates(available);
    const fallback = lexical.slice(0, MAX_TOOL_SEARCH_RESULTS).map(({ match }) => match);
    if (!this.embedder || available.length === 0 || lexical[0]?.exact) return fallback;

    try {
      const semanticSignal = AbortSignal.any([
        ...(signal ? [signal] : []),
        AbortSignal.timeout(SEMANTIC_TIMEOUT_MS),
      ]);
      const [queryVector] = await this.embedder.embed("query", [phrase], semanticSignal);
      if (!queryVector?.length) return fallback;
      const missing = available.filter(({ key }) => !this.vectors.has(key));
      const generated = new Map<string, readonly number[]>();
      for (let offset = 0; offset < missing.length; offset += SEMANTIC_BATCH_SIZE) {
        semanticSignal.throwIfAborted();
        const batch = missing.slice(offset, offset + SEMANTIC_BATCH_SIZE);
        const vectors = await this.embedder.embed(
          "document",
          batch.map(({ text }) => text),
          semanticSignal,
        );
        if (vectors.length !== batch.length) return fallback;
        for (const [index, candidate] of batch.entries()) {
          const vector = vectors[index];
          if (!vector || vector.length !== queryVector.length) return fallback;
          generated.set(candidate.key, vector);
          this.vectors.set(candidate.key, vector);
        }
      }
      while (this.vectors.size > MAX_CACHED_TOOL_VECTORS) {
        const oldest = this.vectors.keys().next().value;
        if (oldest === undefined) break;
        this.vectors.delete(oldest);
      }
      signal?.throwIfAborted();
      const scored = available
        .map((candidate) => ({
          candidate,
          similarity: dotProduct(
            queryVector,
            generated.get(candidate.key) ?? this.vectors.get(candidate.key) ?? [],
          ),
        }))
        .sort((left, right) => right.similarity - left.similarity);
      const best = scored[0]?.similarity;
      const semantic = scored
        .filter(({ similarity }) => best !== undefined && similarity >= best - SEMANTIC_SCORE_DROP)
        .slice(0, SEMANTIC_CANDIDATES)
        .map(({ candidate }) => candidate);
      return fuseCandidates(lexical, semantic);
    } catch (error: unknown) {
      if (signal?.aborted) throw error;
      return fallback;
    }
  }
}

export function searchToolRegistrations(
  registrations: readonly ToolRegistration[],
  query: string,
  limit = MAX_TOOL_SEARCH_RESULTS,
): ToolSearchMatch[] {
  const phrase = query.trim();
  if (!phrase || limit <= 0) return [];
  return lexicalCandidates(candidates(registrations, phrase))
    .slice(0, Math.min(limit, MAX_TOOL_SEARCH_RESULTS))
    .map(({ match }) => match);
}

export function loadToolRegistrations(
  registrations: readonly ToolRegistration[],
  names: readonly string[],
  visibleNames: Set<string>,
): string[] {
  if (
    names.length < 1 ||
    names.length > MAX_TOOL_SEARCH_RESULTS ||
    new Set(names).size !== names.length
  )
    throw new Error("TOOL_LOAD_INVALID: 单次请选择 1 到 10 个不同的工具");
  const available = new Set(
    registrations.filter(({ source }) => source.startsWith("mcp:")).map(({ tool }) => tool.name),
  );
  for (const name of names) {
    if (!available.has(name))
      throw new Error(`TOOL_LOAD_NOT_FOUND: 工具 ${name} 不在本轮 MCP 目录中`);
  }
  const newNames = names.filter((name) => !visibleNames.has(name));
  if (visibleNames.size + newNames.length > MAX_VISIBLE_TOOLS)
    throw new Error("TOOL_LOAD_LIMIT_EXCEEDED: 当前 Run 的工具数量已达上限");
  for (const name of newNames) visibleNames.add(name);
  return newNames;
}
