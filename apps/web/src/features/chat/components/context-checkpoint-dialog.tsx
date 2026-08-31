"use client";

import { Button, Label, ListBox, Modal, ScrollShadow, Select, toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AssistantMarkdown } from "../../../components/ai/assistant-markdown";
import { restoreSessionContextCheckpoint } from "../api/session-api";
import { sessionQueryKeys } from "../api/session-queries";
import type { SessionContextCheckpoint } from "../utils/context-checkpoints";

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

interface CheckpointValueProps {
  label: string;
  value: string | readonly string[];
}

function CheckpointValue({ label, value }: CheckpointValueProps) {
  return (
    <div className="min-w-0 rounded-xl bg-default px-3 py-2.5">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {typeof value === "string" ? (
        <AssistantMarkdown className="mt-1.5 min-w-0 text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
          {value || "—"}
        </AssistantMarkdown>
      ) : value.length > 0 ? (
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-foreground marker:text-muted">
          {value.map((entry, index) => (
            <li className="min-w-0" key={`${index}-${entry}`}>
              <AssistantMarkdown className="min-w-0 text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {entry}
              </AssistantMarkdown>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-foreground">—</p>
      )}
    </div>
  );
}

interface CheckpointComparisonProps {
  left: SessionContextCheckpoint;
  right: SessionContextCheckpoint;
}

function CheckpointComparison({ left, right }: CheckpointComparisonProps) {
  const fields = [
    ["目标", left.checkpoint.objective, right.checkpoint.objective],
    ["约束", left.checkpoint.constraints, right.checkpoint.constraints],
    ["决策", left.checkpoint.decisions, right.checkpoint.decisions],
    ["已完成", left.checkpoint.completed, right.checkpoint.completed],
    ["待处理", left.checkpoint.pending, right.checkpoint.pending],
    ["阻塞", left.checkpoint.blockers, right.checkpoint.blockers],
    ["下一步", left.checkpoint.nextAction, right.checkpoint.nextAction],
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {fields.map(([label, leftValue, rightValue]) => (
        <section className="min-w-0" key={label}>
          <h3 className="mb-2 text-sm font-medium text-foreground">{label}</h3>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <CheckpointValue label={`基准 · #${left.eventSeq}`} value={leftValue} />
            <CheckpointValue label={`对比 · #${right.eventSeq}`} value={rightValue} />
          </div>
        </section>
      ))}
    </div>
  );
}

export interface ContextCheckpointDialogProps {
  activeEventSeq: number | null;
  checkpoints: readonly SessionContextCheckpoint[];
  isGenerating: boolean;
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function ContextCheckpointDialog({
  activeEventSeq,
  checkpoints,
  isGenerating,
  isOpen,
  onClose,
  sessionId,
}: ContextCheckpointDialogProps) {
  const queryClient = useQueryClient();
  const newestFirst = useMemo(() => [...checkpoints].reverse(), [checkpoints]);
  const [leftSeq, setLeftSeq] = useState("");
  const [rightSeq, setRightSeq] = useState("");

  useEffect(() => {
    if (!isOpen || newestFirst.length === 0) return;
    const activeIndex = Math.max(
      0,
      newestFirst.findIndex((item) => item.eventSeq === activeEventSeq),
    );
    setRightSeq(String(newestFirst[activeIndex]?.eventSeq ?? newestFirst[0]?.eventSeq));
    setLeftSeq(
      String(newestFirst[activeIndex + 1]?.eventSeq ?? newestFirst[activeIndex]?.eventSeq),
    );
  }, [activeEventSeq, isOpen, newestFirst]);

  const bySeq = useMemo(
    () => new Map(checkpoints.map((item) => [String(item.eventSeq), item])),
    [checkpoints],
  );
  const left = bySeq.get(leftSeq);
  const right = bySeq.get(rightSeq);
  const restoreMutation = useMutation({
    mutationFn: (eventSeq: number) => restoreSessionContextCheckpoint(sessionId, eventSeq),
    onError: (error) => toast.danger(error.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.detail(sessionId) });
      toast.success("已设为当前 Checkpoint");
      onClose();
    },
  });

  const selectItems = newestFirst.map((item) => ({
    id: String(item.eventSeq),
    label: `${item.eventSeq === activeEventSeq ? "当前 · " : ""}#${item.eventSeq} · ${DATE_FORMATTER.format(item.timestamp)}`,
  }));

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog aria-describedby="context-checkpoint-description" className="sm:max-w-3xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Checkpoint 管理</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <p className="max-w-2xl" id="context-checkpoint-description">
              查看并对比每次上下文压缩后保留的工作摘要。将对比版本设为当前后，后续模型请求将从该摘要继续。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "基准版本", setValue: setLeftSeq, value: leftSeq },
                { label: "对比版本", setValue: setRightSeq, value: rightSeq },
              ].map((field) => (
                <Select
                  key={field.label}
                  aria-label={field.label}
                  value={field.value}
                  variant="secondary"
                  onChange={(key) => field.setValue(String(key))}
                >
                  <Label>{field.label}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={selectItems}>
                      {(item) => (
                        <ListBox.Item id={item.id} textValue={item.label}>
                          <Label>{item.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ))}
            </div>
            <ScrollShadow
              className="max-h-[55dvh] min-w-0 overflow-x-hidden"
              hideScrollBar
              orientation="vertical"
            >
              {left && right ? <CheckpointComparison left={left} right={right} /> : null}
            </ScrollShadow>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="tertiary" onPress={onClose}>
              关闭
            </Button>
            <Button
              isDisabled={right === undefined || right.eventSeq === activeEventSeq || isGenerating}
              isPending={restoreMutation.isPending}
              type="button"
              onPress={() => right && restoreMutation.mutate(right.eventSeq)}
            >
              {isGenerating ? "Run 结束后可切换到对比版本" : "将对比版本设为当前"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
