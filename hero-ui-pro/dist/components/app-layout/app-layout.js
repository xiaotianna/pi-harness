'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { composeTwRenderProps } from '../../utils/compose';
import { setCookie } from '../../utils/cookie-storage';
import { matchesShortcut, parseToggleShortcut, } from '../../utils/keyboard-shortcut';
import { Bars, LayoutSideContentRight } from '../icons';
import { Resizable } from '../resizable/index';
import { Sheet } from '../sheet/index';
import { SidebarProvider, useSidebar } from '../sidebar/sidebar';
import { appLayoutVariants } from './app-layout.styles';
import '../sidebar/index';
// ─── Context ──────────────────────────────────────────────────────────────────
export const AppLayoutContext = createContext(null);
export const useAppLayout = () => useContext(AppLayoutContext);
// ─── Internal Helpers ─────────────────────────────────────────────────────────
function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const media = window.matchMedia(query);
        const listener = (e) => setMatches(e.matches);
        setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
}
function withTooltip(trigger, content, tooltipProps) {
    if (!content)
        return trigger;
    return (_jsxs(Tooltip, { closeDelay: tooltipProps?.closeDelay, delay: tooltipProps?.delay, isDisabled: tooltipProps?.isDisabled, children: [_jsx(Tooltip.Trigger, { children: trigger }), _jsxs(Tooltip.Content, { className: tooltipProps?.className, offset: tooltipProps?.offset, placement: tooltipProps?.placement ?? 'bottom', showArrow: tooltipProps?.showArrow, children: [tooltipProps?.showArrow ? _jsx(Tooltip.Arrow, {}) : null, content] })] }));
}
// ─── Components ───────────────────────────────────────────────────────────────
export const AppLayoutMenuToggle = ({ children, className, tooltip, tooltipProps, ...props }) => {
    const { setMobileOpen } = useSidebar();
    const ctx = useContext(AppLayoutContext);
    const trigger = (_jsx(Button, { isIconOnly: true, "aria-label": "Open navigation", className: composeTwRenderProps(className, ctx?.slots?.menuToggle()), "data-slot": "app-layout-menu-toggle", size: "sm", variant: "ghost", onPress: () => setMobileOpen(true), ...props, children: children ?? _jsx(Bars, { className: "size-4" }) }));
    return withTooltip(trigger, tooltip, tooltipProps);
};
export const AppLayoutAsideTrigger = ({ children, className, closedTooltip, openTooltip, tooltipProps, ...props }) => {
    const ctx = useContext(AppLayoutContext);
    const isOpen = ctx?.isAsideOpen ?? false;
    const trigger = (_jsx(Button, { isIconOnly: true, "aria-expanded": isOpen, "aria-label": "Toggle aside panel", className: composeTwRenderProps(className, ctx?.slots?.asideTrigger()), "data-slot": "app-layout-aside-trigger", "data-state": isOpen ? 'open' : 'closed', size: "sm", variant: "ghost", onPress: () => ctx?.toggleAside(), ...props, children: children ?? _jsx(LayoutSideContentRight, { className: "size-4" }) }));
    return withTooltip(trigger, isOpen ? openTooltip : closedTooltip, tooltipProps);
};
export const AppLayoutMobileAside = ({ children: _children, }) => null;
export const AppLayoutRoot = ({ aside, asideDefaultSize = 20, asideMaxSize = 40, asideMinSize = 15, asideMobile = 'hidden', asideOpen: asideOpenProp, asideResizable = false, asideResizeBehavior, asideToggleShortcut = null, children, className, defaultAsideOpen = true, defaultSidebarOpen = true, footer, navbar, navigate, onAsideOpenChange, onSidebarOpenChange, reduceMotion = false, resizableAutoSaveId, scrollMode = 'page', sidebar, sidebarCollapsible = 'icon', sidebarDefaultSize = 18, sidebarMaxSize = 30, sidebarMinSize = 12, sidebarOpen: sidebarOpenProp, sidebarResizable = false, sidebarResizeBehavior, sidebarSide = 'left', sidebarVariant = 'sidebar', style, toggleShortcut, toolbar, ...props }) => {
    const slots = useMemo(() => appLayoutVariants(), []);
    const isContentScroll = scrollMode === 'content';
    // Sidebar open state
    const isSidebarControlled = sidebarOpenProp !== undefined;
    const [sidebarOpenState, setSidebarOpenState] = useState(defaultSidebarOpen);
    const sidebarOpen = sidebarOpenProp ?? sidebarOpenState;
    const handleSidebarOpenChange = useCallback((open) => {
        onSidebarOpenChange?.(open);
        if (!isSidebarControlled)
            setSidebarOpenState(open);
    }, [onSidebarOpenChange, isSidebarControlled]);
    // Aside open state
    const isAsideControlled = asideOpenProp !== undefined;
    const [asideOpenState, setAsideOpenState] = useState(defaultAsideOpen);
    const isAsideOpen = asideOpenProp ?? asideOpenState;
    const handleAsideOpenChange = useCallback((open) => {
        onAsideOpenChange?.(open);
        if (!isAsideControlled) {
            setAsideOpenState(open);
            setCookie('aside_state', String(open));
        }
    }, [onAsideOpenChange, isAsideControlled]);
    const toggleAside = useCallback(() => {
        handleAsideOpenChange(!isAsideOpen);
    }, [isAsideOpen, handleAsideOpenChange]);
    // Keyboard shortcut for aside toggle
    useEffect(() => {
        if (!asideToggleShortcut || !aside)
            return;
        const shortcut = parseToggleShortcut(asideToggleShortcut);
        if (!shortcut)
            return;
        const handler = (e) => {
            if (matchesShortcut(e, shortcut)) {
                e.preventDefault();
                toggleAside();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [asideToggleShortcut, aside, toggleAside]);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const isResizable = (sidebarResizable || asideResizable) && !isMobile;
    // Separate MobileAside content from regular children
    const { contentChildren, mobileAsideContent } = useMemo(() => {
        let mobileAsideNode = null;
        const rest = [];
        React.Children.forEach(children, (child) => {
            if (React.isValidElement(child) && child.type === AppLayoutMobileAside) {
                mobileAsideNode = child.props.children;
            }
            else {
                rest.push(child);
            }
        });
        return { contentChildren: rest, mobileAsideContent: mobileAsideNode };
    }, [children]);
    const hasMobileAside = mobileAsideContent != null;
    if (process.env.NODE_ENV !== 'production' &&
        sidebarResizable &&
        sidebarCollapsible === 'icon') {
        console.warn('[AppLayout] `sidebarResizable` is only supported with `sidebarCollapsible="offcanvas"` or `"none"`. Falling back to the non-resizable layout.');
    }
    const isSidebarResizable = sidebarResizable && sidebarCollapsible !== 'icon' && !isMobile;
    const isAsideResizable = asideResizable && !isTablet;
    const contextValue = useMemo(() => ({
        hasMobileAside,
        isAsideOpen,
        navigate,
        setAsideOpen: handleAsideOpenChange,
        slots,
        toggleAside,
    }), [
        hasMobileAside,
        isAsideOpen,
        navigate,
        handleAsideOpenChange,
        slots,
        toggleAside,
    ]);
    // Sections
    const headerSection = navbar ? (_jsx("header", { className: slots.header(), "data-slot": "app-layout-header", children: navbar })) : null;
    const toolbarSection = toolbar ? (_jsx("div", { className: slots.toolbar(), "data-slot": "app-layout-toolbar", children: toolbar })) : null;
    const mainSection = (_jsx("main", { "aria-label": isContentScroll ? 'Scrollable main content' : undefined, className: slots.main(), "data-scroll-mode": scrollMode, "data-slot": "app-layout-main", tabIndex: isContentScroll ? 0 : undefined, children: contentChildren }));
    const footerSection = footer ? (_jsx("div", { className: slots.footer(), "data-slot": "app-layout-footer", children: footer })) : null;
    const bodySection = (_jsxs("div", { className: slots.body(), "data-slot": "app-layout-body", children: [headerSection, toolbarSection, mainSection, footerSection] }));
    const asideSection = aside ? (_jsx("aside", { className: slots.aside(), "data-slot": "app-layout-aside", "data-state": isAsideOpen ? 'open' : 'closed', children: aside })) : null;
    const mobileAsideSheet = aside && asideMobile === 'sheet' && isTablet ? (_jsx(Sheet, { isOpen: isAsideOpen, placement: "right", onOpenChange: handleAsideOpenChange, children: _jsx(Sheet.Backdrop, { variant: "blur", children: _jsx(Sheet.Content, { className: "app-layout__mobile-aside-sheet", children: _jsx(Sheet.Dialog, { className: "app-layout__mobile-aside-dialog", children: _jsx("div", { className: "app-layout__mobile-aside", "data-slot": "app-layout-mobile-aside", children: mobileAsideContent ?? aside }) }) }) }) })) : null;
    return (_jsx(AppLayoutContext.Provider, { value: contextValue, children: isResizable ? (_jsxs(SidebarProvider, { className: className, collapsible: sidebarCollapsible, "data-app-layout": "", "data-resizable": "", "data-scroll-mode": scrollMode, defaultOpen: defaultSidebarOpen, navigate: navigate, open: sidebarOpen, reduceMotion: reduceMotion, side: sidebarSide, style: style, toggleShortcut: toggleShortcut, variant: sidebarVariant, onOpenChange: handleSidebarOpenChange, ...props, children: [_jsx(ResizableLayout, { aside: aside, asideDefaultSize: asideDefaultSize, asideMaxSize: asideMaxSize, asideMinSize: asideMinSize, asideResizable: isAsideResizable, asideResizeBehavior: asideResizeBehavior, bodySection: bodySection, isAsideOpen: isAsideOpen, isSidebarOpen: sidebarOpen, resizableAutoSaveId: resizableAutoSaveId, setAsideOpen: handleAsideOpenChange, setSidebarOpen: handleSidebarOpenChange, sidebar: sidebar, sidebarDefaultSize: sidebarDefaultSize, sidebarMaxSize: sidebarMaxSize, sidebarMinSize: sidebarMinSize, sidebarResizable: isSidebarResizable, sidebarResizeBehavior: sidebarResizeBehavior, sidebarSide: sidebarSide ?? 'left' }), mobileAsideSheet] })) : (_jsxs(SidebarProvider, { className: className, collapsible: sidebarCollapsible, "data-app-layout": "", "data-scroll-mode": scrollMode, defaultOpen: defaultSidebarOpen, navigate: navigate, open: sidebarOpen, reduceMotion: reduceMotion, side: sidebarSide, style: style, toggleShortcut: toggleShortcut, variant: sidebarVariant, onOpenChange: handleSidebarOpenChange, ...props, children: [sidebar, bodySection, asideSection, mobileAsideSheet] })) }));
};
// ─── Resizable Layout (internal) ─────────────────────────────────────────────
const ResizableLayout = ({ aside, asideDefaultSize, asideMaxSize, asideMinSize, asideResizable, asideResizeBehavior, bodySection, isAsideOpen, isSidebarOpen, resizableAutoSaveId, setAsideOpen, setSidebarOpen, sidebar, sidebarDefaultSize, sidebarMaxSize, sidebarMinSize, sidebarResizable, sidebarResizeBehavior, sidebarSide, }) => {
    const sidebarRef = useRef(null);
    const asideRef = useRef(null);
    useEffect(() => {
        if (!sidebarResizable)
            return;
        const panel = sidebarRef.current;
        if (!panel)
            return;
        if (isSidebarOpen && panel.isCollapsed())
            panel.expand();
        else if (!isSidebarOpen && !panel.isCollapsed())
            panel.collapse();
    }, [isSidebarOpen, sidebarResizable]);
    useEffect(() => {
        if (!asideResizable)
            return;
        const panel = asideRef.current;
        if (!panel)
            return;
        if (isAsideOpen && panel.isCollapsed())
            panel.expand();
        else if (!isAsideOpen && !panel.isCollapsed())
            panel.collapse();
    }, [isAsideOpen, asideResizable]);
    const sidebarPanel = sidebar && sidebarResizable ? (_jsx(Resizable.Panel, { collapsible: true, className: "app-layout__sidebar-panel", collapsedSize: 0, defaultSize: sidebarDefaultSize, groupResizeBehavior: sidebarResizeBehavior, handleRef: sidebarRef, id: "app-layout-sidebar", maxSize: sidebarMaxSize, minSize: sidebarMinSize, onCollapse: () => setSidebarOpen(false), onExpand: () => setSidebarOpen(true), children: sidebar }, "sidebar-panel")) : null;
    const sidebarHandle = sidebar && sidebarResizable ? (_jsx(Resizable.Handle, { type: "line", variant: "primary" }, "sidebar-handle")) : null;
    const asidePanel = aside && asideResizable ? (_jsx(Resizable.Panel, { collapsible: true, className: "app-layout__aside-panel", collapsedSize: 0, defaultSize: asideDefaultSize, groupResizeBehavior: asideResizeBehavior, handleRef: asideRef, id: "app-layout-aside", maxSize: asideMaxSize, minSize: asideMinSize, onCollapse: () => setAsideOpen(false), onExpand: () => setAsideOpen(true), children: aside }, "aside-panel")) : null;
    const asideHandle = aside && asideResizable ? (_jsx(Resizable.Handle, { type: "line", variant: "primary" }, "aside-handle")) : null;
    const staticSidebar = sidebar && !sidebarResizable ? sidebar : null;
    const staticAside = aside && !asideResizable ? (_jsx("aside", { className: "app-layout__aside", "data-slot": "app-layout-aside", "data-state": isAsideOpen ? 'open' : 'closed', children: aside })) : null;
    const mainPanel = (_jsx(Resizable.Panel, { className: "app-layout__main-panel", id: "app-layout-main", minSize: 30, children: bodySection }, "main-panel"));
    return (_jsxs(_Fragment, { children: [staticSidebar, _jsx(Resizable, { autoSaveId: resizableAutoSaveId, className: "app-layout__resizable", orientation: "horizontal", children: sidebarSide === 'left'
                    ? [sidebarPanel, sidebarHandle, mainPanel, asideHandle, asidePanel]
                    : [asidePanel, asideHandle, mainPanel, sidebarHandle, sidebarPanel] }), staticAside] }));
};
export { AppLayoutAsideTrigger as default };
//# sourceMappingURL=app-layout.js.map