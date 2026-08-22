import type { ComponentPropsWithRef, ReactNode } from 'react';
import { ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle } from '../list-view/list-view';
import type { ChatListViewVariants } from './chat-list-view.styles';
export interface ChatListViewRootProps<T extends object> extends Omit<ComponentPropsWithRef<typeof ListViewRoot<T>>, 'variant'> {
    density?: ChatListViewVariants['density'];
}
export interface ChatListViewItemProps<T extends object> extends ComponentPropsWithRef<typeof ListViewItem<T>> {
    children: ReactNode;
}
export interface ChatListViewItemContentProps extends ComponentPropsWithRef<typeof ListViewItemContent> {
    children: ReactNode;
}
export interface ChatListViewIconProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatListViewTextProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatListViewTitleProps extends ComponentPropsWithRef<typeof ListViewTitle> {
    children: ReactNode;
}
export interface ChatListViewPreviewProps extends ComponentPropsWithRef<typeof ListViewDescription> {
    children: ReactNode;
}
export interface ChatListViewMetaProps extends ComponentPropsWithRef<typeof ListViewItemAction> {
    children: ReactNode;
}
declare const ChatListViewRoot: <T extends object>({ children, className, density, ...props }: ChatListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewItem: <T extends object>({ children, className, ...props }: ChatListViewItemProps<T>) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewItemContent: ({ children, className, ...props }: ChatListViewItemContentProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewIcon: ({ children, className, ...props }: ChatListViewIconProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewText: ({ children, className, ...props }: ChatListViewTextProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewTitle: ({ children, className, ...props }: ChatListViewTitleProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewPreview: ({ children, className, ...props }: ChatListViewPreviewProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatListViewMeta: ({ children, className, ...props }: ChatListViewMetaProps) => import("react/jsx-runtime").JSX.Element;
export { ChatListViewIcon, ChatListViewItem, ChatListViewItemContent, ChatListViewMeta, ChatListViewPreview, ChatListViewRoot, ChatListViewText, ChatListViewTitle, };
//# sourceMappingURL=chat-list-view.d.ts.map