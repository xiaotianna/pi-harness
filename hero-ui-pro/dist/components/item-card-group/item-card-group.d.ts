import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ItemCardGroupVariants } from './item-card-group.styles';
interface ItemCardGroupRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Number of grid columns when layout is "grid". @default 2 */
    columns?: 2 | 3;
    /** Layout mode. @default "list" */
    layout?: ItemCardGroupVariants['layout'];
    /** Visual variant. @default "default" */
    variant?: ItemCardGroupVariants['variant'];
}
declare const ItemCardGroupRoot: ({ children, className, columns, layout, style, variant, ...props }: ItemCardGroupRootProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardGroupHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ItemCardGroupHeader: ({ children, className, ...props }: ItemCardGroupHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardGroupTitleProps extends ComponentPropsWithRef<'h3'> {
    children: ReactNode;
}
declare const ItemCardGroupTitle: ({ children, className, ...props }: ItemCardGroupTitleProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardGroupDescriptionProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
declare const ItemCardGroupDescription: ({ children, className, ...props }: ItemCardGroupDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export { ItemCardGroupDescription, ItemCardGroupHeader, ItemCardGroupRoot, ItemCardGroupTitle, };
export type { ItemCardGroupDescriptionProps, ItemCardGroupHeaderProps, ItemCardGroupRootProps, ItemCardGroupTitleProps, };
//# sourceMappingURL=item-card-group.d.ts.map