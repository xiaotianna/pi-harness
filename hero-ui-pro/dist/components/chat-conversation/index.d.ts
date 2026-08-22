import type { ComponentProps } from 'react';
import { ChatConversationContent, ChatConversationRoot, ChatConversationScrollAnchor, ChatConversationScrollButton } from './chat-conversation';
export type { ChatConversationContentProps, ChatConversationRootProps as ChatConversationProps, ChatConversationRootProps, ChatConversationScrollAnchorProps, ChatConversationScrollButtonProps, } from './chat-conversation';
export type { ChatConversationVariants } from './chat-conversation.styles';
export { chatConversationVariants } from './chat-conversation.styles';
declare const ChatConversation: (({ children, className, initial, onScroll, ref, resize, ...props }: import("./chat-conversation").ChatConversationRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ref, ...props }: import("./chat-conversation").ChatConversationContentProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, initial, onScroll, ref, resize, ...props }: import("./chat-conversation").ChatConversationRootProps) => import("react/jsx-runtime").JSX.Element;
    ScrollAnchor: ({ className, ...props }: import("./chat-conversation").ChatConversationScrollAnchorProps) => import("react/jsx-runtime").JSX.Element;
    ScrollButton: ({ "aria-label": ariaLabel, className, isDisabled, tooltip, ...props }: import("./chat-conversation").ChatConversationScrollButtonProps) => import("react/jsx-runtime").JSX.Element | null;
};
export { ChatConversation, ChatConversationContent, ChatConversationRoot, ChatConversationScrollAnchor, ChatConversationScrollButton, };
export type ChatConversation = {
    ContentProps: ComponentProps<typeof ChatConversationContent>;
    Props: ComponentProps<typeof ChatConversationRoot>;
    RootProps: ComponentProps<typeof ChatConversationRoot>;
    ScrollAnchorProps: ComponentProps<typeof ChatConversationScrollAnchor>;
    ScrollButtonProps: ComponentProps<typeof ChatConversationScrollButton>;
};
//# sourceMappingURL=index.d.ts.map