import {
  Claude,
  DeepSeek,
  Gemini,
  Grok,
  type IconType,
  Kimi,
  Minimax,
  Moonshot,
  OpenAI,
  OpenCode,
  Qwen,
  Zhipu,
} from "@lobehub/icons";
import { Bot } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

const MONO_PROVIDER_ICONS: Readonly<Record<string, IconType>> = {
  anthropic: Claude,
  deepseek: DeepSeek,
  google: Gemini,
  minimax: Minimax,
  moonshotai: Moonshot,
  opencode: OpenCode,
  openai: OpenAI,
  "qwen-token-plan": Qwen,
  xai: Grok,
  zai: Zhipu,
};

const COLOR_PROVIDER_ICONS: Readonly<Record<string, IconType>> = {
  anthropic: Claude.Color,
  deepseek: DeepSeek.Color,
  google: Gemini.Color,
  minimax: Minimax.Color,
  moonshotai: Moonshot,
  opencode: OpenCode,
  openai: OpenAI,
  "qwen-token-plan": Qwen.Color,
  xai: Grok,
  zai: Zhipu.Color,
};

export interface ModelProviderIconProps {
  className?: string;
  isColor?: boolean;
  providerId: string;
  size?: number | string;
}

export function ModelProviderIcon({
  className,
  isColor = false,
  providerId,
  size = 20,
}: ModelProviderIconProps) {
  const iconClassName = cn("text-foreground", className);

  if (providerId === "kimi-coding") {
    return (
      <Kimi.Avatar
        aria-hidden
        className={className ?? ""}
        size={typeof size === "number" ? size : 20}
      />
    );
  }

  const Icon = (isColor ? COLOR_PROVIDER_ICONS : MONO_PROVIDER_ICONS)[providerId];

  return Icon ? (
    <Icon aria-hidden className={iconClassName} size={size} />
  ) : (
    <Bot aria-hidden className={iconClassName} size={size} />
  );
}
