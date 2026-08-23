import { create } from "zustand";
import {
  getEnabledModelProviders,
  MODEL_PROVIDERS,
  ModelId,
  type ModelId as ModelIdValue,
  type ModelProviderId,
} from "../constants/model-providers";

interface ModelSettingsState {
  defaultModelId: ModelIdValue;
  enabledProviderIds: readonly ModelProviderId[];
  setDefaultModelId: (modelId: ModelIdValue) => void;
  setProviderEnabled: (providerId: ModelProviderId, isEnabled: boolean) => void;
}

const DEFAULT_ENABLED_PROVIDER_IDS = MODEL_PROVIDERS.filter(
  (provider) => provider.isConnected && provider.defaultEnabled,
).map((provider) => provider.id);

export const useModelSettingsStore = create<ModelSettingsState>()((set) => ({
  defaultModelId: ModelId.OPENAI_GPT_5_4,
  enabledProviderIds: DEFAULT_ENABLED_PROVIDER_IDS,
  setDefaultModelId: (defaultModelId) => set({ defaultModelId }),
  setProviderEnabled: (providerId, isEnabled) =>
    set((state) => {
      const isCurrentlyEnabled = state.enabledProviderIds.includes(providerId);
      const provider = MODEL_PROVIDERS.find((item) => item.id === providerId);

      if (
        !provider?.isConnected ||
        isCurrentlyEnabled === isEnabled ||
        (!isEnabled && isCurrentlyEnabled && state.enabledProviderIds.length === 1)
      ) {
        return state;
      }

      const enabledProviderIds = isEnabled
        ? [...state.enabledProviderIds, providerId]
        : state.enabledProviderIds.filter((id) => id !== providerId);
      const availableModels = getEnabledModelProviders(enabledProviderIds).flatMap(
        (item) => item.models,
      );
      const defaultModelId = availableModels.some((model) => model.id === state.defaultModelId)
        ? state.defaultModelId
        : (availableModels[0]?.id ?? state.defaultModelId);

      return { defaultModelId, enabledProviderIds };
    }),
}));
