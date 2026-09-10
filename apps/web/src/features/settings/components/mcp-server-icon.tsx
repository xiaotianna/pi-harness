import { MCP } from "@lobehub/icons";
import { useState } from "react";
import type { McpIcon } from "../api/mcp-api";

const SAFE_DATA_ICON_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,/i;
const SAFE_ICON_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function resolveIconSources(icons: readonly McpIcon[], endpoint: string): string[] {
  let endpointOrigin: string | null = null;
  try {
    const url = new URL(endpoint);
    if (url.protocol === "http:" || url.protocol === "https:") endpointOrigin = url.origin;
  } catch {
    // stdio 命令没有可用于校验远程图标的服务器 origin。
  }
  return icons.flatMap((icon) => {
    if (icon.mimeType && !SAFE_ICON_MIME_TYPES.has(icon.mimeType.toLowerCase())) return [];
    if (SAFE_DATA_ICON_PATTERN.test(icon.src)) return [icon.src];
    try {
      const url = new URL(icon.src);
      return endpointOrigin && url.origin === endpointOrigin ? [url.href] : [];
    } catch {
      return [];
    }
  });
}

export function McpServerIcon({
  endpoint,
  icons,
}: {
  endpoint: string;
  icons: readonly McpIcon[] | undefined;
}) {
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(new Set());
  const source = resolveIconSources(icons ?? [], endpoint).find((item) => !failedSources.has(item));
  if (!source) return <MCP aria-hidden className="text-foreground" size={20} />;
  return (
    <img
      alt=""
      aria-hidden
      className="size-5 object-contain"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      src={source}
      onError={() => setFailedSources((current) => new Set(current).add(source))}
    />
  );
}
