import { glob, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { isPathWithin, PathPolicyError } from "@pi-harness/policy";
import { createPatch } from "diff";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { type FileChangeDetails, MAX_FILE_BYTES } from "./file.js";

const IGNORED_DIRECTORY_NAMES = new Set([".git", ".pi-harness", "node_modules"]);
const MAX_TRACKED_FILES = 10_000;
const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;
const MAX_REPORTED_FILES = 50;
const MAX_REPORTED_BYTES = 4 * 1024 * 1024;
const WORKSPACE_FILE_PATTERNS = [
  "**/*",
  ".*",
  "**/.*",
  ".*/**/*",
  ".*/**/.*",
  "**/.*/**/*",
  "**/.*/**/.*",
];

export interface WorkspaceTextSnapshot {
  contents: ReadonlyMap<string, string>;
  paths: ReadonlySet<string>;
  truncated: boolean;
}

export interface WorkspaceFileChanges {
  changes: readonly FileChangeDetails[];
  truncated: boolean;
}

export function hasIgnoredWorkspaceDirectory(path: string): boolean {
  return path.split(/[\\/]/).some((segment) => IGNORED_DIRECTORY_NAMES.has(segment));
}

function isSkippableFileError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return ["EACCES", "EISDIR", "ENOENT", "EPERM"].includes(String(error.code));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error("文件变更统计已取消");
}

async function readTrackedTextFile(path: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) return null;
    const content = await readFile(path, signal === undefined ? undefined : { signal });
    if (content.length > MAX_FILE_BYTES || content.includes(0)) return null;
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(content);
    } catch {
      return null;
    }
  } catch (error: unknown) {
    if (isSkippableFileError(error)) return null;
    throw error;
  }
}

async function listWorkspaceFiles(
  context: WorkspaceToolContext,
  signal?: AbortSignal,
): Promise<{ paths: string[]; truncated: boolean }> {
  const workspaceRoot = await resolveToolPath(context, ".");
  const protectedPaths = (context.protectedPaths ?? []).map((path) => resolve(path));
  const paths = new Set<string>();
  let truncated = false;

  for await (const entry of glob(WORKSPACE_FILE_PATTERNS, {
    cwd: workspaceRoot,
    exclude: (entry) => {
      const absolutePath = resolve(entry.parentPath, entry.name);
      return (
        hasIgnoredWorkspaceDirectory(relative(workspaceRoot, absolutePath)) ||
        protectedPaths.some((path) => isPathWithin(path, absolutePath))
      );
    },
    withFileTypes: true,
  })) {
    throwIfAborted(signal);
    if (!entry.isFile()) continue;
    const absolutePath = resolve(entry.parentPath, entry.name);
    let resolvedPath: string;
    try {
      resolvedPath = await resolveToolPath(context, absolutePath);
    } catch (error: unknown) {
      if (error instanceof PathPolicyError || isSkippableFileError(error)) continue;
      throw error;
    }
    const workspacePath = relative(workspaceRoot, resolvedPath);
    if (workspacePath === ".." || workspacePath.startsWith(`..${sep}`)) continue;
    paths.add(workspacePath);
    if (paths.size === MAX_TRACKED_FILES) {
      truncated = true;
      break;
    }
  }

  return { paths: [...paths].sort((left, right) => left.localeCompare(right)), truncated };
}

export async function captureWorkspaceTextSnapshot(
  context: WorkspaceToolContext,
  signal?: AbortSignal,
): Promise<WorkspaceTextSnapshot> {
  const workspaceRoot = await resolveToolPath(context, ".");
  const listed = await listWorkspaceFiles(context, signal);
  const contents = new Map<string, string>();
  let capturedBytes = 0;
  let truncated = listed.truncated;

  for (const path of listed.paths) {
    throwIfAborted(signal);
    const content = await readTrackedTextFile(resolve(workspaceRoot, path), signal);
    if (content === null) continue;
    const contentBytes = Buffer.byteLength(content, "utf8");
    if (capturedBytes + contentBytes > MAX_SNAPSHOT_BYTES) {
      truncated = true;
      break;
    }
    contents.set(path, content);
    capturedBytes += contentBytes;
  }

  return { contents, paths: new Set(listed.paths), truncated };
}

export async function collectWorkspaceFileChanges(
  context: WorkspaceToolContext,
  beforeSnapshot: WorkspaceTextSnapshot,
  signal?: AbortSignal,
): Promise<WorkspaceFileChanges> {
  const workspaceRoot = await resolveToolPath(context, ".");
  const listed = await listWorkspaceFiles(context, signal);
  const afterPaths = new Set(listed.paths);
  const changes: FileChangeDetails[] = [];
  let reportedBytes = 0;
  let truncated = beforeSnapshot.truncated || listed.truncated;

  const appendChange = (path: string, before: string | null, after: string) => {
    const changeBytes = Buffer.byteLength(before ?? "", "utf8") + Buffer.byteLength(after, "utf8");
    if (changes.length === MAX_REPORTED_FILES || reportedBytes + changeBytes > MAX_REPORTED_BYTES) {
      truncated = true;
      return;
    }
    changes.push({
      after,
      before,
      diff: createPatch(path, before ?? "", after, "before", "after"),
      path,
    });
    reportedBytes += changeBytes;
  };

  for (const [path, before] of beforeSnapshot.contents) {
    throwIfAborted(signal);
    if (!afterPaths.has(path)) {
      appendChange(path, before, "");
      continue;
    }
    const after = await readTrackedTextFile(resolve(workspaceRoot, path), signal);
    if (after !== null && after !== before) appendChange(path, before, after);
  }

  for (const path of listed.paths) {
    throwIfAborted(signal);
    if (beforeSnapshot.paths.has(path)) continue;
    const after = await readTrackedTextFile(resolve(workspaceRoot, path), signal);
    if (after !== null) appendChange(path, null, after);
  }

  changes.sort((left, right) => left.path.localeCompare(right.path));
  return { changes, truncated };
}
