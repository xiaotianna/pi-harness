import { lstat, readFile } from "node:fs/promises";
import type { SandboxCredential } from "@pi-harness/policy";
import { isPlainObject } from "es-toolkit";

const MAX_CREDENTIAL_FILE_BYTES = 256 * 1024;

/** Shell 凭据只从 daemon 私有文件读取；不会经过设置 API 或进入命令环境。 */
export async function loadSandboxCredentials(path: string): Promise<readonly SandboxCredential[]> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || (process.platform !== "win32" && (metadata.mode & 0o077) !== 0)) {
      throw new Error("Sandbox credential file must be a 0600 regular file");
    }
    if (metadata.size > MAX_CREDENTIAL_FILE_BYTES) {
      throw new Error("Sandbox credential file is too large");
    }
    const body: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isPlainObject(body) || !Array.isArray(body.credentials)) {
      throw new Error("Sandbox credential file must contain a credentials array");
    }
    const names = new Set<string>();
    return body.credentials.map((value): SandboxCredential => {
      if (
        !isPlainObject(value) ||
        typeof value.name !== "string" ||
        !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/u.test(value.name) ||
        typeof value.value !== "string" ||
        value.value.length === 0 ||
        value.value.length > 65_536 ||
        !Array.isArray(value.injectHosts) ||
        value.injectHosts.length === 0 ||
        value.injectHosts.length > 20 ||
        !value.injectHosts.every((host) => typeof host === "string") ||
        names.has(value.name)
      ) {
        throw new Error("Invalid sandbox credential entry");
      }
      names.add(value.name);
      return { injectHosts: value.injectHosts, name: value.name, value: value.value };
    });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
