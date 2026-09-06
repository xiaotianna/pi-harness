"use client";

import { ChatMessage as ChatMessagePrimitive, TextShimmer } from "@agile-avocation/ui-pro";
import { ChevronDown, ListCheck } from "@gravity-ui/icons";
import { Button, Card, ScrollShadow } from "@heroui/react";
import { useState } from "react";
import { AssistantMarkdown } from "../../../../components/ai/assistant-markdown";
import { type ChatPlanReviewMessage, ChatPlanReviewStatus } from "../../data/chat-message";

export function PlanReviewThreadMessage({ message }: { message: ChatPlanReviewMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPending = message.status === ChatPlanReviewStatus.PENDING;

  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Body>
        <Card className="w-full gap-0 overflow-hidden p-0" variant="secondary">
          <Card.Header className="flex-row items-center gap-2 px-4 py-3">
            <ListCheck className="size-4 shrink-0 text-accent" />
            <Card.Title className="text-sm font-medium">计划书</Card.Title>
            {message.isStreaming ? (
              <TextShimmer className="ml-auto text-xs leading-none">正在生成</TextShimmer>
            ) : isPending ? null : (
              <span className="ml-auto text-xs text-muted">
                {message.status === ChatPlanReviewStatus.CONFIRMED
                  ? "已确认"
                  : message.status === ChatPlanReviewStatus.REVISION_REQUESTED
                    ? "已要求修改"
                    : "已结束"}
              </span>
            )}
          </Card.Header>
          <Card.Content className="p-0">
            {isExpanded ? (
              <div className="px-4 pb-2">
                {message.planMarkdown ? (
                  <AssistantMarkdown>{message.planMarkdown}</AssistantMarkdown>
                ) : null}
              </div>
            ) : (
              <ScrollShadow
                hideScrollBar
                className="max-h-56 overflow-y-auto overscroll-y-contain px-4 pb-2"
                orientation="vertical"
              >
                {message.planMarkdown ? (
                  <AssistantMarkdown>{message.planMarkdown}</AssistantMarkdown>
                ) : null}
              </ScrollShadow>
            )}
          </Card.Content>
          {message.isStreaming ? null : (
            <Card.Footer className="justify-end px-4 py-2">
              <Button
                aria-expanded={isExpanded}
                size="sm"
                variant="ghost"
                onPress={() => setIsExpanded((current) => !current)}
              >
                {isExpanded ? "收起" : "展开全部"}
                <ChevronDown
                  className={`size-4 transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
                />
              </Button>
            </Card.Footer>
          )}
        </Card>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
