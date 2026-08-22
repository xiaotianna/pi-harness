import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import React from 'react';
import { Dialog as DialogPrimitive, Heading as HeadingPrimitive } from 'react-aria-components/Dialog';
import { Modal as ModalPrimitive, ModalOverlay as ModalOverlayPrimitive } from 'react-aria-components/Modal';
import { CloseButton } from '@heroui/react';
import type { SheetVariants } from './sheet.styles';
import type { SheetPlacement } from './types';
export interface WithFadeFromProps {
    snapPoints: (number | string)[];
    fadeFromIndex: number;
}
export interface WithoutFadeFromProps {
    snapPoints?: (number | string)[];
    fadeFromIndex?: never;
}
export type SheetRootProps = {
    activeSnapPoint?: number | string | null;
    onActiveSnapPointChange?: (snapPoint: number | string | null) => void;
    children?: React.ReactNode;
    isOpen?: boolean;
    closeThreshold?: number;
    noBodyStyles?: boolean;
    onOpenChange?: (open: boolean) => void;
    shouldScaleBackground?: boolean;
    setBackgroundColorOnScale?: boolean;
    scrollLockTimeout?: number;
    isFixed?: boolean;
    isHandleOnly?: boolean;
    isDismissable?: boolean;
    onDrag?: (event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void;
    onRelease?: (event: React.PointerEvent<HTMLDivElement>, open: boolean) => void;
    isModal?: boolean;
    isNested?: boolean;
    onClose?: () => void;
    placement?: SheetPlacement;
    defaultOpen?: boolean;
    disablePreventScroll?: boolean;
    repositionInputs?: boolean;
    snapToSequentialPoint?: boolean;
    container?: HTMLElement | null;
    onAnimationEnd?: (open: boolean) => void;
    preventScrollRestoration?: boolean;
    shouldAutoFocus?: boolean;
    isDetached?: boolean;
} & (WithFadeFromProps | WithoutFadeFromProps);
export declare function SheetRoot({ isOpen: isOpenProp, onOpenChange, children, onDrag: onDragProp, onRelease: onReleaseProp, snapPoints, shouldScaleBackground, setBackgroundColorOnScale, closeThreshold, scrollLockTimeout, isDismissable, isHandleOnly, fadeFromIndex, activeSnapPoint: activeSnapPointProp, onActiveSnapPointChange, isFixed, isModal, onClose, isNested, noBodyStyles, placement, defaultOpen, disablePreventScroll, snapToSequentialPoint, preventScrollRestoration, repositionInputs, onAnimationEnd, container, shouldAutoFocus, isDetached, }: SheetRootProps): import("react/jsx-runtime").JSX.Element;
interface SheetTriggerProps {
    children: ReactElement<{
        onPress?: () => void;
    }>;
}
declare const SheetTrigger: ({ children, }: SheetTriggerProps) => ReactElement<{
    onPress?: () => void;
}>;
interface SheetCloseProps {
    children: ReactElement<{
        onPress?: () => void;
    }>;
}
declare const SheetClose: ({ children, }: SheetCloseProps) => ReactElement<{
    onPress?: () => void;
}>;
interface SheetBackdropProps extends Omit<ComponentPropsWithRef<typeof ModalOverlayPrimitive>, 'isOpen' | 'onOpenChange'> {
    variant?: SheetVariants['backdrop'];
}
declare const SheetBackdrop: ({ children, className, ref, variant, ...rest }: SheetBackdropProps) => import("react/jsx-runtime").JSX.Element;
interface SheetContentProps extends Omit<ComponentPropsWithRef<typeof ModalPrimitive>, 'isOpen' | 'onOpenChange'> {
}
declare const SheetContent: ({ children, className, ref, style, ...rest }: SheetContentProps) => import("react/jsx-runtime").JSX.Element;
interface SheetDialogProps extends Omit<ComponentPropsWithRef<typeof DialogPrimitive>, 'children'> {
    children: ReactNode;
}
declare const SheetDialog: ({ children, className, ...props }: SheetDialogProps) => import("react/jsx-runtime").JSX.Element;
interface SheetHeaderProps extends ComponentPropsWithRef<'div'> {
}
declare const SheetHeader: ({ children, className, ...props }: SheetHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface SheetHeadingProps extends ComponentPropsWithRef<typeof HeadingPrimitive> {
}
declare const SheetHeading: ({ children, className, ...props }: SheetHeadingProps) => import("react/jsx-runtime").JSX.Element;
interface SheetBodyProps extends ComponentPropsWithRef<'div'> {
}
declare const SheetBody: ({ children, className, ...props }: SheetBodyProps) => import("react/jsx-runtime").JSX.Element;
interface SheetFooterProps extends ComponentPropsWithRef<'div'> {
}
declare const SheetFooter: ({ children, className, ...props }: SheetFooterProps) => import("react/jsx-runtime").JSX.Element;
interface SheetHandleProps extends ComponentPropsWithRef<'div'> {
    preventCycle?: boolean;
}
declare const SheetHandle: ({ children, className, preventCycle, ...rest }: SheetHandleProps) => import("react/jsx-runtime").JSX.Element;
interface SheetCloseTriggerProps extends ComponentPropsWithRef<typeof CloseButton> {
}
declare const SheetCloseTrigger: ({ children, className, ...props }: SheetCloseTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare function SheetNestedRoot({ isOpen: nestedIsOpen, onDrag, onOpenChange, ...rest }: SheetRootProps): import("react/jsx-runtime").JSX.Element;
export { SheetBackdrop, SheetBody, SheetClose, SheetCloseTrigger, SheetContent, SheetDialog, SheetFooter, SheetHandle, SheetHeader, SheetHeading, SheetTrigger, };
export type { SheetBackdropProps, SheetBodyProps, SheetCloseProps, SheetCloseTriggerProps, SheetContentProps, SheetDialogProps, SheetFooterProps, SheetHandleProps, SheetHeaderProps, SheetHeadingProps, SheetTriggerProps, };
//# sourceMappingURL=sheet.d.ts.map