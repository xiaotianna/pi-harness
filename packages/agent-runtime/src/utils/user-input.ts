import { glob, open, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { Api, ImageContent, Model, TextContent } from "@earendil-works/pi-ai";
import { resolveWorkspacePath } from "@pi-harness/policy";
import {
  extractDocumentText,
  hasIgnoredWorkspaceDirectory,
  resolveDocumentFileType,
} from "@pi-harness/tools";
import { buildUserContextPrompt, type UserContextSection } from "../prompts/user-context-prompt.js";
import {
  type HarnessUserAttachment,
  type HarnessUserMessage,
  isHarnessUserMessage,
  type RunInputAttachment,
  type RunInputContextReference,
  type RunUserInput,
  UserContextReferenceKind,
  UserInputContextError,
} from "../user-input.js";

const MAX_TEXT_CONTEXT_BYTES = 64 * 1024;
const MAX_IMAGE_CONTEXT_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_CONTEXT_BYTES = 5 * 1024 * 1024;
const MAX_FOLDER_ENTRIES = 200;
const MAX_USER_CONTEXT_CHARACTERS = 64 * 1024;
const MIN_USER_CONTEXT_CHARACTERS = 8 * 1024;
const USER_CONTEXT_ENVELOPE_ALLOWANCE = 4 * 1024;
const USER_CONTEXT_WINDOW_SHARE = 0.25;
const HISTORICAL_CONTEXT_TRUNCATION_MARKER = "\n\n[附件或引用内容已按本次模型请求的上下文预算截断]";
const HISTORICAL_CONTEXT_OMISSION_MARKER = "[附件或引用内容未在本次模型请求中重复展开]";
const BASE64_PATTERN = /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function decodeText(buffer: Buffer): string | null {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

function decodeAttachment(attachment: RunInputAttachment): Buffer {
  if (!BASE64_PATTERN.test(attachment.data)) {
    throw new UserInputContextError(`附件 ${attachment.name} 的内容编码无效`);
  }
  const buffer = Buffer.from(attachment.data, "base64");
  if (buffer.byteLength !== attachment.size) {
    throw new UserInputContextError(`附件 ${attachment.name} 的内容大小不匹配`);
  }
  return buffer;
}

function truncateTextContext(buffer: Buffer): { content: string | null; truncated: boolean } {
  const truncated = buffer.byteLength > MAX_TEXT_CONTEXT_BYTES;
  const content = decodeText(buffer.subarray(0, MAX_TEXT_CONTEXT_BYTES));
  return { content, truncated };
}

function formatTextContent(content: string, truncated: boolean): string {
  return truncated ? `${content}\n\n[内容已截断]` : content;
}

function truncateExtractedText(content: string): { content: string; truncated: boolean } {
  const buffer = Buffer.from(content, "utf8");
  return {
    content: buffer.subarray(0, MAX_TEXT_CONTEXT_BYTES).toString("utf8"),
    truncated: buffer.byteLength > MAX_TEXT_CONTEXT_BYTES,
  };
}

function formatBinaryFileContext(
  mimeType: string,
  size: number,
  canInspectWithTools: boolean,
): string {
  const inspectionHint = canInspectWithTools
    ? "需要正文时，请使用可用文件工具检查该路径。"
    : "当前模型消息协议不能直接接收这种二进制内容。";
  return [
    "文件已附加，但当前 Runtime 无法安全提取该格式的正文。",
    `MIME 类型：${mimeType || "application/octet-stream"}`,
    `文件大小：${size} bytes`,
    inspectionHint,
  ].join("\n");
}

export function resolveUserContextCharacterBudget(contextWindow: number): number {
  return Math.max(
    MIN_USER_CONTEXT_CHARACTERS,
    Math.min(MAX_USER_CONTEXT_CHARACTERS, Math.floor(contextWindow * USER_CONTEXT_WINDOW_SHARE)),
  );
}

function hasExpandedUserContext(message: AgentMessage): boolean {
  return (
    isHarnessUserMessage(message) &&
    ((message.attachments?.length ?? 0) > 0 || (message.contextReferences?.length ?? 0) > 0)
  );
}

function limitHarnessUserMessageText(
  message: AgentMessage,
  maximumCharacters: number,
): { consumedCharacters: number; message: AgentMessage } {
  if (!isHarnessUserMessage(message)) return { consumedCharacters: 0, message };
  const content = message.content;
  const sourceText =
    typeof content === "string" ? content : content.find((part) => part.type === "text")?.text;
  if (sourceText === undefined) return { consumedCharacters: 0, message };

  const isOmitted = maximumCharacters <= 0;
  const isTruncated = sourceText.length > maximumCharacters;
  if (!isOmitted && !isTruncated) {
    return { consumedCharacters: sourceText.length, message };
  }

  const nextText = isOmitted
    ? [message.displayText.trim(), HISTORICAL_CONTEXT_OMISSION_MARKER].filter(Boolean).join("\n\n")
    : `${sourceText.slice(
        0,
        Math.max(0, maximumCharacters - HISTORICAL_CONTEXT_TRUNCATION_MARKER.length),
      )}${HISTORICAL_CONTEXT_TRUNCATION_MARKER}`;
  const nextContent =
    typeof content === "string"
      ? nextText
      : content.map((part) => (part.type === "text" ? { ...part, text: nextText } : part));
  return {
    consumedCharacters: isOmitted ? 0 : nextText.length,
    message: { ...message, content: nextContent },
  };
}

/**
 * 仅限制附件和 @ 引用展开出的历史文本；不修改 Agent state 或 JSONL，也不裁剪普通对话。
 * 从最新消息向前分配预算，让当前任务引用优先于较早的附件内容。
 */
export function limitUserInputContext(
  messages: readonly AgentMessage[],
  contextWindow: number,
): AgentMessage[] {
  const projected = [...messages];
  let remainingCharacters =
    resolveUserContextCharacterBudget(contextWindow) + USER_CONTEXT_ENVELOPE_ALLOWANCE;

  for (let index = projected.length - 1; index >= 0; index -= 1) {
    const message = projected[index];
    if (message === undefined || !hasExpandedUserContext(message)) continue;
    const limited = limitHarnessUserMessageText(message, remainingCharacters);
    projected[index] = limited.message;
    remainingCharacters = Math.max(0, remainingCharacters - limited.consumedCharacters);
  }

  return projected;
}

async function readFilePrefix(
  path: string,
  fileSize: number,
  maximumBytes: number,
): Promise<{ buffer: Buffer; truncated: boolean }> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(Math.min(fileSize, maximumBytes));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return {
      buffer: buffer.subarray(0, bytesRead),
      truncated: fileSize > maximumBytes,
    };
  } finally {
    await handle.close();
  }
}

