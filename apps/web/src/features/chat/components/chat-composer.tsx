"use client";

import type { ChatStatus } from "@agile-avocation/ui-pro";
import { PromptInput } from "@agile-avocation/ui-pro";
import { Button, Dropdown, Label, Tooltip } from "@heroui/react";
import {
  ChevronDown,
  Code2,
  Lightbulb,
  Paperclip,
  PencilLine,
  Plug,
  Search,
  Settings2,
  Sparkles,
  SquareTerminal,
  WandSparkles,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CHAT_MODELS } from "../data/chat";
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
  modelId?: string;
  placeholder?: string;
  presentation?: "dock" | "hero";
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

const MCP_OPTIONS = [
  { id: "filesystem", label: "Filesystem" },
  { id: "github", label: "GitHub" },
  { id: "browser", label: "Browser" },
] as const;

const SLASH_MENU_ITEMS = [
  ...COMMAND_OPTIONS.map((option) => ({ ...option, kind: ChatComposerTokenKind.COMMAND })),
  ...SKILL_OPTIONS.map((option) => ({ ...option, kind: ChatComposerTokenKind.SKILL })),
  ...MCP_OPTIONS.map((option) => ({ ...option, kind: ChatComposerTokenKind.MCP })),
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
  modelId = CHAT_MODELS[0]?.id ?? "gpt-5.4",
  placeholder = "输入任何问题",
  presentation = "dock",
}: ChatComposerProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isAttachmentDrawerExpanded, setIsAttachmentDrawerExpanded] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState(modelId);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [value, setValue] = useState("");
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  const attachmentDrawerId = useId();
  const editorRef = useRef<ChatComposerEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    timersRef.current = [];
  }, []);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    setSelectedModelId(modelId);
  }, [modelId]);

  useEffect(() => {
    return () => {
      clearTimers();
      revokeAttachmentUrls(attachmentsRef.current);
    };
  }, [clearTimers]);

  const handleStop = () => {
    clearTimers();
    setStatus("ready");
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0;

    if (status !== "ready" || (!trimmed && !hasAttachments)) return;

    revokeAttachmentUrls(attachments);
    setValue("");
    setAttachments([]);
    setStatus("submitted");
    clearTimers();

    timersRef.current.push(
      window.setTimeout(() => setStatus("streaming"), 350),
      window.setTimeout(() => setStatus("ready"), 1600),
    );
  };

  const isGenerating = status === "submitted" || status === "streaming";
  const canSend = Boolean(value.trim() || attachments.length);
  const sendLabel = isGenerating ? "停止生成" : "发送消息";
  const isHero = presentation === "hero";
  const selectedModel = CHAT_MODELS.find((model) => model.id === selectedModelId) ?? CHAT_MODELS[0];

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

  return (
    <PromptInput
      className={className}
      status={status}
      value={value}
      variant="primary"
      onStop={handleStop}
      onSubmit={handleSubmit}
      onValueChange={setValue}
    >
      {attachments.length ? (
        <div className="relative rounded-t-[28px] bg-default pb-7">
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
        className={`relative z-10 overflow-visible! rounded-[28px] bg-field shadow-field ${
          attachments.length ? "-mt-6" : ""
        } ${isHero ? "min-h-[184px]" : "min-h-[132px]"}`}
      >
        <PromptInput.Content>
          <div className="px-3 pt-3">
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
            <PromptInput.Action
              aria-label="添加附件"
              className="size-8 min-w-8"
              isDisabled={isGenerating}
              style={{ boxShadow: "none" }}
              tooltip="添加附件"
              onPress={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </PromptInput.Action>
          </div>
          <ChatComposerEditor
            ref={editorRef}
            ariaLabel="消息输入框"
            contextMenuItems={CONTEXT_MENU_ITEMS}
            isDisabled={isGenerating}
            minHeight={isHero ? 92 : 56}
            placeholder={placeholder}
            slashMenuItems={SLASH_MENU_ITEMS}
            value={value}
            onSubmit={handleSubmit}
            onValueChange={setValue}
          />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart>
            <Dropdown>
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  aria-label="输入设置"
                  className="size-8 min-w-8 p-0"
                  isDisabled={isGenerating}
                  size="sm"
                  variant="ghost"
                >
                  <Settings2 className="size-4" />
                </Button>
                <Tooltip.Content placement="top">设置</Tooltip.Content>
              </Tooltip>
              <Dropdown.Popover className="min-w-48" placement="bottom start">
                <Dropdown.Menu
                  aria-label="输入设置"
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
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="mcp" textValue="MCP">
                      <Plug className="size-4 text-muted" />
                      <Label>MCP</Label>
                      <Dropdown.SubmenuIndicator />
                    </Dropdown.Item>
                    <Dropdown.Popover className="min-w-40" placement="right top">
                      <Dropdown.Menu
                        aria-label="MCP"
                        onAction={(key) =>
                          handleInsertToken(ChatComposerTokenKind.MCP, MCP_OPTIONS, key)
                        }
                      >
                        {MCP_OPTIONS.map((option) => (
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
            <Dropdown>
              <Button
                aria-label="选择模型"
                className="gap-2 px-2"
                isDisabled={isGenerating}
                size="sm"
                variant="ghost"
              >
                <Sparkles className="size-4" />
                <span>{selectedModel?.label ?? "自动选择"}</span>
                <ChevronDown className="size-3.5" />
              </Button>
              <Dropdown.Popover className="min-w-52" placement="bottom start">
                <Dropdown.Menu
                  aria-label="选择模型"
                  selectedKeys={new Set([selectedModelId])}
                  selectionMode="single"
                  onAction={(key) => setSelectedModelId(String(key))}
                >
                  {CHAT_MODELS.map((model) => (
                    <Dropdown.Item key={model.id} id={model.id} textValue={model.label}>
                      <Sparkles className="size-4 text-muted" />
                      <Label>{model.label}</Label>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  ))}
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
                onPress={() => setValue(shortcut.prompt)}
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
