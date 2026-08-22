import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Popover as PopoverPrimitive } from 'react-aria-components/Popover';
export interface FloatingTocRootProps {
    children: ReactNode;
    /** Time in ms before the floating toc closes after pointer/focus leave. @default 300 */
    closeDelay?: number;
    /** Default open state (uncontrolled). */
    defaultOpen?: boolean;
    /** Callback when open state changes. */
    onOpenChange?: (open: boolean) => void;
    /** Controlled open state. */
    open?: boolean;
    /** Time in ms before the floating toc opens after hover. @default 200 */
    openDelay?: number;
    /** Which side of the page the TOC is on. Controls bar growth direction and default content side. @default "right" */
    placement?: 'left' | 'right';
    /** How the trigger opens the content. @default "hover" */
    triggerMode?: 'hover' | 'press';
}
export interface FloatingTocTriggerProps extends ComponentPropsWithRef<'span'> {
}
export interface FloatingTocBarProps extends ComponentPropsWithRef<'span'> {
    /** Highlights this bar as the currently active section. */
    active?: boolean;
    /** Nesting depth (1 = top-level). Deeper levels produce shorter bars. */
    level?: number;
}
export interface FloatingTocContentProps extends Omit<ComponentPropsWithRef<typeof PopoverPrimitive>, 'isOpen' | 'triggerRef'> {
}
export interface FloatingTocItemProps extends ComponentPropsWithRef<'button'> {
    /** Highlights this item as the currently active section. */
    active?: boolean;
    /** Nesting depth (1 = top-level). Deeper levels are indented. */
    level?: number;
}
export declare const FloatingTocRoot: ({ children, closeDelay, defaultOpen, onOpenChange, open, openDelay, placement, triggerMode, }: FloatingTocRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const FloatingTocTrigger: ({ children, className, onBlur: onBlurProp, onClick: onClickProp, onFocus: onFocusProp, onKeyDown: onKeyDownProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, ref, ...props }: FloatingTocTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const FloatingTocBar: ({ active, className, level, ref: refProp, style: styleProp, ...props }: FloatingTocBarProps) => import("react/jsx-runtime").JSX.Element;
export declare const FloatingTocContent: ({ children, className, offset, onOpenChange: onOpenChangeProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, placement: placementProp, ...props }: FloatingTocContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const FloatingTocItem: ({ active, children, className, level, style: styleProp, ...props }: FloatingTocItemProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=floating-toc.d.ts.map