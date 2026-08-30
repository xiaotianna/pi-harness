import type { SupportedFileType } from "officeparser";

const DOCUMENT_FILE_TYPE_BY_EXTENSION = {
  docm: "docx",
  docx: "docx",
  epub: "epub",
  odp: "odp",
  ods: "ods",
  odt: "odt",
  pdf: "pdf",
  pptm: "pptx",
  pptx: "pptx",
  rtf: "rtf",
  xlsm: "xlsx",
  xlsx: "xlsx",
} as const satisfies Partial<Record<string, SupportedFileType>>;

const DOCUMENT_FILE_TYPE_BY_MIME_TYPE = {
  "application/epub+zip": "epub",
  "application/pdf": "pdf",
  "application/rtf": "rtf",
  "application/vnd.ms-excel.sheet.macroenabled.12": "xlsx",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": "pptx",
  "application/vnd.ms-word.document.macroenabled.12": "docx",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/rtf": "rtf",
} as const satisfies Partial<Record<string, SupportedFileType>>;

const MAX_DOCUMENT_ARCHIVE_ENTRIES = 2_000;
const MAX_DOCUMENT_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

function getFileExtension(name: string): string {
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}

export function resolveDocumentFileType(name: string, mimeType: string): SupportedFileType | null {
  const extension = getFileExtension(name);
  return (
    DOCUMENT_FILE_TYPE_BY_EXTENSION[extension as keyof typeof DOCUMENT_FILE_TYPE_BY_EXTENSION] ??
    DOCUMENT_FILE_TYPE_BY_MIME_TYPE[
      mimeType.toLowerCase() as keyof typeof DOCUMENT_FILE_TYPE_BY_MIME_TYPE
    ] ??
    null
  );
}

/** 解析文档正文。调用方决定空正文和解析错误应该降级还是作为 Tool Error 抛出。 */
export async function parseDocumentText(
  buffer: Buffer,
  fileType: SupportedFileType,
  signal?: AbortSignal,
): Promise<string | null> {
  signal?.throwIfAborted();
  const { parseOffice } = await import("officeparser");
  signal?.throwIfAborted();
  const document = await parseOffice(buffer, {
    ...(signal === undefined ? {} : { abortSignal: signal }),
    decompressionLimits: {
      maxUncompressedBytes: MAX_DOCUMENT_UNCOMPRESSED_BYTES,
      maxZipEntries: MAX_DOCUMENT_ARCHIVE_ENTRIES,
    },
    extractAttachments: false,
    fileType,
    ignoreComments: true,
    includeRawContent: false,
  });
  signal?.throwIfAborted();
  return document.toText().trim() || null;
}

/** 附件与 @ 引用链路允许解析失败后按普通文件降级。 */
export async function extractDocumentText(
  buffer: Buffer,
  fileType: SupportedFileType,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    return await parseDocumentText(buffer, fileType, signal);
  } catch (error: unknown) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    return null;
  }
}
