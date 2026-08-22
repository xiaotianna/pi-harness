import { ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot, } from './resizable';
export { ResizableContext, useResizableContext } from './resizable';
export { resizableVariants } from './resizable.styles';
const Resizable = Object.assign(ResizableRoot, {
    Handle: ResizableHandle,
    Indicator: ResizableIndicator,
    Panel: ResizablePanel,
    Root: ResizableRoot,
});
export { Resizable, ResizableHandle, ResizableIndicator, ResizablePanel, ResizableRoot, };
//# sourceMappingURL=index.js.map