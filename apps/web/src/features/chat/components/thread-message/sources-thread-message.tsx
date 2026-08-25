import {
  ChatMessage as ChatMessagePrimitive,
  ChatSource,
  ChatSources,
} from "@agile-avocation/ui-pro";
import type { ChatMessageSource, ChatSourcesMessage } from "../../data/chat";

function renderSource(source: ChatMessageSource, key: string) {
  if (source.sourceType === "url") {
    return (
      <ChatSource
        key={key}
        href={source.url}
        sourceType="url"
        title={source.title}
        {...(source.description !== undefined ? { description: source.description } : {})}
      />
    );
  }

  return <ChatSource key={key} sourceType="document" title={source.title} />;
}

export function SourcesThreadMessage({ message }: { message: ChatSourcesMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ChatSources className="!my-0" defaultExpanded={message.defaultExpanded ?? false}>
          <ChatSources.Trigger>{message.label}</ChatSources.Trigger>
          <ChatSources.Content>
            <ChatSources.List>
              {message.sources.map((source, index) =>
                renderSource(
                  source,
                  source.sourceType === "url"
                    ? `${source.url}-${index}`
                    : `${source.title}-${index}`,
                ),
              )}
            </ChatSources.List>
          </ChatSources.Content>
        </ChatSources>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
