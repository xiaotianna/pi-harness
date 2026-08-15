"use client";

import { Button, Card, Chip, Switch, Tabs, Tooltip } from "@heroui/react";
import { Brain, FolderKanban, Lightbulb, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";

const MEMORY_ITEMS = [
  {
    id: "memory-1",
    category: "preference",
    title: "默认使用中文沟通",
    summary: "解释实现方案、变更摘要和错误信息时优先使用简体中文。",
    source: "来自 8 月 12 日的对话",
    updatedAt: "3 天前",
  },
  {
    id: "memory-2",
    category: "project",
    title: "PI Workbench 的 UI 约定",
    summary: "基础组件使用 HeroUI v3，不添加 focus ring，也不混用其他组件库。",
    source: "项目 · pi-workbench",
    updatedAt: "昨天",
  },
  {
    id: "memory-3",
    category: "preference",
    title: "先给出结论再说明细节",
    summary: "技术说明保持简洁，优先展示最终结果、风险和需要确认的事项。",
    source: "从多次反馈中学习",
    updatedAt: "今天",
  },
  {
    id: "memory-4",
    category: "project",
    title: "本地副作用需要审批",
    summary: "写文件和执行 Shell 命令前，需要明确展示目标、参数摘要与风险。",
    source: "项目 · pi-workbench",
    updatedAt: "今天",
  },
] as const;

function MemoryList({
  items,
}: {
  items: typeof MEMORY_ITEMS | readonly (typeof MEMORY_ITEMS)[number][];
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((memory) => {
        const isProjectMemory = memory.category === "project";
        const Icon = isProjectMemory ? FolderKanban : UserRound;

        return (
          <Card key={memory.id} variant="secondary">
            <Card.Header className="flex-row items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-default">
                <Icon aria-hidden className="size-4 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Card.Title>{memory.title}</Card.Title>
                  <Chip size="sm" variant="soft">
                    {isProjectMemory ? "项目" : "偏好"}
                  </Chip>
                </div>
                <Card.Description className="mt-1">{memory.summary}</Card.Description>
              </div>
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  aria-label={`删除记忆：${memory.title}`}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-muted" />
                </Button>
                <Tooltip.Content placement="top">删除记忆</Tooltip.Content>
              </Tooltip>
            </Card.Header>
            <Card.Content className="mt-3 flex-row items-center justify-between gap-4 text-xs text-muted">
              <span>{memory.source}</span>
              <span>{memory.updatedAt}</span>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}

export function MemorySettingsPanel() {
  const preferenceMemories = MEMORY_ITEMS.filter((memory) => memory.category === "preference");
  const projectMemories = MEMORY_ITEMS.filter((memory) => memory.category === "project");

  return (
    <section aria-label="记忆设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        description="让 Agent 在不同对话中延续你的偏好和项目背景。你可以随时查看或删除保存的内容。"
        title="记忆"
      />

      <div className="mt-6 rounded-2xl bg-default px-4">
        <SettingsRow
          description="启用后，Agent 可以在后续对话中使用已保存的记忆。"
          title="启用记忆"
        >
          <Switch aria-label="启用记忆" defaultSelected>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </div>

      <Card className="mt-4" variant="secondary">
        <Card.Header className="flex-row items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
            <Brain aria-hidden className="size-5 text-accent-soft-foreground" />
          </div>
          <div>
            <Card.Title>记忆由你掌控</Card.Title>
            <Card.Description className="mt-1">
              Agent 只保存有助于未来任务的稳定信息，不会把密钥、完整文件内容或临时输出写入记忆。
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-default p-3 text-sm text-foreground">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-success" />
            敏感内容不会被记住
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-default p-3 text-sm text-foreground">
            <Lightbulb aria-hidden className="size-4 shrink-0 text-accent" />
            重要偏好会主动建议保存
          </div>
        </Card.Content>
      </Card>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">已保存的记忆</h3>
          <p className="mt-1 text-sm text-muted">共 4 条，最近更新于今天。</p>
        </div>
        <Button size="sm" variant="tertiary">
          <Lightbulb className="size-4" />
          添加记忆
        </Button>
      </div>

      <Tabs className="mt-4" defaultSelectedKey="all" variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="记忆分类">
            <Tabs.Tab id="all">
              全部
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="preference">
              个人偏好
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="project">
              项目记忆
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="pt-4" id="all">
          <MemoryList items={MEMORY_ITEMS} />
        </Tabs.Panel>
        <Tabs.Panel className="pt-4" id="preference">
          <MemoryList items={preferenceMemories} />
        </Tabs.Panel>
        <Tabs.Panel className="pt-4" id="project">
          <MemoryList items={projectMemories} />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
