import type { ComponentPropsWithRef } from 'react';
import React from 'react';
import { type ReactNode } from 'react';
import type { GroupImperativeHandle, Layout, LayoutStorage, PanelImperativeHandle, PanelProps as ReactResizablePanelProps, PanelSize } from 'react-resizable-panels';
import type { ResizableVariants } from './resizable.styles';
import { resizableVariants } from './resizable.styles';
type ResizableSize = number | string;
type ResizablePanelGroupResizeBehavior = NonNullable<ReactResizablePanelProps['groupResizeBehavior']>;
type ResizableContextValue = {
    orientation: NonNullable<ResizableVariants['orientation']>;
    slots: ReturnType<typeof resizableVariants>;
};
declare const ResizableContext: React.Context<ResizableContextValue | null>;
declare const useResizableContext: () => ResizableContextValue;
interface ResizableRootProps extends Omit<ComponentPropsWithRef<'div'>, 'id'> {
    autoSaveId?: string;
    children: ReactNode;
    handleRef?: React.Ref<GroupImperativeHandle>;
    id?: string;
    onLayoutChange?: (layout: Layout) => void;
    orientation?: ResizableVariants['orientation'];
    storage?: LayoutStorage;
}
declare const ResizableRoot: ({ autoSaveId, children, className, handleRef, id, onLayoutChange, orientation, storage, style, ...props }: ResizableRootProps) => import("react/jsx-runtime").JSX.Element;
interface ResizablePanelProps {
    children?: ReactNode;
    className?: string;
    /** When collapsible and the panel is dragged smaller than the collapse threshold, this size is applied. */
    collapsedSize?: ResizableSize;
    collapsible?: boolean;
    /**
     * Initial size. Numbers are treated as percentages (0-100).
     * Strings accept any CSS unit: "200px", "30%", "10rem".
     */
    defaultSize?: ResizableSize;
    /**
     * How this panel behaves when the parent group is resized.
     * @default "preserve-relative-size"
     */
    groupResizeBehavior?: ResizablePanelGroupResizeBehavior;
    handleRef?: React.Ref<PanelImperativeHandle>;
    id?: string;
    /**
     * Max size. Numbers are treated as percentages (0-100).
     * Strings accept any CSS unit.
     */
    maxSize?: ResizableSize;
    /**
     * Min size. Numbers are treated as percentages (0-100).
     * Strings accept any CSS unit.
     */
    minSize?: ResizableSize;
    onCollapse?: () => void;
    onExpand?: () => void;
    onResize?: (panelSize: PanelSize, id: string | number | undefined, prevPanelSize: PanelSize | undefined) => void;
    style?: React.CSSProperties;
}
declare const ResizablePanel: ({ children, className, collapsedSize, collapsible, defaultSize, groupResizeBehavior, handleRef, id, maxSize, minSize, onCollapse, onExpand, onResize, style, }: ResizablePanelProps) => import("react/jsx-runtime").JSX.Element;
interface ResizableHandleProps {
    'aria-label'?: string;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
    id?: string;
    type?: ResizableVariants['type'];
    variant?: ResizableVariants['variant'];
    withIndicator?: boolean;
}
declare const ResizableHandle: ({ "aria-label": ariaLabel, children, className, disabled, id, type, variant, withIndicator, }: ResizableHandleProps) => import("react/jsx-runtime").JSX.Element;
interface ResizableIndicatorProps {
    children?: ReactNode;
    className?: string;
    type?: 'drag' | 'pill';
}
declare const ResizableIndicator: ({ children, className, type, }: ResizableIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export { ResizableContext, ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot, useResizableContext, };
export type { ResizableContextValue, ResizableHandleProps, ResizableIndicatorProps, ResizablePanelGroupResizeBehavior, ResizablePanelProps, ResizableRootProps, ResizableSize, };
//# sourceMappingURL=resizable.d.ts.map