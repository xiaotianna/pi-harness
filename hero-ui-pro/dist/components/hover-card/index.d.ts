import type { ComponentProps } from 'react';
import { HoverCardArrow, HoverCardContent, HoverCardRoot, HoverCardTrigger } from './hover-card';
export { hoverCardVariants } from './hover-card.styles';
export declare const HoverCard: (({ children, closeDelay, defaultOpen, onOpenChange, open, openDelay, }: import("./hover-card").HoverCardRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Arrow: ({ children, className, ...props }: import("./hover-card").HoverCardArrowProps) => import("react/jsx-runtime").JSX.Element;
    Content: ({ children, className, offset, onOpenChange: onOpenChangeProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, placement, ...props }: import("./hover-card").HoverCardContentProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, closeDelay, defaultOpen, onOpenChange, open, openDelay, }: import("./hover-card").HoverCardRootProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, onBlur: onBlurProp, onFocus: onFocusProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, ref, ...props }: import("./hover-card").HoverCardTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export { HoverCardArrow, HoverCardContent, HoverCardRoot, HoverCardTrigger };
export type { HoverCardArrowProps, HoverCardContentProps, HoverCardRootProps as HoverCardProps, HoverCardRootProps, HoverCardTriggerProps, } from './hover-card';
export type { HoverCardVariants } from './hover-card.styles';
export { hoverCardVariants as default } from './hover-card.styles';
export type HoverCard = {
    ArrowProps: ComponentProps<typeof HoverCardArrow>;
    ContentProps: ComponentProps<typeof HoverCardContent>;
    Props: ComponentProps<typeof HoverCardRoot>;
    RootProps: ComponentProps<typeof HoverCardRoot>;
    TriggerProps: ComponentProps<typeof HoverCardTrigger>;
};
//# sourceMappingURL=index.d.ts.map