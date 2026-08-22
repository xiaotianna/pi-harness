import type { ComponentProps } from 'react';
import { ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle } from './list-view';
export { listViewVariants } from './list-view.styles';
declare const ListView: (<T extends object>({ children, className, renderEmptyState, rowHeight, selectionMode, variant, virtualized, ...props }: import("./list-view").ListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element) & {
    Description: ({ children, className, ...props }: import("./list-view").ListViewDescriptionProps) => import("react/jsx-runtime").JSX.Element;
    Item: <T extends object>({ children, className, ...props }: import("./list-view").ListViewItemProps<T>) => import("react/jsx-runtime").JSX.Element;
    ItemAction: ({ children, className, ...props }: import("./list-view").ListViewItemActionProps) => import("react/jsx-runtime").JSX.Element;
    ItemContent: ({ children, className, ...props }: import("./list-view").ListViewItemContentProps) => import("react/jsx-runtime").JSX.Element;
    Root: <T extends object>({ children, className, renderEmptyState, rowHeight, selectionMode, variant, virtualized, ...props }: import("./list-view").ListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./list-view").ListViewTitleProps) => import("react/jsx-runtime").JSX.Element;
};
export { ListView, ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle, };
export type { ListViewDescriptionProps, ListViewItemActionProps, ListViewItemContentProps, ListViewItemProps, ListViewRootProps as ListViewProps, ListViewRootProps, ListViewTitleProps, } from './list-view';
export type { ListViewVariants } from './list-view.styles';
export type ListView = {
    DescriptionProps: ComponentProps<typeof ListViewDescription>;
    ItemActionProps: ComponentProps<typeof ListViewItemAction>;
    ItemContentProps: ComponentProps<typeof ListViewItemContent>;
    ItemProps: ComponentProps<typeof ListViewItem>;
    Props: ComponentProps<typeof ListViewRoot>;
    RootProps: ComponentProps<typeof ListViewRoot>;
    TitleProps: ComponentProps<typeof ListViewTitle>;
};
//# sourceMappingURL=index.d.ts.map