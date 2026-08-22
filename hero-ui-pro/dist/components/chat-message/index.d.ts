import type { ComponentProps } from 'react';
import { ChatMessageAction, ChatMessageActions, ChatMessageAssistant, ChatMessageAvatar, ChatMessageBody, ChatMessageBubble, ChatMessageContent, ChatMessageMedia, ChatMessageUser } from './chat-message';
export type { ChatMessageActionProps, ChatMessageAssistantProps, ChatMessageAvatarProps, ChatMessageBodyProps, ChatMessageBubbleProps, ChatMessageContentProps, ChatMessageMediaProps, ChatMessageUserProps, } from './chat-message';
export type { ChatMessageVariants } from './chat-message.styles';
export { chatMessageVariants } from './chat-message.styles';
declare const ChatMessage: {
    Action: ({ "aria-label": ariaLabel, children, className, tooltip, ...props }: import("./chat-message").ChatMessageActionProps) => import("react/jsx-runtime").JSX.Element;
    Actions: ({ children, className, ...props }: import("./chat-message").ChatMessageActionsProps) => import("react/jsx-runtime").JSX.Element;
    Assistant: ({ children, className, ...props }: import("./chat-message").ChatMessageAssistantProps) => import("react/jsx-runtime").JSX.Element;
    Avatar: ({ alt, className, fallback, show, src, ...props }: import("./chat-message").ChatMessageAvatarProps) => import("react/jsx-runtime").JSX.Element;
    Body: ({ children, className, ...props }: import("./chat-message").ChatMessageBodyProps) => import("react/jsx-runtime").JSX.Element;
    Bubble: ({ children, className, ...props }: import("./chat-message").ChatMessageBubbleProps) => import("react/jsx-runtime").JSX.Element;
    Content: ({ children, className, ...props }: import("./chat-message").ChatMessageContentProps) => import("react/jsx-runtime").JSX.Element;
    Media: ({ children, className, ...props }: import("./chat-message").ChatMessageMediaProps) => import("react/jsx-runtime").JSX.Element;
    User: ({ children, className, ...props }: import("./chat-message").ChatMessageUserProps) => import("react/jsx-runtime").JSX.Element;
};
export { ChatMessage, ChatMessageAction, ChatMessageAssistant, ChatMessageAvatar, ChatMessageBody, ChatMessageBubble, ChatMessageContent, ChatMessageMedia, ChatMessageUser, };
export type ChatMessage = {
    ActionProps: ComponentProps<typeof ChatMessageAction>;
    ActionsProps: ComponentProps<typeof ChatMessageActions>;
    AssistantProps: ComponentProps<typeof ChatMessageAssistant>;
    AvatarProps: ComponentProps<typeof ChatMessageAvatar>;
    BodyProps: ComponentProps<typeof ChatMessageBody>;
    BubbleProps: ComponentProps<typeof ChatMessageBubble>;
    ContentProps: ComponentProps<typeof ChatMessageContent>;
    MediaProps: ComponentProps<typeof ChatMessageMedia>;
    UserProps: ComponentProps<typeof ChatMessageUser>;
};
//# sourceMappingURL=index.d.ts.map