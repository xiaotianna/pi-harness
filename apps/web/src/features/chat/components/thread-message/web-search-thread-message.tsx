import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { WebSearch } from "../../../../components/ai/web-search";
import type { ChatWebSearchMessage } from "../../data/chat";

export function WebSearchThreadMessage({ message }: { message: ChatWebSearchMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <WebSearch
          query={message.query}
          results={message.sources}
          searching={message.isSearching ?? false}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
