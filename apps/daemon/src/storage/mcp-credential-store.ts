import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { Value } from "typebox/value";
import { type McpCredential, McpCredentialFileSchema } from "../mcp/credential.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { validateMcpCredential } from "../mcp/utils/credential.js";
import type { McpServerId } from "../schemas/mcp.js";

const MAX_CREDENTIAL_FILE_BYTES = 4 * 1_024 * 1_024;

/** 单 daemon 写入；只有原子替换成功后才更新内存，失败不会产生幽灵授权。 */
export class McpCredentialStore {
  private credentials = new Map<McpServerId, McpCredential>();
  private writeChain: Promise<void> = Promise.resolve();
  private isClosed = false;

  private constructor(private readonly path: string) {}

  public static async open(path: string): Promise<McpCredentialStore> {
    const store = new McpCredentialStore(path);
    try {
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const metadata = await file.stat();
        if (
          !metadata.isFile() ||
          metadata.nlink !== 1 ||
          (metadata.mode & 0o077) !== 0 ||
          metadata.size > MAX_CREDENTIAL_FILE_BYTES
        ) {
          throw new McpError(McpErrorCode.STORAGE_FAILED, "MCP 凭据文件权限、类型或大小不符合要求");
        }
        const buffer = Buffer.alloc(MAX_CREDENTIAL_FILE_BYTES + 1);
        let length = 0;
        while (length < buffer.length) {
          const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
          if (bytesRead === 0) break;
          length += bytesRead;
        }
        if (length > MAX_CREDENTIAL_FILE_BYTES) {
          throw new McpError(McpErrorCode.STORAGE_FAILED, "MCP 凭据文件超出大小限制");
        }
        const value: unknown = JSON.parse(buffer.subarray(0, length).toString("utf8"));
        if (!Value.Check(McpCredentialFileSchema, value)) {
          throw new McpError(McpErrorCode.STORAGE_FAILED, "MCP 凭据文件结构无效");
        }
        for (const item of value.credentials) {
          const credential = validateMcpCredential(item);
          if (store.credentials.has(credential.serverId)) {
            throw new McpError(McpErrorCode.STORAGE_FAILED, "MCP 凭据文件包含重复服务");
          }
          store.credentials.set(credential.serverId, credential);
        }
      } finally {
        await file.close();
      }
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return store;
      throw new McpError(McpErrorCode.STORAGE_FAILED, "无法安全读取 MCP 凭据文件");
    }
    return store;
  }

  public read(serverId: McpServerId): McpCredential | undefined {
    const value = this.credentials.get(serverId);
    return value === undefined ? undefined : structuredClone(value);
  }

  public async modify(
    serverId: McpServerId,
    operation: (current: McpCredential | undefined) => Promise<McpCredential | undefined>,
  ): Promise<void> {
    if (this.isClosed) throw new McpError(McpErrorCode.DISABLED, "MCP 凭据存储已关闭");
    const pending = this.writeChain.then(async () => {
      const value = await operation(this.read(serverId));
      const next = new Map(this.credentials);
      if (value === undefined) {
        if (!next.delete(serverId)) return;
      } else {
        const credential = validateMcpCredential(value);
        if (credential.serverId !== serverId) {
          throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 凭据服务不匹配");
        }
        next.set(serverId, credential);
      }
      await this.persist(next);
    });
    // 消费者仍收到 pending 的原始失败；队列独立恢复，允许用户修复存储后重试。
    this.writeChain = pending.then(
      () => undefined,
      () => undefined,
    );
    await pending;
  }

  public delete(serverId: McpServerId): Promise<void> {
    return this.modify(serverId, async () => undefined);
  }

  public async close(): Promise<void> {
    this.isClosed = true;
    await this.writeChain;
  }

  private async persist(next: Map<McpServerId, McpCredential>): Promise<void> {
    const value = { version: 1, credentials: [...next.values()] };
    if (!Value.Check(McpCredentialFileSchema, value)) {
      throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 凭据数量超出限制");
    }
    const body = `${JSON.stringify(value)}\n`;
    if (Buffer.byteLength(body) > MAX_CREDENTIAL_FILE_BYTES) {
      throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 凭据总大小超出限制");
    }
    const directoryPath = dirname(this.path);
    const temporaryPath = `${this.path}.${randomUUID()}.tmp`;
    let hasTemporaryFile = false;
    try {
      await mkdir(directoryPath, { recursive: true, mode: 0o700 });
      const file = await open(temporaryPath, "wx", 0o600);
      hasTemporaryFile = true;
      try {
        await file.writeFile(body);
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporaryPath, this.path);
      hasTemporaryFile = false;
      // rename 已经提交：即使后面的目录同步失败，内存必须与可见磁盘状态一致。
      this.credentials = next;
      const directory = await open(directoryPath, constants.O_RDONLY);
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    } catch {
      throw new McpError(McpErrorCode.STORAGE_FAILED, "保存 MCP 凭据失败，请重试");
    } finally {
      if (hasTemporaryFile) {
        await unlink(temporaryPath).catch((error: unknown) => {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
            throw new McpError(McpErrorCode.STORAGE_FAILED, "清理临时 MCP 凭据失败");
          }
        });
      }
    }
  }
}
