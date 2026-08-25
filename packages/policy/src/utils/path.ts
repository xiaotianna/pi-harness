import { lstat, realpath } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { invalidPath } from "../path-policy-error.js";

export function isPathWithin(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..");
}

// 用于把路径转换为经过符号链接解析的真实绝对路径，供后续安全边界检查。
export async function canonicalizePath(path: string, allowMissing: boolean): Promise<string> {
  let current = path;
  const missingSegments: string[] = [];

  while (true) {
    try {
      const canonical = await realpath(current);
      return resolve(canonical, ...missingSegments.reverse());
    } catch (error: unknown) {
      if (!allowMissing || !isNodeError(error) || error.code !== "ENOENT") {
        throw invalidPath("路径不存在或无法访问");
      }

      try {
        if ((await lstat(current)).isSymbolicLink()) {
          throw invalidPath("拒绝写入目标不存在的符号链接");
        }
      } catch (lstatError: unknown) {
        if (!isNodeError(lstatError) || lstatError.code !== "ENOENT") throw lstatError;
      }

      const parent = dirname(current);
      if (parent === current) throw invalidPath("无法解析目标路径");
      missingSegments.push(basename(current));
      current = parent;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
