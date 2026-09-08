import { create } from "zustand";

export const MemoryScope = {
  USER: "user",
  HARNESS: "pi-harness",
  WEBSITE: "personal-site",
} as const;
export type MemoryScope = (typeof MemoryScope)[keyof typeof MemoryScope];
export const MEMORY_SCOPES = [
  { id: MemoryScope.USER, label: "个人 · 所有项目" },
  { id: MemoryScope.HARNESS, label: "项目 · PI Harness" },
  { id: MemoryScope.WEBSITE, label: "项目 · Personal Site" },
] as const;
export const MemoryStatus = { SAVED: "saved", SUGGESTED: "suggested" } as const;
export type MemoryEntry = {
  id: string;
  content: string;
  scope: MemoryScope;
  source: string;
  updatedAt: string;
  status: (typeof MemoryStatus)[keyof typeof MemoryStatus];
};
const INITIAL_MEMORIES: MemoryEntry[] = [
  {
    id: "language",
    content: "默认使用简体中文沟通，技术术语保留英文。",
    scope: MemoryScope.USER,
    source: "对话 · 调整沟通偏好",
    updatedAt: "9 月 8 日",
    status: MemoryStatus.SAVED,
  },
  {
    id: "summary",
    content: "变更说明先给结论，再列出修改内容和验证结果，保持简洁。",
    scope: MemoryScope.USER,
    source: "手动添加",
    updatedAt: "9 月 7 日",
    status: MemoryStatus.SAVED,
  },
  {
    id: "ui",
    content: "PI Harness 的页面使用 HeroUI v3，图标优先使用 Gravity UI。",
    scope: MemoryScope.HARNESS,
    source: "对话 · 统一设置页面组件",
    updatedAt: "9 月 8 日",
    status: MemoryStatus.SAVED,
  },
  {
    id: "package",
    content: "项目使用 pnpm workspace，依赖版本集中在 Catalog 中管理。",
    scope: MemoryScope.HARNESS,
    source: "对话 · 整理项目依赖",
    updatedAt: "9 月 6 日",
    status: MemoryStatus.SAVED,
  },
  {
    id: "website",
    content: "个人网站使用暖色背景，作品页面优先展示摄影内容。",
    scope: MemoryScope.WEBSITE,
    source: "对话 · 作品集视觉方向",
    updatedAt: "9 月 5 日",
    status: MemoryStatus.SAVED,
  },
  {
    id: "suggestion",
    content: "设置页面优先使用紧凑列表，减少嵌套卡片。",
    scope: MemoryScope.HARNESS,
    source: "对话 · 优化设置布局",
    updatedAt: "9 月 8 日",
    status: MemoryStatus.SUGGESTED,
  },
  {
    id: "suggestion-2",
    content: "日期和时间默认使用 24 小时制。",
    scope: MemoryScope.USER,
    source: "对话 · 调整时间显示",
    updatedAt: "9 月 8 日",
    status: MemoryStatus.SUGGESTED,
  },
];
interface MemoryDemoState {
  memories: MemoryEntry[];
  isEnabled: boolean;
  canSuggest: boolean;
  setEnabled: (value: boolean) => void;
  setCanSuggest: (value: boolean) => void;
  save: (entry: MemoryEntry) => void;
  remove: (id: string) => void;
}
// Frontend demonstration state survives panel navigation, but resets on page reload.
export const useMemoryDemoStore = create<MemoryDemoState>((set) => ({
  memories: INITIAL_MEMORIES,
  isEnabled: true,
  canSuggest: true,
  setEnabled: (isEnabled) => set({ isEnabled }),
  setCanSuggest: (canSuggest) => set({ canSuggest }),
  save: (entry) =>
    set(({ memories }) => ({
      memories: memories.some(({ id }) => id === entry.id)
        ? memories.map((memory) => (memory.id === entry.id ? entry : memory))
        : [entry, ...memories],
    })),
  remove: (id) =>
    set(({ memories }) => ({ memories: memories.filter((memory) => memory.id !== id) })),
}));
