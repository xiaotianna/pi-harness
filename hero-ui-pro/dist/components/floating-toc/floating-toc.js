'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, } from 'react';
import { Popover as PopoverPrimitive } from 'react-aria-components/Popover';
import { mergeRefs } from '@react-aria/utils';
import { useControlledState } from '@react-stately/utils';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { floatingTocVariants } from './floating-toc.styles';
const FloatingTocContext = createContext({
    handleCancelClose: () => { },
    handleClose: () => { },
    handleOpen: () => { },
    isOpen: false,
    isPointerInsideRef: { current: false },
    placement: 'right',
    triggerMode: 'hover',
    triggerRef: { current: null },
});
// ---- Components ----
export const FloatingTocRoot = ({ children, closeDelay = 300, defaultOpen = false, onOpenChange, open, openDelay = 200, placement = 'right', triggerMode = 'hover', }) => {
    const [isOpen, setIsOpen] = useControlledState(open, defaultOpen, onOpenChange);
    const triggerRef = useRef(null);
    const isPointerInsideRef = useRef(false);
    const openTimerRef = useRef(undefined);
    const closeTimerRef = useRef(undefined);
    const slots = useMemo(() => floatingTocVariants(), []);
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
        placement,
        slots,
        triggerMode,
        triggerRef,
    }), [
        handleCancelClose,
        handleClose,
        handleOpen,
        isOpen,
        placement,
        slots,
        triggerMode,
    ]);
    return (_jsx(FloatingTocContext.Provider, { value: contextValue, children: children }));
};
export const FloatingTocTrigger = ({ children, className, onBlur: onBlurProp, onClick: onClickProp, onFocus: onFocusProp, onKeyDown: onKeyDownProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, ref, ...props }) => {
    const { handleClose, handleOpen, isOpen, isPointerInsideRef, placement, slots, triggerMode, triggerRef, } = useContext(FloatingTocContext);
    const isHover = triggerMode === 'hover';
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
    const handleClick = useCallback((e) => {
        if (isHover) {
            handleOpen(true);
        }
        else {
            isOpen ? handleClose(true) : handleOpen(true);
        }
        onClickProp?.(e);
    }, [handleClose, handleOpen, isHover, isOpen, onClickProp]);
    const handleFocus = useCallback((e) => {
        handleOpen(true);
        onFocusProp?.(e);
    }, [handleOpen, onFocusProp]);
    const handleBlur = useCallback((e) => {
        if (!isPointerInsideRef.current)
            handleClose();
        onBlurProp?.(e);
    }, [handleClose, isPointerInsideRef, onBlurProp]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isOpen ? handleClose(true) : handleOpen(true);
        }
        onKeyDownProp?.(e);
    }, [handleClose, handleOpen, isOpen, onKeyDownProp]);
    return (_jsx("span", { ref: mergedRef, className: composeSlotClassName(slots?.trigger, className), "data-placement": placement, "data-slot": "floating-toc-trigger", role: "button", tabIndex: 0, onBlur: isHover ? handleBlur : onBlurProp, onClick: handleClick, onFocus: isHover ? handleFocus : onFocusProp, onKeyDown: handleKeyDown, onPointerEnter: isHover ? handlePointerEnter : onPointerEnterProp, onPointerLeave: isHover ? handlePointerLeave : onPointerLeaveProp, ...props, children: children }));
};
export const FloatingTocBar = ({ active, className, level, ref: refProp, style: styleProp, ...props }) => {
    const { slots } = useContext(FloatingTocContext);
    const localRef = useRef(null);
    const hasActivatedRef = useRef(false);
    useEffect(() => {
        if (hasActivatedRef.current) {
            if (active && localRef.current) {
                localRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }
        else {
            hasActivatedRef.current = true;
        }
    }, [active]);
    const mergedRef = useMemo(() => mergeRefs(refProp, localRef), [refProp]);
    const style = level != null && level > 1
        ? { ...styleProp, '--floating-toc-level': level }
        : styleProp;
    return (_jsx("span", { ref: mergedRef, className: composeSlotClassName(slots?.bar, className), "data-active": active || undefined, "data-slot": "floating-toc-bar", style: style, ...props }));
};
export const FloatingTocContent = ({ children, className, offset = 8, onOpenChange: onOpenChangeProp, onPointerEnter: onPointerEnterProp, onPointerLeave: onPointerLeaveProp, placement: placementProp, ...props }) => {
    const { handleCancelClose, handleClose, isOpen, isPointerInsideRef, placement, slots, triggerRef, } = useContext(FloatingTocContext);
    const resolvedPlacement = placementProp ?? (placement === 'left' ? 'right' : 'left');
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
    return (_jsx(PopoverPrimitive, { isNonModal: true, className: composeTwRenderProps(className, slots?.content()), "data-slot": "floating-toc-content", isOpen: isOpen, offset: offset, placement: resolvedPlacement, triggerRef: triggerRef, onOpenChange: handleOpenChange, onPointerEnter: handlePointerEnter, onPointerLeave: handlePointerLeave, ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const FloatingTocItem = ({ active, children, className, level, style: styleProp, ...props }) => {
    const { slots } = useContext(FloatingTocContext);
    const style = level != null && level > 1
        ? { ...styleProp, '--floating-toc-level': level }
        : styleProp;
    return (_jsx("button", { className: composeSlotClassName(slots?.item, className), "data-active": active || undefined, "data-slot": "floating-toc-item", style: style, type: "button", ...props, children: children }));
};
//# sourceMappingURL=floating-toc.js.map