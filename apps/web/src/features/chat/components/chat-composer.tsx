"use client";

import type { ChatStatus } from "@agile-avocation/ui-pro";
import { PromptInput } from "@agile-avocation/ui-pro";
import { Button, Description, Dropdown, Label, Separator, Tooltip, toast } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  CircleAlert,
  Code2,
  Folder,
  FolderOpen,
  Lightbulb,
  Paperclip,
  PencilLine,
  Plus,
  Search,
  SquareTerminal,
  WandSparkles,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  createModelSelectionKey,
  ModelProviderIcon,
  providerQueryOptions,
  useModelSettingsStore,
} from "../../models";
import type { ChatWorkspace } from "../data/chat";
import { useNewChatStore } from "../state/new-chat-store";
import type { ChatAttachmentListItem } from "./chat-attachment-list";
import { ChatAttachmentList } from "./chat-attachment-list";
import {
  ChatComposerEditor,
  type ChatComposerEditorHandle,
  type ChatComposerToken,
  ChatComposerTokenKind,
  type ChatComposerTokenKind as ChatComposerTokenKindValue,
} from "./chat-composer-editor";

type PendingAttachment = {
  id: string;
  mimeType?: string;
  name: string;
  src?: string;
};

function createAttachmentId(file: File): string {
  return `${file.name}-${file.lastModified}-${
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  }`;
}

function revokeAttachmentUrl(attachment: PendingAttachment) {
  if (attachment.src?.startsWith("blob:")) URL.revokeObjectURL(attachment.src);
}

function revokeAttachmentUrls(items: readonly PendingAttachment[]) {
  items.forEach((item) => {
    revokeAttachmentUrl(item);
  });
}

export interface ChatComposerProps {
  className?: string;
  conversationId?: string;
  isAddingWorkspace?: boolean;
  modelId?: string;
  onAddWorkspace?: () => Promise<ChatWorkspace | null>;
  onModelChange?: (selection: ChatComposerModelSelection) => Promise<void>;
  onStopRun?: () => Promise<void>;
  onSubmitMessage?: (input: ChatComposerSubmitInput) => Promise<void>;
  placeholder?: string;
  presentation?: "dock" | "hero";
  providerId?: string;
  status?: ChatStatus;
  workspaces?: readonly ChatWorkspace[];
}

export interface ChatComposerModelSelection {
  modelId: string;
  providerId: string;
}

export interface ChatComposerSubmitInput extends ChatComposerModelSelection {
  prompt: string;
  workspaceId?: string;
}

const COMPOSER_SHORTCUTS = [
  {
    icon: PencilLine,
    label: "写作",
    prompt: "帮我起草并润色以下内容：",
  },
  {
    icon: Code2,
    label: "编程",
    prompt: "帮我解决这个编程问题：",
  },
  {
    icon: Search,
    label: "研究",
    prompt: "研究并比较以下内容：",
  },
  {
    icon: Lightbulb,
    label: "创意",
    prompt: "围绕以下主题集思广益：",
  },
] as const;

const COMMAND_OPTIONS = [
  { id: "review", label: "/review" },
  { id: "explain", label: "/explain" },
  { id: "fix", label: "/fix" },
] as const;

const SKILL_OPTIONS = [
  { id: "frontend-design", label: "Frontend Design" },
  { id: "code-review", label: "Code Review" },
  { id: "documents", label: "Documents" },
] as const;

const SLASH_MENU_ITEMS = [
  ...COMMAND_OPTIONS.map((option) => ({ ...option, kind: ChatComposerTokenKind.COMMAND })),
  ...SKILL_OPTIONS.map((option) => ({ ...option, kind: ChatComposerTokenKind.SKILL })),
] satisfies readonly ChatComposerToken[];

const CONTEXT_MENU_ITEMS = [
  { id: "design-reference.png", kind: ChatComposerTokenKind.IMAGE, label: "design-reference.png" },
  {
    id: "dashboard-preview.jpg",
    kind: ChatComposerTokenKind.IMAGE,
    label: "dashboard-preview.jpg",
  },
  { id: "README.md", kind: ChatComposerTokenKind.FILE, label: "README.md" },
  { id: "package.json", kind: ChatComposerTokenKind.FILE, label: "package.json" },
  { id: "architecture", kind: ChatComposerTokenKind.FILE, label: "架构设计.md" },
  { id: "apps/web", kind: ChatComposerTokenKind.FOLDER, label: "apps/web" },
  {
    id: "packages/agent-runtime",
    kind: ChatComposerTokenKind.FOLDER,
    label: "packages/agent-runtime",
  },
] satisfies readonly ChatComposerToken[];

