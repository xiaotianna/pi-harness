import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import type { ChatCodeMessage } from "../../data/chat";

export function CodeThreadMessage({ message }: { message: ChatCodeMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <CodeBlock className="!my-0">
          <CodeBlock.Header>
            <span>{message.label}</span>
            <CodeBlock.CopyButton aria-label="复制代码" code={message.code} />
          </CodeBlock.Header>
          <CodeBlock.Code code={message.code} language={message.language} />
        </CodeBlock>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
