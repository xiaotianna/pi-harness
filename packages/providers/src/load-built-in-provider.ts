import { ModelsError, type Provider } from "@earendil-works/pi-ai";

type ProviderLoader = () => Promise<Provider>;

const PROVIDER_LOADERS: Readonly<Record<string, ProviderLoader>> = {
  openai: async () => (await import("@earendil-works/pi-ai/providers/openai")).openaiProvider(),
  anthropic: async () =>
    (await import("@earendil-works/pi-ai/providers/anthropic")).anthropicProvider(),
  deepseek: async () =>
    (await import("@earendil-works/pi-ai/providers/deepseek")).deepseekProvider(),
  google: async () => (await import("@earendil-works/pi-ai/providers/google")).googleProvider(),
  xai: async () => (await import("@earendil-works/pi-ai/providers/xai")).xaiProvider(),
  "kimi-coding": async () =>
    (await import("@earendil-works/pi-ai/providers/kimi-coding")).kimiCodingProvider(),
  opencode: async () =>
    (await import("@earendil-works/pi-ai/providers/opencode")).opencodeProvider(),
  zai: async () => (await import("@earendil-works/pi-ai/providers/zai")).zaiProvider(),
  minimax: async () => (await import("@earendil-works/pi-ai/providers/minimax")).minimaxProvider(),
  moonshotai: async () =>
    (await import("@earendil-works/pi-ai/providers/moonshotai")).moonshotaiProvider(),
  "qwen-token-plan": async () =>
    (await import("@earendil-works/pi-ai/providers/qwen-token-plan")).qwenTokenPlanProvider(),
};

export const BUILT_IN_PROVIDER_IDS = Object.freeze(Object.keys(PROVIDER_LOADERS));

export async function loadBuiltInProvider(providerId: string): Promise<Provider> {
  const loadProvider = PROVIDER_LOADERS[providerId];

  if (loadProvider === undefined) {
    throw new ModelsError("provider", `Unsupported built-in provider: ${providerId}`);
  }

  return loadProvider();
}
