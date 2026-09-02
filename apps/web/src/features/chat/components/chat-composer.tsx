"use client";

import type { ChatStatus } from "@agile-avocation/ui-pro";
import { PromptInput } from "@agile-avocation/ui-pro";
import {
  ChevronDown,
  CircleExclamation as CircleAlert,
  Code as Code2,
  Folder,
  FolderOpen,
  Bulb as Lightbulb,
  Paperclip,
  PencilToLine as PencilLine,
  Plus,
  Magnifier as Search,
  Terminal as SquareTerminal,
  MagicWand as WandSparkles,
} from "@gravity-ui/icons";
import {
  Button,
  Description,
  Disclosure,
  Dropdown,
  Label,
  ListBox,
  Popover,
  ScrollShadow,
  Separator,
  Skeleton,
  Tooltip,
  toast,
  useMediaQuery,
} from "@heroui/react";
import type { HarnessEvent } from "@pi-harness/agent-runtime/harness-event";
import {
  DEFAULT_THINKING_LEVEL,
  ThinkingLevel,
  type ThinkingLevel as ThinkingLevelValue,
} from "@pi-harness/agent-runtime/thinking-level";
import {
  BusySubmitBehavior,
  type BusySubmitBehavior as BusySubmitBehaviorValue,
  type QueuedRunInput,
  type RunInputContextReference,
  type RunUserInput,
  UserContextReferenceKind,
} from "@pi-harness/agent-runtime/user-input";
import type { ApprovalPolicy } from "@pi-harness/policy/approval-policy";
import { useQuery } from "@tanstack/react-query";
import { maxBy } from "es-toolkit";
import type { ChangeEvent, ClipboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ListLayout, Virtualizer } from "react-aria-components";
import {
  createModelSelectionKey,
  type ModelProvider,
  ModelProviderIcon,
  providerQueryOptions,
  useModelSettingsStore,
} from "../../models";
import { ApprovalPolicySelect, useAppSettings } from "../../settings";
import { skillListQueryOptions } from "../../skills";
import { workspaceContextItemsQueryOptions } from "../api/workspace-queries";
import type { ChatWorkspace } from "../data/chat";
import { useNewChatStore } from "../state/new-chat-store";
import {
  createRunInputAttachment,
  MAX_RUN_ATTACHMENT_BYTES,
  MAX_RUN_ATTACHMENT_TOTAL_BYTES,
  MAX_RUN_ATTACHMENTS,
} from "../utils/run-input";
import type { SessionUsageSummary } from "../utils/session-usage";
import type { ChatAttachmentListItem } from "./chat-attachment-list";
import { ChatAttachmentList } from "./chat-attachment-list";
import {
  ChatComposerEditor,
  type ChatComposerEditorHandle,
  ChatComposerTokenKind,
  type ChatComposerTokenKind as ChatComposerTokenKindValue,
  createChatComposerTokenValue,
} from "./chat-composer-editor";
import { ContextUsagePopover } from "./context-usage-popover";
import { QueuedRunInputs } from "./queued-run-inputs";

type PendingAttachment = {
  file: File;
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
  events?: readonly HarnessEvent[];
  initialPrompt?: string;
  initialSkillLabel?: string;
  initialSkillName?: string;
  isAddingWorkspace?: boolean;
  modelId?: string;
  onAddWorkspace?: () => Promise<ChatWorkspace | null>;
  onModelChange?: (selection: ChatComposerModelSelection) => Promise<void>;
  onStopRun?: () => Promise<void>;
  onRemoveQueuedInput?: (queuedInputId: string) => Promise<void>;
  onSteerQueuedInput?: (queuedInputId: string) => Promise<void>;
  onSubmitMessage?: (input: ChatComposerSubmitInput) => Promise<void>;
  onUpdateQueuedInput?: (queuedInputId: string, prompt: string) => Promise<void>;
  placeholder?: string;
  presentation?: "dock" | "hero";
  providerId?: string;
  queuedInputs?: readonly QueuedRunInput[];
  status?: ChatStatus;
  thinkingLevel?: ThinkingLevelValue;
  usage?: SessionUsageSummary;
  workspaceId?: string;
  workspaces?: readonly ChatWorkspace[];
}

export interface ChatComposerModelSelection {
  modelId: string;
  providerId: string;
  thinkingLevel: ThinkingLevelValue;
}

