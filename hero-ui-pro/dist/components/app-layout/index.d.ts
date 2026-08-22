import type { ComponentProps } from 'react';
import { AppLayoutAsideTrigger, AppLayoutMenuToggle, AppLayoutMobileAside, AppLayoutRoot } from './app-layout';
export { AppLayoutContext, useAppLayout } from './app-layout';
export { appLayoutVariants } from './app-layout.styles';
export declare const AppLayout: (({ aside, asideDefaultSize, asideMaxSize, asideMinSize, asideMobile, asideOpen: asideOpenProp, asideResizable, asideResizeBehavior, asideToggleShortcut, children, className, defaultAsideOpen, defaultSidebarOpen, footer, navbar, navigate, onAsideOpenChange, onSidebarOpenChange, reduceMotion, resizableAutoSaveId, scrollMode, sidebar, sidebarCollapsible, sidebarDefaultSize, sidebarMaxSize, sidebarMinSize, sidebarOpen: sidebarOpenProp, sidebarResizable, sidebarResizeBehavior, sidebarSide, sidebarVariant, style, toggleShortcut, toolbar, ...props }: import("./app-layout").AppLayoutRootProps) => import("react/jsx-runtime").JSX.Element) & {
    AsideTrigger: ({ children, className, closedTooltip, openTooltip, tooltipProps, ...props }: import("./app-layout").AppLayoutAsideTriggerProps) => import("react").ReactNode;
    MenuToggle: ({ children, className, tooltip, tooltipProps, ...props }: import("./app-layout").AppLayoutMenuToggleProps) => import("react").ReactNode;
    MobileAside: ({ children: _children, }: import("./app-layout").AppLayoutMobileAsideProps) => null;
    Root: ({ aside, asideDefaultSize, asideMaxSize, asideMinSize, asideMobile, asideOpen: asideOpenProp, asideResizable, asideResizeBehavior, asideToggleShortcut, children, className, defaultAsideOpen, defaultSidebarOpen, footer, navbar, navigate, onAsideOpenChange, onSidebarOpenChange, reduceMotion, resizableAutoSaveId, scrollMode, sidebar, sidebarCollapsible, sidebarDefaultSize, sidebarMaxSize, sidebarMinSize, sidebarOpen: sidebarOpenProp, sidebarResizable, sidebarResizeBehavior, sidebarSide, sidebarVariant, style, toggleShortcut, toolbar, ...props }: import("./app-layout").AppLayoutRootProps) => import("react/jsx-runtime").JSX.Element;
};
export type AppLayout = {
    AsideTriggerProps: ComponentProps<typeof AppLayoutAsideTrigger>;
    MenuToggleProps: ComponentProps<typeof AppLayoutMenuToggle>;
    MobileAsideProps: ComponentProps<typeof AppLayoutMobileAside>;
    Props: ComponentProps<typeof AppLayoutRoot>;
    RootProps: ComponentProps<typeof AppLayoutRoot>;
};
export { AppLayoutAsideTrigger, AppLayoutMenuToggle, AppLayoutMobileAside, AppLayoutRoot, };
export type { AppLayoutAsideTriggerProps, AppLayoutContextValue, AppLayoutMenuToggleProps, AppLayoutMobileAsideProps, AppLayoutRootProps as AppLayoutProps, AppLayoutRootProps, AppLayoutScrollMode, AppLayoutTooltipProps, } from './app-layout';
export type { AppLayoutVariants } from './app-layout.styles';
//# sourceMappingURL=index.d.ts.map