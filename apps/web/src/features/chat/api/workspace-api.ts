import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";
import type { ChatWorkspace } from "../data/chat";

const WorkspaceSchema = Type.Object({
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ minLength: 1 }),
  name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  rootPath: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
});

const WorkspaceListSchema = Type.Array(WorkspaceSchema);

type Workspace = Static<typeof WorkspaceSchema>;

function toChatWorkspace(workspace: Workspace): ChatWorkspace {
  return {
    createdAt: new Date(workspace.createdAt).toISOString(),
    id: workspace.id,
    name:
      workspace.name ??
      workspace.rootPath.split(/[\\/]/).filter(Boolean).at(-1) ??
      workspace.rootPath,
    path: workspace.rootPath,
  };
}

function readWorkspace(value: unknown): ChatWorkspace {
  if (!Value.Check(WorkspaceSchema, value)) {
    throw new Error("daemon 返回了无效的 Workspace 响应");
  }
  return toChatWorkspace(value);
}

export async function listWorkspaces(signal?: AbortSignal): Promise<readonly ChatWorkspace[]> {
  const body = (await (
    await apiRequest("/api/workspaces", signal ? { signal } : undefined)
  ).json()) as unknown;
  if (!Value.Check(WorkspaceListSchema, body)) {
    throw new Error("daemon 返回了无效的 Workspace 列表");
  }
  return body.map(toChatWorkspace);
}

export async function selectWorkspaceDirectory(): Promise<ChatWorkspace | null> {
  const response = await apiRequest("/api/workspaces", { method: "POST" });
  if (response.status === 204) return null;
  return readWorkspace((await response.json()) as unknown);
}

export async function removeWorkspace(workspaceId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}`, { method: "DELETE" });
}

export async function reorderWorkspaces(
  workspaceIds: readonly string[],
): Promise<readonly ChatWorkspace[]> {
  const response = await apiRequest("/api/workspaces/order", {
    body: JSON.stringify({ workspaceIds }),
    method: "PUT",
  });
  const body = (await response.json()) as unknown;
  if (!Value.Check(WorkspaceListSchema, body)) {
    throw new Error("daemon 返回了无效的 Workspace 列表");
  }
  return body.map(toChatWorkspace);
}

export async function revealWorkspace(workspaceId: string): Promise<void> {
  await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}/reveal`, { method: "POST" });
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<ChatWorkspace> {
  const response = await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
  return readWorkspace((await response.json()) as unknown);
}
