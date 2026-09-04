"use client";

import { CircleExclamation as CircleAlert, Key as KeyRound, Plus } from "@gravity-ui/icons";
import {
  Button,
  Card,
  Chip,
  Description,
  Header,
  Label,
  ListBox,
  Select,
  Skeleton,
  Switch,
  toast,
} from "@heroui/react";
import {
  DEFAULT_THINKING_LEVEL,
  resolveThinkingLevel,
} from "@pi-harness/agent-runtime/thinking-level";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createModelSelectionKey,
  type ModelProvider,
  ModelProviderIcon,
  providerQueryKeys,
  providerQueryOptions,
  updateProvider,
} from "../../models";
import { useAppSettings } from "../hooks/use-app-settings";
import { ProviderEditorDialog } from "./provider-editor-dialog";
import { ProviderModelsDialog } from "./provider-models-dialog";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";

function getProviderChipClassName(isConfigured: boolean): string {
  return isConfigured
    ? "[--chip-bg:var(--success-soft)] [--chip-fg:var(--success-soft-foreground)]"
    : "[--chip-bg:var(--default-soft)] [--chip-fg:var(--default-soft-foreground)]";
}

function getProviderAuthenticationStatus(provider: ModelProvider): string {
  if (provider.authSource === "stored credential") return "已保存凭据";
  if (provider.authSource === "OAuth") return "OAuth 已登录";
  if (provider.authSource) return provider.authSource;
  if (provider.requiresApiKey && provider.supportsOAuth) return "尚未配置 API Key 或 OAuth";
  if (provider.requiresApiKey) return "尚未配置 API Key";
  if (provider.supportsOAuth) return "尚未配置 OAuth";
  return "无需配置凭据";
}

