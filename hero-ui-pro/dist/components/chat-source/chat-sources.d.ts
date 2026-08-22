import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Disclosure } from '@heroui/react';
export interface ChatSourcesRootProps extends ComponentPropsWithRef<typeof Disclosure> {
    children: ReactNode;
}
export interface ChatSourcesTriggerProps extends ComponentPropsWithRef<typeof Disclosure.Trigger> {
    children: ReactNode;
}
export interface ChatSourcesContentProps extends ComponentPropsWithRef<typeof Disclosure.Content> {
    children: ReactNode;
}
export interface ChatSourcesListProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const ChatSourcesRoot: ({ children, className, ...props }: ChatSourcesRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatSourcesTrigger: ({ children, className, ...props }: ChatSourcesTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatSourcesContent: ({ children, className, ...props }: ChatSourcesContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatSourcesList: ({ children, className, ...props }: ChatSourcesListProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chat-sources.d.ts.map