'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, } from 'react';
import { Menu, Popover, Separator } from 'react-aria-components/Menu';
import { PopoverContext } from 'react-aria-components/Popover';
import { dom, DropdownItem, DropdownItemIndicator, DropdownSection, DropdownSubmenuIndicator, DropdownSubmenuTrigger, } from '@heroui/react';
import { useControlledState } from '@react-stately/utils';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { contextMenuVariants } from './context-menu.styles';
const ContextMenuContext = createContext({
    anchorRef: { current: null },
    handleClose: () => { },
    handleOpen: () => { },
    isOpen: false,
    popoverRef: { current: null },
    triggerRef: { current: null },
});
// ── Components ───────────────────────────────────────────────────────────────
export const ContextMenuRoot = ({ children, defaultOpen = false, isDisabled = false, onOpenChange, open, }) => {
    const [isOpen, setIsOpen] = useControlledState(open, defaultOpen, onOpenChange);
    const anchorRef = useRef(null);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const slots = useMemo(() => contextMenuVariants(), []);
    const handleOpen = useCallback((x, y) => {
        if (isDisabled)
            return;
        const anchor = anchorRef.current;
        const trigger = triggerRef.current;
        if (anchor && trigger) {
            const rect = trigger.getBoundingClientRect();
            anchor.style.left = x - rect.left + 'px';
            anchor.style.top = y - rect.top + 'px';
        }
        setIsOpen(true);
    }, [isDisabled, setIsOpen]);
    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, [setIsOpen]);
    // Close on scroll outside the popover
    useEffect(() => {
        if (!isOpen)
            return;
        const onScroll = (e) => {
            if (!popoverRef.current?.contains(e.target))
                setIsOpen(false);
        };
        window.addEventListener('scroll', onScroll, {
            capture: true,
            passive: true,
        });
        return () => window.removeEventListener('scroll', onScroll, { capture: true });
    }, [isOpen, setIsOpen]);
    // Handle contextmenu events to open at cursor position or close-and-reopen
    useEffect(() => {
        if (!isOpen)
            return;
        const onContextMenu = (e) => {
            const popover = popoverRef.current;
            const trigger = triggerRef.current;
            if (popover?.contains(e.target)) {
                e.preventDefault();
            }
            else {
                if (trigger) {
                    const rect = trigger.getBoundingClientRect();
                    if (e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(false);
                        requestAnimationFrame(() => handleOpen(e.clientX, e.clientY));
                        return;
                    }
                }
                setIsOpen(false);
            }
        };
        window.addEventListener('contextmenu', onContextMenu, { capture: true });
        return () => window.removeEventListener('contextmenu', onContextMenu, {
            capture: true,
        });
    }, [isOpen, setIsOpen, handleOpen]);
    const contextValue = useMemo(() => ({
        anchorRef,
        handleClose,
        handleOpen,
        isOpen,
        popoverRef,
        slots,
        triggerRef,
    }), [handleClose, handleOpen, isOpen, slots]);
    return (_jsx(ContextMenuContext, { value: contextValue, children: children }));
};
export const ContextMenuTrigger = ({ children, className, ...props }) => {
    const { anchorRef, handleClose, handleOpen, isOpen, slots, triggerRef } = useContext(ContextMenuContext);
    const longPressTimeoutRef = useRef(undefined);
    const touchStartPos = useRef(null);
    useEffect(() => () => clearTimeout(longPressTimeoutRef.current), []);
    const onContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
            handleClose();
            requestAnimationFrame(() => handleOpen(e.clientX, e.clientY));
        }
        else {
            handleOpen(e.clientX, e.clientY);
        }
    }, [handleClose, handleOpen, isOpen]);
    const onTouchStart = useCallback((e) => {
        if (e.touches.length !== 1)
            return;
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        longPressTimeoutRef.current = setTimeout(() => {
            if (touchStartPos.current)
                handleOpen(touchStartPos.current.x, touchStartPos.current.y);
        }, 500);
    }, [handleOpen]);
    const onTouchMove = useCallback((e) => {
        if (!touchStartPos.current || e.touches.length !== 1)
            return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10)
            clearTimeout(longPressTimeoutRef.current);
    }, []);
    const onTouchEnd = useCallback(() => {
        clearTimeout(longPressTimeoutRef.current);
        touchStartPos.current = null;
    }, []);
    return (_jsxs(dom.div, { ref: triggerRef, className: composeSlotClassName(slots?.trigger, className), "data-slot": "context-menu-trigger", onContextMenu: onContextMenu, onTouchCancel: onTouchEnd, onTouchEnd: onTouchEnd, onTouchMove: onTouchMove, onTouchStart: onTouchStart, ...props, children: [children, _jsx("div", { ref: anchorRef, "aria-hidden": "true", style: {
                    height: 0,
                    pointerEvents: 'none',
                    position: 'absolute',
                    width: 0,
                } })] }));
};
export const ContextMenuPopover = ({ children, className, offset = 2, placement, ...props }) => {
    const { anchorRef, handleClose, isOpen, popoverRef, slots } = useContext(ContextMenuContext);
    const parentPopoverContext = useContext(PopoverContext);
    const onOpenChange = useCallback((open) => {
        if (!open)
            handleClose();
    }, [handleClose]);
    if (parentPopoverContext != null) {
        return (_jsx(Popover, { className: composeTwRenderProps(className, slots?.popover()), "data-slot": "context-menu-popover", offset: offset, placement: placement, ...props, children: children }));
    }
    return (_jsx(Popover, { ref: popoverRef, className: composeTwRenderProps(className, slots?.popover()), "data-slot": "context-menu-popover", isOpen: isOpen, offset: offset, placement: placement ?? 'bottom start', triggerRef: anchorRef, onOpenChange: onOpenChange, ...props, children: children }));
};
export function ContextMenuMenu({ children, className, onClose, ...props }) {
    const { handleClose, slots } = useContext(ContextMenuContext);
    return (_jsx(Menu, { className: composeTwRenderProps(className, slots?.menu()), "data-slot": "context-menu-menu", onClose: onClose ?? handleClose, ...props, children: children }));
}
export const ContextMenuSeparator = ({ className, ...props }) => {
    const { slots } = useContext(ContextMenuContext);
    return (_jsx(Separator, { className: composeSlotClassName(slots?.separator, className), "data-slot": "context-menu-separator", ...props }));
};
// Re-export HeroUI primitives under ContextMenu naming
export const ContextMenuItem = DropdownItem;
export const ContextMenuItemIndicator = DropdownItemIndicator;
export const ContextMenuSection = DropdownSection;
export const ContextMenuSubmenuTrigger = DropdownSubmenuTrigger;
export const ContextMenuSubmenuIndicator = DropdownSubmenuIndicator;
//# sourceMappingURL=context-menu.js.map