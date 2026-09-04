import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { useEffect, useRef, useState } from "react";
import { ReasoningPanel } from "../../../../components/ai/reasoning-panel";
import type { ChatReasoningMessage } from "../../data/chat";

export function ReasoningThreadMessage({ message }: { message: ChatReasoningMessage }) {
  const active = message.isActive ?? false;
  const streaming = message.isStreaming ?? false;
  const [isOpen, setIsOpen] = useState((message.defaultExpanded ?? false) || active);
  const wasActive = useRef(active);

  useEffect(() => {
    if (wasActive.current && !active) setIsOpen(false);
    wasActive.current = active;
  }, [active]);

  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ReasoningPanel
          isLockedOpen={active}
          onOpenChange={setIsOpen}
          open={active || isOpen}
          restingLabel={message.trigger}
          steps={message.steps.map((step) => ({ body: step.content, title: step.label }))}
          streaming={streaming}
          visibleSteps={message.steps.length}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
