import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const MAX_FILE_BYTES = 1024 * 1024;

export interface FileChangeDetails {
  after: string;
  before: string | null;
  diff: string;
  path: string;
}

export async function readTextFile(path: string, signal?: AbortSignal): Promise<string> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) {
    throw new Error(`文件不存在、不是普通文件或超过 ${MAX_FILE_BYTES} 字节限制`);
  }
  return readFile(path, { encoding: "utf8", ...(signal === undefined ? {} : { signal }) });
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
