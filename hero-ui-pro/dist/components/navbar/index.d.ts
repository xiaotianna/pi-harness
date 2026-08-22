import type { ComponentProps } from 'react';
import { NavbarBrand, NavbarContent, NavbarHeader, NavbarItem, NavbarLabel, NavbarMenu, NavbarMenuItem, NavbarMenuToggle, NavbarRoot, NavbarSeparator, NavbarSpacer } from './navbar';
export { useNavbar } from './navbar';
export { navbarVariants } from './navbar.styles';
declare const Navbar: (({ children, className, defaultMenuOpen, height, hideOnScroll, isMenuOpen: isMenuOpenProp, maxWidth, navigate: navigateProp, onMenuOpenChange, parentRef, position, shouldBlockScroll, size, style, ...props }: import("./navbar").NavbarRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Brand: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: import("./navbar").NavbarBrandProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./navbar").NavbarBrandProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Content: ({ children, className, ...props }: import("./navbar").NavbarContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Header: ({ children, className, ...props }: import("./navbar").NavbarHeaderProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Item: <E extends keyof React.JSX.IntrinsicElements = "a">({ children, className, forceReload, href, isCurrent, ...props }: import("./navbar").NavbarItemProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./navbar").NavbarItemProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Label: ({ children, className, ...props }: import("./navbar").NavbarLabelProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Menu: ({ children, className, ...props }: import("./navbar").NavbarMenuProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    MenuItem: <E extends keyof React.JSX.IntrinsicElements = "a">({ children, className, forceReload, href, isCurrent, ...props }: import("./navbar").NavbarMenuItemProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./navbar").NavbarMenuItemProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    MenuToggle: ({ children, className, srLabel, ...props }: import("./navbar").NavbarMenuToggleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ children, className, defaultMenuOpen, height, hideOnScroll, isMenuOpen: isMenuOpenProp, maxWidth, navigate: navigateProp, onMenuOpenChange, parentRef, position, shouldBlockScroll, size, style, ...props }: import("./navbar").NavbarRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Separator: ({ className, ...props }: import("./navbar").NavbarSeparatorProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Spacer: ({ className, ...props }: import("./navbar").NavbarSpacerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export { Navbar, NavbarBrand, NavbarContent, NavbarHeader, NavbarItem, NavbarLabel, NavbarMenu, NavbarMenuItem, NavbarMenuToggle, NavbarRoot, NavbarSeparator, NavbarSpacer, };
export type { NavbarBrandProps, NavbarContentProps, NavbarHeaderProps, NavbarItemProps, NavbarLabelProps, NavbarMenuItemProps, NavbarMenuProps, NavbarMenuToggleProps, NavbarNavigate, NavbarRootProps as NavbarProps, NavbarRootProps, NavbarSeparatorProps, NavbarSpacerProps, } from './navbar';
export type { NavbarVariants } from './navbar.styles';
export type Navbar = {
    BrandProps: ComponentProps<typeof NavbarBrand>;
    ContentProps: ComponentProps<typeof NavbarContent>;
    HeaderProps: ComponentProps<typeof NavbarHeader>;
    ItemProps: ComponentProps<typeof NavbarItem>;
    LabelProps: ComponentProps<typeof NavbarLabel>;
    MenuItemProps: ComponentProps<typeof NavbarMenuItem>;
    MenuProps: ComponentProps<typeof NavbarMenu>;
    MenuToggleProps: ComponentProps<typeof NavbarMenuToggle>;
    Props: ComponentProps<typeof NavbarRoot>;
    RootProps: ComponentProps<typeof NavbarRoot>;
    SeparatorProps: ComponentProps<typeof NavbarSeparator>;
    SpacerProps: ComponentProps<typeof NavbarSpacer>;
};
//# sourceMappingURL=index.d.ts.map