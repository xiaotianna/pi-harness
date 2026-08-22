import type { ComponentProps } from 'react';
import { ChatListViewIcon, ChatListViewItem, ChatListViewItemContent, ChatListViewMeta, ChatListViewPreview, ChatListViewRoot, ChatListViewText, ChatListViewTitle } from './chat-list-view';
export type { ChatListViewIconProps, ChatListViewItemContentProps, ChatListViewItemProps, ChatListViewMetaProps, ChatListViewPreviewProps, ChatListViewRootProps as ChatListViewProps, ChatListViewRootProps, ChatListViewTextProps, ChatListViewTitleProps, } from './chat-list-view';
export type { ChatListViewVariants } from './chat-list-view.styles';
export { chatListViewVariants } from './chat-list-view.styles';
declare const ChatListView: (<T extends object>({ children, className, density, ...props }: import("./chat-list-view").ChatListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element) & {
    Icon: ({ children, className, ...props }: import("./chat-list-view").ChatListViewIconProps) => import("react/jsx-runtime").JSX.Element;
    Item: <T extends object>({ children, className, ...props }: import("./chat-list-view").ChatListViewItemProps<T>) => import("react/jsx-runtime").JSX.Element;
    ItemContent: ({ children, className, ...props }: import("./chat-list-view").ChatListViewItemContentProps) => import("react/jsx-runtime").JSX.Element;
    Meta: ({ children, className, ...props }: import("./chat-list-view").ChatListViewMetaProps) => import("react/jsx-runtime").JSX.Element;
    Preview: ({ children, className, ...props }: import("./chat-list-view").ChatListViewPreviewProps) => import("react/jsx-runtime").JSX.Element;
    Root: <T extends object>({ children, className, density, ...props }: import("./chat-list-view").ChatListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element;
    Text: ({ children, className, ...props }: import("./chat-list-view").ChatListViewTextProps) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./chat-list-view").ChatListViewTitleProps) => import("react/jsx-runtime").JSX.Element;
};
export { ChatListView, ChatListViewIcon, ChatListViewItem, ChatListViewItemContent, ChatListViewMeta, ChatListViewPreview, ChatListViewRoot, ChatListViewText, ChatListViewTitle, };
export type ChatListView = {
    IconProps: ComponentProps<typeof ChatListViewIcon>;
    ItemContentProps: ComponentProps<typeof ChatListViewItemContent>;
    ItemProps: ComponentProps<typeof ChatListViewItem>;
    MetaProps: ComponentProps<typeof ChatListViewMeta>;
    PreviewProps: ComponentProps<typeof ChatListViewPreview>;
    Props: ComponentProps<typeof ChatListViewRoot>;
    RootProps: ComponentProps<typeof ChatListViewRoot>;
    TextProps: ComponentProps<typeof ChatListViewText>;
    TitleProps: ComponentProps<typeof ChatListViewTitle>;
};
//# sourceMappingURL=index.d.ts.map