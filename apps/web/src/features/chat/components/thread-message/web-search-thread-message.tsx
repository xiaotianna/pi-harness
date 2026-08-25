import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { WebSearch } from "../../../../components/ai/aicss/aicss-components";
import type { ChatWebSearchMessage } from "../../data/chat";

export function WebSearchThreadMessage({ message }: { message: ChatWebSearchMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <WebSearch
          isSearching={message.isSearching ?? false}
          query={message.query}
          sources={message.sources}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
