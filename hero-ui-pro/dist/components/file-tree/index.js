import { FileTreeHeader, FileTreeIndicator, FileTreeItem, FileTreeRoot, FileTreeSection, } from './file-tree';
export { fileTreeVariants } from './file-tree.styles';
export { useFileTree } from './use-file-tree';
export { useFileTreeDrag } from './use-file-tree-drag';
export const FileTree = Object.assign(FileTreeRoot, {
    Header: FileTreeHeader,
    Indicator: FileTreeIndicator,
    Item: FileTreeItem,
    Root: FileTreeRoot,
    Section: FileTreeSection,
});
export { FileTreeHeader, FileTreeIndicator, FileTreeItem, FileTreeRoot, FileTreeSection, };
export { fileTreeVariants as default } from './file-tree.styles';
//# sourceMappingURL=index.js.map