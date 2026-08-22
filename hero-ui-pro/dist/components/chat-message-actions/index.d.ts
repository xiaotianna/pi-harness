import type { ComponentProps } from 'react';
import { ChatMessageActionsCopiedIcon, ChatMessageActionsCopy, ChatMessageActionsCopyIcon, ChatMessageActionsMenu, ChatMessageActionsMenuIcon, ChatMessageActionsRegenerate, ChatMessageActionsRegenerateIcon, ChatMessageActionsRoot, ChatMessageActionsThumbsDown, ChatMessageActionsThumbsDownIcon, ChatMessageActionsThumbsUp, ChatMessageActionsThumbsUpIcon } from './chat-message-actions';
export type { ChatMessageActionIconProps, ChatMessageActionPresetProps, ChatMessageActionIconProps as ChatMessageActionsCopiedIconProps, ChatMessageActionsCopyProps, ChatMessageActionPresetProps as ChatMessageActionsMenuProps, ChatMessageActionsRootProps as ChatMessageActionsProps, ChatMessageActionPresetProps as ChatMessageActionsRegenerateProps, ChatMessageActionsRootProps, ChatMessageActionPresetProps as ChatMessageActionsThumbsDownProps, ChatMessageActionPresetProps as ChatMessageActionsThumbsUpProps, } from './chat-message-actions';
export type { ChatMessageActionsVariants } from './chat-message-actions.styles';
export { chatMessageActionsVariants } from './chat-message-actions.styles';
declare const ChatMessageActions: (({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionsRootProps) => import("react/jsx-runtime").JSX.Element) & {
    CopiedIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
    Copy: ({ children, copiedIcon, isCopied: isCopiedProp, onPress, ...props }: import("./chat-message-actions").ChatMessageActionsCopyProps) => import("react/jsx-runtime").JSX.Element;
    CopyIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
    Menu: {
        ({ children, ...props }: import("./chat-message-actions").ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
        displayName: string;
    };
    MenuIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
    Regenerate: {
        ({ children, ...props }: import("./chat-message-actions").ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
        displayName: string;
    };
    RegenerateIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionsRootProps) => import("react/jsx-runtime").JSX.Element;
    ThumbsDown: {
        ({ children, ...props }: import("./chat-message-actions").ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
        displayName: string;
    };
    ThumbsDownIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
    ThumbsUp: {
        ({ children, ...props }: import("./chat-message-actions").ChatMessageActionPresetProps): import("react/jsx-runtime").JSX.Element;
        displayName: string;
    };
    ThumbsUpIcon: ({ children, className, ...props }: import("./chat-message-actions").ChatMessageActionIconProps) => import("react/jsx-runtime").JSX.Element;
};
export { ChatMessageActions, ChatMessageActionsCopiedIcon, ChatMessageActionsCopy, ChatMessageActionsCopyIcon, ChatMessageActionsMenu, ChatMessageActionsMenuIcon, ChatMessageActionsRegenerate, ChatMessageActionsRegenerateIcon, ChatMessageActionsRoot, ChatMessageActionsThumbsDown, ChatMessageActionsThumbsDownIcon, ChatMessageActionsThumbsUp, ChatMessageActionsThumbsUpIcon, };
export type ChatMessageActions = {
    CopyIconProps: ComponentProps<typeof ChatMessageActionsCopyIcon>;
    CopyProps: ComponentProps<typeof ChatMessageActionsCopy>;
    CopiedIconProps: ComponentProps<typeof ChatMessageActionsCopiedIcon>;
    MenuIconProps: ComponentProps<typeof ChatMessageActionsMenuIcon>;
    MenuProps: ComponentProps<typeof ChatMessageActionsMenu>;
    Props: ComponentProps<typeof ChatMessageActionsRoot>;
    RegenerateIconProps: ComponentProps<typeof ChatMessageActionsRegenerateIcon>;
    RegenerateProps: ComponentProps<typeof ChatMessageActionsRegenerate>;
    RootProps: ComponentProps<typeof ChatMessageActionsRoot>;
    ThumbsDownIconProps: ComponentProps<typeof ChatMessageActionsThumbsDownIcon>;
    ThumbsDownProps: ComponentProps<typeof ChatMessageActionsThumbsDown>;
    ThumbsUpIconProps: ComponentProps<typeof ChatMessageActionsThumbsUpIcon>;
    ThumbsUpProps: ComponentProps<typeof ChatMessageActionsThumbsUp>;
};
//# sourceMappingURL=index.d.ts.map