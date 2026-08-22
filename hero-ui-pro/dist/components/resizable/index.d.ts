import type { ComponentProps } from 'react';
import { ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot } from './resizable';
export { ResizableContext, useResizableContext } from './resizable';
export { resizableVariants } from './resizable.styles';
declare const Resizable: (({ autoSaveId, children, className, handleRef, id, onLayoutChange, orientation, storage, style, ...props }: import("./resizable").ResizableRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Handle: ({ "aria-label": ariaLabel, children, className, disabled, id, type, variant, withIndicator, }: import("./resizable").ResizableHandleProps) => import("react/jsx-runtime").JSX.Element;
    Indicator: ({ children, className, type, }: import("./resizable").ResizableIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Panel: ({ children, className, collapsedSize, collapsible, defaultSize, groupResizeBehavior, handleRef, id, maxSize, minSize, onCollapse, onExpand, onResize, style, }: import("./resizable").ResizablePanelProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ autoSaveId, children, className, handleRef, id, onLayoutChange, orientation, storage, style, ...props }: import("./resizable").ResizableRootProps) => import("react/jsx-runtime").JSX.Element;
};
export { Resizable, ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot, };
export type { ResizableContextValue, ResizableHandleProps, ResizableIndicatorProps, ResizablePanelGroupResizeBehavior, ResizablePanelProps, ResizableRootProps as ResizableProps, ResizableRootProps, ResizableSize, } from './resizable';
export type { ResizableVariants } from './resizable.styles';
export type { GroupImperativeHandle, Layout, LayoutStorage, PanelImperativeHandle, PanelSize, } from 'react-resizable-panels';
export type Resizable = {
    HandleProps: ComponentProps<typeof ResizableHandle>;
    IndicatorProps: ComponentProps<typeof ResizableIndicator>;
    PanelProps: ComponentProps<typeof ResizablePanel>;
    Props: ComponentProps<typeof ResizableRoot>;
    RootProps: ComponentProps<typeof ResizableRoot>;
};
//# sourceMappingURL=index.d.ts.map