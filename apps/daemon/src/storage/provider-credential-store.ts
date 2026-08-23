import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Credential, CredentialInfo, CredentialStore } from "@pi-harness/providers";

function isCredential(value: unknown): value is Credential {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  if (value.type === "api_key") {
    const hasValidKey = !("key" in value) || typeof value.key === "string";
    const hasValidEnv =
      !("env" in value) ||
      (typeof value.env === "object" &&
        value.env !== null &&
        !Array.isArray(value.env) &&
        Object.values(value.env).every((entry) => typeof entry === "string"));
    return hasValidKey && hasValidEnv;
  }
  return (
    value.type === "oauth" &&
    "refresh" in value &&
    typeof value.refresh === "string" &&
    "access" in value &&
    typeof value.access === "string" &&
    "expires" in value &&
    typeof value.expires === "number"
  );
}

/** 将模型凭据保存在 SQLite 之外的仅当前用户可读文件中。 */
export class FileCredentialStore implements CredentialStore {
  private readonly credentials = new Map<string, Credential>();
  private writeChain: Promise<void> = Promise.resolve();

  private constructor(private readonly path: string) {}

  public static async open(path: string): Promise<FileCredentialStore> {
    const store = new FileCredentialStore(path);
    try {
      const body = JSON.parse(await readFile(path, "utf8")) as unknown;
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error("Credential file must contain an object");
      }
      for (const [providerId, credential] of Object.entries(body)) {
        if (!isCredential(credential)) throw new Error(`Invalid credential for ${providerId}`);
        store.credentials.set(providerId, credential);
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    return store;
  }

  public async read(providerId: string): Promise<Credential | undefined> {
    return this.credentials.get(providerId);
  }

  public async list(): Promise<readonly CredentialInfo[]> {
    return [...this.credentials].map(([providerId, credential]) => ({
      providerId,
      type: credential.type,
    }));
  }

  public async modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>,
  ): Promise<Credential | undefined> {
    let result: Credential | undefined;
    // ponytail: daemon 当前只有一个进程，全局写队列足够；出现多进程写入时再换文件锁。
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        const current = this.credentials.get(providerId);
        const next = await fn(current);
        result = next ?? current;
        if (next !== undefined) {
          this.credentials.set(providerId, next);
          await this.persist();
        }
      });
    await this.writeChain;
    return result;
  }

  public async delete(providerId: string): Promise<void> {
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        if (this.credentials.delete(providerId)) await this.persist();
      });
    await this.writeChain;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.path), { mode: 0o700, recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(Object.fromEntries(this.credentials), null, 2)}\n`,
      {
        flush: true,
        mode: 0o600,
      },
    );
    await rename(temporaryPath, this.path);
  }
}
