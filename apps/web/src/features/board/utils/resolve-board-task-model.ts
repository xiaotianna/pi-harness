import {
  DEFAULT_THINKING_LEVEL,
  resolveThinkingLevel,
  type ThinkingLevel,
} from "@pi-harness/agent-runtime/thinking-level";
import type { ModelProvider } from "../../models";

interface PreferredModelSelection {
  modelId: string;
  providerId: string;
  thinkingLevel: ThinkingLevel;
}

export interface BoardTaskModelSelection {
  modelId: string;
  providerId: string;
  thinkingLevel: ThinkingLevel;
}

export function resolveBoardTaskModelSelection(
  providers: readonly ModelProvider[],
  preferred: PreferredModelSelection | null | undefined,
): BoardTaskModelSelection | null {
  const availableProviders = providers.filter(
    (provider) => provider.enabled && provider.isConfigured && provider.models.length > 0,
  );
  const preferredProvider = preferred
    ? availableProviders.find(
        (provider) =>
          provider.id === preferred.providerId &&
          provider.models.some((model) => model.id === preferred.modelId),
      )
    : undefined;
  const provider = preferredProvider ?? availableProviders[0];
  const model = preferredProvider
    ? preferredProvider.models.find((item) => item.id === preferred?.modelId)
    : provider?.models[0];

  if (!provider || !model) return null;

  return {
    modelId: model.id,
    providerId: provider.id,
    thinkingLevel: resolveThinkingLevel(
      model.thinkingLevels,
      preferred?.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
    ),
  };
}
