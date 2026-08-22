'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, } from 'react';
import { OverlayArrow as OverlayArrowPrimitive, Popover as PopoverPrimitive, } from 'react-aria-components/Popover';
import { mergeRefs } from '@react-aria/utils';
import { useControlledState } from '@react-stately/utils';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { hoverCardVariants } from './hover-card.styles';
const HoverCardContext = createContext({
    handleCancelClose: () => { },
    handleClose: () => { },
    handleOpen: () => { },
    isOpen: false,
    isPointerInsideRef: { current: false },
    triggerRef: { current: null },
});
// ---- Components ----
export const HoverCardRoot = ({ children, closeDelay = 300, defaultOpen = false, onOpenChange, open, openDelay = 700, }) => {
    const [isOpen, setIsOpen] = useControlledState(open, defaultOpen, onOpenChange);
    const triggerRef = useRef(null);
    const isPointerInsideRef = useRef(false);
    const openTimerRef = useRef(undefined);
    const closeTimerRef = useRef(undefined);
    const slots = useMemo(() => hoverCardVariants(), []);
    const clearTimers = useCallback(() => {
        clearTimeout(openTimerRef.current);
        clearTimeout(closeTimerRef.current);
    }, []);
    useEffect(() => clearTimers, [clearTimers]);
    useEffect(() => {
        if (!isOpen)
            return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                clearTimers();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [clearTimers, isOpen, setIsOpen]);
    const handleOpen = useCallback((immediate = false) => {
        clearTimers();
        if (immediate || openDelay <= 0) {
            setIsOpen(true);
        }
        else {
            openTimerRef.current = setTimeout(() => setIsOpen(true), openDelay);
        }
    }, [clearTimers, openDelay, setIsOpen]);
    const handleClose = useCallback((immediate = false) => {
        clearTimers();
        if (immediate || closeDelay <= 0) {
            setIsOpen(false);
        }
        else {
            closeTimerRef.current = setTimeout(() => setIsOpen(false), closeDelay);
        }
    }, [clearTimers, closeDelay, setIsOpen]);
    const handleCancelClose = useCallback(() => {
        clearTimeout(closeTimerRef.current);
    }, []);
    const contextValue = useMemo(() => ({
        handleCancelClose,
        handleClose,
        handleOpen,
        isOpen,
        isPointerInsideRef,
        slots,
        triggerRef,
    }), [handleCancelClose, handleClose, handleOpen, isOpen, slots]);
    return (_jsx(HoverCardContext.Provider, { value: contextValue, children: children }));
};
export const HoverCardTrigger = ({ children, className, onBlur: onBlurProp, onFocus: onFocusProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, ref, ...props }) => {
    const { handleClose, handleOpen, isPointerInsideRef, slots, triggerRef } = useContext(HoverCardContext);
    const mergedRef = useMemo(() => mergeRefs(ref, triggerRef), [ref, triggerRef]);
    const handlePointerEnter = useCallback((e) => {
        if (e.pointerType === 'mouse')
            handleOpen();
        onPointerEnterProp?.(e);
    }, [handleOpen, onPointerEnterProp]);
    const handlePointerLeave = useCallback((e) => {
        if (e.pointerType === 'mouse')
            handleClose();
        onPointerLeaveProp?.(e);
    }, [handleClose, onPointerLeaveProp]);
    const handleFocus = useCallback((e) => {
        handleOpen(true);
        onFocusProp?.(e);
    }, [handleOpen, onFocusProp]);
    const handleBlur = useCallback((e) => {
        if (!isPointerInsideRef.current)
            handleClose();
        onBlurProp?.(e);
    }, [handleClose, isPointerInsideRef, onBlurProp]);
    return (_jsx("span", { ref: mergedRef, className: composeSlotClassName(slots?.trigger, className), "data-slot": "hover-card-trigger", onBlur: handleBlur, onFocus: handleFocus, onPointerEnter: handlePointerEnter, onPointerLeave: handlePointerLeave, ...props, children: children }));
};
export const HoverCardContent = ({ children, className, offset = 8, onOpenChange: onOpenChangeProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, placement = 'top', ...props }) => {
    const { handleCancelClose, handleClose, isOpen, isPointerInsideRef, slots, triggerRef, } = useContext(HoverCardContext);
    const handlePointerEnter = useCallback((e) => {
        isPointerInsideRef.current = true;
        handleCancelClose();
        onPointerEnterProp?.(e);
    }, [handleCancelClose, isPointerInsideRef, onPointerEnterProp]);
    const handlePointerLeave = useCallback((e) => {
        isPointerInsideRef.current = false;
        handleClose();
        onPointerLeaveProp?.(e);
    }, [handleClose, isPointerInsideRef, onPointerLeaveProp]);
    const handleOpenChange = useCallback((open) => {
        if (!open)
            handleClose(true);
        onOpenChangeProp?.(open);
    }, [handleClose, onOpenChangeProp]);
    return (_jsx(PopoverPrimitive, { isNonModal: true, className: composeTwRenderProps(className, slots?.content()), "data-slot": "hover-card-content", isOpen: isOpen, offset: offset, placement: placement, triggerRef: triggerRef, onOpenChange: handleOpenChange, onPointerEnter: handlePointerEnter, onPointerLeave: handlePointerLeave, ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const HoverCardArrow = ({ children, className, ...props }) => {
    const { slots } = useContext(HoverCardContext);
    return (_jsx(OverlayArrowPrimitive, { className: composeTwRenderProps(className, slots?.arrow()), "data-slot": "hover-card-arrow", ...props, children: children ?? (_jsx("svg", { fill: "none", height: "12", viewBox: "0 0 12 12", width: "12", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M0 0C5.48483 8 6.5 8 12 0Z" }) })) }));
};
//# sourceMappingURL=hover-card.js.map