import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Disclosure } from '@heroui/react';
export interface ChatToolGroupRootProps extends ComponentPropsWithRef<typeof Disclosure> {
    active?: boolean;
    children: ReactNode;
}
export interface ChatToolGroupTriggerProps extends ComponentPropsWithRef<typeof Disclosure.Trigger> {
    children: ReactNode;
}
export interface ChatToolGroupContentProps extends ComponentPropsWithRef<typeof Disclosure.Content> {
    children: ReactNode;
}
export declare const ChatToolGroupRoot: ({ active, children, className, ...props }: ChatToolGroupRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolGroupTrigger: ({ children, className, ...props }: ChatToolGroupTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolGroupContent: ({ children, className, ...props }: ChatToolGroupContentProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chat-tool-group.d.ts.map