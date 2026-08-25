import { memo } from "react";
import { type ChatMessage, ChatMessageType } from "../data/chat";
import { ThreadMessage } from "./thread-message/index";

export interface ThreadMessageListProps {
  messages: readonly ChatMessage[];
}

export const ThreadMessageList = memo(function ThreadMessageList({
  messages,
}: ThreadMessageListProps) {
  return (
    <div className="mx-auto flex w-full max-w-[714px] flex-col gap-2 px-4 pt-10 pb-12">
      {messages.map((message, index) => {
        const previousMessage = messages[index - 1];
        const startsNewTurn =
          index > 0 &&
          (message.type === ChatMessageType.USER || previousMessage?.type === ChatMessageType.USER);

        return (
          <div key={message.id} className={startsNewTurn ? "mt-6" : undefined}>
            <ThreadMessage message={message} />
          </div>
        );
      })}
    </div>
  );
});
