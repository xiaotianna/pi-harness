"use client";

import { FolderOpen, Gear, Person, Plus, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Popover, SearchField, Switch, Tooltip, toast } from "@heroui/react";
import { useState } from "react";
import {
  MEMORY_SCOPES,
  type MemoryEntry,
  MemoryScope,
  MemoryStatus,
  useMemoryDemoStore,
} from "../state/memory-demo-store";
import { MemoryEditorDialog } from "./memory-editor-dialog";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsFilterTabs } from "./settings-filter-tabs";
import { SettingsPanelHeader } from "./settings-panel-header";

const MemoryView = {
  ALL: "all",
  USER: "user",
  PROJECT: "project",
  SUGGESTED: "suggested",
} as const;
const MEMORY_FILTERS = [
  { id: MemoryView.ALL, label: "全部记忆" },
  { id: MemoryView.USER, label: "个人记忆" },
  { id: MemoryView.PROJECT, label: "项目记忆" },
  { id: MemoryView.SUGGESTED, label: "待确认" },
];

export function MemorySettingsPanel() {
  const { memories, isEnabled, canSuggest, setEnabled, setCanSuggest, save, remove } =
    useMemoryDemoStore();
  const [view, setView] = useState<string>(MemoryView.ALL);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ entry: MemoryEntry | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemoryEntry | null>(null);
  const suggestions = memories.filter(({ status }) => status === MemoryStatus.SUGGESTED);
  const saved = memories.filter(({ status }) => status === MemoryStatus.SAVED);
  const visible = (view === MemoryView.SUGGESTED ? suggestions : saved).filter(
    (entry) =>
      (view !== MemoryView.USER || entry.scope === MemoryScope.USER) &&
      (view !== MemoryView.PROJECT || entry.scope !== MemoryScope.USER) &&
      `${entry.content} ${entry.source} ${MEMORY_SCOPES.find(({ id }) => id === entry.scope)?.label}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <section aria-label="记忆设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        title="记忆"
        description="管理个人偏好和项目背景。"
        action={
          <div className="flex items-center gap-2">
            <Popover>
              <Button size="sm" variant="ghost">
                <Gear aria-hidden className="size-4" />
                记忆设置
              </Button>
              <Popover.Content
                className="w-80 max-w-[calc(100vw-2rem)]"
                offset={8}
                placement="bottom end"
              >
                <Popover.Dialog className="p-3">
                  <Popover.Heading className="text-sm font-medium">记忆设置</Popover.Heading>
                  <div className="mt-3 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">使用记忆</p>
                        <p className="mt-1 text-xs text-muted">
                          {isEnabled
                            ? "在对话中参考已保存的记忆。"
                            : "已暂停使用，仍可查看和管理记忆。"}
                        </p>
                      </div>
                      <Switch
                        aria-label="使用记忆"
                        className="mt-0.5 shrink-0"
                        isSelected={isEnabled}
                        onChange={setEnabled}
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">从对话中学习</p>
                        <p className="mt-1 text-xs text-muted">
                          {canSuggest && isEnabled
                            ? "新的记忆建议经你确认后保存。"
                            : "已暂停产生新建议，已有建议仍可处理。"}
                        </p>
                      </div>
                      <Switch
                        aria-label="从对话中学习"
                        className="mt-0.5 shrink-0"
                        isSelected={canSuggest}
                        onChange={setCanSuggest}
                        isDisabled={!isEnabled}
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </div>
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
            <Button size="sm" variant="secondary" onPress={() => setEditor({ entry: null })}>
              <Plus aria-hidden className="size-4" />
              添加记忆
            </Button>
          </div>
        }
      />
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 @xl/settings:flex-row @xl/settings:items-center @xl/settings:justify-between">
          <SettingsFilterTabs
            label="筛选记忆"
            items={MEMORY_FILTERS}
            selectedKey={view}
            onSelectionChange={setView}
          />
          <SearchField
            aria-label="搜索记忆"
            className="w-full min-w-0 @xl/settings:w-64"
            value={search}
            onChange={setSearch}
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="搜索记忆" />
              <SearchField.ClearButton aria-label="清除搜索" />
            </SearchField.Group>
          </SearchField>
        </div>
        {view === MemoryView.SUGGESTED && (
          <p className="text-sm text-muted">确认后加入记忆库，用于后续对话。</p>
        )}
        <ul className="flex flex-col gap-1">
          {visible.map((entry) => {
            const scope = MEMORY_SCOPES.find(({ id }) => id === entry.scope);
            const Icon = entry.scope === MemoryScope.USER ? Person : FolderOpen;
            return (
              <SettingsCatalogItem
                key={entry.id}
                ariaLabel={`编辑记忆：${entry.content}`}
                name={entry.content}
                icon={<Icon aria-hidden className="size-5 text-muted" />}
                onPress={() => setEditor({ entry })}
                secondary={
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>{scope?.label}</span>
                    <span>{entry.source}</span>
                    <span>{entry.updatedAt}</span>
                  </span>
                }
                action={
                  <div className="flex flex-col items-end gap-1 @xl/settings:flex-row @xl/settings:items-center">
                    {entry.status === MemoryStatus.SUGGESTED && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          save({ ...entry, status: MemoryStatus.SAVED, updatedAt: "刚刚" });
                          toast.success("已加入记忆库");
                        }}
                      >
                        记住
                      </Button>
                    )}
                    <Tooltip>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-muted data-[hovered]:text-danger"
                        aria-label={`删除记忆：${entry.content}`}
                        onPress={() => setDeleteTarget(entry)}
                      >
                        <TrashBin aria-hidden className="size-4" />
                      </Button>
                      <Tooltip.Content>
                        {entry.status === MemoryStatus.SUGGESTED ? "忽略建议" : "删除记忆"}
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                }
              />
            );
          })}
        </ul>
        {!visible.length && (
          <div className="py-8 text-center" role="status">
            <p className="text-sm text-muted">
              {search
                ? "没有找到匹配的记忆"
                : view === MemoryView.SUGGESTED
                  ? "暂无待确认的记忆"
                  : "暂无记忆"}
            </p>
            {search && (
              <Button className="mt-3" size="sm" variant="tertiary" onPress={() => setSearch("")}>
                清除搜索
              </Button>
            )}
          </div>
        )}
      </div>
      {editor && (
        <MemoryEditorDialog
          entry={editor.entry}
          onClose={() => setEditor(null)}
          onSave={(entry) => {
            save(entry);
            setEditor(null);
            toast.success(
              entry.status === MemoryStatus.SUGGESTED ? "建议已更新，确认后生效" : "记忆已保存",
            );
          }}
        />
      )}
      <AlertDialog.Backdrop
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {deleteTarget?.status === MemoryStatus.SUGGESTED
                  ? "忽略这条建议？"
                  : "删除这条记忆？"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="break-words">{deleteTarget?.content}</p>
              <p className="mt-3 text-sm text-muted">删除后，此内容将从记忆库中移除。</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  if (deleteTarget) remove(deleteTarget.id);
                  setDeleteTarget(null);
                  toast.success("已移除");
                }}
              >
                确认移除
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </section>
  );
}
