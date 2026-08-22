import type { ComponentProps } from 'react';
import { ContextMenuItem, ContextMenuItemIndicator, ContextMenuMenu, ContextMenuPopover, ContextMenuRoot, ContextMenuSection, ContextMenuSeparator, ContextMenuSubmenuIndicator, ContextMenuSubmenuTrigger, ContextMenuTrigger } from './context-menu';
export declare const ContextMenu: (({ children, defaultOpen, isDisabled, onOpenChange, open, }: import("./context-menu").ContextMenuRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Item: (props: import("@heroui/react").DropdownItemProps) => import("react/jsx-runtime").JSX.Element;
    ItemIndicator: (props: import("@heroui/react").DropdownItemIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Menu: typeof ContextMenuMenu;
    Popover: ({ children, className, offset, placement, ...props }: import("./context-menu").ContextMenuPopoverProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, defaultOpen, isDisabled, onOpenChange, open, }: import("./context-menu").ContextMenuRootProps) => import("react/jsx-runtime").JSX.Element;
    Section: (props: import("@heroui/react").DropdownSectionProps) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, ...props }: import("./context-menu").ContextMenuSeparatorProps) => import("react/jsx-runtime").JSX.Element;
    SubmenuIndicator: (props: import("@heroui/react").DropdownSubmenuIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    SubmenuTrigger: ({ children, ...props }: import("@heroui/react").DropdownSubmenuTriggerProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: import("./context-menu").ContextMenuTriggerProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./context-menu").ContextMenuTriggerProps<E>>) => import("react/jsx-runtime").JSX.Element;
};
export type ContextMenu<T extends object = object> = {
    ItemIndicatorProps: ComponentProps<typeof ContextMenuItemIndicator>;
    ItemProps: ComponentProps<typeof ContextMenuItem>;
    MenuProps: ComponentProps<typeof ContextMenuMenu<T>>;
    PopoverProps: ComponentProps<typeof ContextMenuPopover>;
    Props: ComponentProps<typeof ContextMenuRoot>;
    RootProps: ComponentProps<typeof ContextMenuRoot>;
    SectionProps: ComponentProps<typeof ContextMenuSection>;
    SeparatorProps: ComponentProps<typeof ContextMenuSeparator>;
    SubmenuIndicatorProps: ComponentProps<typeof ContextMenuSubmenuIndicator>;
    SubmenuTriggerProps: ComponentProps<typeof ContextMenuSubmenuTrigger>;
    TriggerProps: ComponentProps<typeof ContextMenuTrigger>;
};
export { ContextMenuItem, ContextMenuItemIndicator, ContextMenuMenu, ContextMenuPopover, ContextMenuRoot, ContextMenuSection, ContextMenuSeparator, ContextMenuSubmenuIndicator, ContextMenuSubmenuTrigger, ContextMenuTrigger, };
export type { ContextMenuItemIndicatorProps, ContextMenuItemProps, ContextMenuMenuProps, ContextMenuPopoverProps, ContextMenuRootProps as ContextMenuProps, ContextMenuRootProps, ContextMenuSectionProps, ContextMenuSeparatorProps, ContextMenuSubmenuIndicatorProps, ContextMenuSubmenuTriggerProps, ContextMenuTriggerProps, } from './context-menu';
export type { ContextMenuVariants } from './context-menu.styles';
export { contextMenuVariants } from './context-menu.styles';
//# sourceMappingURL=index.d.ts.map