export const ModelProviderId = {
  OPENAI: "openai",
  DEEPSEEK: "deepseek",
  ANTHROPIC: "anthropic",
  OPENROUTER: "openrouter",
  GOOGLE: "google",
} as const;

export type ModelProviderId = (typeof ModelProviderId)[keyof typeof ModelProviderId];

export const ModelId = {
  OPENAI_GPT_5_4: "openai/gpt-5.4",
  OPENAI_GPT_5_3_CODEX: "openai/gpt-5.3-codex",
  OPENAI_O4_MINI: "openai/o4-mini",
  DEEPSEEK_V4: "deepseek/deepseek-v4",
  DEEPSEEK_R1: "deepseek/deepseek-r1",
  ANTHROPIC_CLAUDE_OPUS_4_6: "anthropic/claude-opus-4.6",
  ANTHROPIC_CLAUDE_SONNET_4_6: "anthropic/claude-sonnet-4.6",
  OPENROUTER_GEMINI_3_1_PRO: "openrouter/gemini-3.1-pro",
  OPENROUTER_DEEPSEEK_V4: "openrouter/deepseek-v4",
  GOOGLE_GEMINI_3_1_PRO: "google/gemini-3.1-pro",
  GOOGLE_GEMINI_3_FLASH: "google/gemini-3-flash",
} as const;

export type ModelId = (typeof ModelId)[keyof typeof ModelId];

export interface ModelConfiguration {
  id: ModelId;
  label: string;
}

export interface ModelProviderConfiguration {
  authenticationLabel: string | null;
  defaultEnabled: boolean;
  description: string;
  id: ModelProviderId;
  isConnected: boolean;
  models: readonly ModelConfiguration[];
  name: string;
}

export const MODEL_PROVIDERS = [
  {
    id: ModelProviderId.OPENAI,
    name: "OpenAI",
    description: "用于通用编程、推理与图像理解。",
    authenticationLabel: "API Key 已配置",
    defaultEnabled: true,
    isConnected: true,
    models: [
      { id: ModelId.OPENAI_GPT_5_4, label: "GPT-5.4" },
      { id: ModelId.OPENAI_GPT_5_3_CODEX, label: "GPT-5.3 Codex" },
      { id: ModelId.OPENAI_O4_MINI, label: "o4-mini" },
    ],
  },
  {
    id: ModelProviderId.DEEPSEEK,
    name: "DeepSeek",
    description: "适合代码生成、推理与中文任务。",
    authenticationLabel: "API Key 已配置",
    defaultEnabled: true,
    isConnected: true,
    models: [
      { id: ModelId.DEEPSEEK_V4, label: "DeepSeek V4" },
      { id: ModelId.DEEPSEEK_R1, label: "DeepSeek R1" },
    ],
  },
  {
    id: ModelProviderId.ANTHROPIC,
    name: "Anthropic",
    description: "适合长上下文任务与复杂代码分析。",
    authenticationLabel: "API Key 已配置",
    defaultEnabled: true,
    isConnected: true,
    models: [
      { id: ModelId.ANTHROPIC_CLAUDE_OPUS_4_6, label: "Claude Opus 4.6" },
      { id: ModelId.ANTHROPIC_CLAUDE_SONNET_4_6, label: "Claude Sonnet 4.6" },
    ],
  },
  {
    id: ModelProviderId.OPENROUTER,
    name: "OpenRouter",
    description: "通过统一端点访问多个模型提供方。",
    authenticationLabel: "OAuth 已连接",
    defaultEnabled: true,
    isConnected: true,
    models: [
      { id: ModelId.OPENROUTER_GEMINI_3_1_PRO, label: "Gemini 3.1 Pro" },
      { id: ModelId.OPENROUTER_DEEPSEEK_V4, label: "DeepSeek V4" },
    ],
  },
  {
    id: ModelProviderId.GOOGLE,
    name: "Google AI",
    description: "连接 Gemini 系列模型。",
    authenticationLabel: null,
    defaultEnabled: false,
    isConnected: false,
    models: [
      { id: ModelId.GOOGLE_GEMINI_3_1_PRO, label: "Gemini 3.1 Pro" },
      { id: ModelId.GOOGLE_GEMINI_3_FLASH, label: "Gemini 3 Flash" },
    ],
  },
] as const satisfies readonly ModelProviderConfiguration[];

export function getEnabledModelProviders(
  enabledProviderIds: readonly ModelProviderId[],
): readonly ModelProviderConfiguration[] {
  return MODEL_PROVIDERS.filter(
    (provider) => provider.isConnected && enabledProviderIds.includes(provider.id),
  );
}
