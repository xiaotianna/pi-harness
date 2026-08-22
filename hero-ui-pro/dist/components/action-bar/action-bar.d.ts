import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ToolbarProps } from '@heroui/react';
interface ActionBarRootProps extends Omit<ToolbarProps, 'children'> {
    children: ReactNode;
    /** Controls visibility with animated enter/exit. */
    isOpen: boolean;
}
interface ActionBarPrefixProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
interface ActionBarContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
interface ActionBarSuffixProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ActionBarRoot: ({ "aria-label": ariaLabel, children, className, isAttached, isOpen, orientation, ...props }: ActionBarRootProps) => import("react/jsx-runtime").JSX.Element;
declare const ActionBarPrefix: ({ children, className, ...props }: ActionBarPrefixProps) => import("react/jsx-runtime").JSX.Element;
declare const ActionBarContent: ({ children, className, ...props }: ActionBarContentProps) => import("react/jsx-runtime").JSX.Element;
declare const ActionBarSuffix: ({ children, className, ...props }: ActionBarSuffixProps) => import("react/jsx-runtime").JSX.Element;
export { ActionBarContent, ActionBarPrefix, ActionBarRoot, ActionBarSuffix };
export type { ActionBarContentProps, ActionBarPrefixProps, ActionBarRootProps, ActionBarSuffixProps, };
//# sourceMappingURL=action-bar.d.ts.map