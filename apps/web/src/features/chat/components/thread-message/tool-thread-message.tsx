import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import type { ChatToolMessage } from "../../data/chat";
import { ToolCall } from "./tool-call";

export function ToolThreadMessage({ message }: { message: ChatToolMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ToolCall tool={message.tool} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
