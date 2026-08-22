'use client';
import { useCallback, useEffect, useMemo } from 'react';
import { isTextDropItem, useDragAndDrop, } from 'react-aria-components/useDragAndDrop';
import { useListData } from 'react-aria-components/useListData';
function useKanban(options) {
    const { dragType = 'kanban-item-id', getColumn, getKey, initialItems, setColumn, } = options;
    const list = useListData({ getKey, initialItems });
    return {
        addItem: (item) => {
            list.append(item);
        },
        dragType,
        getColumn,
        list,
        moveItem: (key, toColumn) => {
            const item = list.getItem(key);
            if (item) {
                list.update(key, setColumn(item, toColumn));
            }
        },
        removeItem: (key) => {
            list.remove(key);
        },
        setColumn,
        updateItem: (key, item) => {
            list.update(key, item);
        },
    };
}
function useKanbanColumn(kanban, column, options) {
    const { dragType, getColumn, list, setColumn } = kanban;
    const items = useMemo(() => list.items.filter((item) => getColumn(item) === column), [list.items, getColumn, column]);
    const { dragAndDropHooks } = useDragAndDrop({
        acceptedDragTypes: [dragType],
        getDropOperation: () => 'move',
        getItems: (keys) => [...keys].map((key) => ({
            [dragType]: String(key),
            'text/plain': String(key),
        })),
        async onInsert(e) {
            const keys = await Promise.all(e.items.filter(isTextDropItem).map((item) => item.getText(dragType)));
            for (const key of keys) {
                const item = list.getItem(key);
                if (item) {
                    list.update(key, setColumn(item, column));
                }
            }
            if (e.target.dropPosition === 'before') {
                list.moveBefore(e.target.key, items);
            }
            else if (e.target.dropPosition === 'after') {
                list.moveAfter(e.target.key, items);
            }
        },
        onReorder(e) {
            if (e.target.dropPosition === 'before') {
                list.moveBefore(e.target.key, e.keys);
            }
            else if (e.target.dropPosition === 'after') {
                list.moveAfter(e.target.key, e.keys);
            }
        },
        async onRootDrop(e) {
            const keys = await Promise.all(e.items.filter(isTextDropItem).map((item) => item.getText(dragType)));
            for (const key of keys) {
                const item = list.getItem(key);
                if (item) {
                    list.update(key, setColumn(item, column));
                }
            }
        },
        renderDropIndicator: options?.renderDropIndicator,
    });
    return { dragAndDropHooks, items };
}
function useKanbanCardPlaceholder(options) {
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const dragging = document.querySelector('[data-dragging]');
            if (dragging) {
                const height = dragging.getBoundingClientRect().height;
                if (height > 0) {
                    document.documentElement.style.setProperty('--kanban-drop-height', `${height}px`);
                }
            }
            else {
                document.documentElement.style.removeProperty('--kanban-drop-height');
            }
        });
        observer.observe(document.body, {
            attributeFilter: ['data-dragging'],
            attributes: true,
            subtree: true,
        });
        return () => {
            observer.disconnect();
            document.documentElement.style.removeProperty('--kanban-drop-height');
        };
    }, []);
    return {
        renderDropIndicator: useCallback((target) => options.renderIndicator(target), [options]),
    };
}
export { useKanban, useKanbanCardPlaceholder, useKanbanColumn };
//# sourceMappingURL=use-kanban.js.map