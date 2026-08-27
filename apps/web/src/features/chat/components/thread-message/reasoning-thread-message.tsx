import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { useEffect, useRef, useState } from "react";
import { ReasoningPanel } from "../../../../components/ai/reasoning-panel";
import type { ChatReasoningMessage } from "../../data/chat";

export function ReasoningThreadMessage({ message }: { message: ChatReasoningMessage }) {
  const streaming = message.isStreaming ?? false;
  const [isOpen, setIsOpen] = useState((message.defaultExpanded ?? false) || streaming);
  const wasStreaming = useRef(streaming);

  useEffect(() => {
    if (wasStreaming.current && !streaming) setIsOpen(false);
    wasStreaming.current = streaming;
  }, [streaming]);

  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ReasoningPanel
          onOpenChange={setIsOpen}
          open={streaming || isOpen}
          restingLabel={message.trigger}
          steps={message.steps.map((step) => ({ body: step.content, title: step.label }))}
          streaming={streaming}
          visibleSteps={message.steps.length}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
