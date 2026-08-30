import { readFile, stat } from "node:fs/promises";

const IMAGE_MIME_TYPE_BY_EXTENSION = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type SupportedImageMimeType =
  (typeof IMAGE_MIME_TYPE_BY_EXTENSION)[keyof typeof IMAGE_MIME_TYPE_BY_EXTENSION];

function getFileExtension(path: string): string {
  return path.split(".").at(-1)?.toLowerCase() ?? "";
}

export function expectedImageMimeType(path: string): SupportedImageMimeType | null {
  const extension = getFileExtension(path);
  return (
    IMAGE_MIME_TYPE_BY_EXTENSION[extension as keyof typeof IMAGE_MIME_TYPE_BY_EXTENSION] ?? null
  );
}

export function detectImageMimeType(buffer: Buffer): SupportedImageMimeType | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function readRegularFile(
  path: string,
  maximumBytes: number,
  signal?: AbortSignal,
): Promise<Buffer> {
  signal?.throwIfAborted();
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new Error("目标不是普通文件");
  if (metadata.size > maximumBytes) {
    throw new Error(`文件超过 ${Math.floor(maximumBytes / (1024 * 1024))} MB 限制`);
  }
  const buffer = await readFile(path, signal === undefined ? undefined : { signal });
  if (buffer.byteLength > maximumBytes) {
    throw new Error(`文件超过 ${Math.floor(maximumBytes / (1024 * 1024))} MB 限制`);
  }
  signal?.throwIfAborted();
  return buffer;
}
