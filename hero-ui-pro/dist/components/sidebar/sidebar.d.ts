import type { ComponentPropsWithRef, Ref } from 'react';
import { type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components/Button';
import { Tree as TreePrimitive, TreeHeader as TreeHeaderPrimitive, TreeItem as TreeItemPrimitive, TreeSection as TreeSectionPrimitive } from 'react-aria-components/Tree';
import { Button, ScrollShadow, Separator, Tooltip } from '@heroui/react';
import { ChevronRight } from '../icons';
import type { SidebarVariants } from './sidebar.styles';
import { sidebarVariants } from './sidebar.styles';
type SidebarNavigate = (href: string) => void;
type SidebarContextValue = {
    collapsible: 'icon' | 'none' | 'offcanvas';
    isMobile: boolean;
    isMobileOpen: boolean;
    isOpen: boolean;
    navigate?: SidebarNavigate;
    reduceMotion: boolean;
    setMobileOpen: (open: boolean) => void;
    setOpen: (open: boolean) => void;
    side: 'left' | 'right';
    slots?: ReturnType<typeof sidebarVariants>;
    toggleSidebar: () => void;
    variant: 'floating' | 'inset' | 'sidebar';
};
/** Hook for programmatic sidebar control. */
declare const useSidebar: () => SidebarContextValue;
interface SidebarProviderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    collapsible?: 'icon' | 'none' | 'offcanvas';
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    navigate?: SidebarNavigate;
    open?: boolean;
    reduceMotion?: boolean;
    side?: SidebarVariants['side'];
    toggleShortcut?: string | false | null;
    variant?: SidebarVariants['variant'];
}
declare const SidebarProvider: ({ children, className, collapsible, defaultOpen, navigate, onOpenChange, open: openProp, reduceMotion, side, toggleShortcut, variant, ...props }: SidebarProviderProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarRootProps extends ComponentPropsWithRef<'aside'> {
    children: ReactNode;
}
declare const SidebarRoot: ({ children, className, ...props }: SidebarRootProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const SidebarHeader: ({ children, className, ...props }: SidebarHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarContentProps extends ComponentPropsWithRef<typeof ScrollShadow> {
    children: ReactNode;
}
declare const SidebarContent: ({ children, className, ...props }: SidebarContentProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarFooterProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const SidebarFooter: ({ children, className, ...props }: SidebarFooterProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarGroupProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    closeMobileOnAction?: boolean;
}
declare const SidebarGroup: ({ children, className, closeMobileOnAction, ...props }: SidebarGroupProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarGroupLabelProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const SidebarGroupLabel: ({ children, className, ...props }: SidebarGroupLabelProps) => import("react/jsx-runtime").JSX.Element;
type SidebarMenuDisallowedProps = 'defaultSelectedKeys' | 'disallowEmptySelection' | 'escapeKeyBehavior' | 'onSelectionChange' | 'selectedKeys' | 'selectionBehavior' | 'selectionMode' | 'shouldSelectOnPressUp';
interface SidebarMenuProps<T extends object> extends Omit<ComponentPropsWithRef<typeof TreePrimitive<T>>, SidebarMenuDisallowedProps> {
    defaultSelectedKeys?: never;
    disallowEmptySelection?: never;
    escapeKeyBehavior?: never;
    onSelectionChange?: never;
    reduceMotion?: boolean;
    selectedKeys?: never;
    selectionBehavior?: never;
    selectionMode?: never;
    closeMobileOnAction?: boolean;
    showGuideLines?: boolean | 'hover';
    shouldSelectOnPressUp?: never;
}
declare const SidebarMenu: <T extends object>({ children, className, closeMobileOnAction, reduceMotion, showGuideLines, ...props }: SidebarMenuProps<T>) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuSectionProps extends ComponentPropsWithRef<typeof TreeSectionPrimitive> {
}
declare const SidebarMenuSection: ({ children, className, ...props }: SidebarMenuSectionProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuHeaderProps extends ComponentPropsWithRef<typeof TreeHeaderPrimitive> {
}
declare const SidebarMenuHeader: ({ children, className, ...props }: SidebarMenuHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuIconProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const SidebarMenuIcon: ({ children, className, ...props }: SidebarMenuIconProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const SidebarMenuLabel: ({ children, className, ...props }: SidebarMenuLabelProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuChipProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const SidebarMenuChip: ({ children, className, ...props }: SidebarMenuChipProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuActionsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const SidebarMenuActions: ({ children, className, ...props }: SidebarMenuActionsProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuActionProps extends ComponentPropsWithRef<typeof AriaButton> {
    children: ReactNode;
}
declare const SidebarMenuAction: ({ children, className, ...props }: SidebarMenuActionProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuItemContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const SidebarMenuItemContent: ({ children }: SidebarMenuItemContentProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuTriggerProps extends ComponentPropsWithRef<typeof AriaButton> {
    children: ReactNode;
}
declare const SidebarMenuTrigger: ({ children }: SidebarMenuTriggerProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuIndicatorProps extends ComponentPropsWithRef<typeof ChevronRight> {
    children?: ReactNode;
}
declare const SidebarMenuIndicator: ({ children, className, ...props }: SidebarMenuIndicatorProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarSubmenuProps {
    children: ReactNode;
}
declare const SidebarSubmenu: ({ children }: SidebarSubmenuProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMenuItemTooltipProps {
    content: ReactNode;
    className?: string;
    delay?: number;
    closeDelay?: number;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}
interface SidebarMenuItemProps extends Partial<ComponentPropsWithRef<typeof TreeItemPrimitive>> {
    closeMobileOnAction?: boolean;
    forceReload?: boolean;
    href?: string;
    isCurrent?: boolean;
    tooltip?: ReactNode;
    tooltipProps?: SidebarMenuItemTooltipProps;
}
declare const SidebarMenuItem: ({ children, className, closeMobileOnAction, forceReload, href, isCurrent, render: renderProp, textValue, tooltip, tooltipProps, ...props }: SidebarMenuItemProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarSeparatorProps extends ComponentPropsWithRef<typeof Separator> {
}
declare const SidebarSeparator: ({ className, ...props }: SidebarSeparatorProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarTriggerProps extends ComponentPropsWithRef<typeof Button> {
    children?: ReactNode;
}
declare const SidebarTrigger: ({ children, className, ...props }: SidebarTriggerProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarRailProps extends ComponentPropsWithRef<'button'> {
}
declare const SidebarRail: ({ className, ...props }: SidebarRailProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMainProps extends ComponentPropsWithRef<'main'> {
    children: ReactNode;
}
declare const SidebarMain: ({ children, className, ...props }: SidebarMainProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarMobileProps extends ComponentPropsWithRef<'div'> {
    backdrop?: 'blur' | 'opaque' | 'transparent';
    children: ReactNode;
}
declare const SidebarMobile: ({ backdrop, children, className, ...props }: SidebarMobileProps) => import("react/jsx-runtime").JSX.Element | null;
interface SidebarTooltipProps extends Omit<ComponentPropsWithRef<typeof Tooltip.Content>, 'children'> {
    children: ReactNode;
    content: ReactNode;
    delay?: number;
    closeDelay?: number;
}
declare const SidebarTooltip: ({ children, closeDelay, content, delay, placement, ...props }: SidebarTooltipProps) => import("react/jsx-runtime").JSX.Element;
type SidebarPagesContextValue = {
    activeIndex: number;
    activeValue: string;
    order: string[];
    reduceMotion: boolean;
    setActiveValue: (value: string) => void;
};
/** Hook to read and control the nearest `Sidebar.Pages` switcher. Must be used within `Sidebar.Pages`. */
declare const useSidebarPages: () => SidebarPagesContextValue;
interface SidebarPagesProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Initial active page for uncontrolled usage. Defaults to the first `Sidebar.Page`. */
    defaultValue?: string;
    /** Called when the active page changes. */
    onValueChange?: (value: string) => void;
    /** Disable slide animations. Also respects the user's reduced-motion preference. @default inherited from Sidebar.Provider */
    reduceMotion?: boolean;
    /** Controlled active page value. */
    value?: string;
}
declare const SidebarPages: ({ children, className, defaultValue, onValueChange, reduceMotion: reduceMotionProp, value: valueProp, ...props }: SidebarPagesProps) => import("react/jsx-runtime").JSX.Element;
interface SidebarPageProps {
    children: ReactNode;
    className?: string;
    ref?: Ref<HTMLDivElement>;
    /** Unique key identifying this page within `Sidebar.Pages`. */
    value: string;
}
declare const SidebarPage: ({ children, className, ref, value }: SidebarPageProps) => import("react/jsx-runtime").JSX.Element;
export { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMain, SidebarMenu, SidebarMenuAction, SidebarMenuActions, SidebarMenuChip, SidebarMenuHeader, SidebarMenuIcon, SidebarMenuIndicator, SidebarMenuItem, SidebarMenuItemContent, SidebarMenuLabel, SidebarMenuSection, SidebarMenuTrigger, SidebarMobile, SidebarPage, SidebarPages, SidebarProvider, SidebarRail, SidebarRoot, SidebarSeparator, SidebarSubmenu, SidebarTooltip, SidebarTrigger, useSidebar, useSidebarPages, };
export type { SidebarContentProps, SidebarFooterProps, SidebarGroupLabelProps, SidebarGroupProps, SidebarHeaderProps, SidebarMainProps, SidebarMenuActionProps, SidebarMenuActionsProps, SidebarMenuChipProps, SidebarMenuHeaderProps, SidebarMenuIconProps, SidebarMenuIndicatorProps, SidebarMenuItemContentProps, SidebarMenuItemProps, SidebarMenuItemTooltipProps, SidebarMenuLabelProps, SidebarMenuProps, SidebarMenuSectionProps, SidebarMenuTriggerProps, SidebarMobileProps, SidebarNavigate, SidebarPageProps, SidebarPagesProps, SidebarProviderProps, SidebarRailProps, SidebarRootProps, SidebarSeparatorProps, SidebarSubmenuProps, SidebarTooltipProps, SidebarTriggerProps, };
//# sourceMappingURL=sidebar.d.ts.map