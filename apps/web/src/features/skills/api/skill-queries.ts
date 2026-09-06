import { queryOptions, skipToken } from "@tanstack/react-query";
import {
  getSkillCollectionSkillContent,
  getSkillConnectionStatus,
  getSkillContent,
  listSkillCollections,
  listSkills,
  type Skill,
} from "./skill-api";

export const skillQueryKeys = {
  all: ["skills"] as const,
  collections: () => [...skillQueryKeys.all, "collections"] as const,
  connection: (collectionId: string) =>
    [...skillQueryKeys.all, "connection", collectionId] as const,
  collectionDetail: (collectionId: string, skillId: string) =>
    [...skillQueryKeys.collections(), collectionId, "skills", skillId] as const,
  detail: (workspaceId: string, scope: Skill["scope"], name: string) =>
    [...skillQueryKeys.all, "detail", workspaceId, scope, name] as const,
  lists: () => [...skillQueryKeys.all, "list"] as const,
  list: (workspaceId: string | null) => [...skillQueryKeys.all, "list", workspaceId] as const,
};

export const skillCollectionQueryOptions = queryOptions({
  queryFn: ({ signal }) => listSkillCollections(signal),
  queryKey: skillQueryKeys.collections(),
});

export const skillConnectionQueryOptions = (collectionId: string) =>
  queryOptions({
    queryFn: ({ signal }) => getSkillConnectionStatus(collectionId, signal),
    queryKey: skillQueryKeys.connection(collectionId),
  });

export const skillCollectionDetailQueryOptions = (collectionId: string, skillId: string) =>
  queryOptions({
    queryFn: ({ signal }) => getSkillCollectionSkillContent(collectionId, skillId, signal),
    queryKey: skillQueryKeys.collectionDetail(collectionId, skillId),
  });

export const skillDetailQueryOptions = (
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
) =>
  queryOptions({
    queryFn: ({ signal }) => getSkillContent(workspaceId, skill, signal),
    queryKey: skillQueryKeys.detail(workspaceId, skill.scope, skill.name),
  });

export const skillListQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryFn: workspaceId ? ({ signal }) => listSkills(workspaceId, signal) : skipToken,
    queryKey: skillQueryKeys.list(workspaceId ?? null),
  });
