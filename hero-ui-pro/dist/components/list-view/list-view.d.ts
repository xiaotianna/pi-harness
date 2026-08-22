import type { ComponentPropsWithRef, ReactNode } from 'react';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import type { ListViewVariants } from './list-view.styles';
interface ListViewRootProps<T extends object> extends Omit<ComponentPropsWithRef<typeof GridList<T>>, 'layout' | 'orientation'> {
    /** Visual variant. @default "primary" */
    variant?: ListViewVariants['variant'];
    /** Enable row virtualization for large datasets. @default false */
    virtualized?: boolean;
    /** Estimated row height in pixels for virtualization. @default 48 */
    rowHeight?: number;
    /** Render function for the empty state. */
    renderEmptyState?: () => ReactNode;
}
declare const ListViewRoot: <T extends object>({ children, className, renderEmptyState, rowHeight, selectionMode, variant, virtualized, ...props }: ListViewRootProps<T>) => import("react/jsx-runtime").JSX.Element;
interface ListViewItemProps<T extends object> extends Omit<ComponentPropsWithRef<typeof GridListItem<T>>, 'children'> {
    children: ReactNode;
}
declare const ListViewItem: <T extends object>({ children, className, ...props }: ListViewItemProps<T>) => import("react/jsx-runtime").JSX.Element;
interface ListViewItemContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ListViewItemContent: ({ children, className, ...props }: ListViewItemContentProps) => import("react/jsx-runtime").JSX.Element;
interface ListViewTitleProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const ListViewTitle: ({ children, className, ...props }: ListViewTitleProps) => import("react/jsx-runtime").JSX.Element;
interface ListViewDescriptionProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const ListViewDescription: ({ children, className, ...props }: ListViewDescriptionProps) => import("react/jsx-runtime").JSX.Element;
interface ListViewItemActionProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ListViewItemAction: ({ children, className, ...props }: ListViewItemActionProps) => import("react/jsx-runtime").JSX.Element;
export { ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle, };
export type { ListViewDescriptionProps, ListViewItemActionProps, ListViewItemContentProps, ListViewItemProps, ListViewRootProps, ListViewTitleProps, };
//# sourceMappingURL=list-view.d.ts.map