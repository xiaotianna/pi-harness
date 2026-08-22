'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { Button as AriaButton } from 'react-aria-components/Button';
import { Tree as TreePrimitive, TreeHeader as TreeHeaderPrimitive, TreeItem as TreeItemPrimitive, TreeItemContent as TreeItemContentPrimitive, TreeSection as TreeSectionPrimitive, } from 'react-aria-components/Tree';
import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Button, ScrollShadow, Separator, Tooltip } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { setCookie } from '../../utils/cookie-storage';
import { matchesShortcut, parseToggleShortcut, } from '../../utils/keyboard-shortcut';
import { TreeMotionProvider } from '../../utils/tree-motion';
import { ChevronRight, LayoutSideContentLeft } from '../icons';
import { Sheet } from '../sheet/index';
import { sidebarVariants } from './sidebar.styles';
const PAGE_TRANSITION = {
    duration: 0.3,
    ease: [0.23, 1, 0.32, 1],
};
const SidebarContext = createContext({
    collapsible: 'icon',
    isMobile: false,
    isMobileOpen: false,
    isOpen: true,
    reduceMotion: false,
    setMobileOpen: () => { },
    setOpen: () => { },
    side: 'left',
    toggleSidebar: () => { },
    variant: 'sidebar',
});
/** Hook for programmatic sidebar control. */
const useSidebar = () => useContext(SidebarContext);
// Context for closeMobileOnAction inheritance
const CloseMobileContext = createContext(undefined);
const SidebarProvider = ({ children, className, collapsible = 'icon', defaultOpen = true, navigate, onOpenChange, open: openProp, reduceMotion = false, side = 'left', toggleShortcut = 'mod+b', variant = 'sidebar', ...props }) => {
    const isControlled = openProp !== undefined;
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isOpen = openProp ?? internalOpen;
    const setOpen = useCallback((val) => {
        onOpenChange?.(val);
        if (!isControlled) {
            setInternalOpen(val);
            setCookie('sidebar_state', String(val));
        }
    }, [onOpenChange, isControlled]);
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);
    const slots = useMemo(() => sidebarVariants({ side, variant }), [side, variant]);
    const toggleSidebar = useCallback(() => {
        if (collapsible === 'none')
            return;
        if (isMobile) {
            setMobileOpen((v) => !v);
        }
        else {
            setOpen(!isOpen);
        }
    }, [collapsible, isMobile, isOpen, setOpen]);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => {
            setIsMobile(e.matches);
            if (e.matches)
                setMobileOpen(false);
        };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    useEffect(() => {
        if (!toggleShortcut)
            return;
        const parsed = parseToggleShortcut(toggleShortcut);
        if (!parsed)
            return;
        const handler = (e) => {
            if (matchesShortcut(e, parsed)) {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleShortcut, toggleSidebar]);
    const ctxValue = useMemo(() => ({
        collapsible: collapsible ?? 'icon',
        isMobile,
        isMobileOpen,
        isOpen,
        navigate,
        reduceMotion,
        setMobileOpen,
        setOpen,
        side: side ?? 'left',
        slots,
        toggleSidebar,
        variant: variant ?? 'sidebar',
    }), [
        collapsible,
        isMobile,
        isMobileOpen,
        isOpen,
        navigate,
        reduceMotion,
        setMobileOpen,
        setOpen,
        side,
        slots,
        toggleSidebar,
        variant,
    ]);
    return (_jsx(SidebarContext.Provider, { value: ctxValue, children: _jsx("div", { className: composeSlotClassName(slots?.provider, className), "data-sidebar": "provider", "data-slot": "sidebar-provider", "data-state": isOpen ? 'expanded' : 'collapsed', ...props, children: children }) }));
};
const SidebarRoot = ({ children, className, ...props }) => {
    const { collapsible, isOpen, side, slots, variant } = useSidebar();
    const state = isOpen ? 'expanded' : 'collapsed';
    const aside = (_jsx("aside", { className: composeSlotClassName(slots?.base, className), "data-collapsible": collapsible, "data-side": side, "data-slot": "sidebar", "data-state": state, "data-variant": variant, ...props, children: children }));
    if (collapsible === 'offcanvas') {
        return (_jsx("div", { className: "sidebar__offcanvas-wrapper", "data-side": side, "data-state": state, children: aside }));
    }
    return aside;
};
const SidebarHeader = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "sidebar-header", ...props, children: children }));
};
const SidebarContent = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx(ScrollShadow, { hideScrollBar: true, className: composeSlotClassName(slots?.content, className), "data-slot": "sidebar-content", ...props, children: children }));
};
const SidebarFooter = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("div", { className: composeSlotClassName(slots?.footer, className), "data-slot": "sidebar-footer", ...props, children: children }));
};
const SidebarGroup = ({ children, className, closeMobileOnAction, ...props }) => {
    const { slots } = useSidebar();
    const div = (_jsx("div", { className: composeSlotClassName(slots?.group, className), "data-slot": "sidebar-group", ...props, children: children }));
    return closeMobileOnAction !== undefined ? (_jsx(CloseMobileContext.Provider, { value: closeMobileOnAction, children: div })) : (div);
};
const SidebarGroupLabel = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("div", { className: composeSlotClassName(slots?.groupLabel, className), "data-slot": "sidebar-group-label", ...props, children: children }));
};
const guideLineDataMap = {
    false: 'none',
    hover: 'hover',
    true: 'always',
};
const SidebarMenu = ({ children, className, closeMobileOnAction, reduceMotion, showGuideLines = true, ...props }) => {
    const { reduceMotion: ctxReduceMotion, slots } = useSidebar();
    const parentCloseMobile = useContext(CloseMobileContext);
    const resolvedClose = closeMobileOnAction ?? parentCloseMobile;
    const guideLines = guideLineDataMap[String(showGuideLines)];
    const tree = (_jsx(TreeMotionProvider, { reduceMotion: reduceMotion ?? ctxReduceMotion, children: _jsx(TreePrimitive, { className: composeTwRenderProps(className, slots?.menu()), "data-guide-lines": guideLines, "data-sidebar": "menu", "data-slot": "sidebar-menu", ...props, children: children }) }));
    return resolvedClose !== undefined ? (_jsx(CloseMobileContext.Provider, { value: resolvedClose, children: tree })) : (tree);
};
const SidebarMenuSection = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx(TreeSectionPrimitive, { className: composeSlotClassName(slots?.menuSection, className), "data-slot": "sidebar-menu-section", ...props, children: children }));
};
const SidebarMenuHeader = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx(TreeHeaderPrimitive, { className: composeSlotClassName(slots?.menuHeader, className), "data-slot": "sidebar-menu-header", ...props, children: children }));
};
const SidebarMenuIcon = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("span", { className: composeSlotClassName(slots?.menuIcon, className), "data-slot": "sidebar-menu-icon", ...props, children: children }));
};
const SidebarMenuLabel = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    const regularChildren = [];
    const chipChildren = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === SidebarMenuTrigger) {
            chipChildren.push(child);
        }
        else {
            regularChildren.push(child);
        }
    });
    return (_jsxs("span", { className: composeSlotClassName(slots?.menuLabel, className), "data-sidebar": "label", "data-slot": "sidebar-menu-label", ...props, children: [_jsx("span", { className: slots?.menuLabelText(), "data-slot": "sidebar-menu-label-text", children: regularChildren }), chipChildren] }));
};
const SidebarMenuChip = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("span", { className: composeSlotClassName(slots?.menuChip, className), "data-slot": "sidebar-menu-chip", ...props, children: children }));
};
const SidebarMenuActions = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("div", { className: composeSlotClassName(slots?.menuActions, className), "data-slot": "sidebar-menu-actions", ...props, children: children }));
};
const SidebarMenuAction = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx(AriaButton, { className: composeTwRenderProps(className, slots?.menuAction()), "data-slot": "sidebar-menu-action", ...props, children: children }));
};
const SidebarMenuItemContent = ({ children }) => (_jsx(_Fragment, { children: children }));
const SidebarMenuTrigger = ({ children }) => (_jsx(_Fragment, { children: children }));
const SidebarMenuIndicator = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    if (children && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            className: composeSlotClassName(slots?.menuIndicator, className),
            'data-slot': 'sidebar-menu-indicator',
        });
    }
    return (_jsx(ChevronRight, { className: composeSlotClassName(slots?.menuIndicator, className), "data-slot": "sidebar-menu-indicator", ...props }));
};
const SidebarSubmenu = ({ children }) => _jsx(_Fragment, { children: children });
// Helper: extract text from react children
function extractText(node) {
    if (typeof node === 'string' || typeof node === 'number')
        return String(node);
    if (Array.isArray(node))
        return node.map(extractText).join('');
    if (React.isValidElement(node))
        return extractText(node.props.children);
    return '';
}
// Helper: collect item slot children
function collectSlotChildren(children, regular, submenuChildren, contentPropsRef) {
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type !== React.Fragment) {
                if (child.type !== SidebarSubmenu) {
                    if (child.type === SidebarMenuItemContent) {
                        if (contentPropsRef)
                            contentPropsRef.value =
                                child.props;
                        return;
                    }
                    regular.push(child);
                }
                else {
                    submenuChildren.push(...React.Children.toArray(child.props.children));
                }
            }
            else {
                collectSlotChildren(child.props.children, regular, submenuChildren, contentPropsRef);
            }
        }
        else {
            regular.push(child);
        }
    });
}
const SidebarMenuItem = ({ children, className, closeMobileOnAction, forceReload = false, href, isCurrent = false, render: renderProp, textValue, tooltip, tooltipProps, ...props }) => {
    const { collapsible, isMobile, isOpen: sidebarIsOpen, navigate, setMobileOpen, slots, } = useSidebar();
    const parentCloseMobile = useContext(CloseMobileContext);
    const resolvedClose = closeMobileOnAction ?? parentCloseMobile ?? true;
    const isIconOnly = collapsible === 'icon' && !isMobile && !sidebarIsOpen;
    const regularChildren = [];
    const submenuChildren = [];
    const contentPropsRef = {};
    collectSlotChildren(children, regularChildren, submenuChildren, contentPropsRef);
    const textValueResolved = textValue ?? extractText(regularChildren);
    const tooltipContent = tooltip ?? textValueResolved;
    const submenuEl = submenuChildren.length > 0 ? submenuChildren : null;
    const { children: contentChildren, className: contentClassName, ...contentRestProps } = contentPropsRef.value ?? {};
    const enhancedChildren = regularChildren.map((child, i) => {
        if (React.isValidElement(child)) {
            const childEl = child;
            if (childEl.type === SidebarMenuTrigger) {
                const { children: triggerChildren, className: triggerClassName, ...triggerRest } = childEl.props;
                return (_jsx(AriaButton, { className: composeTwRenderProps(triggerClassName, slots?.menuTrigger()), "data-slot": "sidebar-menu-trigger", slot: "chevron", ...triggerRest, children: triggerChildren }, childEl.key ?? i));
            }
            if (isIconOnly &&
                !tooltipProps &&
                tooltipContent &&
                childEl.type === SidebarMenuIcon) {
                return (_jsx(SidebarTooltip, { content: tooltipContent, children: childEl }, childEl.key ?? i));
            }
        }
        return child;
    });
    const shouldCloseOnAction = resolvedClose && isMobile && submenuChildren.length === 0;
    const handleAction = useCallback(() => {
        if (href) {
            if (shouldCloseOnAction)
                setMobileOpen(false);
            if (/^https?:\/\//.test(href)) {
                window.open(href, '_blank', 'noopener,noreferrer');
            }
            else if (navigate && !forceReload) {
                navigate(href);
            }
            else {
                window.location.href = href;
            }
        }
    }, [href, shouldCloseOnAction, setMobileOpen, navigate, forceReload]);
    const itemContent = (_jsx("div", { className: composeSlotClassName(slots?.menuItemContent, contentClassName), "data-slot": "sidebar-menu-item-content", ...contentRestProps, children: enhancedChildren }));
    return (_jsxs(TreeItemPrimitive, { "aria-current": isCurrent ? 'page' : undefined, className: composeTwRenderProps(className, slots?.menuItem()), "data-current": isCurrent ? 'true' : undefined, "data-slot": "sidebar-menu-item", render: renderProp, textValue: textValueResolved, ...props, ...(href ? { onAction: handleAction } : {}), children: [_jsx(TreeItemContentPrimitive, { children: tooltipProps ? (_jsxs(Tooltip, { closeDelay: tooltipProps.closeDelay, delay: tooltipProps.delay, children: [_jsx(Tooltip.Trigger, { className: "w-full", children: itemContent }), _jsx(Tooltip.Content, { className: tooltipProps.className, placement: tooltipProps.placement ?? 'right', children: tooltipProps.content })] })) : (itemContent) }), submenuEl] }));
};
const SidebarSeparator = ({ className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx(Separator, { className: composeSlotClassName(slots?.separator, className), "data-slot": "sidebar-separator", ...props }));
};
const SidebarTrigger = ({ children, className, ...props }) => {
    const { toggleSidebar } = useSidebar();
    return (_jsx(Button, { isIconOnly: true, className: className, "data-slot": "sidebar-trigger", size: "sm", variant: "ghost", onPress: toggleSidebar, ...props, children: children ?? _jsx(LayoutSideContentLeft, { className: "size-4" }) }));
};
const SidebarRail = ({ className, ...props }) => {
    const { slots, toggleSidebar } = useSidebar();
    return (_jsx("button", { "aria-label": "Toggle sidebar", className: composeSlotClassName(slots?.rail, className), "data-slot": "sidebar-rail", tabIndex: -1, type: "button", onClick: toggleSidebar, ...props }));
};
const SidebarMain = ({ children, className, ...props }) => {
    const { slots } = useSidebar();
    return (_jsx("main", { className: composeSlotClassName(slots?.main, className), "data-slot": "sidebar-main", ...props, children: children }));
};
const SidebarMobile = ({ backdrop = 'blur', children, className, ...props }) => {
    const { isMobile, isMobileOpen, setMobileOpen, side, slots } = useSidebar();
    if (!isMobile)
        return null;
    return (_jsx(Sheet, { isOpen: isMobileOpen, placement: side, onOpenChange: setMobileOpen, children: _jsx(Sheet.Backdrop, { variant: backdrop, children: _jsx(Sheet.Content, { className: "sidebar__mobile-sheet", children: _jsx(Sheet.Dialog, { className: "sidebar__mobile-dialog", children: _jsx("div", { className: composeSlotClassName(slots?.mobile, className), "data-slot": "sidebar-mobile", ...props, children: children }) }) }) }) }));
};
const SidebarTooltip = ({ children, closeDelay, content, delay, placement = 'right', ...props }) => {
    const { isOpen } = useSidebar();
    if (isOpen)
        return _jsx(_Fragment, { children: children });
    return (_jsxs(Tooltip, { closeDelay: closeDelay, delay: delay, children: [_jsx(Tooltip.Trigger, { children: children }), _jsx(Tooltip.Content, { placement: placement, ...props, children: content })] }));
};
const SidebarPagesContext = createContext(null);
/** Hook to read and control the nearest `Sidebar.Pages` switcher. Must be used within `Sidebar.Pages`. */
const useSidebarPages = () => {
    const ctx = useContext(SidebarPagesContext);
    if (!ctx) {
        throw new Error('useSidebarPages must be used within a Sidebar.Pages');
    }
    return ctx;
};
const SidebarPages = ({ children, className, defaultValue, onValueChange, reduceMotion: reduceMotionProp, value: valueProp, ...props }) => {
    const { reduceMotion: ctxReduceMotion, slots } = useSidebar();
    const prefersReducedMotion = useReducedMotion();
    const order = useMemo(() => {
        const values = [];
        React.Children.forEach(children, (child) => {
            if (React.isValidElement(child) && child.type === SidebarPage) {
                values.push(child.props.value);
            }
        });
        return values;
    }, [children]);
    const isControlled = valueProp !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(() => defaultValue ?? order[0] ?? '');
    const activeValue = isControlled ? valueProp : uncontrolledValue;
    const activeIndex = Math.max(order.indexOf(activeValue), 0);
    const reduceMotion = Boolean((reduceMotionProp ?? ctxReduceMotion) || prefersReducedMotion);
    const setActiveValue = useCallback((next) => {
        onValueChange?.(next);
        if (!isControlled) {
            setUncontrolledValue(next);
        }
    }, [isControlled, onValueChange]);
    const contextValue = useMemo(() => ({
        activeIndex,
        activeValue,
        order,
        reduceMotion,
        setActiveValue,
    }), [activeIndex, activeValue, order, reduceMotion, setActiveValue]);
    return (_jsx(SidebarPagesContext.Provider, { value: contextValue, children: _jsx(LazyMotion, { features: domAnimation, children: _jsx("div", { className: composeSlotClassName(slots?.pages, className), "data-slot": "sidebar-pages", ...props, children: children }) }) }));
};
const SidebarPage = ({ children, className, ref, value }) => {
    const { activeIndex, activeValue, order, reduceMotion } = useSidebarPages();
    const { slots } = useSidebar();
    const index = Math.max(order.indexOf(value), 0);
    const isActive = value === activeValue;
    return (_jsx(m.div, { ref: ref, animate: {
            opacity: isActive ? 1 : 0,
            x: `${100 * (index - activeIndex)}%`,
        }, "aria-hidden": !isActive || undefined, className: composeSlotClassName(slots?.page, className), "data-active": isActive ? 'true' : 'false', "data-slot": "sidebar-page", inert: !isActive, initial: false, transition: reduceMotion ? { duration: 0 } : PAGE_TRANSITION, children: children }));
};
export { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMain, SidebarMenu, SidebarMenuAction, SidebarMenuActions, SidebarMenuChip, SidebarMenuHeader, SidebarMenuIcon, SidebarMenuIndicator, SidebarMenuItem, SidebarMenuItemContent, SidebarMenuLabel, SidebarMenuSection, SidebarMenuTrigger, SidebarMobile, SidebarPage, SidebarPages, SidebarProvider, SidebarRail, SidebarRoot, SidebarSeparator, SidebarSubmenu, SidebarTooltip, SidebarTrigger, useSidebar, useSidebarPages, };
//# sourceMappingURL=sidebar.js.map