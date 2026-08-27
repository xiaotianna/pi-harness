import type { ComponentPropsWithRef } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { GridList, GridListItem } from 'react-aria-components/GridList';
import { DropIndicator as DropIndicatorPrimitive } from 'react-aria-components/useDragAndDrop';
import { ScrollShadow } from '@heroui/react';
import type { KanbanVariants } from './kanban.styles';
interface KanbanRootProps extends ComponentPropsWithRef<'div'> {
    /** Size variant controlling card padding, font size, and column width. @default "md" */
    size?: KanbanVariants['size'];
}
declare const KanbanRoot: ({ children, className, size, ...props }: KanbanRootProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnProps extends ComponentPropsWithRef<'section'> {
}
declare const KanbanColumn: ({ children, className, ...props }: KanbanColumnProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnBodyProps extends ComponentPropsWithRef<'div'> {
}
declare const KanbanColumnBody: ({ children, className, ...props }: KanbanColumnBodyProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnHeaderProps extends ComponentPropsWithRef<'header'> {
}
declare const KanbanColumnHeader: ({ children, className, ...props }: KanbanColumnHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnActionsProps extends ComponentPropsWithRef<'div'> {
}
declare const KanbanColumnActions: ({ children, className, ...props }: KanbanColumnActionsProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnIndicatorProps extends ComponentPropsWithRef<'span'> {
}
declare const KanbanColumnIndicator: ({ children, className, ...props }: KanbanColumnIndicatorProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnTitleProps extends ComponentPropsWithRef<'h3'> {
}
declare const KanbanColumnTitle: ({ children, className, ...props }: KanbanColumnTitleProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanColumnCountProps extends ComponentPropsWithRef<'span'> {
}
declare const KanbanColumnCount: ({ children, className, ...props }: KanbanColumnCountProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanCardListProps<T extends object> extends ComponentPropsWithRef<typeof GridList<T>> {
}
declare const KanbanCardList: <T extends object>({ children, className, renderEmptyState, selectionMode, ...props }: KanbanCardListProps<T>) => import("react/jsx-runtime").JSX.Element;
interface KanbanCardProps<T extends object> extends ComponentPropsWithRef<typeof GridListItem<T>> {
}
declare const KanbanCard: <T extends object>({ children, className, ...props }: KanbanCardProps<T>) => import("react/jsx-runtime").JSX.Element;
interface KanbanDropIndicatorProps extends ComponentPropsWithRef<typeof DropIndicatorPrimitive> {
    /** Height of the drop placeholder. Typically set to the dragged card's height. */
    height?: number;
}
declare const KanbanDropIndicator: ({ className, height, style, ...props }: KanbanDropIndicatorProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanScrollShadowProps extends ComponentPropsWithRef<typeof ScrollShadow> {
}
declare const KanbanScrollShadow: ({ children, className, ...props }: KanbanScrollShadowProps) => import("react/jsx-runtime").JSX.Element;
interface KanbanDragHandleProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
declare const KanbanDragHandle: ({ children, className, ...props }: KanbanDragHandleProps) => import("react/jsx-runtime").JSX.Element;
export { KanbanCard, KanbanCardList, KanbanColumn, KanbanColumnActions, KanbanColumnBody, KanbanColumnCount, KanbanColumnHeader, KanbanColumnIndicator, KanbanColumnTitle, KanbanDragHandle, KanbanDropIndicator, KanbanRoot, KanbanScrollShadow, };
export type { KanbanCardListProps, KanbanCardProps, KanbanColumnActionsProps, KanbanColumnBodyProps, KanbanColumnCountProps, KanbanColumnHeaderProps, KanbanColumnIndicatorProps, KanbanColumnProps, KanbanColumnTitleProps, KanbanDragHandleProps, KanbanDropIndicatorProps, KanbanRootProps, KanbanScrollShadowProps, };
