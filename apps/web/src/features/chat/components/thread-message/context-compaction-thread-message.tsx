import { ChatMessage as ChatMessagePrimitive, TextShimmer } from "@agile-avocation/ui-pro";
import { ChevronsCollapseFromLines } from "@gravity-ui/icons";
import type { ChatContextCompactionMessage } from "../../data/chat";

export function ContextCompactionThreadMessage({
  message,
}: {
  message: ChatContextCompactionMessage;
}) {
  return (
    <ChatMessagePrimitive.Assistant
      aria-busy={message.isActive}
      aria-live="polite"
      className="!py-0"
    >
      <ChatMessagePrimitive.Body>
        <div className="flex min-h-7 items-center gap-2 text-sm text-muted" role="status">
          <ChevronsCollapseFromLines aria-hidden className="size-4 shrink-0" />
          {message.isActive ? (
            <TextShimmer>正在自动压缩上下文</TextShimmer>
          ) : (
            <span>上下文已自动压缩</span>
          )}
        </div>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
