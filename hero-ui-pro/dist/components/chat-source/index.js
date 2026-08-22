import { ChatSourceDocumentIcon, ChatSourceIcon, ChatSourcePreview, ChatSourceRoot, ChatSourceTitle, ChatSourceTrigger, } from './chat-source';
export { extractSourceDomain } from './chat-source';
import { ChatSourcesContent, ChatSourcesList, ChatSourcesRoot, ChatSourcesTrigger, } from './chat-sources';
export { chatSourcesVariants, chatSourceVariants } from './chat-source.styles';
const ChatSource = Object.assign(ChatSourceRoot, {
    DocumentIcon: ChatSourceDocumentIcon,
    Icon: ChatSourceIcon,
    Preview: ChatSourcePreview,
    Root: ChatSourceRoot,
    Title: ChatSourceTitle,
    Trigger: ChatSourceTrigger,
});
const ChatSources = Object.assign(ChatSourcesRoot, {
    Content: ChatSourcesContent,
    List: ChatSourcesList,
    Root: ChatSourcesRoot,
    Trigger: ChatSourcesTrigger,
});
export { ChatSource, ChatSourceDocumentIcon, ChatSourceIcon, ChatSourcePreview, ChatSourceRoot, ChatSources, ChatSourcesContent, ChatSourcesList, ChatSourcesRoot, ChatSourcesTrigger, ChatSourceTitle, ChatSourceTrigger, };
//# sourceMappingURL=index.js.map