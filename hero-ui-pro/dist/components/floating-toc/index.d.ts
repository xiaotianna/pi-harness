import type { ComponentProps } from 'react';
import { FloatingTocBar, FloatingTocContent, FloatingTocItem, FloatingTocRoot, FloatingTocTrigger } from './floating-toc';
export { floatingTocVariants } from './floating-toc.styles';
export declare const FloatingToc: (({ children, closeDelay, defaultOpen, onOpenChange, open, openDelay, placement, triggerMode, }: import("./floating-toc").FloatingTocRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Bar: ({ active, className, level, ref: refProp, style: styleProp, ...props }: import("./floating-toc").FloatingTocBarProps) => import("react/jsx-runtime").JSX.Element;
    Content: ({ children, className, offset, onOpenChange: onOpenChangeProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, placement: placementProp, ...props }: import("./floating-toc").FloatingTocContentProps) => import("react/jsx-runtime").JSX.Element;
    Item: ({ active, children, className, level, style: styleProp, ...props }: import("./floating-toc").FloatingTocItemProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, closeDelay, defaultOpen, onOpenChange, open, openDelay, placement, triggerMode, }: import("./floating-toc").FloatingTocRootProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, onBlur: onBlurProp, onClick: onClickProp, onFocus: onFocusProp, onKeyDown: onKeyDownProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, ref, ...props }: import("./floating-toc").FloatingTocTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export { FloatingTocBar, FloatingTocContent, FloatingTocItem, FloatingTocRoot, FloatingTocTrigger, };
export type { FloatingTocBarProps, FloatingTocContentProps, FloatingTocItemProps, FloatingTocRootProps as FloatingTocProps, FloatingTocRootProps, FloatingTocTriggerProps, } from './floating-toc';
export type { FloatingTocVariants } from './floating-toc.styles';
export { floatingTocVariants as default } from './floating-toc.styles';
export type FloatingToc = {
    BarProps: ComponentProps<typeof FloatingTocBar>;
    ContentProps: ComponentProps<typeof FloatingTocContent>;
    ItemProps: ComponentProps<typeof FloatingTocItem>;
    Props: ComponentProps<typeof FloatingTocRoot>;
    RootProps: ComponentProps<typeof FloatingTocRoot>;
    TriggerProps: ComponentProps<typeof FloatingTocTrigger>;
};
//# sourceMappingURL=index.d.ts.map