export function ChatComposer({
  className,
  conversationId,
  isAddingWorkspace = false,
  modelId,
  onAddWorkspace,
  onModelChange,
  onStopRun,
  onSubmitMessage,
  placeholder = "输入任何问题",
  presentation = "dock",
  providerId,
  status: statusProp,
  workspaces = [],
}: ChatComposerProps) {
  const defaultModelKey = useModelSettingsStore((state) => state.defaultModelKey);
  const conversationModelKey = useModelSettingsStore((state) =>
    conversationId ? state.conversationModelKeys[conversationId] : undefined,
  );
  const setConversationModelKey = useModelSettingsStore((state) => state.setConversationModelKey);
  const providersQuery = useQuery(providerQueryOptions());
  const availableModelProviders = useMemo(
    () =>
      (providersQuery.data ?? []).filter(
        (provider) => provider.enabled && provider.isConfigured && provider.models.length > 0,
      ),
    [providersQuery.data],
  );
  const availableModelKeys = useMemo(
    () =>
      availableModelProviders.flatMap((provider) =>
        provider.models.map((model) => createModelSelectionKey(provider.id, model.id)),
      ),
    [availableModelProviders],
  );
  const initialConversationModelKey = useMemo(() => {
    if (providerId && modelId) {
      const modelKey = createModelSelectionKey(providerId, modelId);
      if (availableModelKeys.includes(modelKey)) return modelKey;
    }
    if (!modelId) return null;
    const provider = availableModelProviders.find((item) =>
      item.models.some((model) => model.id === modelId),
    );
    return provider ? createModelSelectionKey(provider.id, modelId) : null;
  }, [availableModelKeys, availableModelProviders, modelId, providerId]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [draftModelKey, setDraftModelKey] = useState<string | null>(null);
  const [isAttachmentDrawerExpanded, setIsAttachmentDrawerExpanded] = useState(true);
  const [internalStatus, setInternalStatus] = useState<ChatStatus>("ready");
  const [hasEditorContent, setHasEditorContent] = useState(false);
  const selectedWorkspaceId = useNewChatStore((state) => state.workspaceId);
  const setSelectedWorkspaceId = useNewChatStore((state) => state.setWorkspaceId);
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  const attachmentDrawerId = useId();
  const editorRef = useRef<ChatComposerEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const status = statusProp ?? internalStatus;

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      revokeAttachmentUrls(attachmentsRef.current);
    };
  }, []);

  const handleStop = () => {
    if (!onStopRun) {
      setInternalStatus("ready");
      return;
    }
    void onStopRun().catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "停止 Run 失败");
    });
  };

  const handleSubmit = () => {
    const value = editorRef.current?.getValue() ?? "";
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0;

    if (
      status !== "ready" ||
      selectedModelKey === null ||
      isSubmittingRef.current ||
      (!trimmed && !hasAttachments) ||
      (isHero && !selectedWorkspace)
    ) {
      return;
    }

    const clearComposer = () => {
      revokeAttachmentUrls(attachments);
      editorRef.current?.clear();
      setAttachments([]);
    };

    if (!onSubmitMessage || !selectedModelProvider || !selectedModel) {
      clearComposer();
      return;
    }

    isSubmittingRef.current = true;
    void onSubmitMessage({
      modelId: selectedModel.id,
      prompt: trimmed,
      providerId: selectedModelProvider.id,
      ...(selectedWorkspace ? { workspaceId: selectedWorkspace.id } : {}),
    })
      .then(clearComposer)
      .catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "发送消息失败");
      })
      .finally(() => {
        isSubmittingRef.current = false;
      });
  };

  const isGenerating = status === "submitted" || status === "streaming";
  const preferredModelKey =
    initialConversationModelKey ?? conversationModelKey ?? draftModelKey ?? defaultModelKey;
  const selectedModelKey =
    preferredModelKey && availableModelKeys.includes(preferredModelKey)
      ? preferredModelKey
      : (availableModelKeys[0] ?? null);
  const sendLabel = isGenerating ? "停止生成" : "发送消息";
  const isHero = presentation === "hero";
  const selectedModelProvider = availableModelProviders.find((provider) =>
    provider.models.some(
      (model) => createModelSelectionKey(provider.id, model.id) === selectedModelKey,
    ),
  );
  const selectedModel = selectedModelProvider?.models.find(
    (model) => createModelSelectionKey(selectedModelProvider.id, model.id) === selectedModelKey,
  );
  const canSend =
    selectedModel !== undefined &&
    (onSubmitMessage ? hasEditorContent : hasEditorContent || attachments.length > 0) &&
    (!isHero || workspaces.length > 0);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0];

  const handleFilesSelected = (files: File[]) => {
    setIsAttachmentDrawerExpanded(true);
    setAttachments((current) => [
      ...current,
      ...files.map((file) => {
        const attachment: PendingAttachment = {
          id: createAttachmentId(file),
          mimeType: file.type,
          name: file.name,
        };

        if (file.type.startsWith("image/")) {
          attachment.src = URL.createObjectURL(file);
        }

        return attachment;
      }),
    ]);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length) handleFilesSelected(files);

    event.currentTarget.value = "";
  };

  const handleRemoveAttachment = (attachment: ChatAttachmentListItem) => {
    if (!attachment.id) return;

    setAttachments((current) => {
      const removed = current.find((item) => item.id === attachment.id);

      if (removed) revokeAttachmentUrl(removed);

      return current.filter((item) => item.id !== attachment.id);
    });
  };

  const handleInsertToken = (
    kind: ChatComposerTokenKindValue,
    options: ReadonlyArray<{ id: string; label: string }>,
    key: unknown,
  ) => {
    const option = options.find((item) => item.id === String(key));
    if (!option) return;

    editorRef.current?.insertToken({ ...option, kind });
  };

  const handleEditorEmptyChange = useCallback((isEmpty: boolean) => {
    setHasEditorContent(!isEmpty);
  }, []);

  const handleModelChange = (modelKey: string) => {
    if (!conversationId) {
      setDraftModelKey(modelKey);
      return;
    }

    const provider = availableModelProviders.find((item) =>
      item.models.some((model) => createModelSelectionKey(item.id, model.id) === modelKey),
    );
    const model = provider?.models.find(
      (item) => createModelSelectionKey(provider.id, item.id) === modelKey,
    );
    if (!onModelChange || !provider || !model) {
      setConversationModelKey(conversationId, modelKey);
      return;
    }

    void onModelChange({ modelId: model.id, providerId: provider.id })
      .then(() => setConversationModelKey(conversationId, modelKey))
      .catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "切换模型失败");
      });
  };

  const handleWorkspaceAction = (key: unknown) => {
    if (key !== "add-workspace") {
      setSelectedWorkspaceId(String(key));
      return;
    }

    if (!onAddWorkspace) return;
    void onAddWorkspace()
      .then((workspace) => {
        if (workspace) setSelectedWorkspaceId(workspace.id);
      })
      .catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "添加工作区失败");
      });
  };

  return (
    <PromptInput
      className={className}
      lockInputOnRun={false}
      status={status}
      value={hasEditorContent ? "content" : ""}
      variant="primary"
      onStop={handleStop}
      onSubmit={handleSubmit}
    >
      {attachments.length ? (
        <div className="relative rounded-t-[32px] bg-default pb-7">
          <div className="relative flex h-8 items-center">
            {isAttachmentDrawerExpanded ? (
              <Button
                isIconOnly
                aria-controls={attachmentDrawerId}
                aria-expanded
                aria-label="收起附件"
                className="absolute left-1/2 min-w-8 -translate-x-1/2 p-0"
                size="sm"
                variant="ghost"
                onPress={() => setIsAttachmentDrawerExpanded(false)}
              >
                <span className="block h-0.5 w-5 rounded-full bg-foreground/80" />
              </Button>
            ) : (
              <Button
                aria-controls={attachmentDrawerId}
                aria-expanded={false}
                aria-label="展开附件"
                className="ml-4 h-8 w-fit min-w-0 translate-y-0.5 justify-start gap-2 px-0"
                size="sm"
                variant="ghost"
                onPress={() => setIsAttachmentDrawerExpanded(true)}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-background text-xs tabular-nums text-muted">
                  {attachments.length}
                </span>
                <span className="text-sm font-normal">{attachments.length} 个附件</span>
              </Button>
            )}
          </div>
          <div
            id={attachmentDrawerId}
            aria-hidden={!isAttachmentDrawerExpanded}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
              isAttachmentDrawerExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
            inert={!isAttachmentDrawerExpanded}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="px-4 pb-1">
                <ChatAttachmentList
                  attachments={attachments}
                  removeLabel="移除附件"
                  variant="token"
                  onRemove={handleRemoveAttachment}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <PromptInput.Shell
        className={`relative z-10 overflow-visible! rounded-[32px] bg-field shadow-field ${
          attachments.length ? "-mt-6" : ""
        }`}
      >
        <PromptInput.Content className="px-1 pt-1">
          <input
            ref={fileInputRef}
            aria-hidden
            multiple
            className="sr-only"
            disabled={isGenerating}
            tabIndex={-1}
            type="file"
            onChange={handleFileInputChange}
          />
          <ChatComposerEditor
            ref={editorRef}
            ariaLabel="消息输入框"
            contextMenuItems={CONTEXT_MENU_ITEMS}
            maxHeight={80}
            minHeight={56}
            onEmptyChange={handleEditorEmptyChange}
            placeholder={placeholder}
            slashMenuItems={SLASH_MENU_ITEMS}
            onSubmit={handleSubmit}
          />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className="translate-y-1">
            <Dropdown>
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  aria-label="添加文件等内容"
                  className="size-8 min-w-8 p-0"
                  size="sm"
                  variant="ghost"
                >
                  <Plus className="size-4" />
                </Button>
                <Tooltip.Content placement="top">添加文件等内容</Tooltip.Content>
              </Tooltip>
              <Dropdown.Popover className="min-w-48" placement="bottom start">
                <Dropdown.Menu
                  aria-label="添加文件等内容"
                  onAction={(key) => {
                    if (key === "attach") fileInputRef.current?.click();
                  }}
                >
                  <Dropdown.Item
                    id="attach"
                    isDisabled={isGenerating || onSubmitMessage !== undefined}
                    textValue="添加附件"
                  >
                    <Paperclip className="size-4 text-muted" />
                    <Label>添加附件</Label>
                  </Dropdown.Item>
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="commands" textValue="命令">
                      <SquareTerminal className="size-4 text-muted" />
                      <Label>命令</Label>
                      <Dropdown.SubmenuIndicator />
                    </Dropdown.Item>
                    <Dropdown.Popover className="min-w-40" placement="right top">
                      <Dropdown.Menu
                        aria-label="命令"
                        onAction={(key) =>
                          handleInsertToken(ChatComposerTokenKind.COMMAND, COMMAND_OPTIONS, key)
                        }
                      >
                        {COMMAND_OPTIONS.map((option) => (
                          <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                            <Label>{option.label}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.SubmenuTrigger>
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="skills" textValue="Skills">
                      <WandSparkles className="size-4 text-muted" />
                      <Label>Skills</Label>
                      <Dropdown.SubmenuIndicator />
                    </Dropdown.Item>
                    <Dropdown.Popover className="min-w-40" placement="right top">
                      <Dropdown.Menu
                        aria-label="Skills"
                        onAction={(key) =>
                          handleInsertToken(ChatComposerTokenKind.SKILL, SKILL_OPTIONS, key)
                        }
                      >
                        {SKILL_OPTIONS.map((option) => (
                          <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                            <Label>{option.label}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.SubmenuTrigger>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            {isHero ? (
              <Dropdown>
                <Button
                  aria-label="选择工作区"
                  className="max-w-44 gap-2 px-2"
                  isDisabled={isGenerating}
                  size="sm"
                  variant="ghost"
                >
                  {selectedWorkspace ? (
                    <FolderOpen className="size-4 shrink-0" />
                  ) : (
                    <Folder className="size-4 shrink-0" />
                  )}
                  <span className="truncate">{selectedWorkspace?.name ?? "选择工作区"}</span>
                  <ChevronDown className="size-3.5 shrink-0" />
                </Button>
                <Dropdown.Popover
                  className="w-80 max-w-[calc(100vw-2rem)]"
                  placement="bottom start"
                >
                  <Dropdown.Menu
                    aria-label="选择工作区"
                    selectedKeys={selectedWorkspace ? new Set([selectedWorkspace.id]) : new Set()}
                    selectionMode="single"
                    onAction={handleWorkspaceAction}
                  >
                    {workspaces.map((workspace) => (
                      <Dropdown.Item
                        className="ps-2 pe-7"
                        key={workspace.id}
                        id={workspace.id}
                        textValue={workspace.name}
                      >
                        <Folder className="size-4 text-muted" />
                        <Label className="min-w-0 flex-1 truncate">{workspace.name}</Label>
                        <Dropdown.ItemIndicator className="start-auto end-2" />
                      </Dropdown.Item>
                    ))}
                    <Separator className="my-1" />
                    <Dropdown.Item
                      id="add-workspace"
                      isDisabled={isAddingWorkspace}
                      textValue="添加工作区"
                    >
                      <Plus className="size-4 text-muted" />
                      <Label>添加工作区...</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : null}
            <Dropdown>
              <Button
                aria-label="选择模型"
                className={`gap-2 px-2 ${
                  isGenerating ? "pointer-events-auto! cursor-[var(--cursor-disabled)]!" : ""
                }`}
                isDisabled={isGenerating}
                size="sm"
                variant="ghost"
              >
                {selectedModelProvider ? (
                  <ModelProviderIcon isColor providerId={selectedModelProvider.id} size={16} />
                ) : null}
                <span>
                  {selectedModel?.name ?? (providersQuery.isPending ? "加载模型…" : "选择模型")}
                </span>
                <ChevronDown className="size-3.5" />
              </Button>
              <Dropdown.Popover className="min-w-52" placement="bottom start">
                <Dropdown.Menu aria-label="选择模型 Provider">
                  {availableModelProviders.length === 0 ? (
                    <Dropdown.Item isDisabled id="no-models" textValue="暂无可用模型">
                      <CircleAlert className="size-4 text-muted" />
                      <div className="flex flex-col">
                        <Label>{providersQuery.isPending ? "正在加载模型" : "暂无可用模型"}</Label>
                        <Description>请先在设置中连接并启用 Provider</Description>
                      </div>
                    </Dropdown.Item>
                  ) : (
                    availableModelProviders.map((provider) => (
                      <Dropdown.SubmenuTrigger key={provider.id}>
                        <Dropdown.Item id={`provider-${provider.id}`} textValue={provider.name}>
                          <ModelProviderIcon isColor providerId={provider.id} size={16} />
                          <Label>{provider.name}</Label>
                          <Dropdown.SubmenuIndicator />
                        </Dropdown.Item>
                        <Dropdown.Popover className="min-w-60">
                          <Dropdown.Menu
                            aria-label={`${provider.name} 模型`}
                            selectedKeys={
                              selectedModelKey ? new Set([selectedModelKey]) : new Set()
                            }
                            selectionMode="single"
                            onAction={(key) => {
                              if (typeof key === "string") handleModelChange(key);
                            }}
                          >
                            {provider.models.map((model) => (
                              <Dropdown.Item
                                className="ps-2 pe-7"
                                key={createModelSelectionKey(provider.id, model.id)}
                                id={createModelSelectionKey(provider.id, model.id)}
                                textValue={model.name}
                              >
                                <ModelProviderIcon isColor providerId={provider.id} size={16} />
                                <Label>{model.name}</Label>
                                <Dropdown.ItemIndicator className="start-auto end-2" />
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown.SubmenuTrigger>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </PromptInput.ToolbarStart>
          <PromptInput.ToolbarEnd>
            <PromptInput.Send aria-label={sendLabel} isDisabled={!canSend && !isGenerating} />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
      {isHero ? (
        <div className="mt-6 flex flex-wrap items-center gap-1 px-3 sm:gap-2">
          {COMPOSER_SHORTCUTS.map((shortcut) => {
            const ShortcutIcon = shortcut.icon;

            return (
              <Button
                key={shortcut.label}
                className="px-3"
                size="sm"
                variant="ghost"
                onPress={() => editorRef.current?.setValue(shortcut.prompt)}
              >
                <ShortcutIcon className="size-4" />
                {shortcut.label}
              </Button>
            );
          })}
        </div>
      ) : (
        <PromptInput.Footer className="mt-2!">AI 可能会出错，请核实重要信息。</PromptInput.Footer>
      )}
    </PromptInput>
  );
}
