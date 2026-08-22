import type { Key } from 'react';
import { useDragAndDrop } from 'react-aria-components/useDragAndDrop';
/**
 * Minimal interface matching the subset of `useTreeData` return value
 * needed for drag-and-drop operations.
 */
export interface TreeDataManager {
    getItem(key: Key): {
        children?: unknown[] | null;
    } | null | undefined;
    move(key: Key, toParentKey: Key | null, index: number): void;
    moveAfter(key: Key, keys: Iterable<Key>): void;
    moveBefore(key: Key, keys: Iterable<Key>): void;
}
export interface UseFileTreeDragOptions {
    /** The mutable tree data object returned by `useTreeData` from `react-aria-components`. */
    tree: TreeDataManager;
    /** Custom drag data per item. By default each key is serialized as `{ "text/plain": String(key) }`. */
    getItems?: Parameters<typeof useDragAndDrop>[0]['getItems'];
    /** Called after items are successfully moved within the tree. */
    onMove?: (keys: Set<Key>, target: {
        key: Key;
        dropPosition: string;
    }) => void;
}
export declare function useFileTreeDrag({ getItems, onMove: onMoveCallback, tree, }: UseFileTreeDragOptions): {
    dragAndDropHooks: import("react-aria-components").DragAndDropHooks<unknown>;
};
//# sourceMappingURL=use-file-tree-drag.d.ts.map