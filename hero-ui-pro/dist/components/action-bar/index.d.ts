import type { ComponentProps } from 'react';
import { ActionBarContent, ActionBarPrefix, ActionBarRoot, ActionBarSuffix } from './action-bar';
export type { ActionBarVariants } from './action-bar.styles';
export { actionBarVariants } from './action-bar.styles';
declare const ActionBar: (({ "aria-label": ariaLabel, children, className, isAttached, isOpen, orientation, ...props }: import("./action-bar").ActionBarRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./action-bar").ActionBarContentProps) => import("react/jsx-runtime").JSX.Element;
    Prefix: ({ children, className, ...props }: import("./action-bar").ActionBarPrefixProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ "aria-label": ariaLabel, children, className, isAttached, isOpen, orientation, ...props }: import("./action-bar").ActionBarRootProps) => import("react/jsx-runtime").JSX.Element;
    Suffix: ({ children, className, ...props }: import("./action-bar").ActionBarSuffixProps) => import("react/jsx-runtime").JSX.Element;
};
export { ActionBar, ActionBarContent, ActionBarPrefix, ActionBarRoot, ActionBarSuffix, };
export type { ActionBarContentProps, ActionBarPrefixProps, ActionBarRootProps as ActionBarProps, ActionBarRootProps, ActionBarSuffixProps, } from './action-bar';
export type ActionBar = {
    ContentProps: ComponentProps<typeof ActionBarContent>;
    PrefixProps: ComponentProps<typeof ActionBarPrefix>;
    Props: ComponentProps<typeof ActionBarRoot>;
    RootProps: ComponentProps<typeof ActionBarRoot>;
    SuffixProps: ComponentProps<typeof ActionBarSuffix>;
};
//# sourceMappingURL=index.d.ts.map