async function readWorkspaceFile(
  reference: RunInputContextReference,
  workspaceRoot: string,
  protectedPaths: readonly string[],
  supportsImages: boolean,
  signal?: AbortSignal,
): Promise<{ image?: ImageContent; section: UserContextSection }> {
  const path = await resolveWorkspacePath({
    path: reference.path,
    protectedPaths,
    workspaceRoot,
  });
  const metadata = await stat(path);
  if (!metadata.isFile()) {
    throw new UserInputContextError(`引用的路径不是文件：${reference.path}`);
  }

  if (reference.kind === UserContextReferenceKind.IMAGE && !supportsImages) {
    throw new UserInputContextError("当前模型不支持图片引用");
  }

  if (reference.kind === UserContextReferenceKind.IMAGE) {
    if (metadata.size > MAX_IMAGE_CONTEXT_BYTES) {
      throw new UserInputContextError(`引用图片超过 5 MB：${reference.path}`);
    }
    const { buffer } = await readFilePrefix(path, metadata.size, MAX_IMAGE_CONTEXT_BYTES);
    const extension = reference.path.split(".").at(-1)?.toLowerCase();
    const mimeType =
      extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "gif"
          ? "image/gif"
          : extension === "webp"
            ? "image/webp"
            : "image/png";
    return {
      image: { data: buffer.toString("base64"), mimeType, type: "image" },
      section: {
        content: "图片内容随本条消息一并提供。",
        label: reference.path,
        source: "workspace_file",
      },
    };
  }

  const documentFileType = resolveDocumentFileType(reference.path, "");
  if (documentFileType && metadata.size <= MAX_DOCUMENT_CONTEXT_BYTES) {
    const { buffer } = await readFilePrefix(path, metadata.size, MAX_DOCUMENT_CONTEXT_BYTES);
    const documentText = await extractDocumentText(buffer, documentFileType, signal);
    if (documentText !== null) {
      const text = truncateExtractedText(documentText);
      return {
        section: {
          content: formatTextContent(text.content, text.truncated),
          label: reference.path,
          source: "workspace_file",
        },
      };
    }
  }

  const prefix = await readFilePrefix(path, metadata.size, MAX_TEXT_CONTEXT_BYTES);
  const text = {
    content: decodeText(prefix.buffer),
    truncated: prefix.truncated,
  };
  return {
    section: {
      content:
        text.content === null
          ? formatBinaryFileContext("application/octet-stream", metadata.size, true)
          : formatTextContent(text.content, text.truncated),
      label: reference.path,
      source: "workspace_file",
    },
  };
}

