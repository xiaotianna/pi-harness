"use client";

import { ArrowShapeTurnUpRight, Pencil, TrashBin as Trash2 } from "@gravity-ui/icons";
import { Button, ScrollShadow, Surface, TextArea, Tooltip, toast } from "@heroui/react";
import type { QueuedRunInput } from "@pi-harness/agent-runtime/user-input";
import { useCallback, useState } from "react";

export function QueuedRunInputs({
  items,
  onRemove,
  onSteer,
  onUpdate,
}: {
  items: readonly QueuedRunInput[];
  onRemove: (queuedInputId: string) => Promise<void>;
  onSteer: (queuedInputId: string) => Promise<void>;
  onUpdate: (queuedInputId: string, prompt: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const setDraftTextAreaRef = useCallback((textArea: HTMLTextAreaElement | null) => {
    if (!textArea) return;
    textArea.focus({ preventScroll: true });
    textArea.setSelectionRange(textArea.value.length, textArea.value.length);
  }, []);

  if (items.length === 0) return null;

  const update = async (item: QueuedRunInput) => {
    const prompt = draft.trim();
    if (!prompt || prompt === item.prompt) return;
    setPendingId(item.id);
    try {
      await onUpdate(item.id, prompt);
      setEditingId(null);
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "保存排队消息失败");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (queuedInputId: string) => {
    setPendingId(queuedInputId);
    try {
      await onRemove(queuedInputId);
      if (editingId === queuedInputId) setEditingId(null);
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "删除排队消息失败");
    } finally {
      setPendingId(null);
    }
  };

  const steer = async (queuedInputId: string) => {
    setPendingId(queuedInputId);
    try {
      await onSteer(queuedInputId);
      if (editingId === queuedInputId) setEditingId(null);
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "调整方向失败");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Surface
      aria-label="排队消息"
      className="rounded-t-[32px] bg-default px-2 pt-2 pb-7"
      role="region"
      variant="secondary"
    >
      <div className="flex items-center justify-between px-2 pb-1.5">
        <h3 className="text-xs font-medium text-foreground">已排队</h3>
        <span className="text-xs tabular-nums text-muted">{items.length} 条</span>
      </div>
      <ScrollShadow className="max-h-28 space-y-1 overflow-y-auto" orientation="vertical">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          const isPending = pendingId === item.id;
          const contextCount = item.attachments.length + item.references.length;

          return (
            <div className="px-2" key={item.id}>
              {isEditing ? (
                <div className="flex min-h-10 items-center gap-1">
                  <TextArea
                    fullWidth
                    aria-label="编辑排队消息"
                    className="min-w-0 flex-1 resize-none px-0 [--textarea-bg-focus:transparent] [--textarea-bg-hover:transparent] [--textarea-bg:transparent]"
                    disabled={isPending}
                    ref={setDraftTextAreaRef}
                    rows={1}
                    value={draft}
                    variant="secondary"
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <Button
                    className="h-7 min-w-0 px-2"
                    isDisabled={isPending}
                    size="sm"
                    variant="tertiary"
                    onPress={() => setEditingId(null)}
                  >
                    取消
                  </Button>
                  <Button
                    className="h-7 min-w-0 px-2"
                    isDisabled={!draft.trim() || draft.trim() === item.prompt}
                    isPending={isPending}
                    size="sm"
                    variant="primary"
                    onPress={() => void update(item)}
                  >
                    保存
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-9 min-w-0 items-center gap-1">
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.prompt || "仅包含附件或引用"}
                    {contextCount > 0 ? (
                      <span className="ml-1.5 text-xs text-muted">
                        · {contextCount} 个附件或引用
                      </span>
                    ) : null}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      className="h-7 min-w-0 gap-1 px-2 text-muted"
                      isDisabled={pendingId !== null}
                      size="sm"
                      variant="tertiary"
                      onPress={() => void steer(item.id)}
                    >
                      <ArrowShapeTurnUpRight aria-hidden className="size-3.5" />
                      调整方向
                    </Button>
                    <Tooltip delay={0}>
                      <Button
                        isIconOnly
                        aria-label="编辑排队消息"
                        className="size-7 min-w-7 p-0"
                        isDisabled={pendingId !== null}
                        size="sm"
                        variant="tertiary"
                        onPress={() => {
                          setDraft(item.prompt);
                          setEditingId(item.id);
                        }}
                      >
                        <Pencil className="size-3.5 text-muted" />
                      </Button>
                      <Tooltip.Content placement="top">编辑</Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Button
                        isIconOnly
                        aria-label="删除排队消息"
                        className="size-7 min-w-7 p-0 text-danger [--button-bg-hover:var(--danger-soft)] [--button-bg-pressed:var(--danger-soft-hover)]"
                        isDisabled={pendingId !== null}
                        size="sm"
                        variant="ghost"
                        onPress={() => void remove(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      <Tooltip.Content placement="top">删除</Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </ScrollShadow>
    </Surface>
  );
}
