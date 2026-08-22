import type { ComponentPropsWithRef, ReactNode } from 'react';
import { ChatMessage } from '../chat-message/index';
export interface ChatMessageActionsRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export type ChatMessageActionPresetProps = ComponentPropsWithRef<typeof ChatMessage.Action> & {
    children?: ReactNode;
};
export type ChatMessageActionsCopyProps = ChatMessageActionPresetProps & {
    copiedIcon?: ReactNode;
    isCopied?: boolean;
};
export type ChatMessageActionIconProps = {
    children?: ReactNode;
    className?: string;
};
declare const ChatMessageActionsRoot: ({ children, className, ...props }: ChatMessageActionsRootProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsCopyIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsCopiedIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsRegenerateIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsMenuIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsThumbsUpIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsThumbsDownIcon: ({ children, className, ...props }: ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsCopy: ({ children, copiedIcon, isCopied: isCopiedProp, onPress, ...props }: ChatMessageActionsCopyProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatMessageActionsRegenerate: {
    ({ children, ...props }: ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const ChatMessageActionsMenu: {
    ({ children, ...props }: ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const ChatMessageActionsThumbsUp: {
    ({ children, ...props }: ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const ChatMessageActionsThumbsDown: {
    ({ children, ...props }: ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { ChatMessageActionsCopiedIcon, ChatMessageActionsCopy, ChatMessageActionsCopyIcon, ChatMessageActionsMenu, ChatMessageActionsMenuIcon, ChatMessageActionsRegenerate, ChatMessageActionsRegenerateIcon, ChatMessageActionsRoot, ChatMessageActionsThumbsDown, ChatMessageActionsThumbsDownIcon, ChatMessageActionsThumbsUp, ChatMessageActionsThumbsUpIcon, };
//# sourceMappingURL=chat-message-actions.d.ts.map