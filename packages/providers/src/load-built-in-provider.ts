import { ModelsError, type Provider } from "@earendil-works/pi-ai";

type ProviderLoader = () => Promise<Provider>;

const PROVIDER_LOADERS = [
  ["openai", async () => (await import("@earendil-works/pi-ai/providers/openai")).openaiProvider()],
  [
    "openai-codex",
    async () =>
      (await import("@earendil-works/pi-ai/providers/openai-codex")).openaiCodexProvider(),
  ],
  [
    "anthropic",
    async () => (await import("@earendil-works/pi-ai/providers/anthropic")).anthropicProvider(),
  ],
  ["google", async () => (await import("@earendil-works/pi-ai/providers/google")).googleProvider()],
  ["xai", async () => (await import("@earendil-works/pi-ai/providers/xai")).xaiProvider()],
  [
    "github-copilot",
    async () =>
      (await import("@earendil-works/pi-ai/providers/github-copilot")).githubCopilotProvider(),
  ],
  [
    "openrouter",
    async () => (await import("@earendil-works/pi-ai/providers/openrouter")).openrouterProvider(),
  ],
  [
    "deepseek",
    async () => (await import("@earendil-works/pi-ai/providers/deepseek")).deepseekProvider(),
  ],
  [
    "kimi-coding",
    async () => (await import("@earendil-works/pi-ai/providers/kimi-coding")).kimiCodingProvider(),
  ],
  [
    "moonshotai",
    async () => (await import("@earendil-works/pi-ai/providers/moonshotai")).moonshotaiProvider(),
  ],
  [
    "moonshotai-cn",
    async () =>
      (await import("@earendil-works/pi-ai/providers/moonshotai-cn")).moonshotaiCnProvider(),
  ],
  [
    "minimax",
    async () => (await import("@earendil-works/pi-ai/providers/minimax")).minimaxProvider(),
  ],
  [
    "minimax-cn",
    async () => (await import("@earendil-works/pi-ai/providers/minimax-cn")).minimaxCnProvider(),
  ],
  [
    "qwen-token-plan",
    async () =>
      (await import("@earendil-works/pi-ai/providers/qwen-token-plan")).qwenTokenPlanProvider(),
  ],
  [
    "qwen-token-plan-cn",
    async () =>
      (
        await import("@earendil-works/pi-ai/providers/qwen-token-plan-cn")
      ).qwenTokenPlanCnProvider(),
  ],
  ["zai", async () => (await import("@earendil-works/pi-ai/providers/zai")).zaiProvider()],
  [
    "zai-coding-cn",
    async () =>
      (await import("@earendil-works/pi-ai/providers/zai-coding-cn")).zaiCodingCnProvider(),
  ],
  ["xiaomi", async () => (await import("@earendil-works/pi-ai/providers/xiaomi")).xiaomiProvider()],
  [
    "xiaomi-token-plan-cn",
    async () =>
      (
        await import("@earendil-works/pi-ai/providers/xiaomi-token-plan-cn")
      ).xiaomiTokenPlanCnProvider(),
  ],
  [
    "opencode",
    async () => (await import("@earendil-works/pi-ai/providers/opencode")).opencodeProvider(),
  ],
] as const satisfies readonly (readonly [string, ProviderLoader])[];

const PROVIDER_LOADER_BY_ID = new Map<string, ProviderLoader>(PROVIDER_LOADERS);

export const BUILT_IN_PROVIDER_IDS: readonly string[] = Object.freeze(
  PROVIDER_LOADERS.map(([providerId]) => providerId),
);

export async function loadBuiltInProvider(providerId: string): Promise<Provider> {
  const loadProvider = PROVIDER_LOADER_BY_ID.get(providerId);

  if (loadProvider === undefined) {
    throw new ModelsError("provider", `Unsupported built-in provider: ${providerId}`);
  }

  return loadProvider();
}
