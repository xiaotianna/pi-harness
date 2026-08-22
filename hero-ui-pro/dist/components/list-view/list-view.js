'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useRef } from 'react';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import { ListLayout, Virtualizer } from 'react-aria-components/Virtualizer';
import { Checkbox } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { listViewVariants } from './list-view.styles';
const ListViewContext = createContext({});
const ListViewRoot = ({ children, className, renderEmptyState, rowHeight = 48, selectionMode, variant = 'primary', virtualized = false, ...props }) => {
    const slots = useMemo(() => listViewVariants({ variant }), [variant]);
    const ref = useRef(null);
    const emptyStateRenderer = renderEmptyState
        ? () => (_jsx("div", { className: composeSlotClassName(slots?.emptyState, undefined), "data-slot": "list-view-empty-state", children: renderEmptyState() }))
        : undefined;
    const list = (_jsx(GridList, { ref: ref, className: composeTwRenderProps(className, slots?.base()), "data-slot": "list-view", "data-virtualized": virtualized || undefined, renderEmptyState: emptyStateRenderer, selectionMode: selectionMode === 'none' ? undefined : selectionMode, ...props, children: children }));
    return (_jsx(ListViewContext.Provider, { value: { selectionMode, slots, variant }, children: virtualized ? (_jsx(Virtualizer, { layout: ListLayout, layoutOptions: { estimatedRowHeight: rowHeight }, children: list })) : (list) }));
};
const ListViewItem = ({ children, className, ...props }) => {
    const { selectionMode, slots, variant } = useContext(ListViewContext);
    const checkboxVariant = variant === 'secondary' ? 'primary' : 'secondary';
    return (_jsx(GridListItem, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "list-view-item", ...props, children: ({ selectionBehavior, selectionMode: itemSelectionMode }) => (_jsxs(_Fragment, { children: [selectionMode !== 'none' &&
                    itemSelectionMode !== 'none' &&
                    selectionBehavior === 'toggle' && (_jsx("div", { className: composeSlotClassName(slots?.selectionCell, undefined), "data-slot": "list-view-selection-cell", children: _jsx(Checkbox, { "aria-label": "Select row", slot: "selection", variant: checkboxVariant, children: _jsx(Checkbox.Control, { children: _jsx(Checkbox.Indicator, {}) }) }) })), children] })) }));
};
const ListViewItemContent = ({ children, className, ...props }) => {
    const { slots } = useContext(ListViewContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.itemContent, className), "data-slot": "list-view-item-content", ...props, children: children }));
};
const ListViewTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(ListViewContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.title, className), "data-slot": "list-view-title", ...props, children: children }));
};
const ListViewDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(ListViewContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.description, className), "data-slot": "list-view-description", ...props, children: children }));
};
const ListViewItemAction = ({ children, className, ...props }) => {
    const { slots } = useContext(ListViewContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.itemAction, className), "data-slot": "list-view-item-action", ...props, children: children }));
};
export { ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle, };
//# sourceMappingURL=list-view.js.map