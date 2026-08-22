'use client';
import { useCallback, useMemo } from 'react';
function flattenLeaves(items, isLeaf) {
    const result = [];
    for (const item of items) {
        if (isLeaf(item))
            result.push(item);
        if (item.children)
            result.push(...flattenLeaves(item.children, isLeaf));
    }
    return result;
}
function collectExpandableKeys(items) {
    const keys = [];
    for (const item of items) {
        if (item.children && item.children.length > 0) {
            keys.push(item.id);
            keys.push(...collectExpandableKeys(item.children));
        }
    }
    return keys;
}
function filterTree(items, predicate, isLeaf) {
    return items
        .map((item) => {
        if (isLeaf(item))
            return predicate(item) ? item : null;
        if (item.children) {
            const filtered = filterTree(item.children, predicate, isLeaf);
            if (filtered.length > 0)
                return { ...item, children: filtered };
        }
        return null;
    })
        .filter((x) => x !== null);
}
const defaultIsLeaf = (node) => !node.children || node.children.length === 0;
export function useFileTree({ isLeaf = defaultIsLeaf, items, }) {
    const leaves = useMemo(() => flattenLeaves(items, isLeaf), [items, isLeaf]);
    return {
        expandableKeys: useMemo(() => collectExpandableKeys(items), [items]),
        filterTree: useCallback((predicate) => filterTree(items, predicate, isLeaf), [items, isLeaf]),
        leaves,
    };
}
//# sourceMappingURL=use-file-tree.js.map