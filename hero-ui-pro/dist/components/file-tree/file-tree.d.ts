import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Tree as TreePrimitive, TreeHeader as TreeHeaderPrimitive, TreeItem as TreeItemPrimitive, TreeSection as TreeSectionPrimitive } from 'react-aria-components/Tree';
import { ChevronRight } from '../icons';
import type { FileTreeVariants } from './file-tree.styles';
export interface FileTreeRootProps<T extends object> extends ComponentPropsWithRef<typeof TreePrimitive<T>> {
    /** Whether to show indent guide lines. `true` = always, `false` = never, `"hover"` = on tree hover only. @default true */
    showGuideLines?: boolean | 'hover';
    /** Whether to disable expand/collapse animations. Also respects the user's reduced-motion preference. @default false */
    reduceMotion?: boolean;
    /** Size variant. @default "md" */
    size?: FileTreeVariants['size'];
}
export interface FileTreeIndicatorProps extends ComponentPropsWithRef<typeof ChevronRight> {
    className?: string;
}
export interface FileTreeItemRenderProps {
    isExpanded: boolean;
    hasChildItems: boolean;
    allowsDragging: boolean;
}
export interface FileTreeItemProps extends Partial<ComponentPropsWithRef<typeof TreeItemPrimitive>> {
    /** Icon rendered before the label. Accepts a ReactNode or a function receiving `{ isExpanded, hasChildItems, allowsDragging }`. */
    icon?: ReactNode | ((props: FileTreeItemRenderProps) => ReactNode);
    /** Drag handle icon shown when dragging is allowed. Pass `false` to hide, or a ReactNode to replace the default grip icon. @default <GripVertical /> */
    dragIcon?: ReactNode | false;
    /** Label content rendered as the item text. */
    title: ReactNode;
}
export interface FileTreeSectionProps extends ComponentPropsWithRef<typeof TreeSectionPrimitive> {
}
export interface FileTreeHeaderProps extends ComponentPropsWithRef<typeof TreeHeaderPrimitive> {
}
export declare const FileTreeRoot: <T extends object>({ children, className, reduceMotion, showGuideLines, size, ...props }: FileTreeRootProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const FileTreeIndicator: ({ children, className, ...props }: FileTreeIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const FileTreeItem: ({ children, className, dragIcon, icon, render: renderProp, title, ...props }: FileTreeItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const FileTreeSection: ({ children, className, ...props }: FileTreeSectionProps) => import("react/jsx-runtime").JSX.Element;
export declare const FileTreeHeader: ({ children, className, ...props }: FileTreeHeaderProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=file-tree.d.ts.map