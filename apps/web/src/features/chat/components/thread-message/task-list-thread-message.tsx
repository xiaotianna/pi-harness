import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { TodoList } from "../../../../components/ai/todo-list";
import type { ChatTaskListMessage } from "../../data/chat";

export function TaskListThreadMessage({ message }: { message: ChatTaskListMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <TodoList
          items={message.items.map((item) => ({
            id: item.id,
            status: item.status,
            text: item.label,
          }))}
          label={message.label}
          {...(message.revision === undefined ? {} : { revision: message.revision })}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
