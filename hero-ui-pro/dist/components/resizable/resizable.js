'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, } from 'react';
import { Group, Panel, Separator, useDefaultLayout, } from 'react-resizable-panels';
import { composeSlotClassName } from '../../utils/compose';
import { Grip, GripHorizontal } from '../icons';
import { resizableVariants } from './resizable.styles';
const noopStorage = {
    getItem: () => null,
    setItem: () => { },
};
const localStorageImpl = {
    getItem: (key) => {
        if (typeof window === 'undefined')
            return null;
        try {
            return window.localStorage.getItem(key);
        }
        catch {
            return null;
        }
    },
    setItem: (key, value) => {
        if (typeof window === 'undefined')
            return;
        try {
            window.localStorage.setItem(key, value);
        }
        catch {
            /* empty */
        }
    },
};
function normalizePanelSize(size) {
    if (size == null)
        return undefined;
    return typeof size === 'number' ? `${size}%` : size;
}
const ResizableContext = createContext(null);
const useResizableContext = () => {
    const ctx = useContext(ResizableContext);
    if (!ctx) {
        throw new Error('Resizable subcomponents must be rendered inside <Resizable>.');
    }
    return ctx;
};
const ResizableRoot = ({ autoSaveId, children, className, handleRef, id, onLayoutChange, orientation = 'horizontal', storage, style, ...props }) => {
    const slots = useMemo(() => resizableVariants({ orientation }), [orientation]);
    const ctxValue = useMemo(() => ({ orientation: orientation ?? 'horizontal', slots }), [orientation, slots]);
    const { defaultLayout, onLayoutChanged } = useDefaultLayout({
        id: autoSaveId || '__no_persist__',
        storage: autoSaveId ? (storage ?? localStorageImpl) : noopStorage,
    });
    return (_jsx(ResizableContext.Provider, { value: ctxValue, children: _jsx(Group, { className: composeSlotClassName(slots?.base, className), "data-slot": "resizable", defaultLayout: autoSaveId ? defaultLayout : undefined, groupRef: handleRef, id: id, orientation: orientation === 'vertical' ? 'vertical' : 'horizontal', style: style, onLayoutChange: onLayoutChange, onLayoutChanged: autoSaveId ? onLayoutChanged : undefined, ...props, children: children }) }));
};
const ResizablePanel = ({ children, className, collapsedSize, collapsible, defaultSize, groupResizeBehavior, handleRef, id, maxSize, minSize, onCollapse, onExpand, onResize, style, }) => {
    const { slots } = useResizableContext();
    const panelRef = useRef(null);
    const wasCollapsedRef = useRef(undefined);
    const mergedRef = useCallback((el) => {
        panelRef.current = el;
        if (typeof handleRef === 'function') {
            handleRef(el);
        }
        else if (handleRef) {
            handleRef.current = el;
        }
    }, [handleRef]);
    const hasCollapseCallbacks = collapsible && (onCollapse || onExpand);
    const handleResize = useCallback((size, panelId, prevSize) => {
        if (hasCollapseCallbacks && panelRef.current) {
            const isCollapsed = panelRef.current.isCollapsed();
            if (wasCollapsedRef.current !== undefined) {
                if (isCollapsed && !wasCollapsedRef.current) {
                    onCollapse?.();
                }
                else if (!isCollapsed && wasCollapsedRef.current) {
                    onExpand?.();
                }
            }
            wasCollapsedRef.current = isCollapsed;
        }
        onResize?.(size, panelId, prevSize);
    }, [hasCollapseCallbacks, onCollapse, onExpand, onResize]);
    return (_jsx(Panel, { className: composeSlotClassName(slots?.panel, className), collapsedSize: normalizePanelSize(collapsedSize), collapsible: collapsible, "data-slot": "resizable-panel", defaultSize: normalizePanelSize(defaultSize), groupResizeBehavior: groupResizeBehavior, id: id, maxSize: normalizePanelSize(maxSize), minSize: normalizePanelSize(minSize), panelRef: hasCollapseCallbacks ? mergedRef : handleRef, style: style, onResize: hasCollapseCallbacks ? handleResize : onResize, children: children }));
};
const ResizableHandle = ({ 'aria-label': ariaLabel, children, className, disabled, id, type = 'line', variant = 'primary', withIndicator, }) => {
    const { orientation } = useResizableContext();
    const slots = useMemo(() => resizableVariants({ orientation, type, variant }), [orientation, type, variant]);
    const showIndicator = children == null && (withIndicator ?? type !== 'line');
    const indicatorType = type === 'drag' ? 'drag' : 'pill';
    return (_jsxs(Separator, { "aria-label": ariaLabel ?? 'Resize handle', className: composeSlotClassName(slots?.handle, className), "data-slot": "resizable-handle", "data-type": type, "data-variant": variant, disabled: disabled, id: id, children: [children, showIndicator ? _jsx(ResizableIndicator, { type: indicatorType }) : null] }));
};
const ResizableIndicator = ({ children, className, type = 'pill', }) => {
    const { orientation, slots } = useResizableContext();
    if (children) {
        return (_jsx("span", { className: composeSlotClassName(slots?.indicator, className), "data-slot": "resizable-handle-indicator", children: children }));
    }
    if (type === 'drag') {
        const Icon = orientation === 'horizontal' ? Grip : GripHorizontal;
        return (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.indicator, className, {
                type: 'drag',
            }), "data-slot": "resizable-handle-indicator", children: _jsx(Icon, { className: "resizable__handle-indicator-icon", "data-slot": "resizable-handle-indicator-icon" }) }));
    }
    return (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.indicator, className, {
            type: 'pill',
        }), "data-slot": "resizable-handle-indicator" }));
};
export { ResizableContext, ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot, useResizableContext, };
//# sourceMappingURL=resizable.js.map