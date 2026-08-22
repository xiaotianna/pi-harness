import React, { type ComponentProps, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button, Tooltip } from '@heroui/react';
import type { ResizablePanelGroupResizeBehavior, ResizableSize } from '../resizable/index';
import type { SidebarVariants } from '../sidebar/sidebar.styles';
import { appLayoutVariants } from './app-layout.styles';
import '../sidebar/index';
export type AppLayoutContextValue = {
    isAsideOpen: boolean;
    /** Whether a user-provided <AppLayout.MobileAside> slot was rendered. */
    hasMobileAside: boolean;
    /** Programmatic navigation function forwarded from `AppLayout.navigate`. */
    navigate?: (href: string) => void;
    setAsideOpen: (open: boolean) => void;
    slots: ReturnType<typeof appLayoutVariants>;
    toggleAside: () => void;
};
export interface AppLayoutTooltipProps {
    /** Class name applied to the Tooltip.Content element. */
    className?: string;
    /** Delay in ms before hiding the tooltip. */
    closeDelay?: number;
    /** Delay in ms before showing the tooltip. */
    delay?: number;
    /** Whether the tooltip is disabled. */
    isDisabled?: boolean;
    /** Offset from the trigger element in px. */
    offset?: number;
    /** Tooltip placement relative to the trigger. @default "bottom" */
    placement?: ComponentProps<typeof Tooltip.Content>['placement'];
    /** Whether to show the tooltip arrow. @default false */
    showArrow?: boolean;
}
export interface AppLayoutMenuToggleProps extends ComponentPropsWithRef<typeof Button> {
    /** Custom icon. Defaults to a hamburger (Bars) icon. */
    children?: ReactNode;
    /** Tooltip content. When omitted, no tooltip is rendered. */
    tooltip?: ReactNode;
    /** Additional props forwarded to the internal Tooltip. */
    tooltipProps?: AppLayoutTooltipProps;
}
export interface AppLayoutAsideTriggerProps extends ComponentPropsWithRef<typeof Button> {
    /** Custom icon. Defaults to a right-panel icon. */
    children?: ReactNode;
    /** Tooltip content when the aside is closed. */
    closedTooltip?: ReactNode;
    /** Tooltip content when the aside is open. */
    openTooltip?: ReactNode;
    /** Additional props forwarded to the internal Tooltip. */
    tooltipProps?: AppLayoutTooltipProps;
}
export interface AppLayoutMobileAsideProps {
    children: ReactNode;
}
export type SidebarNavigate = (href: string) => void;
export type AppLayoutScrollMode = 'content' | 'page';
export interface AppLayoutRootProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
    aside?: ReactNode;
    asideMobile?: 'hidden' | 'sheet';
    /** Default size of the aside when resizable. Numbers are percentages; strings accept CSS units. @default 20 */
    asideDefaultSize?: ResizableSize;
    /** Max aside size when resizable. Numbers are percentages; strings accept CSS units. @default 40 */
    asideMaxSize?: ResizableSize;
    /** Min aside size when resizable. Numbers are percentages; strings accept CSS units. @default 15 */
    asideMinSize?: ResizableSize;
    asideOpen?: boolean;
    asideResizable?: boolean;
    /**
     * How the aside panel behaves when the layout width changes.
     * @default "preserve-relative-size"
     */
    asideResizeBehavior?: ResizablePanelGroupResizeBehavior;
    asideToggleShortcut?: string | false | null;
    children: ReactNode;
    defaultAsideOpen?: boolean;
    defaultSidebarOpen?: boolean;
    footer?: ReactNode;
    navbar?: ReactNode;
    navigate?: SidebarNavigate;
    onAsideOpenChange?: (open: boolean) => void;
    onSidebarOpenChange?: (open: boolean) => void;
    reduceMotion?: boolean;
    resizableAutoSaveId?: string;
    scrollMode?: AppLayoutScrollMode;
    sidebar?: ReactNode;
    sidebarCollapsible?: 'icon' | 'none' | 'offcanvas';
    /** Default size of the sidebar when resizable. Numbers are percentages; strings accept CSS units. @default 18 */
    sidebarDefaultSize?: ResizableSize;
    /** Max sidebar size when resizable. Numbers are percentages; strings accept CSS units. @default 30 */
    sidebarMaxSize?: ResizableSize;
    /** Min sidebar size when resizable. Numbers are percentages; strings accept CSS units. @default 12 */
    sidebarMinSize?: ResizableSize;
    sidebarOpen?: boolean;
    sidebarResizable?: boolean;
    /**
     * How the sidebar panel behaves when the layout width changes.
     * @default "preserve-relative-size"
     */
    sidebarResizeBehavior?: ResizablePanelGroupResizeBehavior;
    sidebarSide?: SidebarVariants['side'];
    sidebarVariant?: SidebarVariants['variant'];
    toggleShortcut?: string | false | null;
    toolbar?: ReactNode;
    style?: React.CSSProperties;
    className?: string;
}
export declare const AppLayoutContext: React.Context<AppLayoutContextValue | null>;
export declare const useAppLayout: () => AppLayoutContextValue | null;
export declare const AppLayoutMenuToggle: ({ children, className, tooltip, tooltipProps, ...props }: AppLayoutMenuToggleProps) => ReactNode;
export declare const AppLayoutAsideTrigger: ({ children, className, closedTooltip, openTooltip, tooltipProps, ...props }: AppLayoutAsideTriggerProps) => ReactNode;
export declare const AppLayoutMobileAside: ({ children: _children, }: AppLayoutMobileAsideProps) => null;
export declare const AppLayoutRoot: ({ aside, asideDefaultSize, asideMaxSize, asideMinSize, asideMobile, asideOpen: asideOpenProp, asideResizable, asideResizeBehavior, asideToggleShortcut, children, className, defaultAsideOpen, defaultSidebarOpen, footer, navbar, navigate, onAsideOpenChange, onSidebarOpenChange, reduceMotion, resizableAutoSaveId, scrollMode, sidebar, sidebarCollapsible, sidebarDefaultSize, sidebarMaxSize, sidebarMinSize, sidebarOpen: sidebarOpenProp, sidebarResizable, sidebarResizeBehavior, sidebarSide, sidebarVariant, style, toggleShortcut, toolbar, ...props }: AppLayoutRootProps) => import("react/jsx-runtime").JSX.Element;
export { AppLayoutAsideTrigger as default };
//# sourceMappingURL=app-layout.d.ts.map