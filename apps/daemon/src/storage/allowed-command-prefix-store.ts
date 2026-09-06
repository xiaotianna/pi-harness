import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type CommandPrefixRule, isPersistableCommandPrefixRule } from "@pi-harness/policy";

/** 将用户允许的命令前缀保存在 daemon 数据目录的 JSON 文件中。 */
export class AllowedCommandPrefixStore {
  private constructor(private readonly path: string) {}

  public static open(path: string): AllowedCommandPrefixStore {
    const store = new AllowedCommandPrefixStore(path);
    store.getAll();
    return store;
  }

  public getAll(): readonly CommandPrefixRule[] {
    try {
      const value = JSON.parse(readFileSync(this.path, "utf8")) as unknown;
      if (!Array.isArray(value) || !value.every(isPersistableCommandPrefixRule)) {
        throw new Error("Invalid allowed command prefix file");
      }
      return value;
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  public add(prefix: CommandPrefixRule): void {
    if (!isPersistableCommandPrefixRule(prefix)) {
      throw new Error("Invalid allowed command prefix");
    }
    const prefixes = this.getAll();
    if (prefixes.some((current) => JSON.stringify(current) === JSON.stringify(prefix))) return;

    const next = [...prefixes, [...prefix]];
    mkdirSync(dirname(this.path), { mode: 0o700, recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, {
      flush: true,
      mode: 0o600,
    });
    renameSync(temporaryPath, this.path);
  }
}
