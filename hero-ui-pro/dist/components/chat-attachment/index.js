import { ChatAttachmentIcon, ChatAttachmentInfo, ChatAttachmentName, ChatAttachmentPreview, ChatAttachmentRemove, ChatAttachmentRoot, ChatAttachmentSize, } from './chat-attachment';
export { formatChatAttachmentSize, inferChatAttachmentFileKind, inferChatAttachmentMediaType, } from './chat-attachment';
import { ChatAttachmentGroupRoot } from './chat-attachment-group';
import { ChatAttachmentInputDropzone, ChatAttachmentInputRoot, ChatAttachmentInputTrigger, } from './chat-attachment-input';
export { chatAttachmentGroupVariants, chatAttachmentVariants, } from './chat-attachment.styles';
const ChatAttachment = Object.assign(ChatAttachmentRoot, {
    Icon: ChatAttachmentIcon,
    Info: ChatAttachmentInfo,
    Name: ChatAttachmentName,
    Preview: ChatAttachmentPreview,
    Remove: ChatAttachmentRemove,
    Root: ChatAttachmentRoot,
    Size: ChatAttachmentSize,
});
const ChatAttachmentGroup = Object.assign(ChatAttachmentGroupRoot, {
    Root: ChatAttachmentGroupRoot,
});
const ChatAttachmentInput = Object.assign(ChatAttachmentInputRoot, {
    Dropzone: ChatAttachmentInputDropzone,
    Root: ChatAttachmentInputRoot,
    Trigger: ChatAttachmentInputTrigger,
});
export { ChatAttachment, ChatAttachmentGroup, ChatAttachmentGroupRoot, ChatAttachmentIcon, ChatAttachmentInfo, ChatAttachmentInput, ChatAttachmentInputDropzone, ChatAttachmentInputRoot, ChatAttachmentInputTrigger, ChatAttachmentName, ChatAttachmentPreview, ChatAttachmentRemove, ChatAttachmentRoot, ChatAttachmentSize, };
//# sourceMappingURL=index.js.map