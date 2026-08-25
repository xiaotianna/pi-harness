import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ImageGeneration } from "../../../../components/ai/aicss/aicss-components";
import type { ChatImageGenerationMessage } from "../../data/chat";

export function ImageGenerationThreadMessage({ message }: { message: ChatImageGenerationMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ImageGeneration
          prompt={message.prompt}
          {...(message.alt !== undefined ? { alt: message.alt } : {})}
          {...(message.imageUrl !== undefined ? { imageUrl: message.imageUrl } : {})}
          {...(message.isGenerating !== undefined ? { isGenerating: message.isGenerating } : {})}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
