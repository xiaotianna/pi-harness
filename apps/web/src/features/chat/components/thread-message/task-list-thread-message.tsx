import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { TaskList } from "../../../../components/ai/aicss/aicss-components";
import type { ChatTaskListMessage } from "../../data/chat";

export function TaskListThreadMessage({ message }: { message: ChatTaskListMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <TaskList
          defaultExpanded={message.defaultExpanded ?? true}
          items={message.items}
          title={message.label}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
