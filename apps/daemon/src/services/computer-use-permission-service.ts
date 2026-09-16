import {
  ComputerUseClient,
  ComputerUsePermission,
  type ComputerUsePermissions,
  resolveComputerUseHelperPath,
} from "@pi-harness/computer-use";
import type { FileOpenService } from "./file-open-service.js";

export class ComputerUsePermissionService {
  private readonly clients = new Map<ComputerUsePermission, ComputerUseClient>();

  public constructor(private readonly fileOpen: FileOpenService) {}

  public async getPermissions(signal?: AbortSignal): Promise<ComputerUsePermissions> {
    // macOS may retain a process's earlier TCC result after its permission changes.
    const client = new ComputerUseClient({ helperPath: resolveComputerUseHelperPath() });
    try {
      return await client.getPermissions(signal);
    } finally {
      client.close();
    }
  }

  public requestPermission(
    permission: ComputerUsePermission,
    signal?: AbortSignal,
  ): Promise<ComputerUsePermissions> {
    this.clients.get(permission)?.close();
    const client = new ComputerUseClient({
      helperPath: resolveComputerUseHelperPath(),
      timeoutMs: 5 * 60 * 1_000,
    });
    this.clients.set(permission, client);
    return client.requestPermission(permission, signal);
  }

  public async openPermissionSettings(
    permission: ComputerUsePermission,
    signal: AbortSignal,
  ): Promise<void> {
    if (process.platform !== "darwin") throw new Error("电脑操控权限设置仅支持 macOS");
    const settingsUrl =
      permission === ComputerUsePermission.ACCESSIBILITY
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        : "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
    await this.fileOpen.openSystem(settingsUrl, signal);
  }

  public close(): void {
    for (const client of this.clients.values()) client.close();
    this.clients.clear();
  }
}