async function readWorkspaceFolder(
  reference: RunInputContextReference,
  workspaceRoot: string,
  protectedPaths: readonly string[],
): Promise<UserContextSection> {
  const directory = await resolveWorkspacePath({
    path: reference.path,
    protectedPaths,
    workspaceRoot,
  });
  if (!(await stat(directory)).isDirectory()) {
    throw new UserInputContextError(`引用的路径不是文件夹：${reference.path}`);
  }

  const entries: string[] = [];
  let truncated = false;
  for await (const entry of glob("**/*", {
    cwd: directory,
    exclude: (candidate) =>
      hasIgnoredWorkspaceDirectory(
        relative(directory, resolve(candidate.parentPath, candidate.name)),
      ),
    withFileTypes: true,
  })) {
    const candidate = resolve(entry.parentPath, entry.name);
    try {
      await resolveWorkspacePath({ path: candidate, protectedPaths, workspaceRoot });
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") continue;
      continue;
    }
    entries.push(`${relative(directory, candidate)}${entry.isDirectory() ? "/" : ""}`);
    if (entries.length === MAX_FOLDER_ENTRIES) {
      truncated = true;
      break;
    }
  }
  entries.sort((left, right) => left.localeCompare(right));
  return {
    content: `${entries.join("\n") || "(empty)"}${truncated ? "\n\n[目录清单已截断]" : ""}`,
    label: reference.path,
    source: "workspace_folder",
  };
}

export interface CreateHarnessUserMessageInput {
  input: RunUserInput;
  model: Model<Api>;
  protectedPaths: readonly string[];
  signal?: AbortSignal;
  workspaceRoot: string;
}

export function createHarnessUserMessageRecord(input: RunUserInput): HarnessUserMessage {
  const attachments = input.attachments.map((attachment) => ({
    mimeType: attachment.mimeType,
    name: attachment.name,
    size: attachment.size,
  }));
  return {
    ...(attachments.length === 0 ? {} : { attachments }),
    content: [{ text: input.prompt, type: "text" }],
    ...(input.references.length === 0 ? {} : { contextReferences: input.references }),
    displayText: input.prompt,
    role: "user",
    timestamp: Date.now(),
  };
}

export async function createHarnessUserMessage(
  source: CreateHarnessUserMessageInput,
): Promise<HarnessUserMessage> {
  const supportsImages = source.model.input.includes("image");
  const sections: UserContextSection[] = [];
  const images: ImageContent[] = [];
  const attachments: HarnessUserAttachment[] = [];

  for (const attachment of source.input.attachments) {
    const buffer = decodeAttachment(attachment);
    if (SUPPORTED_IMAGE_MIME_TYPES.has(attachment.mimeType)) {
      if (!supportsImages) throw new UserInputContextError("当前模型不支持图片附件");
      const contentIndex = images.length + 1;
      images.push({ data: attachment.data, mimeType: attachment.mimeType, type: "image" });
      attachments.push({
        contentIndex,
        mimeType: attachment.mimeType,
        name: attachment.name,
        size: attachment.size,
      });
      sections.push({
        content: "图片内容随本条消息一并提供。",
        label: attachment.name,
        source: "attachment",
      });
      continue;
    }

    attachments.push({
      mimeType: attachment.mimeType,
      name: attachment.name,
      size: attachment.size,
    });
    const documentFileType = resolveDocumentFileType(attachment.name, attachment.mimeType);
    if (documentFileType !== null) {
      const documentText = await extractDocumentText(buffer, documentFileType, source.signal);
      if (documentText !== null) {
        const text = truncateExtractedText(documentText);
        sections.push({
          content: formatTextContent(text.content, text.truncated),
          label: attachment.name,
          source: "attachment",
        });
        continue;
      }
    }

    const text = truncateTextContext(buffer);
    if (text.content === null) {
      sections.push({
        content: formatBinaryFileContext(attachment.mimeType, attachment.size, false),
        label: attachment.name,
        source: "attachment",
      });
      continue;
    }
    sections.push({
      content:
        text.content.length === 0
          ? "(empty file)"
          : formatTextContent(text.content, text.truncated),
      label: attachment.name,
      source: "attachment",
    });
  }

  for (const reference of source.input.references) {
    if (reference.kind === UserContextReferenceKind.FOLDER) {
      sections.push(
        await readWorkspaceFolder(reference, source.workspaceRoot, source.protectedPaths),
      );
      continue;
    }
    const resolved = await readWorkspaceFile(
      reference,
      source.workspaceRoot,
      source.protectedPaths,
      supportsImages,
      source.signal,
    );
    sections.push(resolved.section);
    if (resolved.image) images.push(resolved.image);
  }

  const text: TextContent = {
    text: buildUserContextPrompt(
      source.input.prompt,
      sections,
      resolveUserContextCharacterBudget(source.model.contextWindow),
    ),
    type: "text",
  };
  return {
    ...createHarnessUserMessageRecord(source.input),
    ...(attachments.length === 0 ? {} : { attachments }),
    content: [text, ...images],
  };
}
