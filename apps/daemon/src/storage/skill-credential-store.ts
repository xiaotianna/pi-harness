import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isPlainObject } from "es-toolkit";

export interface SkillOAuthCredential {
  accessToken: string;
  account: {
    avatarUrl: string | null;
    displayName: string | null;
    id: string;
    username: string;
  };
  connectedAt: number;
}

function isSkillOAuthCredential(value: unknown): value is SkillOAuthCredential {
  return (
    isPlainObject(value) &&
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.connectedAt === "number" &&
    isPlainObject(value.account) &&
    typeof value.account.id === "string" &&
    typeof value.account.username === "string" &&
    (typeof value.account.displayName === "string" || value.account.displayName === null) &&
    (typeof value.account.avatarUrl === "string" || value.account.avatarUrl === null)
  );
}

export class SkillCredentialStore {
  private readonly credentials = new Map<string, SkillOAuthCredential>();
  private writeChain: Promise<void> = Promise.resolve();

  private constructor(private readonly path: string) {}

  public static async open(path: string): Promise<SkillCredentialStore> {
    const store = new SkillCredentialStore(path);
    try {
      const body = JSON.parse(await readFile(path, "utf8")) as unknown;
      if (!isPlainObject(body)) throw new Error("Skill credential file must contain an object");
      for (const [collectionId, credential] of Object.entries(body)) {
        if (!isSkillOAuthCredential(credential)) {
          throw new Error(`Invalid Skill credential for ${collectionId}`);
        }
        store.credentials.set(collectionId, credential);
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    return store;
  }

  public read(collectionId: string): SkillOAuthCredential | undefined {
    return this.credentials.get(collectionId);
  }

  public async set(collectionId: string, credential: SkillOAuthCredential): Promise<void> {
    await this.enqueue(async () => {
      this.credentials.set(collectionId, credential);
      await this.persist();
    });
  }

  public async delete(collectionId: string): Promise<void> {
    await this.enqueue(async () => {
      if (this.credentials.delete(collectionId)) await this.persist();
    });
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.catch(() => undefined).then(operation);
    await this.writeChain;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.path), { mode: 0o700, recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(Object.fromEntries(this.credentials), null, 2)}\n`,
      { flush: true, mode: 0o600 },
    );
    await rename(temporaryPath, this.path);
  }
}
