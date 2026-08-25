import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Alert } from "@heroui/react";
import type { ChatErrorMessage } from "../../data/chat";

export function ErrorThreadMessage({ message }: { message: ChatErrorMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Alert className="max-w-xl bg-danger-soft" role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>回复生成失败</Alert.Title>
            <Alert.Description>{message.content}</Alert.Description>
          </Alert.Content>
        </Alert>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
