import { ChatAttachment, ChatAttachmentGroup } from "@agile-avocation/ui-pro";
import type { ChatUserMessage } from "../../data/chat";

export function MessageAttachments({ message }: { message: ChatUserMessage }) {
  if (!message.attachments?.length) return null;

  return (
    <ChatAttachmentGroup className="mb-2">
      {message.attachments.map((attachment, index) => (
        <ChatAttachment
          key={`${attachment.name}-${index}`}
          name={attachment.name}
          {...(attachment.mimeType !== undefined ? { mimeType: attachment.mimeType } : {})}
          {...(attachment.size !== undefined ? { size: attachment.size } : {})}
          {...(attachment.src !== undefined ? { src: attachment.src } : {})}
        />
      ))}
    </ChatAttachmentGroup>
  );
}
