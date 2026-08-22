import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button } from '@heroui/react';
export interface ChatConversationRootProps extends Omit<ComponentPropsWithRef<'div'>, 'resize'> {
    children: ReactNode;
    initial?: 'instant' | 'smooth';
    resize?: 'instant' | 'smooth';
}
export interface ChatConversationContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatConversationScrollAnchorProps extends ComponentPropsWithRef<'div'> {
}
export interface ChatConversationScrollButtonProps extends ComponentPropsWithRef<typeof Button> {
    'aria-label'?: string;
    tooltip?: ReactNode;
}
declare const ChatConversationRoot: ({ children, className, initial, onScroll, ref, resize, ...props }: ChatConversationRootProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatConversationContent: ({ children, className, ref, ...props }: ChatConversationContentProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatConversationScrollAnchor: ({ className, ...props }: ChatConversationScrollAnchorProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatConversationScrollButton: ({ "aria-label": ariaLabel, className, isDisabled, tooltip, ...props }: ChatConversationScrollButtonProps) => import("react/jsx-runtime").JSX.Element | null;
export { ChatConversationContent, ChatConversationRoot, ChatConversationScrollAnchor, ChatConversationScrollButton, };
//# sourceMappingURL=chat-conversation.d.ts.map