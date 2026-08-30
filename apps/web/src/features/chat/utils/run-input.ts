import type { RunInputAttachment } from "@pi-harness/agent-runtime/user-input";

export const MAX_RUN_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_RUN_ATTACHMENTS = 8;
export const MAX_RUN_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);
const IMAGE_MIME_TYPE_BY_EXTENSION = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
function getFileExtension(name: string): string {
  return name.split(".").at(-1)?.toLocaleLowerCase() ?? "";
}

function resolveAttachmentMimeType(file: File): string {
  const extension = getFileExtension(file.name);
  if (extension === "svg") return "text/plain";
  if (SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) return file.type;
  if (extension in IMAGE_MIME_TYPE_BY_EXTENSION) {
    return IMAGE_MIME_TYPE_BY_EXTENSION[extension as keyof typeof IMAGE_MIME_TYPE_BY_EXTENSION];
  }
  if (file.type) return file.type;
  return "application/octet-stream";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`读取附件 ${file.name} 失败`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`读取附件 ${file.name} 失败`));
        return;
      }
      const separatorIndex = result.indexOf(",");
      if (separatorIndex < 0) {
        reject(new Error(`附件 ${file.name} 的编码无效`));
        return;
      }
      resolve(result.slice(separatorIndex + 1));
    };
    reader.readAsDataURL(file);
  });
}

export async function createRunInputAttachment(file: File): Promise<RunInputAttachment> {
  return {
    data: await readFileAsBase64(file),
    mimeType: resolveAttachmentMimeType(file),
    name: file.name,
    size: file.size,
  };
}
