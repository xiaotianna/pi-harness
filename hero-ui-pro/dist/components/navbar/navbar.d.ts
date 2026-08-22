import type React from 'react';
import type { ComponentPropsWithRef } from 'react';
import { type ReactNode, type RefObject } from 'react';
import type { ToggleButton as ToggleButtonPrimitive } from 'react-aria-components/ToggleButton';
import type { DOMRenderProps } from '@heroui/react';
import { Separator } from '@heroui/react';
import type { NavbarVariants } from './navbar.styles';
import { navbarVariants } from './navbar.styles';
export type NavbarNavigate = (href: string) => void;
type NavbarContextValue = {
    height: string;
    isHidden: boolean;
    isMenuOpen: boolean;
    navigate?: NavbarNavigate;
    setMenuOpen: (open: boolean) => void;
    slots?: ReturnType<typeof navbarVariants>;
};
export declare const useNavbar: () => NavbarContextValue;
export interface NavbarRootProps extends ComponentPropsWithRef<'nav'>, NavbarVariants {
    children: ReactNode;
    /** Default menu open state (uncontrolled). @default false */
    defaultMenuOpen?: boolean;
    /** Navbar height CSS value. @default "4rem" */
    height?: string;
    /** Enable hide-on-scroll behavior. @default false */
    hideOnScroll?: boolean;
    /** Controlled menu open state. */
    isMenuOpen?: boolean;
    /** Programmatic navigation function for client-side routing (e.g. `router.push`). Called when an Item/MenuItem with `href` is pressed. When the `Navbar` is rendered inside an `AppLayout`, it automatically inherits the layout's `navigate` unless this prop is set. If omitted, the `Navbar` defers to a global React Aria `RouterProvider` when one is present, falling back to native browser navigation otherwise. */
    navigate?: NavbarNavigate;
    /** Callback when menu open state changes. */
    onMenuOpenChange?: (isOpen: boolean) => void;
    /** Scroll container ref for hide-on-scroll. @default window */
    parentRef?: RefObject<HTMLElement | null>;
    /** Block background scroll when menu is open. @default true */
    shouldBlockScroll?: boolean;
}
export declare const NavbarRoot: ({ children, className, defaultMenuOpen, height, hideOnScroll, isMenuOpen: isMenuOpenProp, maxWidth, navigate: navigateProp, onMenuOpenChange, parentRef, position, shouldBlockScroll, size, style, ...props }: NavbarRootProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarHeaderProps extends ComponentPropsWithRef<'header'> {
    children: ReactNode;
}
export declare const NavbarHeader: ({ children, className, ...props }: NavbarHeaderProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarBrandProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
}
export declare const NavbarBrand: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: NavbarBrandProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof NavbarBrandProps<E>>) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const NavbarContent: ({ children, className, ...props }: NavbarContentProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarItemProps<E extends keyof React.JSX.IntrinsicElements = 'a'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
    /** Force full page reload. @default false */
    forceReload?: boolean;
    href?: string;
    /** Marks the item as current page. @default false */
    isCurrent?: boolean;
}
export declare const NavbarItem: <E extends keyof React.JSX.IntrinsicElements = "a">({ children, className, forceReload, href, isCurrent, ...props }: NavbarItemProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof NavbarItemProps<E>>) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export declare const NavbarLabel: ({ children, className, ...props }: NavbarLabelProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarSeparatorProps extends ComponentPropsWithRef<typeof Separator> {
}
export declare const NavbarSeparator: ({ className, ...props }: NavbarSeparatorProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarSpacerProps extends ComponentPropsWithRef<'div'> {
}
export declare const NavbarSpacer: ({ className, ...props }: NavbarSpacerProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarMenuToggleProps extends Omit<ComponentPropsWithRef<typeof ToggleButtonPrimitive>, 'isSelected' | 'onChange'> {
    children?: ReactNode;
    /** Screen-reader label. @default "Toggle navigation menu" */
    srLabel?: string;
}
export declare const NavbarMenuToggle: ({ children, className, srLabel, ...props }: NavbarMenuToggleProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarMenuProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const NavbarMenu: ({ children, className, ...props }: NavbarMenuProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NavbarMenuItemProps<E extends keyof React.JSX.IntrinsicElements = 'a'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
    /** Force full page reload. @default false */
    forceReload?: boolean;
    href?: string;
    /** Marks the item as current page. @default false */
    isCurrent?: boolean;
}
export declare const NavbarMenuItem: <E extends keyof React.JSX.IntrinsicElements = "a">({ children, className, forceReload, href, isCurrent, ...props }: NavbarMenuItemProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof NavbarMenuItemProps<E>>) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=navbar.d.ts.map