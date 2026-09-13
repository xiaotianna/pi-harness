import { UserProfileFacet } from "@pi-harness/memory/contract";

export const MEMORY_PROFILE_FACETS = [
  { id: UserProfileFacet.BACKGROUND, label: "基本背景" },
  { id: UserProfileFacet.COMMUNICATION, label: "沟通偏好" },
  { id: UserProfileFacet.EXPERTISE, label: "技能与经验" },
  { id: UserProfileFacet.INTERESTS, label: "兴趣领域" },
  { id: UserProfileFacet.PREFERENCES, label: "通用偏好" },
  { id: UserProfileFacet.WORKFLOW, label: "工作方式" },
] as const;

export function isMemoryProfileFacet(value: unknown): value is UserProfileFacet {
  return MEMORY_PROFILE_FACETS.some(({ id }) => id === value);
}

export function getMemoryProfileFacetLabel(facet: UserProfileFacet | null): string | null {
  return MEMORY_PROFILE_FACETS.find(({ id }) => id === facet)?.label ?? null;
}
