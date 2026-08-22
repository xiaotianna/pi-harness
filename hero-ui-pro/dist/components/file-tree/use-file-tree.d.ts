interface TreeNode {
    id: string;
    children?: TreeNode[];
}
interface UseFileTreeOptions<T extends TreeNode> {
    /** The tree data. */
    items: T[];
    /** Return true for leaf nodes. Defaults to checking `!children || children.length === 0`. */
    isLeaf?: (node: T) => boolean;
}
interface UseFileTreeReturn<T extends TreeNode> {
    /** All expandable (branch) node keys — useful for `defaultExpandedKeys`. */
    expandableKeys: string[];
    /** Filter the tree by a leaf predicate. Prunes empty branches automatically. */
    filterTree: (predicate: (node: T) => boolean) => T[];
    /** All leaf nodes flattened from the tree. */
    leaves: T[];
}
export declare function useFileTree<T extends TreeNode>({ isLeaf, items, }: UseFileTreeOptions<T>): UseFileTreeReturn<T>;
export type { TreeNode, UseFileTreeOptions, UseFileTreeReturn };
//# sourceMappingURL=use-file-tree.d.ts.map