import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReasoningPanel } from "../../../../components/ai/reasoning-panel";
import type { ChatReasoningMessage } from "../../data/chat";
import { useTypewriterLength } from "../../hooks/use-typewriter-text";

export function ReasoningThreadMessage({ message }: { message: ChatReasoningMessage }) {
  const streaming = message.isStreaming ?? false;
  const stepCharacters = useMemo(
    () => message.steps.map((step) => Array.from(step.content)),
    [message.steps],
  );
  const totalLength = stepCharacters.reduce((total, characters) => total + characters.length, 0);
  const [visibleLength, isTyping] = useTypewriterLength(
    totalLength,
    message.shouldTypewrite ?? streaming,
  );
  const isDisplayingStream = streaming || isTyping;
  const [isOpen, setIsOpen] = useState((message.defaultExpanded ?? false) || isDisplayingStream);
  const wasDisplayingStream = useRef(isDisplayingStream);
  let remainingLength = visibleLength;
  const visibleSteps = message.steps.map((step, index) => {
    const characters = stepCharacters[index] ?? [];
    const stepLength = Math.min(remainingLength, characters.length);
    remainingLength -= stepLength;
    return { body: characters.slice(0, stepLength).join(""), title: step.label };
  });

  useEffect(() => {
    if (wasDisplayingStream.current && !isDisplayingStream) setIsOpen(false);
    wasDisplayingStream.current = isDisplayingStream;
  }, [isDisplayingStream]);

  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ReasoningPanel
          onOpenChange={setIsOpen}
          open={isDisplayingStream || isOpen}
          restingLabel={message.trigger}
          steps={visibleSteps}
          streaming={isDisplayingStream}
          visibleSteps={message.steps.length}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
