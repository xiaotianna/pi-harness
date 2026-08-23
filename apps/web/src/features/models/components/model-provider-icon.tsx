
import { Gemini, OpenAI, OpenRouter, DeepSeek, Claude, type IconType } from '@lobehub/icons'
import {
  ModelProviderId,
  type ModelProviderId as ModelProviderIdValue,
} from "../constants/model-providers";

const MONO_PROVIDER_ICONS: Record<ModelProviderIdValue, IconType> = {
  [ModelProviderId.OPENAI]: OpenAI,
  [ModelProviderId.DEEPSEEK]: DeepSeek,
  [ModelProviderId.ANTHROPIC]: Claude,
  [ModelProviderId.OPENROUTER]: OpenRouter,
  [ModelProviderId.GOOGLE]: Gemini,
};

const COLOR_PROVIDER_ICONS: Record<ModelProviderIdValue, IconType> = {
  [ModelProviderId.OPENAI]: OpenAI,
  [ModelProviderId.DEEPSEEK]: DeepSeek.Color,
  [ModelProviderId.ANTHROPIC]: Claude.Color,
  [ModelProviderId.OPENROUTER]: OpenRouter,
  [ModelProviderId.GOOGLE]: Gemini.Color,
};

export interface ModelProviderIconProps {
  className?: string;
  isColor?: boolean;
  providerId: ModelProviderIdValue;
  size?: number | string;
}

export function ModelProviderIcon({
  className,
  isColor = false,
  providerId,
  size = 20,
}: ModelProviderIconProps) {
  const Icon = (isColor ? COLOR_PROVIDER_ICONS : MONO_PROVIDER_ICONS)[providerId];

  return <Icon aria-hidden className={className} size={size} />;
}
