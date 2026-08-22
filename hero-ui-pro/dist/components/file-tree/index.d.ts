import { FileTreeHeader, FileTreeIndicator, FileTreeItem, FileTreeRoot, FileTreeSection } from './file-tree';
export { fileTreeVariants } from './file-tree.styles';
export { useFileTree } from './use-file-tree';
export { useFileTreeDrag } from './use-file-tree-drag';
export declare const FileTree: (<T extends object>({ children, className, reduceMotion, showGuideLines, size, ...props }: import("./file-tree").FileTreeRootProps<T>) => import("react/jsx-runtime").JSX.Element) & {
    Header: ({ children, className, ...props }: import("./file-tree").FileTreeHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Indicator: ({ children, className, ...props }: import("./file-tree").FileTreeIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Item: ({ children, className, dragIcon, icon, render: renderProp, title, ...props }: import("./file-tree").FileTreeItemProps) => import("react/jsx-runtime").JSX.Element;
    Root: <T extends object>({ children, className, reduceMotion, showGuideLines, size, ...props }: import("./file-tree").FileTreeRootProps<T>) => import("react/jsx-runtime").JSX.Element;
    Section: ({ children, className, ...props }: import("./file-tree").FileTreeSectionProps) => import("react/jsx-runtime").JSX.Element;
};
export { FileTreeHeader, FileTreeIndicator, FileTreeItem, FileTreeRoot, FileTreeSection, };
export type { FileTreeHeaderProps, FileTreeIndicatorProps, FileTreeItemProps, FileTreeItemRenderProps, FileTreeRootProps as FileTreeProps, FileTreeRootProps, FileTreeSectionProps, } from './file-tree';
export type { FileTreeVariants } from './file-tree.styles';
export { fileTreeVariants as default } from './file-tree.styles';
export type { TreeNode, UseFileTreeOptions, UseFileTreeReturn, } from './use-file-tree';
export type { TreeDataManager, UseFileTreeDragOptions, } from './use-file-tree-drag';
//# sourceMappingURL=index.d.ts.map