"use client";

import { ChevronDown, Terminal as SquareTerminal } from "@gravity-ui/icons";
import { Button, ButtonGroup, Card, Dropdown, Label, toast } from "@heroui/react";
import {
  ApprovalDecision,
  type ApprovalResponseDecision,
} from "@pi-harness/agent-runtime/harness-event";
import { useId, useState } from "react";
import type { ChatMessageTool, ResolveChatToolApproval } from "../data/chat";

export function ToolApprovalCard({
  approval,
  onResolve,
  toolName,
}: {
  approval: NonNullable<ChatMessageTool["approval"]>;
  onResolve: ResolveChatToolApproval;
  toolName: string;
}) {
  const titleId = useId();
  const [pendingDecision, setPendingDecision] = useState<ApprovalResponseDecision | null>(null);
  const isApprovalPending =
    pendingDecision === ApprovalDecision.APPROVED ||
    pendingDecision === ApprovalDecision.APPROVED_SIMILAR;

  const resolveApproval = (decision: ApprovalResponseDecision) => {
    setPendingDecision(decision);
    void onResolve(approval, decision).catch((error: unknown) => {
      setPendingDecision(null);
      toast.danger(error instanceof Error ? error.message : "处理工具审批失败");
    });
  };

  return (
    <Card
      aria-labelledby={titleId}
      aria-modal="true"
      className="max-h-[min(70svh,36rem)] min-h-full w-full gap-3 overflow-hidden rounded-[32px] p-4"
      role="dialog"
    >
      <Card.Header className="shrink-0 flex-row items-center gap-2">
        <SquareTerminal className="size-4 text-muted" />
        <Card.Title id={titleId} className="text-sm font-normal text-muted">
          {toolName}
        </Card.Title>
      </Card.Header>
      <Card.Content className="min-h-0 gap-2 overflow-y-auto">
        <p className="text-sm font-medium">要允许我执行以下操作吗？</p>
        <code className="block max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-muted">
          {approval.summary}
        </code>
        <p className="line-clamp-2 text-xs text-muted">
          目标：{approval.target} · {approval.risk}
        </p>
        {approval.preview ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-surface-secondary p-3 font-mono text-xs text-muted">
            {approval.preview}
          </pre>
        ) : null}
      </Card.Content>
      <Card.Footer className="shrink-0 justify-end gap-2">
        <Button
          isDisabled={pendingDecision !== null}
          isPending={pendingDecision === ApprovalDecision.REJECTED}
          size="sm"
          variant="ghost"
          onPress={() => resolveApproval(ApprovalDecision.REJECTED)}
        >
          拒绝
        </Button>
        {approval.commandPrefix ? (
          <ButtonGroup isDisabled={pendingDecision !== null} size="sm" variant="primary">
            <Button
              isPending={isApprovalPending}
              onPress={() => resolveApproval(ApprovalDecision.APPROVED)}
            >
              允许一次
            </Button>
            <Dropdown>
              <Button
                aria-label="选择允许方式"
                isDisabled={pendingDecision !== null}
                isIconOnly
                size="sm"
                variant="primary"
              >
                <ButtonGroup.Separator />
                <ChevronDown className="size-3.5" />
              </Button>
              <Dropdown.Popover placement="top end">
                <Dropdown.Menu
                  aria-label="允许方式"
                  onAction={(key) => {
                    if (key === ApprovalDecision.APPROVED) {
                      resolveApproval(ApprovalDecision.APPROVED);
                    }
                    if (key === ApprovalDecision.APPROVED_SIMILAR) {
                      resolveApproval(ApprovalDecision.APPROVED_SIMILAR);
                    }
                  }}
                >
                  <Dropdown.Item id={ApprovalDecision.APPROVED} textValue="允许一次">
                    <Label>允许一次</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id={ApprovalDecision.APPROVED_SIMILAR} textValue="允许类似命令">
                    <Label>允许类似命令</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </ButtonGroup>
        ) : (
          <Button
            isDisabled={pendingDecision !== null}
            isPending={isApprovalPending}
            size="sm"
            onPress={() => resolveApproval(ApprovalDecision.APPROVED)}
          >
            允许一次
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
