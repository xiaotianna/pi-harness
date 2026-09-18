import { ChatMessage as ChatMessagePrimitive, TextShimmer } from "@agile-avocation/ui-pro";
import { Check, Xmark } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { SubAgentStatus } from "@pi-harness/agent-runtime/harness-event";
import { useEffect, useState } from "react";
import type { ChatSubAgentMessage } from "../../data/chat";
import { useWorkspaceInspectorStore } from "../../state/workspace-inspector-store";
import { SUB_AGENT_STATUS_LABEL } from "../../utils/sub-agent-status";
import { SubAgentAvatar } from "../sub-agent-avatar";

function elapsed(start: number | undefined, now: number): string {
  if (start === undefined) return "";
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export function SubAgentThreadMessage({ message }: { message: ChatSubAgentMessage }) {
  const openSubAgent = useWorkspaceInspectorStore((state) => state.openSubAgent);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (message.status !== SubAgentStatus.RUNNING) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [message.status]);
  if (!message.sessionId || !message.turnId) return null;
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Button
          className="h-auto w-full justify-start py-1"
          size="sm"
          variant="ghost"
          aria-label={`查看${message.parentExecutionId ? "孙" : "子"} Agent ${message.name}${message.parentName ? `，由 ${message.parentName} 委派` : ""}，${message.status === SubAgentStatus.RUNNING ? (message.latestActivity ?? "正在处理") : SUB_AGENT_STATUS_LABEL[message.status]}`}
          onPress={() =>
            openSubAgent(message.sessionId ?? "", message.turnId ?? "", message.executionId)
          }
        >
          <SubAgentAvatar executionId={message.executionId} className="size-5" />
          <span className="flex min-w-0 flex-1 flex-col items-start text-start">
            <span className="flex w-full min-w-0 items-center gap-1.5">
              <span className="truncate">{message.name}</span>
              {message.status === SubAgentStatus.COMPLETED ? (
                <Check aria-hidden className="size-4 shrink-0 text-success" />
              ) : message.status === SubAgentStatus.FAILED ? (
                <Xmark aria-hidden className="size-4 shrink-0 text-danger" />
              ) : null}
            </span>
            {message.parentExecutionId ? (
              <span className="w-full truncate text-xs text-muted">
                由 {message.parentName ?? "上级 Agent"} 委派
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {message.status === SubAgentStatus.RUNNING ? (
              <TextShimmer>{message.latestActivity ?? "正在处理…"}</TextShimmer>
            ) : (
              SUB_AGENT_STATUS_LABEL[message.status]
            )}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {elapsed(message.timestamp, message.endedAt ?? now)}
          </span>
        </Button>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
