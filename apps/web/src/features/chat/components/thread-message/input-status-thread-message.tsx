import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { CircleQuestion, ListCheck } from "@gravity-ui/icons";
import { ChatInputStatus, type ChatInputStatusMessage } from "../../data/chat";

const answerStatusLabels = {
  [ChatInputStatus.ANSWERED]: "已收到你的回答",
  [ChatInputStatus.EXPIRED]: "等待回答已结束",
  [ChatInputStatus.WAITING]: "正在等待你的回答",
} satisfies Record<ChatInputStatus, string>;

export function InputStatusThreadMessage({ message }: { message: ChatInputStatusMessage }) {
  const isWaiting = message.status === ChatInputStatus.WAITING;

  return (
    <ChatMessagePrimitive.Assistant aria-busy={isWaiting} aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <div className="flex flex-col gap-2 text-[13.5px] text-muted" role="status">
          <div className="flex min-h-6 items-center gap-2">
            <CircleQuestion aria-hidden className="size-4 shrink-0" />
            <span>正在询问问题</span>
          </div>
          <div className="flex min-h-6 items-center gap-2">
            <ListCheck aria-hidden className="size-4 shrink-0" />
            <span>{answerStatusLabels[message.status]}</span>
          </div>
        </div>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
