import { isPlainObject } from "es-toolkit";
import type { ToolRegistration } from "../lib/tool-registry.js";

export const MAX_TOOL_SEARCH_RESULTS = 10;
export const MAX_VISIBLE_TOOLS = 64;
const MAX_CACHED_TOOL_VECTORS = 4_000;
const SEMANTIC_BATCH_SIZE = 32;
const SEMANTIC_CANDIDATES = 60;
const SEMANTIC_SCORE_DROP = 0.05;
const SEMANTIC_TIMEOUT_MS = 18_000;
const RANK_FUSION_K = 60;

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
  return value.toLocaleLowerCase().replace(/[_/-]+/g, " ");
}

function parameterNames(parameters: unknown): string {
  return isPlainObject(parameters) && isPlainObject(parameters.properties)
    ? Object.keys(parameters.properties).join(" ")
    : "";
}

function searchTerms(query: string): string[] {
  const chunks = query.match(/[\p{Script=Han}]+|[\p{L}\p{N}]+/gu) ?? [];
  return [
    ...new Set(
      chunks.flatMap((chunk) => {
        if (!/^[\p{Script=Han}]+$/u.test(chunk) || chunk.length <= 2) return [chunk];
        return Array.from({ length: chunk.length - 1 }, (_, index) =>
          chunk.slice(index, index + 2),
        );
      }),
    ),
  ];
}

function toolSearchScore(
  query: string,
  name: string,
  label: string,
  description: string,
  parameters: string,
): number {
  const normalizedName = normalizeName(name);
  const normalizedLabel = normalizeName(label);
  const originalName = normalizeName(label.split(" / ").at(-1) ?? label);
  const normalizedDescription = description.toLocaleLowerCase();
  const normalizedParameters = parameters.toLocaleLowerCase().replace(/[_/-]+/g, " ");
  const normalizedQuery = query.replace(/[_/-]+/g, " ");
  const terms = searchTerms(query);
  if (terms.length === 0) return 0;
  const hits = terms.map((term) =>
    normalizedName.includes(term)
      ? 8
      : normalizedLabel.includes(term)
        ? 6
        : normalizedDescription.includes(term)
          ? 2
          : normalizedParameters.includes(term)
            ? 1
            : 0,
  );
  return (
    (normalizedName === normalizedQuery ? 100 : 0) +
    (originalName === normalizedQuery ? 100 : 0) +
    (normalizedName.includes(normalizedQuery) ? 40 : 0) +
    (normalizedLabel.includes(normalizedQuery) ? 30 : 0) +
    (normalizedDescription.includes(query) ? 12 : 0) +
    hits.reduce<number>((total, hit) => total + hit, 0)
  );
}

function candidates(registrations: readonly ToolRegistration[], query: string): SearchCandidate[] {
  return registrations.map(({ searchDescription, source, tool }) => {
    const description = searchDescription ?? tool.description;
    const parameters = parameterNames(tool.parameters);
    const match = {
      description: description.slice(0, 160),
      label: tool.label,
      name: tool.name,
      source: source.startsWith("mcp:") ? "mcp" : source,
    };
    const text = `${tool.label}. ${description.slice(0, 900)}. Parameters: ${parameters}`;
    return {
      exact:
        normalizeName(tool.name) === normalizeName(query) ||
        normalizeName(tool.label.split(" / ").at(-1) ?? tool.label) === normalizeName(query),
      key: JSON.stringify([source, tool.name, text]),
      match,
      score: toolSearchScore(query, tool.name, tool.label, description, parameters),
      text,
    };
  });
}

function lexicalCandidates(values: readonly SearchCandidate[]): SearchCandidate[] {
  return values
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) => right.score - left.score || left.match.name.localeCompare(right.match.name),
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
    const weight = candidate.score >= 40 ? 1.5 : candidate.score >= 8 ? 1.1 : 0.8;
    ranks.set(candidate.match.name, {
      candidate,
      score: weight / (RANK_FUSION_K + index + 1),
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

/** 检索只处理候选摘要；完整 schema 仍由 load_tools 在下一次模型请求中提供。 */
export class HybridToolSearch {
  private readonly vectors = new Map<string, readonly number[]>();

  public constructor(private readonly embedder?: ToolSearchEmbedder) {}

  public async search(
    registrations: readonly ToolRegistration[],
    query: string,
    signal?: AbortSignal,
  ): Promise<ToolSearchMatch[]> {
    signal?.throwIfAborted();
    const phrase = query.trim().toLocaleLowerCase();
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
  const phrase = query.trim().toLocaleLowerCase();
  if (!phrase || limit <= 0) return [];
  return lexicalCandidates(candidates(registrations, phrase))
    .slice(0, Math.min(limit, MAX_TOOL_SEARCH_RESULTS))
    .map(({ match }) => match);
}

export function loadToolRegistrations(
  registrations: readonly ToolRegistration[],
  names: readonly string[],
  searchedNames: ReadonlySet<string>,
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
    if (!searchedNames.has(name) || !available.has(name))
      throw new Error(`TOOL_LOAD_NOT_FOUND: 工具 ${name} 不在本轮搜索结果中`);
  }
  const newNames = names.filter((name) => !visibleNames.has(name));
  if (visibleNames.size + newNames.length > MAX_VISIBLE_TOOLS)
    throw new Error("TOOL_LOAD_LIMIT_EXCEEDED: 当前 Run 的工具数量已达上限");
  for (const name of newNames) visibleNames.add(name);
  return newNames;
}
