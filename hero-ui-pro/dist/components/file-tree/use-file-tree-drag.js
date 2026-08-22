'use client';
import { useDragAndDrop } from 'react-aria-components/useDragAndDrop';
export function useFileTreeDrag({ getItems, onMove: onMoveCallback, tree, }) {
    const { dragAndDropHooks } = useDragAndDrop({
        getItems: getItems ??
            ((keys) => [...keys].map((key) => ({ 'text/plain': String(key) }))),
        onMove(event) {
            if (event.target.dropPosition === 'before') {
                tree.moveBefore(event.target.key, event.keys);
            }
            else if (event.target.dropPosition === 'after') {
                tree.moveAfter(event.target.key, event.keys);
            }
            else if (event.target.dropPosition === 'on') {
                const parent = tree.getItem(event.target.key);
                if (parent) {
                    const startIndex = parent.children ? parent.children.length : 0;
                    const keys = [...event.keys];
                    for (let i = 0; i < keys.length; i++) {
                        tree.move(keys[i], event.target.key, startIndex + i);
                    }
                }
            }
            onMoveCallback?.(event.keys, event.target);
        },
    });
    return { dragAndDropHooks };
}
//# sourceMappingURL=use-file-tree-drag.js.map