'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { Button as RACButton } from 'react-aria-components/Button';
import { useDragAndDrop } from 'react-aria-components/useDragAndDrop';
import { TableLayout, Virtualizer } from 'react-aria-components/Virtualizer';
import { Button, Checkbox, Table } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { ChevronRight, ChevronUp, Grip } from '../icons';
import { dataGridVariants } from './data-grid.styles';
const DataGridContext = createContext({});
function computePinned(columns, showSelectionCheckboxes, selectionMode, hasDnd) {
    const hasStart = columns.some((c) => c.pinned === 'start');
    const hasEnd = columns.some((c) => c.pinned === 'end');
    if (!hasStart && !hasEnd)
        return null;
    const offsets = new Map();
    let startEdgeId = null;
    let endEdgeId = null;
    let startOffset = 0;
    if (hasStart && showSelectionCheckboxes && selectionMode !== 'none')
        startOffset += 40;
    if (hasStart && hasDnd)
        startOffset += 32;
    for (const col of columns) {
        if (col.pinned === 'start') {
            offsets.set(col.id, startOffset);
            startEdgeId = col.id;
            startOffset +=
                typeof col.width === 'number' ? col.width : (col.minWidth ?? 0);
        }
    }
    let endOffset = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
        const col = columns[i];
        if (col?.pinned === 'end') {
            offsets.set(col.id, endOffset);
            endEdgeId = col.id;
            endOffset +=
                typeof col.width === 'number' ? col.width : (col.minWidth ?? 0);
        }
    }
    return {
        endEdgeId,
        hasEndPinned: hasEnd,
        hasStartPinned: hasStart,
        offsets,
        startEdgeId,
    };
}
function reorderItems(data, draggedKeys, targetKey, dropPosition, getId) {
    const dragged = [];
    const rest = [];
    for (const item of data) {
        if (draggedKeys.has(getId(item)))
            dragged.push(item);
        else
            rest.push(item);
    }
    const idx = rest.findIndex((item) => getId(item) === targetKey);
    rest.splice(dropPosition === 'before' ? idx : idx + 1, 0, ...dragged);
    return rest;
}
function buildDndHooks(data, getId, onReorder, dragAndDropHooks) {
    const { dragAndDropHooks: hooks } = useDragAndDrop({
        getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
        onReorder(event) {
            if (!onReorder)
                return;
            const dropPosition = event.target.dropPosition;
            if (dropPosition !== 'before' && dropPosition !== 'after')
                return;
            const keys = new Set(event.keys);
            const reorderedData = reorderItems(data, keys, event.target.key, dropPosition, getId);
            onReorder({
                keys,
                reorderedData,
                target: { dropPosition, key: event.target.key },
            });
        },
    });
    return dragAndDropHooks ?? (onReorder ? hooks : undefined);
}
function SortHeader({ children, sortDirection }) {
    const { slots } = useContext(DataGridContext);
    return (_jsxs("span", { "data-slot": "data-grid-sort-header", children: [children, !!sortDirection && (_jsx(ChevronUp, { className: composeSlotClassName(slots?.sortIcon, undefined), "data-direction": sortDirection, "data-slot": "data-grid-sort-icon" }))] }));
}
// ── DataGrid ──────────────────────────────────────────────────────────────────
export const DataGrid = function DataGrid(props) {
    const { allowsColumnResize = false, 'aria-label': ariaLabel, className, columns, contentClassName, data, defaultExpandedKeys, defaultSelectedKeys, defaultSortDescriptor, disabledKeys, dragAndDropHooks: dragAndDropHooksProp, expandedKeys, getChildren, getRowId, headingHeight = 36, isLoadingMore = false, loadMoreContent, onColumnResize, onColumnResizeEnd, onExpandedChange, onLoadMore, onReorder, onRowAction, onSelectionChange, onSortChange, renderEmptyState, rowHeight = 42, scrollContainerClassName, selectedKeys, selectionBehavior = 'toggle', selectionMode = 'none', showSelectionCheckboxes = false, sortDescriptor: sortDescriptorProp, treeColumn, treeIndent = 20, variant = 'primary', verticalAlign = 'middle', virtualized = false, } = props;
    const slots = useMemo(() => dataGridVariants({}), []);
    const [internalSortDescriptor, setInternalSortDescriptor] = useState(defaultSortDescriptor);
    const isControlledSort = sortDescriptorProp !== undefined;
    const activeSortDescriptor = isControlledSort
        ? sortDescriptorProp
        : internalSortDescriptor;
    const sortedData = useMemo(() => {
        if (isControlledSort || !activeSortDescriptor?.column)
            return data;
        const col = columns.find((c) => c.id === activeSortDescriptor.column);
        if (!col)
            return data;
        return [...data].sort((a, b) => {
            let result;
            if (col.sortFn) {
                result = col.sortFn(a, b);
            }
            else {
                const key = col.accessorKey;
                if (!key)
                    return 0;
                const valA = a[key];
                const valB = b[key];
                result =
                    typeof valA === 'number' && typeof valB === 'number'
                        ? valA - valB
                        : String(valA ?? '').localeCompare(String(valB ?? ''));
            }
            return activeSortDescriptor.direction === 'descending' ? -result : result;
        });
    }, [data, activeSortDescriptor, columns, isControlledSort]);
    const hasSort = columns.some((c) => c.allowsSorting);
    const hasDnd = !!(onReorder || dragAndDropHooksProp);
    const pinnedInfo = useMemo(() => computePinned(columns, showSelectionCheckboxes, selectionMode, hasDnd), [columns, showSelectionCheckboxes, selectionMode, hasDnd]);
    const tableRef = useRef(null);
    // Detach shadow classes for sticky columns on scroll
    useEffect(() => {
        if (!pinnedInfo)
            return;
        const el = tableRef.current;
        if (!el)
            return;
        const scrollContainer = el.querySelector('.table__resizable-container') ??
            el.querySelector('[data-slot="table-scroll-container"]');
        if (!scrollContainer)
            return;
        const onScroll = () => {
            const { clientWidth, scrollLeft, scrollWidth } = scrollContainer;
            const left = Math.abs(scrollLeft);
            if (pinnedInfo.hasStartPinned)
                el.toggleAttribute('data-pinned-start-detached', left > 1);
            if (pinnedInfo.hasEndPinned)
                el.toggleAttribute('data-pinned-end-detached', scrollWidth - clientWidth - left > 1);
        };
        onScroll();
        scrollContainer.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(onScroll);
        ro.observe(scrollContainer);
        return () => {
            scrollContainer.removeEventListener('scroll', onScroll);
            ro.disconnect();
        };
    }, [pinnedInfo]);
    // Build DnD hooks
    const resolvedDndHooks = buildDndHooks(sortedData, getRowId, onReorder, dragAndDropHooksProp);
    // Determine tree column id
    const isTreeTable = typeof getChildren === 'function';
    const treeColumnId = useMemo(() => {
        if (!isTreeTable)
            return undefined;
        if (treeColumn)
            return treeColumn;
        const rowHeaderCol = columns.find((c) => c.isRowHeader);
        return rowHeaderCol?.id ?? columns[0]?.id;
    }, [isTreeTable, treeColumn, columns]);
    // Row renderer
    const renderRow = (item) => {
        const rowId = getRowId(item);
        const children = isTreeTable ? (getChildren?.(item) ?? []) : [];
        const hasChildItems = isTreeTable && children.length > 0;
        return (_jsxs(Table.Row, { hasChildItems: hasChildItems || undefined, id: rowId, children: [showSelectionCheckboxes && selectionMode !== 'none' && (_jsx(Table.Cell, { className: composeSlotClassName(slots?.selectionCell, undefined), "data-pinned": pinnedInfo?.hasStartPinned ? 'start' : undefined, style: pinnedInfo?.hasStartPinned ? { insetInlineStart: 0 } : undefined, children: _jsx(Checkbox, { "aria-label": "Select row", slot: "selection", variant: "secondary", children: _jsx(Checkbox.Control, { children: _jsx(Checkbox.Indicator, {}) }) }) })), hasDnd && (_jsx(Table.Cell, { className: composeSlotClassName(slots?.dragHandleCell, undefined), "data-pinned": pinnedInfo?.hasStartPinned ? 'start' : undefined, style: pinnedInfo?.hasStartPinned
                        ? {
                            insetInlineStart: showSelectionCheckboxes && selectionMode !== 'none'
                                ? 40
                                : 0,
                        }
                        : undefined, children: _jsx(RACButton, { className: composeSlotClassName(slots?.dragHandle, undefined), slot: "drag", children: _jsx(Grip, {}) }) })), columns.map((col) => {
                    let cellContent;
                    if (col.cell) {
                        cellContent = col.cell(item, col);
                    }
                    else if (col.accessorKey) {
                        const val = item[col.accessorKey];
                        cellContent = val == null ? '' : String(val);
                    }
                    else {
                        cellContent = null;
                    }
                    const isPinned = !!col.pinned && !!pinnedInfo;
                    const offset = pinnedInfo?.offsets.get(col.id);
                    const isEdge = col.id === pinnedInfo?.startEdgeId ||
                        col.id === pinnedInfo?.endEdgeId;
                    const treeCell = isTreeTable && col.id === treeColumnId
                        ? ({ hasChildItems: hasChild, isDisabled, isExpanded, level, }) => (_jsxs("span", { className: composeSlotClassName(slots?.treeCell, undefined), "data-slot": "data-grid-tree-cell", style: treeIndent && level > 1
                                ? { paddingInlineStart: (level - 1) * treeIndent }
                                : undefined, children: [hasChild ? (_jsx(Button, { isIconOnly: true, "aria-label": isExpanded ? 'Collapse row' : 'Expand row', className: composeSlotClassName(slots?.treeToggle, undefined), isDisabled: isDisabled, size: "sm", slot: "chevron", variant: "ghost", children: _jsx(ChevronRight, { "aria-hidden": true, className: composeSlotClassName(slots?.treeToggleIcon, undefined), "data-expanded": isExpanded || undefined }) })) : (_jsx("span", { "aria-hidden": true, className: composeSlotClassName(slots?.treeToggleSpacer, undefined), "data-slot": "data-grid-tree-toggle-spacer" })), _jsx("span", { children: cellContent })] }))
                        : undefined;
                    return (_jsx(Table.Cell, { className: col.cellClassName, "data-align": col.align, "data-pinned": col.pinned ?? undefined, "data-pinned-edge": isEdge || undefined, style: isPinned
                            ? col.pinned === 'start'
                                ? { insetInlineStart: offset }
                                : { insetInlineEnd: offset }
                            : undefined, children: treeCell ?? cellContent }, col.id));
                }), hasChildItems ? (_jsx(Table.Collection, { items: children, children: (child) => renderRow(child) })) : null] }, rowId));
    };
    const tableContent = (_jsxs(Table.Content, { "aria-label": ariaLabel, className: contentClassName, defaultExpandedKeys: isTreeTable ? defaultExpandedKeys : undefined, defaultSelectedKeys: defaultSelectedKeys, disabledKeys: disabledKeys, dragAndDropHooks: resolvedDndHooks, expandedKeys: isTreeTable ? expandedKeys : undefined, selectedKeys: selectedKeys, selectionBehavior: selectionBehavior, selectionMode: selectionMode === 'none' ? undefined : selectionMode, sortDescriptor: activeSortDescriptor, treeColumn: isTreeTable ? treeColumnId : undefined, onExpandedChange: isTreeTable ? onExpandedChange : undefined, onRowAction: onRowAction, onSelectionChange: onSelectionChange, onSortChange: hasSort
            ? (descriptor) => {
                if (!isControlledSort)
                    setInternalSortDescriptor(descriptor);
                onSortChange?.(descriptor);
            }
            : undefined, children: [_jsxs(Table.Header, { className: virtualized ? 'h-full w-full' : undefined, children: [showSelectionCheckboxes && selectionMode !== 'none' && (_jsx(Table.Column, { className: composeSlotClassName(slots?.selectionColumn, undefined), "data-pinned": pinnedInfo?.hasStartPinned ? 'start' : undefined, maxWidth: 40, minWidth: 40, style: pinnedInfo?.hasStartPinned ? { insetInlineStart: 0 } : undefined, width: 40, children: selectionMode === 'multiple' ? (_jsx(Checkbox, { "aria-label": "Select all", slot: "selection", children: _jsx(Checkbox.Control, { children: _jsx(Checkbox.Indicator, {}) }) })) : null })), hasDnd && (_jsx(Table.Column, { className: composeSlotClassName(slots?.dragHandleColumn, undefined), "data-pinned": pinnedInfo?.hasStartPinned ? 'start' : undefined, maxWidth: 32, minWidth: 32, style: pinnedInfo?.hasStartPinned
                            ? {
                                insetInlineStart: showSelectionCheckboxes && selectionMode !== 'none'
                                    ? 40
                                    : 0,
                            }
                            : undefined, width: 32 })), columns.map((col) => {
                        const staticHeader = typeof col.header === 'function' ? null : col.header;
                        const renderHeader = typeof col.header === 'function' ? col.header : null;
                        const resizer = allowsColumnResize && col.allowsResizing !== false ? (_jsx(Table.ColumnResizer, {})) : null;
                        const hasDynamicHeader = col.allowsSorting || renderHeader;
                        const isPinned = !!col.pinned && !!pinnedInfo;
                        const offset = pinnedInfo?.offsets.get(col.id);
                        const isEdge = col.id === pinnedInfo?.startEdgeId ||
                            col.id === pinnedInfo?.endEdgeId;
                        return (_jsx(Table.Column, { allowsSorting: col.allowsSorting, className: col.headerClassName, "data-align": col.align, "data-pinned": col.pinned ?? undefined, "data-pinned-edge": isEdge || undefined, id: col.id, isRowHeader: col.isRowHeader, maxWidth: col.maxWidth, minWidth: col.minWidth, style: isPinned
                                ? col.pinned === 'start'
                                    ? { insetInlineStart: offset }
                                    : { insetInlineEnd: offset }
                                : undefined, width: col.width, children: hasDynamicHeader ? (({ sortDirection }) => {
                                const content = renderHeader
                                    ? renderHeader({ sortDirection })
                                    : staticHeader;
                                return (_jsxs(_Fragment, { children: [col.allowsSorting ? (_jsx(SortHeader, { sortDirection: sortDirection, children: content })) : (content), resizer] }));
                            }) : (_jsxs(_Fragment, { children: [staticHeader, resizer] })) }, col.id));
                    })] }), _jsxs(Table.Body, { renderEmptyState: renderEmptyState
                    ? () => (_jsx("div", { className: composeSlotClassName(slots?.emptyState, undefined), "data-slot": "data-grid-empty-state", children: renderEmptyState() }))
                    : undefined, children: [_jsx(Table.Collection, { dependencies: [
                            columns,
                            showSelectionCheckboxes,
                            selectionMode,
                            hasDnd,
                            isTreeTable,
                            treeColumnId,
                            treeIndent,
                        ], items: sortedData, children: (item) => renderRow(item) }), !!onLoadMore && (_jsx(Table.LoadMore, { isLoading: isLoadingMore, onLoadMore: onLoadMore, children: _jsx(Table.LoadMoreContent, { children: loadMoreContent }) }))] })] }));
    const withResizing = allowsColumnResize ? (_jsx(Table.ResizableContainer, { onResize: onColumnResize, onResizeEnd: onColumnResizeEnd, children: tableContent })) : (tableContent);
    const tableElement = (_jsx(Table, { ref: tableRef, className: composeSlotClassName(slots?.base, className), "data-slot": "data-grid", "data-vertical-align": verticalAlign, variant: variant, children: _jsx(Table.ScrollContainer, { className: scrollContainerClassName, children: withResizing }) }));
    return (_jsx(DataGridContext, { value: { slots }, children: virtualized ? (_jsx(Virtualizer, { layout: TableLayout, layoutOptions: { headingHeight, rowHeight }, children: tableElement })) : (tableElement) }));
};
DataGrid.displayName = 'HeroUI.DataGrid';
//# sourceMappingURL=data-grid.js.map