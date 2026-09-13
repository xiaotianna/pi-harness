import {
  type CreateMemoryInput,
  type MemoryRecord,
  MemoryRecordSchema,
  type MemorySettings,
  MemorySettingsSchema,
  type MemoryState,
  MemoryStateSchema,
  type UpdateMemoryInput,
  type UpdateMemorySettingsInput,
} from "@pi-harness/memory/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

async function readBody<T extends TSchema>(response: Response, schema: T): Promise<Static<T>> {
  const body = (await response.json()) as unknown;
  if (!Value.Check(schema, body)) throw new Error("daemon 返回了无效的记忆数据");
  return body;
}

export async function getMemories(signal?: AbortSignal): Promise<MemoryState> {
  const response = await apiRequest("/api/memories", signal ? { signal } : undefined);
  return readBody(response, MemoryStateSchema);
}

export async function createMemory(input: CreateMemoryInput): Promise<MemoryRecord> {
  const response = await apiRequest("/api/memories", {
    body: JSON.stringify(input),
    method: "POST",
  });
  return readBody(response, MemoryRecordSchema);
}

export async function updateMemory(
  memoryId: string,
  input: UpdateMemoryInput,
): Promise<MemoryRecord> {
  const response = await apiRequest(`/api/memories/${encodeURIComponent(memoryId)}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
  return readBody(response, MemoryRecordSchema);
}

export async function deleteMemory(memoryId: string, expectedRevision: number): Promise<void> {
  await apiRequest(`/api/memories/${encodeURIComponent(memoryId)}`, {
    body: JSON.stringify({ expectedRevision }),
    method: "DELETE",
  });
}

export async function updateMemorySettings(
  input: UpdateMemorySettingsInput,
): Promise<MemorySettings> {
  const response = await apiRequest("/api/memory-settings", {
    body: JSON.stringify(input),
    method: "PATCH",
  });
  return readBody(response, MemorySettingsSchema);
}
