"use client";

import { ChevronDown, Terminal as SquareTerminal } from "@gravity-ui/icons";
import { Button, ButtonGroup, Card, Dropdown, Label, toast } from "@heroui/react";
import {
  ApprovalDecision,
  ApprovalRequestKind,
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
    pendingDecision === ApprovalDecision.APPROVED_SESSION ||
    pendingDecision === ApprovalDecision.APPROVED_SIMILAR;
  const isHostExecution = approval.kind === ApprovalRequestKind.HOST_EXECUTION;

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
        <p className="text-sm font-medium">
          {isHostExecution
            ? "沙箱阻止了这条命令。要提升权限并在宿主机重新执行吗？"
            : "要允许我执行以下操作吗？"}
        </p>
        <code className="block max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-muted">
          {approval.summary}
        </code>
        <p className={isHostExecution ? "text-xs text-muted" : "line-clamp-2 text-xs text-muted"}>
          目标：{approval.target} · {approval.risk}
        </p>
        {approval.preview ? (
          <div className="space-y-1">
            {isHostExecution ? <p className="text-xs text-muted">沙箱阻止原因</p> : null}
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-surface-secondary p-3 font-mono text-xs text-muted">
              {approval.preview}
            </pre>
          </div>
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
        {approval.commandPrefix || approval.allowSimilar ? (
          <ButtonGroup isDisabled={pendingDecision !== null} size="sm" variant="primary">
            <Button
              isPending={isApprovalPending}
              onPress={() => resolveApproval(ApprovalDecision.APPROVED)}
            >
              {isHostExecution ? "在宿主机重试" : "允许一次"}
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
                  <Dropdown.Item
                    id={ApprovalDecision.APPROVED_SIMILAR}
                    textValue={approval.commandPrefix ? "允许类似命令" : "始终允许此操作"}
                  >
                    <Label>{approval.commandPrefix ? "允许类似命令" : "始终允许此操作"}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </ButtonGroup>
        ) : approval.allowSession !== false ? (
          <ButtonGroup isDisabled={pendingDecision !== null} size="sm" variant="primary">
            <Button
              isPending={isApprovalPending}
              onPress={() => resolveApproval(ApprovalDecision.APPROVED)}
            >
              允许一次
            </Button>
            <Dropdown>
              <Button aria-label="选择允许方式" isIconOnly size="sm" variant="primary">
                <ButtonGroup.Separator />
                <ChevronDown className="size-3.5" />
              </Button>
              <Dropdown.Popover placement="top end">
                <Dropdown.Menu
                  aria-label="允许方式"
                  onAction={(key) => {
                    if (key === ApprovalDecision.APPROVED_SESSION) {
                      resolveApproval(ApprovalDecision.APPROVED_SESSION);
                    }
                  }}
                >
                  <Dropdown.Item id={ApprovalDecision.APPROVED_SESSION} textValue="本次会话允许">
                    <Label>本次会话允许</Label>
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
            {isHostExecution ? "在宿主机重试" : "允许一次"}
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
