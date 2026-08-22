import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Menu, Popover, Separator } from 'react-aria-components/Menu';
import type { DOMRenderProps } from '@heroui/react';
import { DropdownItem, DropdownItemIndicator, DropdownSection, DropdownSubmenuIndicator, DropdownSubmenuTrigger } from '@heroui/react';
export interface ContextMenuRootProps {
    children: ReactNode;
    /** Default open state (uncontrolled). */
    defaultOpen?: boolean;
    /** Whether the context menu is disabled. */
    isDisabled?: boolean;
    /** Callback when open state changes. */
    onOpenChange?: (open: boolean) => void;
    /** Controlled open state. */
    open?: boolean;
}
export interface ContextMenuTriggerProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
}
export interface ContextMenuPopoverProps extends Omit<ComponentPropsWithRef<typeof Popover>, 'children' | 'isOpen' | 'triggerRef'> {
    children: ReactNode;
}
export interface ContextMenuMenuProps<T extends object> extends ComponentPropsWithRef<typeof Menu<T>> {
}
export interface ContextMenuSeparatorProps extends ComponentPropsWithRef<typeof Separator> {
}
export type ContextMenuItemProps = ComponentPropsWithRef<typeof DropdownItem>;
export type ContextMenuItemIndicatorProps = ComponentPropsWithRef<typeof DropdownItemIndicator>;
export type ContextMenuSectionProps = ComponentPropsWithRef<typeof DropdownSection>;
export type ContextMenuSubmenuTriggerProps = ComponentPropsWithRef<typeof DropdownSubmenuTrigger>;
export type ContextMenuSubmenuIndicatorProps = ComponentPropsWithRef<typeof DropdownSubmenuIndicator>;
export declare const ContextMenuRoot: ({ children, defaultOpen, isDisabled, onOpenChange, open, }: ContextMenuRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuTrigger: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: ContextMenuTriggerProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof ContextMenuTriggerProps<E>>) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuPopover: ({ children, className, offset, placement, ...props }: ContextMenuPopoverProps) => import("react/jsx-runtime").JSX.Element;
export declare function ContextMenuMenu<T extends object>({ children, className, onClose, ...props }: ContextMenuMenuProps<T>): import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuSeparator: ({ className, ...props }: ContextMenuSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuItem: (props: import("@heroui/react").DropdownItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuItemIndicator: (props: import("@heroui/react").DropdownItemIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuSection: (props: import("@heroui/react").DropdownSectionProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuSubmenuTrigger: ({ children, ...props }: import("@heroui/react").DropdownSubmenuTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ContextMenuSubmenuIndicator: (props: import("@heroui/react").DropdownSubmenuIndicatorProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=context-menu.d.ts.map