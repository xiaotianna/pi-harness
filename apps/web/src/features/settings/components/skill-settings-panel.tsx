"use client";

import {
  Database,
  LogoGithub as Github,
  Globe as Globe2,
  Comment as MessageSquare,
  Box as PackagePlus,
  Magnifier as Search,
  ShieldCheck,
} from "@gravity-ui/icons";
import { Button, Chip, Input, Switch, TextField } from "@heroui/react";
import { type ComponentType, type SVGProps, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { SettingsPanelHeader } from "./settings-panel-header";

const SKILL_STATUSES = [
  { id: "all", label: "全部" },
  { id: "enabled", label: "已开启" },
  { id: "disabled", label: "已关闭" },
] as const;

type SkillStatusId = (typeof SKILL_STATUSES)[number]["id"];

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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  resources: readonly string[];
  isInstalled: boolean;
  isEnabled: boolean;
}[];

function SkillList({
  enabledSkillIds,
  skills,
  onEnabledChange,
}: {
  enabledSkillIds: ReadonlySet<string>;
  skills: readonly (typeof SKILLS)[number][];
  onEnabledChange: (skillId: string, isEnabled: boolean) => void;
}) {
  if (skills.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">暂无技能</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {skills.map((skill) => {
        const Icon = skill.icon;

        return (
          <li
            className="flex min-h-24 items-start gap-3 rounded-xl px-3 py-3 hover:bg-default focus-within:bg-default"
            key={skill.id}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
              <Icon aria-hidden className="size-5 text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{skill.name}</p>
              <p className="mt-0.5 text-sm text-muted">{skill.description}</p>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {skill.resources.map((resource) => (
                    <Chip key={resource} size="sm" variant="soft">
                      {resource}
                    </Chip>
                  ))}
                </div>
                <span className="min-w-0 max-w-64 truncate text-xs text-muted">
                  {skill.scope} · {skill.location}
                </span>
              </div>
            </div>
            {skill.isInstalled ? (
              <Switch
                aria-label={`${skill.name} 可用状态`}
                isSelected={enabledSkillIds.has(skill.id)}
                size="sm"
                onChange={(isSelected) => onEnabledChange(skill.id, isSelected)}
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
          </li>
        );
      })}
    </ul>
  );
}

export function SkillSettingsPanel() {
  const [activeStatusId, setActiveStatusId] = useState<SkillStatusId>("all");
  const [enabledSkillIds, setEnabledSkillIds] = useState<Set<string>>(
    () => new Set(SKILLS.filter((skill) => skill.isEnabled).map((skill) => skill.id)),
  );
  const visibleSkills =
    activeStatusId === "all"
      ? SKILLS
      : SKILLS.filter((skill) => enabledSkillIds.has(skill.id) === (activeStatusId === "enabled"));

  const handleEnabledChange = (skillId: string, isEnabled: boolean) => {
    setEnabledSkillIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isEnabled) {
        nextIds.add(skillId);
      } else {
        nextIds.delete(skillId);
      }

      return nextIds;
    });
  };

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

      <ToggleButtonGroup
        aria-label="技能状态"
        className="mt-5 flex flex-wrap gap-1"
        disallowEmptySelection
        selectedKeys={[activeStatusId]}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const [key] = keys;

          if (typeof key === "string") {
            setActiveStatusId(key as SkillStatusId);
          }
        }}
      >
        {SKILL_STATUSES.map((status) => (
          <ToggleButton
            className="h-8 cursor-[var(--cursor-interactive)] rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-default data-[selected]:font-medium data-[selected]:text-foreground"
            id={status.id}
            key={status.id}
          >
            {status.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <div className="mt-3">
        <SkillList
          enabledSkillIds={enabledSkillIds}
          skills={visibleSkills}
          onEnabledChange={handleEnabledChange}
        />
      </div>
    </section>
  );
}
