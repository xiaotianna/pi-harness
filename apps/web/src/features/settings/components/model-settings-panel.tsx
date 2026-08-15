"use client";

import { Button, Card, Chip, Label, ListBox, Select, Switch } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Bot, BrainCircuit, KeyRound, Network, Plus, Sparkles } from "lucide-react";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";

const MODEL_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "用于通用编程、推理与图像理解。",
    authenticationLabel: "API Key 已配置",
    icon: Sparkles,
    isConnected: true,
    isEnabled: true,
    models: ["GPT-5.4", "GPT-5.3 Codex", "o4-mini"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "适合长上下文任务与复杂代码分析。",
    authenticationLabel: "API Key 已配置",
    icon: BrainCircuit,
    isConnected: true,
    isEnabled: true,
    models: ["Claude Opus 4.6", "Claude Sonnet 4.6"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "通过统一端点访问多个模型提供方。",
    authenticationLabel: "OAuth 已连接",
    icon: Network,
    isConnected: true,
    isEnabled: false,
    models: ["Gemini 3.1 Pro", "DeepSeek V4"],
  },
  {
    id: "google",
    name: "Google AI",
    description: "连接 Gemini 系列模型。",
    authenticationLabel: null,
    icon: Bot,
    isConnected: false,
    isEnabled: false,
    models: ["Gemini 3.1 Pro", "Gemini 3 Flash"],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  authenticationLabel: string | null;
  icon: LucideIcon;
  isConnected: boolean;
  isEnabled: boolean;
  models: readonly string[];
}[];

const DEFAULT_MODELS = [
  { id: "openai/gpt-5.4", label: "GPT-5.4 · OpenAI" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6 · Anthropic" },
  { id: "openrouter/gemini-3.1-pro", label: "Gemini 3.1 Pro · OpenRouter" },
] as const;

export function ModelSettingsPanel() {
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
            defaultSelectedKey="openai/gpt-5.4"
            variant="secondary"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {DEFAULT_MODELS.map((model) => (
                  <ListBox.Item id={model.id} key={model.id} textValue={model.label}>
                    <Label>{model.label}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </SettingsRow>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">Provider</h3>
          <p className="mt-1 text-sm text-muted">已连接 3 个，共可使用 7 个模型。</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {MODEL_PROVIDERS.map((provider) => {
          const Icon = provider.icon;

          return (
            <Card key={provider.id} variant="secondary">
              <Card.Header className="flex-row items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                  <Icon aria-hidden className="size-5 text-muted" />
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
                  defaultSelected={provider.isEnabled}
                  isDisabled={!provider.isConnected}
                  size="sm"
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
                    <Chip key={model} size="sm" variant="soft">
                      {model}
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