export function ModelSettingsPanel() {
  const queryClient = useQueryClient();
  const providersQuery = useQuery(providerQueryOptions());
  const { isLoading, isSaving, settings, updateSettings } = useAppSettings();
  const storedDefaultModelKey = settings?.defaultModel
    ? createModelSelectionKey(settings.defaultModel.providerId, settings.defaultModel.modelId)
    : null;
  const [editor, setEditor] = useState<{ isOpen: boolean; provider: ModelProvider | null }>({
    isOpen: false,
    provider: null,
  });
  const [modelsProvider, setModelsProvider] = useState<ModelProvider | null>(null);
  const [pendingProviderIds, setPendingProviderIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const providers = providersQuery.data ?? [];
  const enabledProviders = useMemo(
    () => providers.filter((provider) => provider.enabled && provider.isConfigured),
    [providers],
  );
  const availableModels = useMemo(
    () => enabledProviders.flatMap((provider) => provider.models),
    [enabledProviders],
  );
  const configuredProviderCount = providers.filter((provider) => provider.isConfigured).length;
  const firstProvider = enabledProviders.find((provider) => provider.models.length > 0);
  const firstModel = firstProvider?.models[0];
  const defaultModelKey = enabledProviders.some((provider) =>
    provider.models.some(
      (model) => createModelSelectionKey(provider.id, model.id) === storedDefaultModelKey,
    ),
  )
    ? storedDefaultModelKey
    : firstProvider && firstModel
      ? createModelSelectionKey(firstProvider.id, firstModel.id)
      : null;

  const enabledMutation = useMutation<
    ModelProvider,
    Error,
    { enabled: boolean; providerId: string },
    ModelProvider | undefined
  >({
    mutationFn: ({ enabled, providerId }) => updateProvider(providerId, { enabled }),
    onError: (_error, _variables, previousProvider) => {
      if (!previousProvider) return;
      queryClient.setQueryData<readonly ModelProvider[]>(providerQueryKeys.all, (current) =>
        current?.map((provider) =>
          provider.id === previousProvider.id ? previousProvider : provider,
        ),
      );
    },
    onMutate: ({ enabled, providerId }) => {
      void queryClient.cancelQueries({ queryKey: providerQueryKeys.all });
      const previousProvider = queryClient
        .getQueryData<readonly ModelProvider[]>(providerQueryKeys.all)
        ?.find((provider) => provider.id === providerId);
      queryClient.setQueryData<readonly ModelProvider[]>(providerQueryKeys.all, (current) =>
        current?.map((provider) =>
          provider.id === providerId ? { ...provider, enabled } : provider,
        ),
      );
      setPendingProviderIds((current) => new Set(current).add(providerId));
      return previousProvider;
    },
    onSettled: (_data, _error, { providerId }) => {
      setPendingProviderIds((current) => {
        const next = new Set(current);
        next.delete(providerId);
        return next;
      });
    },
    onSuccess: (updatedProvider) => {
      queryClient.setQueryData<readonly ModelProvider[]>(providerQueryKeys.all, (current) =>
        current?.map((provider) =>
          provider.id === updatedProvider.id ? updatedProvider : provider,
        ),
      );
    },
  });

  return (
    <section aria-label="模型设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        action={
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setEditor({ isOpen: true, provider: null })}
          >
            <Plus className="size-4" />
            添加 Provider
          </Button>
        }
        description="配置模型提供方，并选择新会话默认使用的模型。凭据只会保存在本地 daemon。"
        title="模型"
      />

      <div className="mt-6 rounded-2xl bg-default px-4">
        <SettingsRow
          description="所有工作区的新对话都会使用；对话内切换只影响该对话。"
          title="默认模型"
        >
          {providersQuery.isPending || isLoading ? (
            <Skeleton aria-label="正在加载默认模型" className="h-10 w-full rounded-xl sm:w-56" />
          ) : (
            <Select
              aria-label="默认模型"
              className="w-full sm:min-w-56 sm:max-w-64"
              isDisabled={isSaving}
              placeholder="暂无可用模型"
              value={defaultModelKey ?? ""}
              variant="secondary"
              onChange={(key) => {
                if (typeof key !== "string") return;
                const provider = enabledProviders.find((item) =>
                  item.models.some((model) => createModelSelectionKey(item.id, model.id) === key),
                );
                const model = provider?.models.find(
                  (item) => createModelSelectionKey(provider.id, item.id) === key,
                );
                if (!provider || !model) return;

                void updateSettings({
                  defaultModel: {
                    modelId: model.id,
                    providerId: provider.id,
                    thinkingLevel: resolveThinkingLevel(
                      model.thinkingLevels,
                      settings?.defaultModel?.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
                    ),
                  },
                }).catch((error: unknown) => {
                  toast.danger(error instanceof Error ? error.message : "保存默认模型失败");
                });
              }}
            >
              <Select.Trigger className="ps-0 sm:ps-3">
                <Select.Value className="flex items-center gap-2" />
                <Select.Indicator className="end-0 sm:end-2" />
              </Select.Trigger>
              <Select.Popover className="w-(--trigger-width) sm:w-auto">
                <ListBox>
                  {enabledProviders.length === 0 ? (
                    <ListBox.Item isDisabled id="no-default-model" textValue="暂无可用模型">
                      <CircleAlert className="size-4 text-muted" />
                      <div className="flex flex-col">
                        <Label>暂无可用模型</Label>
                        <Description>请先配置并启用一个 Provider</Description>
                      </div>
                    </ListBox.Item>
                  ) : (
                    enabledProviders.map((provider) => (
                      <ListBox.Section key={provider.id}>
                        <Header>{provider.name}</Header>
                        {provider.models.map((model) => (
                          <ListBox.Item
                            id={createModelSelectionKey(provider.id, model.id)}
                            key={createModelSelectionKey(provider.id, model.id)}
                            textValue={`${model.name} · ${provider.name}`}
                          >
                            <ModelProviderIcon isColor providerId={provider.id} size={16} />
                            <Label>{model.name}</Label>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox.Section>
                    ))
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        </SettingsRow>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">Provider</h3>
          {providersQuery.isPending ? (
            <Skeleton aria-label="正在加载 Provider 统计" className="mt-2 h-4 w-52 rounded-full" />
          ) : (
            <p className="mt-1 text-sm text-muted">
              已配置 {configuredProviderCount} 个，共可使用 {availableModels.length} 个模型。
            </p>
          )}
        </div>
      </div>

      {providersQuery.isError ? (
        <Card className="mt-4" variant="secondary">
          <Card.Content className="text-sm text-danger">
            {providersQuery.error.message}
          </Card.Content>
        </Card>
      ) : null}

      {providersQuery.isPending ? (
        <div aria-busy="true" className="mt-4 flex flex-col gap-3" role="status">
          <span className="sr-only">正在加载 Provider</span>
          {["first", "second"].map((item) => (
            <Card key={item} variant="secondary">
              <Card.Header className="flex-row items-center gap-4">
                <Skeleton aria-hidden className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton aria-hidden className="h-5 w-28 rounded-full" />
                  <Skeleton aria-hidden className="mt-2 h-4 w-40 rounded-full" />
                </div>
                <Skeleton aria-hidden className="h-6 w-14 rounded-full" />
                <Skeleton aria-hidden className="h-6 w-10 rounded-full" />
              </Card.Header>
              <Card.Content className="mt-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Skeleton aria-hidden className="h-6 w-20 rounded-full" />
                  <Skeleton aria-hidden className="h-6 w-24 rounded-full" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Skeleton aria-hidden className="h-4 w-36 rounded-full" />
                  <div className="flex gap-2">
                    <Skeleton aria-hidden className="h-8 w-14 rounded-xl" />
                    <Skeleton aria-hidden className="h-8 w-14 rounded-xl" />
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : null}

      {enabledMutation.isError ? (
        <Card className="mt-4" variant="secondary">
          <Card.Content className="text-sm text-danger">
            {enabledMutation.error.message}
          </Card.Content>
        </Card>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {providers.map((provider) => (
          <Card key={provider.id} variant="secondary">
            <Card.Header className="flex-row items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                <ModelProviderIcon isColor providerId={provider.id} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <Card.Title>{provider.name}</Card.Title>
                <Card.Description>
                  {provider.kind === "custom"
                    ? provider.baseUrl
                    : `内置 Provider · ${provider.models.length} 个模型`}
                </Card.Description>
              </div>
              <Chip
                className={getProviderChipClassName(provider.isConfigured)}
                size="sm"
                variant="soft"
              >
                {provider.isConfigured ? "已配置" : "未配置"}
              </Chip>
              <Switch
                aria-label={`${provider.name} 可用状态`}
                isDisabled={pendingProviderIds.has(provider.id)}
                isSelected={provider.enabled}
                size="sm"
                onChange={(enabled) => enabledMutation.mutate({ enabled, providerId: provider.id })}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </Card.Header>
            <Card.Content className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {provider.models.slice(0, 8).map((model) => (
                  <Chip key={model.id} size="sm" variant="soft">
                    {model.name}
                  </Chip>
                ))}
                {provider.models.length > 8 ? (
                  <Chip size="sm" variant="soft">
                    +{provider.models.length - 8}
                  </Chip>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
                  <KeyRound aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{getProviderAuthenticationStatus(provider)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="tertiary" onPress={() => setModelsProvider(provider)}>
                    模型
                  </Button>
                  <Button
                    size="sm"
                    variant={provider.isConfigured ? "tertiary" : "secondary"}
                    onPress={() => setEditor({ isOpen: true, provider })}
                  >
                    配置
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      <ProviderEditorDialog
        isOpen={editor.isOpen}
        provider={editor.provider}
        onClose={() => setEditor((current) => ({ ...current, isOpen: false }))}
      />
      <ProviderModelsDialog
        isOpen={modelsProvider !== null}
        provider={modelsProvider}
        onClose={() => setModelsProvider(null)}
      />
    </section>
  );
}
