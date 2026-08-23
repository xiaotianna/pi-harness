"use client";

import {
  Button,
  Card,
  Chip,
  Description,
  Header,
  Label,
  ListBox,
  Select,
  Switch,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, KeyRound, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createModelSelectionKey,
  type ModelProvider,
  ModelProviderIcon,
  providerQueryKeys,
  providerQueryOptions,
  updateProvider,
  useModelSettingsStore,
} from "../../models";
import { ProviderEditorDialog } from "./provider-editor-dialog";
import { ProviderModelsDialog } from "./provider-models-dialog";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";

function getProviderChipClassName(isConfigured: boolean): string {
  return isConfigured
    ? "[--chip-bg:var(--success-soft)] [--chip-fg:var(--success-soft-foreground)]"
    : "[--chip-bg:var(--default-soft)] [--chip-fg:var(--default-soft-foreground)]";
}

export function ModelSettingsPanel() {
  const queryClient = useQueryClient();
  const providersQuery = useQuery(providerQueryOptions());
  const defaultModelKey = useModelSettingsStore((state) => state.defaultModelKey);
  const setDefaultModelKey = useModelSettingsStore((state) => state.setDefaultModelKey);
  const [editor, setEditor] = useState<{ isOpen: boolean; provider: ModelProvider | null }>({
    isOpen: false,
    provider: null,
  });
  const [modelsProvider, setModelsProvider] = useState<ModelProvider | null>(null);
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

  useEffect(() => {
    if (
      availableModels.length > 0 &&
      !enabledProviders.some((provider) =>
        provider.models.some(
          (model) => createModelSelectionKey(provider.id, model.id) === defaultModelKey,
        ),
      )
    ) {
      const firstProvider = enabledProviders.find((provider) => provider.models.length > 0);
      const firstModel = firstProvider?.models[0];
      if (firstProvider && firstModel) {
        setDefaultModelKey(createModelSelectionKey(firstProvider.id, firstModel.id));
      }
    }
  }, [availableModels.length, defaultModelKey, enabledProviders, setDefaultModelKey]);

  const enabledMutation = useMutation({
    mutationFn: ({ enabled, providerId }: { enabled: boolean; providerId: string }) =>
      updateProvider(providerId, { enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
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
          <Select
            aria-label="默认模型"
            className="min-w-56 max-w-64"
            placeholder={providersQuery.isPending ? "正在加载模型…" : "暂无可用模型"}
            value={defaultModelKey ?? ""}
            variant="secondary"
            onChange={(key) => {
              if (typeof key === "string") setDefaultModelKey(key);
            }}
          >
            <Select.Trigger>
              <Select.Value className="flex items-center gap-2" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {enabledProviders.length === 0 ? (
                  <ListBox.Item isDisabled id="no-default-model" textValue="暂无可用模型">
                    <CircleAlert className="size-4 text-muted" />
                    <div className="flex flex-col">
                      <Label>{providersQuery.isPending ? "正在加载模型" : "暂无可用模型"}</Label>
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
        </SettingsRow>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">Provider</h3>
          <p className="mt-1 text-sm text-muted">
            已配置 {configuredProviderCount} 个，共可使用 {availableModels.length} 个模型。
          </p>
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
        <Card className="mt-4" variant="secondary">
          <Card.Content className="text-sm text-muted">正在加载 Provider…</Card.Content>
        </Card>
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
                isDisabled={enabledMutation.isPending}
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
                  <span className="truncate">
                    {provider.authSource === "stored credential"
                      ? "已保存凭据"
                      : provider.authSource === "OAuth"
                        ? "OAuth 已登录"
                        : (provider.authSource ??
                          (provider.supportsOAuth
                            ? "尚未配置 API Key 或 OAuth"
                            : "尚未配置 API Key"))}
                  </span>
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
