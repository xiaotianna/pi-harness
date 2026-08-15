"use client";

import { Button, Card, Chip, Input, Switch, Tabs, TextField } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import {
  Database,
  Github,
  Globe2,
  MessageSquare,
  PackagePlus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SettingsPanelHeader } from "./settings-panel-header";

const SKILLS = [
  {
    id: "code-review",
    name: "代码审查",
    description: "按缺陷优先级审查代码变更，并给出包含位置、影响和修复建议的发现。",
    scope: "项目技能",
    location: ".agents/skills/code-review/SKILL.md",
    icon: Github,
    resources: ["指令", "参考资料"],
    isInstalled: true,
    isEnabled: true,
  },
  {
    id: "frontend-design",
    name: "前端设计规范",
    description: "在实现界面时应用组件规范、视觉原则和可访问性检查流程。",
    scope: "项目技能",
    location: ".agents/skills/frontend-design/SKILL.md",
    icon: Globe2,
    resources: ["指令", "参考资料", "模板"],
    isInstalled: true,
    isEnabled: true,
  },
  {
    id: "security-review",
    name: "安全审查",
    description: "检查代码变更中的安全风险，并按既定流程验证高置信度问题。",
    scope: "个人技能",
    location: "~/.cursor/skills/security-review/SKILL.md",
    icon: ShieldCheck,
    resources: ["指令", "脚本"],
    isInstalled: true,
    isEnabled: false,
  },
  {
    id: "database-migration",
    name: "数据库迁移检查",
    description: "审阅迁移步骤、兼容性和回滚方案，降低本地数据损坏风险。",
    scope: "技能库",
    location: "database-migration",
    icon: Database,
    resources: ["指令", "检查清单"],
    isInstalled: false,
    isEnabled: false,
  },
  {
    id: "technical-writing",
    name: "技术文档编写",
    description: "根据项目语气和文档结构生成清晰、可维护的技术说明。",
    scope: "技能库",
    location: "technical-writing",
    icon: MessageSquare,
    resources: ["指令", "模板"],
    isInstalled: false,
    isEnabled: false,
  },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  scope: string;
  location: string;
  icon: LucideIcon;
  resources: readonly string[];
  isInstalled: boolean;
  isEnabled: boolean;
}[];

function SkillList({ skills }: { skills: readonly (typeof SKILLS)[number][] }) {
  return (
    <div className="flex flex-col gap-3">
      {skills.map((skill) => {
        const Icon = skill.icon;

        return (
          <Card key={skill.id} variant="secondary">
            <Card.Header className="flex-row items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-default">
                <Icon aria-hidden className="size-5 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <Card.Title>{skill.name}</Card.Title>
                <Card.Description className="mt-1">{skill.description}</Card.Description>
              </div>
              {skill.isInstalled ? (
                <Switch
                  aria-label={`${skill.name} 可用状态`}
                  defaultSelected={skill.isEnabled}
                  size="sm"
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              ) : (
                <Button size="sm" variant="secondary">
                  安装
                </Button>
              )}
            </Card.Header>
            <Card.Content className="mt-4 flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {skill.resources.map((resource) => (
                  <Chip key={resource} size="sm" variant="soft">
                    {resource}
                  </Chip>
                ))}
              </div>
              <span className="max-w-64 truncate text-xs text-muted">
                {skill.scope} · {skill.location}
              </span>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}

export function SkillSettingsPanel() {
  const installedSkills = SKILLS.filter((skill) => skill.isInstalled);

  return (
    <section aria-label="技能设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        action={
          <Button size="sm" variant="secondary">
            <PackagePlus className="size-4" />
            添加本地技能
          </Button>
        }
        description="技能是可复用的任务说明，可包含参考资料、模板和脚本。Agent 会在任务匹配时按需加载，也可以手动调用。"
        title="技能"
      />

      <div className="mt-6 flex items-center gap-3">
        <TextField aria-label="搜索技能" className="min-w-0 flex-1" variant="secondary">
          <Input placeholder="搜索技能" />
        </TextField>
        <Button variant="tertiary">
          <Search className="size-4" />
          搜索
        </Button>
      </div>

      <Tabs className="mt-5" defaultSelectedKey="installed" variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="技能分类">
            <Tabs.Tab id="installed">
              已安装
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="directory">
              技能库
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="pt-4" id="installed">
          <SkillList skills={installedSkills} />
        </Tabs.Panel>
        <Tabs.Panel className="pt-4" id="directory">
          <SkillList skills={SKILLS} />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
