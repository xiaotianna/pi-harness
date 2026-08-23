"use client";

import { Button, Card, Chip, Header, Label, ListBox, Select, Switch } from "@heroui/react";
import { KeyRound, Plus } from "lucide-react";
import {
  getEnabledModelProviders,
  MODEL_PROVIDERS,
  ModelProviderIcon,
  useModelSettingsStore,
} from "../../models";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";

export function ModelSettingsPanel() {
  const defaultModelId = useModelSettingsStore((state) => state.defaultModelId);
  const enabledProviderIds = useModelSettingsStore((state) => state.enabledProviderIds);
  const setDefaultModelId = useModelSettingsStore((state) => state.setDefaultModelId);
  const setProviderEnabled = useModelSettingsStore((state) => state.setProviderEnabled);
  const enabledModelProviders = getEnabledModelProviders(enabledProviderIds);
  const connectedProviderCount = MODEL_PROVIDERS.filter((provider) => provider.isConnected).length;
  const availableModelCount = enabledModelProviders.reduce(
    (count, provider) => count + provider.models.length,
    0,
  );

  return (
    <section aria-label="模型设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        action={
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            添加 Provider
          </Button>
        }
        description="连接模型提供方，并选择新会话默认使用的模型。凭据只会保存在本地 daemon。"
        title="模型"
      />

      <div className="mt-6 rounded-2xl bg-default px-4">
        <SettingsRow description="创建会话时仍可在输入框中临时切换模型。" title="默认模型">
          <Select
            aria-label="默认模型"
            className="min-w-56 max-w-64"
            value={defaultModelId}
            variant="secondary"
            onChange={(key) => {
              const model = enabledModelProviders
                .flatMap((provider) => provider.models)
                .find((item) => item.id === key);

              if (model) setDefaultModelId(model.id);
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {enabledModelProviders.map((provider) => (
                  <ListBox.Section key={provider.id}>
                    <Header>{provider.name}</Header>
                    {provider.models.map((model) => (
                      <ListBox.Item
                        id={model.id}
                        key={model.id}
                        textValue={`${model.label} · ${provider.name}`}
                      >
                        <ModelProviderIcon isColor providerId={provider.id} size={16} />
                        <Label>{model.label}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox.Section>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </SettingsRow>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">Provider</h3>
          <p className="mt-1 text-sm text-muted">
            已连接 {connectedProviderCount} 个，共可使用 {availableModelCount} 个模型。
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {MODEL_PROVIDERS.map((provider) => {
          const isEnabled = enabledProviderIds.includes(provider.id);

          return (
            <Card key={provider.id} variant="secondary">
              <Card.Header className="flex-row items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                  <ModelProviderIcon isColor providerId={provider.id} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <Card.Title>{provider.name}</Card.Title>
                  <Card.Description>{provider.description}</Card.Description>
                </div>
                <Chip color={provider.isConnected ? "success" : "default"} size="sm" variant="soft">
                  {provider.isConnected ? "已连接" : "未连接"}
                </Chip>
                <Switch
                  aria-label={`${provider.name} 可用状态`}
                  isDisabled={
                    !provider.isConnected || (isEnabled && enabledProviderIds.length === 1)
                  }
                  isSelected={isEnabled}
                  size="sm"
                  onChange={(nextIsEnabled) => setProviderEnabled(provider.id, nextIsEnabled)}
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
                  {provider.models.map((model) => (
                    <Chip key={model.id} size="sm" variant="soft">
                      {model.label}
                    </Chip>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
                    <KeyRound aria-hidden className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {provider.authenticationLabel ?? "尚未配置 API Key 或 OAuth"}
                    </span>
                  </div>
                  <Button size="sm" variant={provider.isConnected ? "tertiary" : "secondary"}>
                    {provider.isConnected ? "管理" : "连接"}
                  </Button>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
