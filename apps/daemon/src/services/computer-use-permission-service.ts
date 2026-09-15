import {
  ComputerUseClient,
  type ComputerUsePermission,
  type ComputerUsePermissions,
  resolveComputerUseHelperPath,
} from "@pi-harness/computer-use";

export class ComputerUsePermissionService {
  private readonly client = new ComputerUseClient({
    helperPath: resolveComputerUseHelperPath(),
    timeoutMs: 5 * 60 * 1_000,
  });

  public getPermissions(signal?: AbortSignal): Promise<ComputerUsePermissions> {
    return this.client.getPermissions(signal);
  }

  public requestPermission(
    permission: ComputerUsePermission,
    signal?: AbortSignal,
  ): Promise<ComputerUsePermissions> {
    return this.client.requestPermission(permission, signal);
  }

  public close(): void {
    this.client.close();
  }
}
