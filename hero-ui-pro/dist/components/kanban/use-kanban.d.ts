import { useDragAndDrop } from 'react-aria-components/useDragAndDrop';
import type { ListData } from 'react-aria-components/useListData';
interface UseKanbanOptions<T extends object> {
    /** Items to populate the board with. */
    initialItems: T[];
    /** Return the column identifier for a given item. */
    getColumn: (item: T) => string;
    /** Return a copy of the item assigned to a new column. */
    setColumn: (item: T, column: string) => T;
    /** Custom MIME-like drag type used to transfer item keys between columns. @default "kanban-item-id" */
    dragType?: string;
    /** Derive a unique key from each item. Defaults to `item.id`. */
    getKey?: (item: T) => string | number;
}
interface UseKanbanReturn<T extends object> {
    /** The underlying ListData — use for advanced operations. */
    list: ListData<T>;
    /** Add an item to the board. It appears in the column determined by `getColumn`. */
    addItem: (item: T) => void;
    /** Remove an item by its key. */
    removeItem: (key: string | number) => void;
    /** Move an item to a different column by key. */
    moveItem: (key: string | number, toColumn: string) => void;
    /** Update an item by key with a partial or full replacement. */
    updateItem: (key: string | number, item: T) => void;
    getColumn: (item: T) => string;
    setColumn: (item: T, column: string) => T;
    dragType: string;
}
declare function useKanban<T extends object>(options: UseKanbanOptions<T>): UseKanbanReturn<T>;
type UseDragAndDropOptions = Parameters<typeof useDragAndDrop>[0];
type RenderDropIndicatorFn = NonNullable<UseDragAndDropOptions['renderDropIndicator']>;
type DropTarget = Parameters<RenderDropIndicatorFn>[0];
interface UseKanbanColumnOptions {
    /** Override the default drop indicator rendering. */
    renderDropIndicator?: UseDragAndDropOptions['renderDropIndicator'];
}
interface UseKanbanColumnReturn<T extends object> {
    /** Items that belong to this column. */
    items: T[];
    /** Drag-and-drop hooks to pass to `Kanban.CardList`. */
    dragAndDropHooks: ReturnType<typeof useDragAndDrop>['dragAndDropHooks'];
}
declare function useKanbanColumn<T extends object>(kanban: UseKanbanReturn<T>, column: string, options?: UseKanbanColumnOptions): UseKanbanColumnReturn<T>;
interface UseKanbanCardPlaceholderOptions {
    /** Render function that receives the drop target. Return your custom DropIndicator. */
    renderIndicator: (target: DropTarget) => React.JSX.Element;
}
interface UseKanbanCardPlaceholderReturn {
    /** Pass to `useKanbanColumn` options as `renderDropIndicator`. */
    renderDropIndicator: UseDragAndDropOptions['renderDropIndicator'];
}
declare function useKanbanCardPlaceholder(options: UseKanbanCardPlaceholderOptions): UseKanbanCardPlaceholderReturn;
export { useKanban, useKanbanCardPlaceholder, useKanbanColumn };
export type { UseKanbanCardPlaceholderOptions, UseKanbanCardPlaceholderReturn, UseKanbanColumnOptions, UseKanbanColumnReturn, UseKanbanOptions, UseKanbanReturn, };
//# sourceMappingURL=use-kanban.d.ts.map