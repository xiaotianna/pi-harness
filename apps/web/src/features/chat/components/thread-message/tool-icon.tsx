import {
  BookOpen,
  FolderTree,
  Globe,
  MagicWand,
  Magnifier,
  Pencil,
  Picture,
  Terminal,
  Wrench,
} from "@gravity-ui/icons";
import type { ComponentType, SVGProps } from "react";

type ToolIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const TOOL_ICON_BY_NAME: Readonly<Record<string, ToolIconComponent>> = {
  edit_file: Pencil,
  find_skill: MagicWand,
  get_skill: MagicWand,
  list_files: FolderTree,
  load_skill: MagicWand,
  read_document: BookOpen,
  read_file: BookOpen,
  run_command: Terminal,
  search_text: Magnifier,
  skill_creator: MagicWand,
  view_image: Picture,
  view_pdf_page: BookOpen,
  web_search: Globe,
  write_file: Pencil,
};

const TOOL_ICON_RULES: ReadonlyArray<{
  icon: ToolIconComponent;
  patterns: readonly string[];
}> = [
  { icon: Globe, patterns: ["web", "browser", "browse"] },
  { icon: MagicWand, patterns: ["skill"] },
  { icon: Terminal, patterns: ["command", "shell", "terminal", "exec"] },
  { icon: Picture, patterns: ["image", "picture"] },
  { icon: Magnifier, patterns: ["search", "find"] },
  { icon: FolderTree, patterns: ["list", "directory", "folder"] },
  { icon: BookOpen, patterns: ["read", "get", "fetch", "view"] },
  { icon: Pencil, patterns: ["edit", "write", "create", "update", "patch"] },
];

function resolveToolIcon(toolName: string): ToolIconComponent {
  const normalizedToolName = toolName.trim().toLowerCase();
  const exactIcon = TOOL_ICON_BY_NAME[normalizedToolName];
  if (exactIcon) return exactIcon;

  return (
    TOOL_ICON_RULES.find((rule) =>
      rule.patterns.some((pattern) => normalizedToolName.includes(pattern)),
    )?.icon ?? Wrench
  );
}

export function ToolIcon({ className, toolName }: { className?: string; toolName: string }) {
  const Icon = resolveToolIcon(toolName);
  return <Icon aria-hidden className={className} />;
}
