import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

export const MAX_FILE_BYTES = 1024 * 1024;

export interface FileChangeDetails {
  after: string;
  before: string | null;
  diff: string;
  path: string;
}

export interface TextFilePage {
  hasMore: boolean;
  lines: string[];
  totalLines: number | null;
}

export function isFileChangeDetails(value: unknown): value is FileChangeDetails {
  if (typeof value !== "object" || value === null) return false;
  const details = value as Record<string, unknown>;
  return (
    typeof details.after === "string" &&
    (details.before === null || typeof details.before === "string") &&
    typeof details.diff === "string" &&
    typeof details.path === "string"
  );
}

export async function readTextFile(path: string, signal?: AbortSignal): Promise<string> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) {
    throw new Error(`文件不存在、不是普通文件或超过 ${MAX_FILE_BYTES} 字节限制`);
  }
  return readFile(path, { encoding: "utf8", ...(signal === undefined ? {} : { signal }) });
}

export async function readTextFilePage(
  path: string,
  offset: number,
  limit: number,
  signal?: AbortSignal,
): Promise<TextFilePage> {
  const handle = await open(path, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) throw new Error("文件不是普通文件");

    const lastByte = Buffer.allocUnsafe(1);
    const hasTrailingLineFeed =
      metadata.size > 0 && (await handle.read(lastByte, 0, 1, metadata.size - 1)).bytesRead === 1
        ? lastByte[0] === 0x0a
        : false;
    const input = handle.createReadStream({
      autoClose: false,
      encoding: "utf8",
      ...(signal === undefined ? {} : { signal }),
    });
    let currentLineBytes = 0;
    const checkLineSize = (chunk: Buffer | string) => {
      const parts = (typeof chunk === "string" ? chunk : chunk.toString("utf8")).split("\n");
      currentLineBytes += Buffer.byteLength(parts[0] ?? "", "utf8");
      if (currentLineBytes > MAX_FILE_BYTES) {
        input.destroy(new Error(`单行内容超过 ${MAX_FILE_BYTES} 字节限制`));
        return;
      }
      for (const part of parts.slice(1, -1)) {
        if (Buffer.byteLength(part, "utf8") > MAX_FILE_BYTES) {
          input.destroy(new Error(`单行内容超过 ${MAX_FILE_BYTES} 字节限制`));
          return;
        }
      }
      if (parts.length > 1) {
        currentLineBytes = Buffer.byteLength(parts.at(-1) ?? "", "utf8");
        if (currentLineBytes > MAX_FILE_BYTES) {
          input.destroy(new Error(`单行内容超过 ${MAX_FILE_BYTES} 字节限制`));
        }
      }
    };
    input.on("data", checkLineSize);
    const reader = createInterface({ crlfDelay: Number.POSITIVE_INFINITY, input });
    const lines: string[] = [];
    let lineNumber = 0;
    let selectedBytes = 0;
    let stoppedEarly = false;

    const appendLine = (line: string): boolean => {
      if (lineNumber < offset) return true;
      const lineBytes = Buffer.byteLength(line, "utf8") + (lines.length === 0 ? 0 : 1);
      if (lines.length === limit || selectedBytes + lineBytes > MAX_FILE_BYTES) {
        stoppedEarly = true;
        return false;
      }
      lines.push(line);
      selectedBytes += lineBytes;
      return true;
    };

    try {
      for await (const line of reader) {
        lineNumber += 1;
        if (!appendLine(line)) break;
      }
    } finally {
      input.removeListener("data", checkLineSize);
      reader.close();
      input.destroy();
    }

    if (!stoppedEarly && (metadata.size === 0 || hasTrailingLineFeed)) {
      lineNumber += 1;
      appendLine("");
    }

    return {
      hasMore: stoppedEarly,
      lines,
      totalLines: stoppedEarly ? null : lineNumber,
    };
  } finally {
    await handle.close();
  }
}

export function assertTextFileSize(content: string): void {
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
    throw new Error(`文件内容超过 ${MAX_FILE_BYTES} 字节限制`);
  }
}

export async function writeTextFileAtomic(
  path: string,
  content: string,
  mode: number | undefined,
  signal?: AbortSignal,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = resolve(dirname(path), `.${randomUUID()}.tmp`);
  try {
    signal?.throwIfAborted();
    await writeFile(temporaryPath, content, {
      encoding: "utf8",
      ...(signal === undefined ? {} : { signal }),
    });
    signal?.throwIfAborted();
    if (mode !== undefined) await chmod(temporaryPath, mode);
    signal?.throwIfAborted();
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
