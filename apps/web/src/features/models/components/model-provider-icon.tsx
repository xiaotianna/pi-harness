import {
  Claude,
  Codex,
  DeepSeek,
  Gemini,
  GithubCopilot,
  Grok,
  type IconType,
  Kimi,
  Minimax,
  Moonshot,
  OpenAI,
  OpenCode,
  OpenRouter,
  Qwen,
  XiaomiMiMo,
  Zhipu,
} from "@lobehub/icons";
import { Bot } from "lucide-react";
import { cn } from "@/shared/utils/cn";

const MONO_PROVIDER_ICONS: Readonly<Record<string, IconType>> = {
  anthropic: Claude,
  deepseek: DeepSeek,
  "github-copilot": GithubCopilot,
  google: Gemini,
  "kimi-coding": Kimi,
  minimax: Minimax,
  "minimax-cn": Minimax,
  moonshotai: Moonshot,
  "moonshotai-cn": Moonshot,
  opencode: OpenCode,
  openai: OpenAI,
  "openai-codex": Codex,
  openrouter: OpenRouter,
  "qwen-token-plan": Qwen,
  "qwen-token-plan-cn": Qwen,
  xai: Grok,
  xiaomi: XiaomiMiMo,
  "xiaomi-token-plan-cn": XiaomiMiMo,
  zai: Zhipu,
  "zai-coding-cn": Zhipu,
};

const COLOR_PROVIDER_ICONS: Readonly<Record<string, IconType>> = {
  anthropic: Claude.Color,
  deepseek: DeepSeek.Color,
  "github-copilot": GithubCopilot,
  google: Gemini.Color,
  "kimi-coding": Kimi,
  minimax: Minimax.Color,
  "minimax-cn": Minimax.Color,
  moonshotai: Moonshot,
  "moonshotai-cn": Moonshot,
  opencode: OpenCode,
  openai: OpenAI,
  "openai-codex": Codex,
  openrouter: OpenRouter.Color,
  "qwen-token-plan": Qwen.Color,
  "qwen-token-plan-cn": Qwen.Color,
  xai: Grok,
  xiaomi: XiaomiMiMo,
  "xiaomi-token-plan-cn": XiaomiMiMo,
  zai: Zhipu.Color,
  "zai-coding-cn": Zhipu.Color,
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

  const Icon = (isColor ? COLOR_PROVIDER_ICONS : MONO_PROVIDER_ICONS)[providerId];

  return Icon ? (
    <Icon aria-hidden className={iconClassName} size={size} />
  ) : (
    <Bot aria-hidden className={iconClassName} size={size} />
  );
}
