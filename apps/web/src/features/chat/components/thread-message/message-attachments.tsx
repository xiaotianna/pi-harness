import {
  ChatAttachment,
  ChatAttachmentGroup,
  inferChatAttachmentFileKind,
  inferChatAttachmentMediaType,
} from "@agile-avocation/ui-pro";
import { FileText } from "@gravity-ui/icons";
import { FileIconRender } from "../../../../components/ui/file-icon-render";
import type { ChatUserMessage } from "../../data/chat";

export function MessageAttachments({ message }: { message: ChatUserMessage }) {
  if (!message.attachments?.length) return null;

  return (
    <ChatAttachmentGroup className="mb-2">
      {message.attachments.map((attachment, index) => {
        const mediaType = inferChatAttachmentMediaType(attachment.mimeType);
        const fileKind = inferChatAttachmentFileKind(attachment.mimeType, attachment.name);
        const hasMediaPreview =
          Boolean(attachment.src) &&
          (mediaType === "image" ||
            mediaType === "video" ||
            fileKind === "image" ||
            fileKind === "video");

        return (
          <ChatAttachment.Root
            key={`${attachment.name}-${index}`}
            name={attachment.name}
            {...(attachment.mimeType !== undefined ? { mimeType: attachment.mimeType } : {})}
            {...(attachment.size !== undefined ? { size: attachment.size } : {})}
            {...(attachment.src !== undefined ? { src: attachment.src } : {})}
          >
            {hasMediaPreview ? (
              <ChatAttachment.Preview />
            ) : (
              <ChatAttachment.Preview>
                <span>
                  <FileIconRender
                    className="size-5"
                    fallback={FileText}
                    filePath={attachment.name}
                  />
                </span>
              </ChatAttachment.Preview>
            )}
            <ChatAttachment.Info />
          </ChatAttachment.Root>
        );
      })}
    </ChatAttachmentGroup>
  );
}
