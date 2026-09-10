import {
  Bing,
  Cloudflare,
  Figma,
  Github,
  Google,
  type IconType,
  MCP,
  Microsoft,
  Notion,
  Vercel,
} from "@lobehub/icons";

const MCP_SERVER_ICON_RULES: ReadonlyArray<{
  icon: IconType;
  patterns: readonly string[];
}> = [
  { icon: Bing.Color, patterns: ["bing"] },
  { icon: Cloudflare.Color, patterns: ["cloudflare"] },
  { icon: Figma.Color, patterns: ["figma"] },
  { icon: Github, patterns: ["github"] },
  { icon: Google.Color, patterns: ["google"] },
  { icon: Microsoft.Color, patterns: ["microsoft"] },
  { icon: Notion, patterns: ["notion"] },
  { icon: Vercel, patterns: ["vercel"] },
];

export function McpServerIcon({ endpoint, name }: { endpoint: string; name: string }) {
  const value = `${name} ${endpoint}`.toLowerCase();
  const Icon =
    MCP_SERVER_ICON_RULES.find((rule) => rule.patterns.some((pattern) => value.includes(pattern)))
      ?.icon ?? MCP;
  return <Icon aria-hidden className="text-foreground" size={20} />;
}
