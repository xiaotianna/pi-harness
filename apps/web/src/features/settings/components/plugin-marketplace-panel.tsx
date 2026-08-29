"use client";

import {
  Pulse as Activity,
  ChartBar as BarChart3,
  Cloud,
  Diamond as Component,
  LogoFigma as Figma,
  FileMagnifier as FileSearch,
  LogoGithub as Github,
  CodePullRequest as GitPullRequest,
  Globe as Globe2,
  Comment as MessageSquare,
  Pencil,
  Rocket,
  Magnifier as Search,
  LayoutCells as Table2,
  Pipeline as Workflow,
} from "@gravity-ui/icons";
import { Button, Switch } from "@heroui/react";
import { CircleDot } from "lucide-react";
import { type ComponentType, type SVGProps, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { SettingsCatalogDetail } from "./settings-catalog-detail";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

const PLUGIN_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "developer", label: "开发工具" },
  { id: "productivity", label: "生产力" },
] as const;

type PluginCategoryId = (typeof PLUGIN_CATEGORIES)[number]["id"];

const PLUGINS = [
  {
    id: "github",
    name: "GitHub",
    description:
      "连接代码仓库、Issue、Pull Request 和 Actions，为 Agent 补充完整的项目协作上下文。",
    category: "developer",
    icon: Github,
    isInstalled: true,
    skills: [
      {
        id: "github-repository-search",
        name: "仓库检索",
        description: "搜索仓库中的代码、提交记录与文件内容。",
        icon: Search,
        isEnabled: true,
      },
      {
        id: "github-pull-request-review",
        name: "Pull Request 审查",
        description: "读取变更、评论和检查结果，辅助完成代码审查。",
        icon: GitPullRequest,
        isEnabled: true,
      },
      {
        id: "github-issue-management",
        name: "Issue 管理",
        description: "查询并整理 Issue、标签和关联上下文。",
        icon: CircleDot,
        isEnabled: false,
      },
      {
        id: "github-actions-diagnostics",
        name: "Actions 诊断",
        description: "读取工作流运行状态和日志，定位自动化任务问题。",
        icon: Workflow,
        isEnabled: true,
      },
    ],
  },
  {
    id: "figma",
    name: "Figma",
    description: "读取设计稿、评论和组件信息，让界面实现与设计规范保持一致。",
    category: "productivity",
    icon: Figma,
    isInstalled: true,
    skills: [
      {
        id: "figma-design-reader",
        name: "设计稿读取",
        description: "读取页面、图层、样式和布局信息。",
        icon: FileSearch,
        isEnabled: true,
      },
      {
        id: "figma-comments",
        name: "评论协作",
        description: "获取设计评论与讨论上下文。",
        icon: MessageSquare,
        isEnabled: true,
      },
      {
        id: "figma-components",
        name: "组件规范同步",
        description: "读取组件属性和设计变量，辅助还原组件规范。",
        icon: Component,
        isEnabled: false,
      },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "查询部署、域名和运行状态，帮助定位线上环境与发布流程问题。",
    category: "developer",
    icon: Cloud,
    isInstalled: false,
    skills: [
      {
        id: "cloudflare-deployments",
        name: "部署查询",
        description: "查看 Pages 与 Workers 的部署状态和版本。",
        icon: Rocket,
        isEnabled: true,
      },
      {
        id: "cloudflare-dns",
        name: "域名管理",
        description: "查询站点、DNS 记录和域名配置。",
        icon: Globe2,
        isEnabled: true,
      },
      {
        id: "cloudflare-observability",
        name: "运行状态诊断",
        description: "检查服务状态与运行指标，辅助定位线上问题。",
        icon: Activity,
        isEnabled: false,
      },
    ],
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "访问团队表格与业务记录，为任务补充结构化数据和项目上下文。",
    category: "productivity",
    icon: Table2,
    isInstalled: false,
    skills: [
      {
        id: "airtable-record-search",
        name: "记录检索",
        description: "按条件查找表格中的记录和关联数据。",
        icon: Search,
        isEnabled: true,
      },
      {
        id: "airtable-record-update",
        name: "记录更新",
        description: "新增或更新业务记录和字段内容。",
        icon: Pencil,
        isEnabled: false,
      },
      {
        id: "airtable-summary",
        name: "数据汇总",
        description: "整理表格数据并生成简明的任务摘要。",
        icon: BarChart3,
        isEnabled: true,
      },
    ],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  category: "developer" | "productivity";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isInstalled: boolean;
  skills: readonly {
    id: string;
    name: string;
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    isEnabled: boolean;
  }[];
}[];

type Plugin = (typeof PLUGINS)[number];

function PluginInstallButton({ plugin }: { plugin: Plugin }) {
  return (
    <Button
      aria-label={`${plugin.isInstalled ? "卸载" : "安装"} ${plugin.name}`}
      className={`group min-w-16 ${
        plugin.isInstalled
          ? "[--button-bg:var(--success-soft)] [--button-bg-hover:var(--danger-soft-hover)] [--button-bg-pressed:var(--danger-soft-hover)] [--button-fg:var(--success-soft-foreground)] hover:[--button-fg:var(--danger-soft-foreground)] focus-visible:[--button-bg:var(--danger-soft)] focus-visible:[--button-fg:var(--danger-soft-foreground)]"
          : ""
      }`}
      size="sm"
      variant="tertiary"
    >
      {plugin.isInstalled ? (
        <>
          <span className="group-hover:hidden group-focus-visible:hidden">已安装</span>
          <span className="hidden group-hover:inline group-focus-visible:inline">卸载</span>
        </>
      ) : (
        "安装"
      )}
    </Button>
  );
}

function PluginList({
  plugins,
  onSelect,
}: {
  plugins: readonly Plugin[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {plugins.map((plugin) => {
        const Icon = plugin.icon;

        return (
          <SettingsCatalogItem
            action={<PluginInstallButton plugin={plugin} />}
            ariaLabel={`查看 ${plugin.name} 插件详情`}
            icon={<Icon aria-hidden className="size-5 text-muted" />}
            key={plugin.id}
            name={plugin.name}
            secondary={<span className="min-w-0 flex-1 truncate">{plugin.description}</span>}
            onPress={() => onSelect(plugin.id)}
          />
        );
      })}
    </ul>
  );
}

function PluginDetail({ onBack, plugin }: { onBack: () => void; plugin: Plugin }) {
  const Icon = plugin.icon;

  return (
    <SettingsCatalogDetail
      action={<PluginInstallButton plugin={plugin} />}
      ariaLabel={`${plugin.name} 插件详情`}
      backLabel="返回插件市场"
      description={plugin.description}
      icon={<Icon aria-hidden className="size-6 text-muted" />}
      name={plugin.name}
      onBack={onBack}
    >
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">包含的技能</h3>
          <span className="text-sm tabular-nums text-muted">{plugin.skills.length}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {plugin.skills.map((skill) => {
            const SkillIcon = skill.icon;

            return (
              <div
                className="flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5"
                key={skill.id}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                  <SkillIcon aria-hidden className="size-4 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{skill.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">{skill.description}</p>
                </div>
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
              </div>
            );
          })}
        </div>
      </div>
    </SettingsCatalogDetail>
  );
}

export function PluginMarketplacePanel() {
  const [activeCategoryId, setActiveCategoryId] = useState<PluginCategoryId>("all");
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const selectedPlugin = PLUGINS.find((plugin) => plugin.id === selectedPluginId);

  if (selectedPlugin) {
    return <PluginDetail plugin={selectedPlugin} onBack={() => setSelectedPluginId(null)} />;
  }

  const visiblePlugins =
    activeCategoryId === "all"
      ? PLUGINS
      : PLUGINS.filter((plugin) => plugin.category === activeCategoryId);

  return (
    <section aria-label="插件市场" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        description="发现并安装插件，让 Agent 安全地连接常用工具和外部服务。"
        title="插件市场"
      />

      <ToggleButtonGroup
        aria-label="插件分类"
        className="mt-5 flex flex-wrap gap-1"
        disallowEmptySelection
        selectedKeys={[activeCategoryId]}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const [key] = keys;

          if (typeof key === "string") {
            setActiveCategoryId(key as PluginCategoryId);
          }
        }}
      >
        {PLUGIN_CATEGORIES.map((category) => (
          <ToggleButton
            className="h-8 cursor-[var(--cursor-interactive)] rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-accent-soft data-[selected]:font-medium data-[selected]:text-accent-soft-foreground"
            id={category.id}
            key={category.id}
          >
            {category.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <div className="mt-3">
        <PluginList plugins={visiblePlugins} onSelect={setSelectedPluginId} />
      </div>
    </section>
  );
}
