import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ChatToolGroup } from "@agile-avocation/ui-pro/chat-tool";
import type { ChatToolGroupMessage } from "../../data/chat";
import { ToolCall } from "./tool-call";

export function ToolGroupThreadMessage({ message }: { message: ChatToolGroupMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ChatToolGroup
          defaultExpanded
          {...(message.active !== undefined ? { active: message.active } : {})}
        >
          <ChatToolGroup.Trigger>{message.label}</ChatToolGroup.Trigger>
          <ChatToolGroup.Content>
            {message.tools.map((tool, index) => (
              <ToolCall key={tool.toolCallId ?? `${tool.toolName}-${index}`} tool={tool} />
            ))}
          </ChatToolGroup.Content>
        </ChatToolGroup>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