export interface ChatComposerSubmitInput extends ChatComposerModelSelection, RunUserInput {
  busySubmitBehavior?: BusySubmitBehaviorValue;
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

const THINKING_LEVEL_OPTIONS = [
  { description: "响应更快、成本更低", label: "低", value: ThinkingLevel.LOW },
  { description: "默认均衡", label: "中", value: ThinkingLevel.MEDIUM },
  { description: "质量更好，但更慢、更贵", label: "高", value: ThinkingLevel.HIGH },
] as const;

const MODEL_MENU_LAYOUT_OPTIONS = { gap: 2, padding: 6, rowSize: 36 } as const;
const SKILL_SCOPE_LABELS = {
  global: "全局",
  project: "项目",
  system: "系统",
} as const;
const SKILL_SCOPE_ORDER = { system: 0, global: 1, project: 2 } as const;

function getSkillOptionLabel(name: string, scope: keyof typeof SKILL_SCOPE_LABELS): string {
  if (scope !== "system") return name;
  return name
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function MobileModelPicker({
  isDisabled,
  onModelChange,
  onThinkingLevelChange,
  providers,
  selectedModel,
  selectedModelKey,
  selectedProvider,
  selectedThinkingLevel,
  selectedThinkingLevelLabel,
}: {
  isDisabled: boolean;
  onModelChange: (modelKey: string) => void;
  onThinkingLevelChange: (thinkingLevel: ThinkingLevelValue) => void;
  providers: readonly ModelProvider[];
  selectedModel: ModelProvider["models"][number] | undefined;
  selectedModelKey: string | null;
  selectedProvider: ModelProvider | undefined;
  selectedThinkingLevel: ThinkingLevelValue;
  selectedThinkingLevelLabel: string;
}) {
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const triggerLabel = `选择模型，当前 ${selectedModel?.name ?? "未选择模型"}${
    selectedModel?.thinkingLevels.length ? `，推理强度${selectedThinkingLevelLabel}` : ""
  }`;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Tooltip delay={0}>
        <Button
          isIconOnly
          aria-label={triggerLabel}
          isDisabled={isDisabled}
          size="sm"
          variant="ghost"
        >
          {selectedProvider ? (
            <ModelProviderIcon isColor providerId={selectedProvider.id} size={16} />
          ) : (
            <CircleAlert className="size-4 text-muted" />
          )}
        </Button>
        <Tooltip.Content placement="top">{selectedModel?.name ?? "选择模型"}</Tooltip.Content>
      </Tooltip>
      <Popover.Content
        className="w-max min-w-52 max-w-[calc(100vw-2rem)] overflow-hidden"
        placement="top start"
      >
        <Popover.Dialog className="p-0">
          <ScrollShadow className="max-h-[min(70dvh,32rem)] p-1.5" orientation="vertical">
            <Disclosure>
              <Disclosure.Heading>
                <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                  <Label>推理强度</Label>
                  <Description className="ms-auto text-sm">
                    {selectedModel?.thinkingLevels.length
                      ? selectedThinkingLevelLabel
                      : "当前模型不支持"}
                  </Description>
                  <Disclosure.Indicator className="ms-0" />
                </Disclosure.Trigger>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body style={{ padding: 0 }}>
                  <ListBox
                    aria-label="推理强度"
                    className="px-1"
                    disallowEmptySelection
                    selectedKeys={new Set([selectedThinkingLevel])}
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                      if (keys === "all") return;
                      const [key] = keys;
                      const option = THINKING_LEVEL_OPTIONS.find((item) => item.value === key);
                      if (option) onThinkingLevelChange(option.value);
                    }}
                  >
                    {THINKING_LEVEL_OPTIONS.map((option) => (
                      <ListBox.Item
                        id={option.value}
                        isDisabled={!selectedModel?.thinkingLevels.includes(option.value)}
                        key={option.value}
                        textValue={`${option.label} ${option.description}`}
                      >
                        <div className="flex flex-col">
                          <Label>{option.label}</Label>
                          <Description>{option.description}</Description>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
            <Separator className="my-1" />
            {providers.length === 0 ? (
              <div className="flex min-h-9 items-center gap-3 px-2.5 py-1.5">
                <CircleAlert className="size-4 shrink-0 text-muted" />
                <div className="flex flex-col">
                  <Label>暂无可用模型</Label>
                  <Description>请先在设置中连接并启用 Provider</Description>
                </div>
              </div>
            ) : (
              providers.map((provider) => {
                const isExpanded = expandedProviderId === provider.id;

                return (
                  <Disclosure
                    isExpanded={isExpanded}
                    key={provider.id}
                    onExpandedChange={(nextIsExpanded) =>
                      setExpandedProviderId(nextIsExpanded ? provider.id : null)
                    }
                  >
                    <Disclosure.Heading
                      {...(isExpanded ? { className: "sticky top-0 z-10 bg-overlay" } : {})}
                    >
                      <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                        <ModelProviderIcon isColor providerId={provider.id} size={16} />
                        <Label>{provider.name}</Label>
                        <Disclosure.Indicator />
                      </Disclosure.Trigger>
                    </Disclosure.Heading>
                    <Disclosure.Content>
                      <Disclosure.Body style={{ padding: 0 }}>
                        <Virtualizer layout={ListLayout} layoutOptions={MODEL_MENU_LAYOUT_OPTIONS}>
                          <ListBox
                            aria-label={`${provider.name} 模型`}
                            className="max-h-[min(50dvh,20rem)] overflow-y-auto p-0!"
                            disallowEmptySelection
                            items={provider.models}
                            selectedKeys={
                              selectedModelKey ? new Set([selectedModelKey]) : new Set()
                            }
                            selectionMode="single"
                            onSelectionChange={(keys) => {
                              if (keys === "all") return;
                              const [key] = keys;
                              if (typeof key !== "string") return;
                              onModelChange(key);
                              setIsOpen(false);
                            }}
                          >
                            {(model) => (
                              <ListBox.Item
                                className="ps-2 pe-7"
                                id={createModelSelectionKey(provider.id, model.id)}
                                key={createModelSelectionKey(provider.id, model.id)}
                                textValue={model.name}
                              >
                                <ModelProviderIcon isColor providerId={provider.id} size={16} />
                                <Label className="min-w-0 truncate">{model.name}</Label>
                                <ListBox.ItemIndicator className="start-auto end-2" />
                              </ListBox.Item>
                            )}
                          </ListBox>
                        </Virtualizer>
                      </Disclosure.Body>
                    </Disclosure.Content>
                  </Disclosure>
                );
              })
            )}
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function ChatComposer({
  className,
  conversationId,
  events,
  initialPrompt = "",
  initialSkillLabel,
  initialSkillName,
  isAddingWorkspace = false,
  modelId,
  onAddWorkspace,
  onModelChange,
  onRemoveQueuedInput,
  onSteerQueuedInput,
  onStopRun,
  onSubmitMessage,
  onUpdateQueuedInput,
  placeholder = "输入任何问题",
  presentation = "dock",
  providerId,
  queuedInputs = [],
  status: statusProp,
  thinkingLevel,
  usage,
  workspaceId,
  workspaces = [],
}: ChatComposerProps) {
  const { isLoading: isAppSettingsLoading, isSaving, settings, updateSettings } = useAppSettings();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const approvalPolicy = settings?.approvalPolicy;
  const defaultModelKey = settings?.defaultModel
    ? createModelSelectionKey(settings.defaultModel.providerId, settings.defaultModel.modelId)
    : null;
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
  const initialEditorValue = useMemo(() => {
    const skillToken = initialSkillName
      ? createChatComposerTokenValue({
          id: initialSkillName,
          kind: ChatComposerTokenKind.SKILL,
          label: initialSkillLabel ?? initialSkillName,
        })
      : "";
    return [skillToken, initialPrompt].filter(Boolean).join(" ");
  }, [initialPrompt, initialSkillLabel, initialSkillName]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [expandedMobileAddMenuSection, setExpandedMobileAddMenuSection] = useState<
    "commands" | "skills" | null
  >(null);
  const [isMobileAddMenuOpen, setIsMobileAddMenuOpen] = useState(false);
  const [isAttachmentDrawerExpanded, setIsAttachmentDrawerExpanded] = useState(true);
  const [internalStatus, setInternalStatus] = useState<ChatStatus>("ready");
  const [hasEditorContent, setHasEditorContent] = useState(() =>
    Boolean(initialEditorValue.trim()),
  );
  const selectedWorkspaceId = useNewChatStore((state) => state.workspaceId);
  const setSelectedWorkspaceId = useNewChatStore((state) => state.setWorkspaceId);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0];
  const activeWorkspaceId = workspaceId ?? selectedWorkspace?.id;
  const contextItemsQuery = useQuery(workspaceContextItemsQueryOptions(activeWorkspaceId));
  const contextMenuItems = useMemo(
    () =>
      (contextItemsQuery.data ?? []).map((item) => ({
        id: item.path,
        kind:
          item.kind === UserContextReferenceKind.IMAGE
            ? ChatComposerTokenKind.IMAGE
            : item.kind === UserContextReferenceKind.FOLDER
              ? ChatComposerTokenKind.FOLDER
              : ChatComposerTokenKind.FILE,
        label: item.path,
      })),
    [contextItemsQuery.data],
  );
  const skillsQuery = useQuery(skillListQueryOptions(activeWorkspaceId));
  const skillOptions = useMemo(
    () =>
      (skillsQuery.data ?? [])
        .filter((skill) => skill.isEnabled)
        .toSorted(
          (left, right) =>
            SKILL_SCOPE_ORDER[left.scope] - SKILL_SCOPE_ORDER[right.scope] ||
            left.name.localeCompare(right.name),
        )
        .map((skill) => ({
          description: skill.description,
          id: skill.name,
          label: getSkillOptionLabel(skill.name, skill.scope),
          scopeLabel: SKILL_SCOPE_LABELS[skill.scope],
        })),
    [skillsQuery.data],
  );
  const slashMenuItems = useMemo(
    () => [
      ...COMMAND_OPTIONS.map((option) => ({
        ...option,
        kind: ChatComposerTokenKind.COMMAND,
      })),
      ...skillOptions.map((option) => ({ ...option, kind: ChatComposerTokenKind.SKILL })),
    ],
    [skillOptions],
  );
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

  const handleSubmit = (useAlternateBusyBehavior = false) => {
    const value = editorRef.current?.getValue() ?? "";
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0;
    const references = editorRef.current?.getTokens().flatMap<RunInputContextReference>((token) => {
      const kind =
        token.kind === ChatComposerTokenKind.IMAGE
          ? UserContextReferenceKind.IMAGE
          : token.kind === ChatComposerTokenKind.FOLDER
            ? UserContextReferenceKind.FOLDER
            : token.kind === ChatComposerTokenKind.FILE
              ? UserContextReferenceKind.FILE
              : null;
      return kind === null ? [] : [{ kind, path: token.id }];
    });
    const uniqueReferences = [
      ...new Map((references ?? []).map((item) => [item.path, item])).values(),
    ];

    if (
      approvalPolicy === undefined ||
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
    void Promise.all(attachments.map((attachment) => createRunInputAttachment(attachment.file)))
      .then((runAttachments) =>
        onSubmitMessage({
          attachments: runAttachments,
          ...(isGenerating
            ? {
                busySubmitBehavior: useAlternateBusyBehavior
                  ? settings?.busySubmitBehavior === BusySubmitBehavior.STEER
                    ? BusySubmitBehavior.QUEUE
                    : BusySubmitBehavior.STEER
                  : (settings?.busySubmitBehavior ?? BusySubmitBehavior.QUEUE),
              }
            : {}),
          modelId: selectedModel.id,
          prompt: trimmed,
          providerId: selectedModelProvider.id,
          references: uniqueReferences,
          thinkingLevel: selectedThinkingLevel,
          ...(selectedWorkspace ? { workspaceId: selectedWorkspace.id } : {}),
        }),
      )
      .then(clearComposer)
      .catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "发送消息失败");
      })
      .finally(() => {
        isSubmittingRef.current = false;
      });
  };

  const isGenerating = status === "submitted" || status === "streaming";
  const hasDraftContent = hasEditorContent || attachments.length > 0;
  const preferredModelKey = initialConversationModelKey ?? conversationModelKey ?? defaultModelKey;
  const selectedModelKey =
    preferredModelKey && availableModelKeys.includes(preferredModelKey)
      ? preferredModelKey
      : (availableModelKeys[0] ?? null);
  const sendLabel =
    isGenerating && !hasDraftContent ? "停止生成" : isGenerating ? "发送后续消息" : "发送消息";
  const busyActionLabel =
    settings?.busySubmitBehavior === BusySubmitBehavior.STEER ? "调整方向" : "排队发送";
  const isHero = presentation === "hero";
  const selectedModelProvider = availableModelProviders.find((provider) =>
    provider.models.some(
      (model) => createModelSelectionKey(provider.id, model.id) === selectedModelKey,
    ),
  );
  const selectedModel = selectedModelProvider?.models.find(
    (model) => createModelSelectionKey(selectedModelProvider.id, model.id) === selectedModelKey,
  );
  const selectedThinkingLevel =
    thinkingLevel ?? settings?.defaultModel?.thinkingLevel ?? DEFAULT_THINKING_LEVEL;
  const selectedThinkingLevelOption = THINKING_LEVEL_OPTIONS.find(
    (option) => option.value === selectedThinkingLevel,
  );
  const selectedThinkingLevelLabel = selectedThinkingLevelOption?.label ?? "中";
  const canSend =
    approvalPolicy !== undefined &&
    selectedModel !== undefined &&
    hasDraftContent &&
    (!isHero || workspaces.length > 0);
  const handleFilesSelected = (files: File[]) => {
    const remainingSlots = Math.max(0, MAX_RUN_ATTACHMENTS - attachments.length);
    let availableBytes = Math.max(
      0,
      MAX_RUN_ATTACHMENT_TOTAL_BYTES -
        attachments.reduce((total, item) => total + item.file.size, 0),
    );
    const acceptedFiles = files
      .filter((file) => {
        if (file.size > MAX_RUN_ATTACHMENT_BYTES) {
          toast.danger(`${file.name} 超过 5 MB，无法添加`);
          return false;
        }
        if (file.size > availableBytes) {
          toast.danger("附件总大小不能超过 10 MB");
          return false;
        }
        availableBytes -= file.size;
        return true;
      })
      .slice(0, remainingSlots);
    if (files.length > remainingSlots) toast.warning(`一次最多添加 ${MAX_RUN_ATTACHMENTS} 个附件`);
    if (acceptedFiles.length === 0) return;
    setIsAttachmentDrawerExpanded(true);
    setAttachments((current) => [
      ...current,
      ...acceptedFiles.map((file) => {
        const attachment: PendingAttachment = {
          file,
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

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;

    event.preventDefault();
    handleFilesSelected(files);
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
    const provider = availableModelProviders.find((item) =>
      item.models.some((model) => createModelSelectionKey(item.id, model.id) === modelKey),
    );
    const model = provider?.models.find(
      (item) => createModelSelectionKey(provider.id, item.id) === modelKey,
    );
    if (!provider || !model) return;
    if (!conversationId) {
      void updateSettings({
        defaultModel: {
          modelId: model.id,
          providerId: provider.id,
          thinkingLevel: selectedThinkingLevel,
        },
      }).catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "保存默认模型失败");
      });
      return;
    }
    if (!onModelChange) {
      setConversationModelKey(conversationId, modelKey);
      return;
    }

    void onModelChange({
      modelId: model.id,
      providerId: provider.id,
      thinkingLevel: selectedThinkingLevel,
    })
      .then(() => setConversationModelKey(conversationId, modelKey))
      .catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "切换模型失败");
      });
  };

  const handleThinkingLevelChange = (nextThinkingLevel: ThinkingLevelValue) => {
    if (!selectedModel?.thinkingLevels.includes(nextThinkingLevel)) return;
    if (!conversationId) {
      if (!selectedModelProvider) return;
      void updateSettings({
        defaultModel: {
          modelId: selectedModel.id,
          providerId: selectedModelProvider.id,
          thinkingLevel: nextThinkingLevel,
        },
      }).catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "保存默认模型配置失败");
      });
      return;
    }
    if (!onModelChange || !selectedModelProvider) return;

    void onModelChange({
      modelId: selectedModel.id,
      providerId: selectedModelProvider.id,
      thinkingLevel: nextThinkingLevel,
    }).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "切换推理强度失败");
    });
  };

  const handleApprovalPolicyChange = (nextApprovalPolicy: ApprovalPolicy) => {
    void updateSettings({ approvalPolicy: nextApprovalPolicy }).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "保存权限审批设置失败");
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

  const closeMobileAddMenu = () => {
    setIsMobileAddMenuOpen(false);
    setExpandedMobileAddMenuSection(null);
  };

  const addMenuTrigger = (
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
  );

  return (
    <PromptInput
      allowSubmitWhileRunning
      className={className}
      lockInputOnRun={false}
      status={status}
      value={hasDraftContent ? "content" : ""}
      variant="primary"
      onStop={handleStop}
      onSubmit={() => handleSubmit(false)}
    >
      {onRemoveQueuedInput && onSteerQueuedInput && onUpdateQueuedInput ? (
        <QueuedRunInputs
          items={queuedInputs}
          onRemove={onRemoveQueuedInput}
          onSteer={onSteerQueuedInput}
          onUpdate={onUpdateQueuedInput}
        />
      ) : null}
      {attachments.length ? (
        <div
          className={`relative bg-default pb-7 ${
            queuedInputs.length ? "-mt-6 pt-6" : "rounded-t-[32px]"
          }`}
        >
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
        className={`relative z-10 overflow-visible! rounded-[32px] bg-field opacity-100! shadow-field ${
          attachments.length || queuedInputs.length ? "-mt-6" : ""
        }`}
      >
        <PromptInput.Content className="px-1 pt-1" onPaste={handlePaste}>
          <input
            ref={fileInputRef}
            aria-hidden
            multiple
            className="sr-only"
            tabIndex={-1}
            type="file"
            onChange={handleFileInputChange}
          />
          <ChatComposerEditor
            ref={editorRef}
            ariaLabel="消息输入框"
            contextMenuItems={contextMenuItems}
            contextMenuStatus={
              contextItemsQuery.isPending
                ? "loading"
                : contextItemsQuery.isError
                  ? "error"
                  : "ready"
            }
            initialValue={initialEditorValue}
            maxHeight={80}
            minHeight={56}
            onEmptyChange={handleEditorEmptyChange}
            placeholder={placeholder}
            slashMenuItems={slashMenuItems}
            onSubmit={handleSubmit}
          />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className="translate-y-1">
            {isMobile ? (
              <Popover
                isOpen={isMobileAddMenuOpen}
                onOpenChange={(nextIsOpen) => {
                  setIsMobileAddMenuOpen(nextIsOpen);
                  if (!nextIsOpen) setExpandedMobileAddMenuSection(null);
                }}
              >
                {addMenuTrigger}
                <Popover.Content
                  className="w-max min-w-48 max-w-[calc(100vw-2rem)] overflow-hidden"
                  placement="top start"
                >
                  <Popover.Dialog className="p-0">
                    <ScrollShadow className="max-h-[min(70dvh,32rem)] p-1.5" orientation="vertical">
                      <Button
                        className="min-h-9 w-full justify-start gap-3 px-2.5 py-1.5"
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          fileInputRef.current?.click();
                          closeMobileAddMenu();
                        }}
                      >
                        <Paperclip className="size-4 text-muted" />
                        <Label>添加附件</Label>
                      </Button>
                      <Disclosure
                        isExpanded={expandedMobileAddMenuSection === "commands"}
                        onExpandedChange={(isExpanded) =>
                          setExpandedMobileAddMenuSection(isExpanded ? "commands" : null)
                        }
                      >
                        <Disclosure.Heading>
                          <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                            <SquareTerminal className="size-4 text-muted" />
                            <Label>命令</Label>
                            <Disclosure.Indicator />
                          </Disclosure.Trigger>
                        </Disclosure.Heading>
                        <Disclosure.Content>
                          <Disclosure.Body style={{ padding: 0 }}>
                            <ListBox
                              aria-label="命令"
                              className="px-1"
                              selectionMode="none"
                              onAction={(key) => {
                                handleInsertToken(
                                  ChatComposerTokenKind.COMMAND,
                                  COMMAND_OPTIONS,
                                  key,
                                );
                                closeMobileAddMenu();
                              }}
                            >
                              {COMMAND_OPTIONS.map((option) => (
                                <ListBox.Item
                                  key={option.id}
                                  id={option.id}
                                  textValue={option.label}
                                >
                                  <Label>{option.label}</Label>
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Disclosure.Body>
                        </Disclosure.Content>
                      </Disclosure>
                      <Disclosure
                        isExpanded={expandedMobileAddMenuSection === "skills"}
                        onExpandedChange={(isExpanded) =>
                          setExpandedMobileAddMenuSection(isExpanded ? "skills" : null)
                        }
                      >
                        <Disclosure.Heading>
                          <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                            <WandSparkles className="size-4 text-muted" />
                            <Label>Skills</Label>
                            <Disclosure.Indicator />
                          </Disclosure.Trigger>
                        </Disclosure.Heading>
                        <Disclosure.Content>
                          <Disclosure.Body style={{ padding: 0 }}>
                            <ListBox
                              aria-label="Skills"
                              className="px-1"
                              selectionMode="none"
                              onAction={(key) => {
                                handleInsertToken(ChatComposerTokenKind.SKILL, skillOptions, key);
                                closeMobileAddMenu();
                              }}
                            >
                              {!activeWorkspaceId ? (
                                <ListBox.Item id="skills-workspace-required" isDisabled>
                                  <Label>请先选择工作区</Label>
                                </ListBox.Item>
                              ) : skillsQuery.isPending ? (
                                <ListBox.Item id="skills-loading" isDisabled>
                                  <Label>正在加载 Skills...</Label>
                                </ListBox.Item>
                              ) : skillsQuery.isError ? (
                                <ListBox.Item id="skills-error" isDisabled>
                                  <Label>Skills 加载失败</Label>
                                </ListBox.Item>
                              ) : skillOptions.length === 0 ? (
                                <ListBox.Item id="skills-empty" isDisabled>
                                  <Label>暂无可用 Skill</Label>
                                </ListBox.Item>
                              ) : (
                                skillOptions.map((option) => (
                                  <ListBox.Item
                                    key={option.id}
                                    id={option.id}
                                    textValue={option.label}
                                  >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                      <WandSparkles
                                        aria-hidden
                                        className="size-4 shrink-0 text-muted"
                                      />
                                      <div className="flex min-w-0 flex-1 flex-col">
                                        <Label>{option.label}</Label>
                                        <Description className="max-w-72 truncate">
                                          {option.description}
                                        </Description>
                                      </div>
                                      <span className="shrink-0 text-sm text-muted">
                                        {option.scopeLabel}
                                      </span>
                                    </div>
                                  </ListBox.Item>
                                ))
                              )}
                            </ListBox>
                          </Disclosure.Body>
                        </Disclosure.Content>
                      </Disclosure>
                    </ScrollShadow>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
            ) : (
              <Dropdown>
                {addMenuTrigger}
                <Dropdown.Popover className="min-w-48" placement="bottom start">
                  <Dropdown.Menu
                    aria-label="添加文件等内容"
                    onAction={(key) => {
                      if (key === "attach") fileInputRef.current?.click();
                    }}
                  >
                    <Dropdown.Item id="attach" textValue="添加附件">
                      <Paperclip className="size-4 text-muted" />
                      <Label>添加附件</Label>
                    </Dropdown.Item>
                    <Dropdown.SubmenuTrigger>
                      <Dropdown.Item id="commands" textValue="命令">
                        <SquareTerminal className="size-4 text-muted" />
                        <Label>命令</Label>
                        <Dropdown.SubmenuIndicator />
                      </Dropdown.Item>
                      <Dropdown.Popover className="min-w-40" placement="right bottom">
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
                      <Dropdown.Popover className="min-w-40" placement="right bottom">
                        <Dropdown.Menu
                          aria-label="Skills"
                          onAction={(key) =>
                            handleInsertToken(ChatComposerTokenKind.SKILL, skillOptions, key)
                          }
                        >
                          {!activeWorkspaceId ? (
                            <Dropdown.Item id="skills-workspace-required" isDisabled>
                              <Label>请先选择工作区</Label>
                            </Dropdown.Item>
                          ) : skillsQuery.isPending ? (
                            <Dropdown.Item id="skills-loading" isDisabled>
                              <Label>正在加载 Skills...</Label>
                            </Dropdown.Item>
                          ) : skillsQuery.isError ? (
                            <Dropdown.Item id="skills-error" isDisabled>
                              <Label>Skills 加载失败</Label>
                            </Dropdown.Item>
                          ) : skillOptions.length === 0 ? (
                            <Dropdown.Item id="skills-empty" isDisabled>
                              <Label>暂无可用 Skill</Label>
                            </Dropdown.Item>
                          ) : (
                            skillOptions.map((option) => (
                              <Dropdown.Item
                                key={option.id}
                                id={option.id}
                                textValue={option.label}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <WandSparkles
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted"
                                  />
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <Label>{option.label}</Label>
                                    <Description className="max-w-72 truncate">
                                      {option.description}
                                    </Description>
                                  </div>
                                  <span className="shrink-0 text-sm text-muted">
                                    {option.scopeLabel}
                                  </span>
                                </div>
                              </Dropdown.Item>
                            ))
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown.SubmenuTrigger>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            )}
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
                <Dropdown.Popover placement="bottom start">
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
                    {workspaces.length > 0 ? <Separator className="my-1" /> : null}
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
            {approvalPolicy === undefined ? (
              <Skeleton aria-hidden className="h-8 w-8 rounded-full sm:w-32" />
            ) : (
              <ApprovalPolicySelect
                className="max-w-36 gap-2 px-2"
                isDisabled={isSaving}
                showDescription
                value={approvalPolicy}
                onChange={handleApprovalPolicyChange}
              />
            )}
            {providersQuery.isPending || isAppSettingsLoading ? (
              <Skeleton aria-hidden className="h-8 w-8 rounded-full sm:w-40" />
            ) : isMobile ? (
              <MobileModelPicker
                isDisabled={isSaving}
                providers={availableModelProviders}
                selectedModel={selectedModel}
                selectedModelKey={selectedModelKey}
                selectedProvider={selectedModelProvider}
                selectedThinkingLevel={selectedThinkingLevel}
                selectedThinkingLevelLabel={selectedThinkingLevelLabel}
                onModelChange={handleModelChange}
                onThinkingLevelChange={handleThinkingLevelChange}
              />
            ) : (
              <Dropdown>
                <Button
                  aria-label={`选择模型，当前 ${selectedModel?.name ?? "未选择模型"}${
                    selectedModel?.thinkingLevels.length
                      ? `，推理强度${selectedThinkingLevelLabel}`
                      : ""
                  }`}
                  className="gap-2 px-2"
                  isDisabled={isSaving}
                  size="sm"
                  variant="ghost"
                >
                  {selectedModelProvider ? (
                    <ModelProviderIcon isColor providerId={selectedModelProvider.id} size={16} />
                  ) : null}
                  <span>{selectedModel?.name ?? "选择模型"}</span>
                  {selectedModel?.thinkingLevels.length ? (
                    <span className="font-normal text-muted">{selectedThinkingLevelLabel}</span>
                  ) : null}
                  <ChevronDown className="size-3.5" />
                </Button>
                <Dropdown.Popover className="min-w-52" placement="bottom start">
                  <Dropdown.Menu aria-label="选择模型 Provider">
                    <Dropdown.SubmenuTrigger>
                      <Dropdown.Item
                        id="thinking-level"
                        isDisabled={!selectedModel || selectedModel.thinkingLevels.length === 0}
                        textValue={`推理强度 ${selectedThinkingLevelLabel}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
                          <Label>推理强度</Label>
                          <Description className="text-sm">
                            {selectedModel?.thinkingLevels.length
                              ? selectedThinkingLevelLabel
                              : "当前模型不支持"}
                          </Description>
                        </div>
                        <Dropdown.SubmenuIndicator />
                      </Dropdown.Item>
                      <Dropdown.Popover className="min-w-60" placement="right top">
                        <Dropdown.Menu
                          aria-label="推理强度"
                          selectedKeys={new Set([selectedThinkingLevel])}
                          selectionMode="single"
                          onAction={(key) => {
                            const option = THINKING_LEVEL_OPTIONS.find(
                              (item) => item.value === key,
                            );
                            if (option) handleThinkingLevelChange(option.value);
                          }}
                        >
                          {THINKING_LEVEL_OPTIONS.map((option) => (
                            <Dropdown.Item
                              className="ps-2 pe-7"
                              id={option.value}
                              isDisabled={!selectedModel?.thinkingLevels.includes(option.value)}
                              key={option.value}
                              textValue={`${option.label} ${option.description}`}
                            >
                              <div className="flex flex-col">
                                <Label>{option.label}</Label>
                                <Description>{option.description}</Description>
                              </div>
                              <Dropdown.ItemIndicator className="start-auto end-2" />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown.SubmenuTrigger>
                    <Separator className="my-1" />
                    {availableModelProviders.length === 0 ? (
                      <Dropdown.Item isDisabled id="no-models" textValue="暂无可用模型">
                        <CircleAlert className="size-4 text-muted" />
                        <div className="flex flex-col">
                          <Label>暂无可用模型</Label>
                          <Description>请先在设置中连接并启用 Provider</Description>
                        </div>
                      </Dropdown.Item>
                    ) : (
                      availableModelProviders.map((provider) => {
                        const widestModelName = maxBy(
                          provider.models,
                          (model) => model.name.length,
                        )?.name;

                        return (
                          <Dropdown.SubmenuTrigger key={provider.id}>
                            <Dropdown.Item id={`provider-${provider.id}`} textValue={provider.name}>
                              <ModelProviderIcon isColor providerId={provider.id} size={16} />
                              <Label>{provider.name}</Label>
                              <Dropdown.SubmenuIndicator />
                            </Dropdown.Item>
                            <Dropdown.Popover className="w-max max-w-[calc(100vw-2rem)]! overflow-hidden">
                              <span
                                aria-hidden
                                className="pointer-events-none invisible block h-0 whitespace-nowrap px-10 text-sm"
                              >
                                {widestModelName}
                              </span>
                              <Virtualizer
                                layout={ListLayout}
                                layoutOptions={MODEL_MENU_LAYOUT_OPTIONS}
                              >
                                <Dropdown.Menu
                                  aria-label={`${provider.name} 模型`}
                                  className="max-h-[calc(100vh-2rem)] overflow-y-auto! p-0!"
                                  items={provider.models}
                                  selectedKeys={
                                    selectedModelKey ? new Set([selectedModelKey]) : new Set()
                                  }
                                  selectionMode="single"
                                  onAction={(key) => {
                                    if (typeof key === "string") handleModelChange(key);
                                  }}
                                >
                                  {(model) => (
                                    <Dropdown.Item
                                      className="ps-2 pe-7"
                                      id={createModelSelectionKey(provider.id, model.id)}
                                      textValue={model.name}
                                    >
                                      <ModelProviderIcon
                                        isColor
                                        providerId={provider.id}
                                        size={16}
                                      />
                                      <Label className="whitespace-nowrap">{model.name}</Label>
                                      <Dropdown.ItemIndicator className="start-auto end-2" />
                                    </Dropdown.Item>
                                  )}
                                </Dropdown.Menu>
                              </Virtualizer>
                            </Dropdown.Popover>
                          </Dropdown.SubmenuTrigger>
                        );
                      })
                    )}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            )}
          </PromptInput.ToolbarStart>
          <PromptInput.ToolbarEnd>
            {!isHero && usage && providersQuery.isPending ? (
              <Skeleton aria-hidden className="h-8 w-12 rounded-full" />
            ) : null}
            {!isHero && usage && conversationId && !providersQuery.isPending && selectedModel ? (
              <ContextUsagePopover
                contextWindow={selectedModel.contextWindow}
                events={events ?? []}
                isGenerating={isGenerating}
                sessionId={conversationId}
                summary={usage}
              />
            ) : null}
            {isGenerating && hasDraftContent ? (
              <Button
                className="h-8 min-w-0 px-2"
                size="sm"
                variant="tertiary"
                onPress={handleStop}
              >
                停止
              </Button>
            ) : null}
            {isGenerating && hasDraftContent ? (
              <Button
                className="h-8 min-w-0 px-3"
                isDisabled={!canSend}
                size="sm"
                variant="primary"
                onPress={() => handleSubmit(false)}
              >
                {busyActionLabel}
              </Button>
            ) : (
              <PromptInput.Send
                aria-label={sendLabel}
                {...(isGenerating ? {} : { isDisabled: !canSend })}
              />
            )}
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
