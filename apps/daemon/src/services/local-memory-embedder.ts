import { join } from "node:path";
import { type FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import type { MemoryEmbedder } from "@pi-harness/memory";

const BATCH_SIZE = 32;
const MODEL_ID = "Xenova/multilingual-e5-small";
const MODEL_REVISION = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";

function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    void operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function readVectors(value: unknown, expected: number): readonly (readonly number[])[] {
  if (
    !Array.isArray(value) ||
    value.length !== expected ||
    !value.every((row) => Array.isArray(row) && row.length === 384 && row.every(Number.isFinite))
  ) {
    throw new Error("本地向量模型返回了无效数据");
  }
  return value as number[][];
}

export class LocalMemoryEmbedder implements MemoryEmbedder {
  public readonly modelId = `${MODEL_ID}@${MODEL_REVISION}:q8:mean:e5-v1`;
  private extractor: Promise<FeatureExtractionPipeline> | undefined;

  public constructor(private readonly globalRoot: string) {}

  public async embed(
    purpose: "document" | "query",
    inputs: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly (readonly number[])[]> {
    const extractor = await abortable(this.getExtractor(), signal);
    const vectors: (readonly number[])[] = [];
    const prefix = purpose === "query" ? "query" : "passage";
    for (let offset = 0; offset < inputs.length; offset += BATCH_SIZE) {
      signal?.throwIfAborted();
      const batch = inputs.slice(offset, offset + BATCH_SIZE).map((input) => `${prefix}: ${input}`);
      const output = await abortable(
        extractor(batch, { normalize: true, pooling: "mean" }),
        signal,
      );
      vectors.push(...readVectors(output.tolist() as unknown, batch.length));
    }
    return vectors;
  }

  private getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = pipeline("feature-extraction", MODEL_ID, {
        cache_dir: join(this.globalRoot, "models"),
        device: "cpu",
        dtype: "q8",
        revision: MODEL_REVISION,
      }).catch((error: unknown) => {
        this.extractor = undefined;
        throw error;
      });
    }
    return this.extractor;
  }
}
