import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button } from '@heroui/react';
export interface ChatMessageUserProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageAssistantProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageBubbleProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageMediaProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageActionsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageActionProps extends ComponentPropsWithRef<typeof Button> {
    'aria-label'?: string;
    children?: ReactNode;
    tooltip?: ReactNode;
}
export interface ChatMessageBodyProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatMessageAvatarProps extends ComponentPropsWithRef<'div'> {
    alt: string;
    fallback?: string;
    show?: boolean;
    src?: string;
}
declare const ChatMessageUser: ({ children, className, ...props }: ChatMessageUserProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageAssistant: ({ children, className, ...props }: ChatMessageAssistantProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageBubble: ({ children, className, ...props }: ChatMessageBubbleProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageContent: ({ children, className, ...props }: ChatMessageContentProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageMedia: ({ children, className, ...props }: ChatMessageMediaProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActions: ({ children, className, ...props }: ChatMessageActionsProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageAction: ({ "aria-label": ariaLabel, children, className, tooltip, ...props }: ChatMessageActionProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageBody: ({ children, className, ...props }: ChatMessageBodyProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageAvatar: ({ alt, className, fallback, show, src, ...props }: ChatMessageAvatarProps) => import("react/jsx-runtime").JSX.Element;
export { ChatMessageAction, ChatMessageActions, ChatMessageAssistant, ChatMessageAvatar, ChatMessageBody, ChatMessageBubble, ChatMessageContent, ChatMessageMedia, ChatMessageUser, };
//# sourceMappingURL=chat-message.d.ts.map