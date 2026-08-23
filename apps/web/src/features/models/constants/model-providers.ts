export const ModelId = {
  OPENAI_GPT_5_4: "gpt-5.4",
  OPENAI_GPT_5_3_CODEX: "gpt-5.3-codex",
  OPENAI_O4_MINI: "o4-mini",
  DEEPSEEK_V4: "deepseek-v4-pro",
  DEEPSEEK_R1: "deepseek-reasoner",
  ANTHROPIC_CLAUDE_OPUS_4_6: "claude-opus-4-6",
  ANTHROPIC_CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
  GOOGLE_GEMINI_3_1_PRO: "gemini-3.1-pro-preview",
  GOOGLE_GEMINI_3_FLASH: "gemini-3-flash-preview",
} as const;

export type ModelId = (typeof ModelId)[keyof typeof ModelId];

export function createModelSelectionKey(providerId: string, modelId: string): string {
  return `${encodeURIComponent(providerId)}:${encodeURIComponent(modelId)}`;
}
