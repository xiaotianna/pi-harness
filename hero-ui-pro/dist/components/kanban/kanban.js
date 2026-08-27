'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import { DropIndicator as DropIndicatorPrimitive } from 'react-aria-components/useDragAndDrop';
import { domMax, LazyMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { ScrollShadow } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { kanbanVariants } from './kanban.styles';
const KanbanContext = createContext({});
const KanbanRoot = ({ children, className, size, ...props }) => {
    const slots = useMemo(() => kanbanVariants({ size }), [size]);
    return (_jsx(KanbanContext.Provider, { value: { slots }, children: _jsx(LazyMotion, { features: domMax, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "kanban", ...props, children: children }) }) }));
};
const KanbanColumn = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("section", { className: composeSlotClassName(slots?.column, className), "data-slot": "kanban-column", ...props, children: children }));
};
const KanbanColumnBody = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.columnBody, className), "data-slot": "kanban-column-body", ...props, children: children }));
};
const KanbanColumnHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("header", { className: composeSlotClassName(slots?.columnHeader, className), "data-slot": "kanban-column-header", ...props, children: children }));
};
const KanbanColumnActions = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.columnActions, className), "data-slot": "kanban-column-actions", ...props, children: children }));
};
const KanbanColumnIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.columnIndicator, className), "data-slot": "kanban-column-indicator", ...props, children: children }));
};
const KanbanColumnTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("h3", { className: composeSlotClassName(slots?.columnTitle, className), "data-slot": "kanban-column-title", ...props, children: children }));
};
const KanbanColumnCount = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.columnCount, className), "data-slot": "kanban-column-count", ...props, children: children }));
};
const SPRING_TRANSITION = {
    bounce: 0.15,
    duration: 0.35,
    type: 'spring',
};
const KanbanCardList = ({ children, className, renderEmptyState, selectionMode = 'none', ...props }) => {
    const { slots } = useContext(KanbanContext);
    const emptyState = renderEmptyState
        ? (...args) => (_jsx("div", { className: slots?.empty(), "data-slot": "kanban-empty", children: renderEmptyState(...args) }))
        : undefined;
    return (_jsx(GridList, { className: composeTwRenderProps(className, slots?.cardList()), "data-slot": "kanban-card-list", renderEmptyState: emptyState, selectionMode: selectionMode, ...props, children: children }));
};
const KanbanCard = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx(GridListItem, { className: composeTwRenderProps(className, slots?.card()), "data-slot": "kanban-card", ...props, children: (renderProps) => (_jsx(m.div, { layout: true, className: slots?.cardContent(), "data-slot": "kanban-card-content", transition: { layout: SPRING_TRANSITION }, children: typeof children === 'function' ? children(renderProps) : children })) }));
};
const KanbanDropIndicator = ({ className, height, style, ...props }) => {
    const { slots } = useContext(KanbanContext);
    const baseStyle = typeof style === 'function' ? undefined : style;
    const resolvedStyle = height && height > 0
        ? {
            '--kanban-drop-height': `${height}px`,
            ...baseStyle,
        }
        : baseStyle;
    return (_jsx(DropIndicatorPrimitive, { className: composeTwRenderProps(className, slots?.dropIndicator()), "data-slot": "kanban-drop-indicator", style: resolvedStyle, ...props }));
};
const KanbanScrollShadow = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx(ScrollShadow, { className: composeSlotClassName(slots?.scrollShadow, className), "data-slot": "kanban-scroll-shadow", ...props, children: children }));
};
const KanbanDragHandle = ({ children, className, ...props }) => {
    const { slots } = useContext(KanbanContext);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.dragHandle()), "data-slot": "kanban-drag-handle", slot: "drag", ...props, children: children ?? '≡' }));
};
export { KanbanCard, KanbanCardList, KanbanColumn, KanbanColumnActions, KanbanColumnBody, KanbanColumnCount, KanbanColumnHeader, KanbanColumnIndicator, KanbanColumnTitle, KanbanDragHandle, KanbanDropIndicator, KanbanRoot, KanbanScrollShadow, };
