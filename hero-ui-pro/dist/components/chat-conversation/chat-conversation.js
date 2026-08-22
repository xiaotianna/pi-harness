'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { mergeRefs } from '@react-aria/utils';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ChevronDown } from '../icons';
import { chatConversationVariants } from './chat-conversation.styles';
const ChatConversationContext = createContext(null);
// ─── Helpers ─────────────────────────────────────────────────────────────────
const hasScrollOverflow = (el) => el.scrollHeight - el.clientHeight > 4;
const isScrolledToBottom = (el) => !hasScrollOverflow(el) ||
    el.scrollHeight - el.scrollTop - el.clientHeight <= 4;
const toBehavior = (value) => value === 'smooth' ? 'smooth' : 'auto';
const INITIAL_SCROLL_STATE = {
    hasOverflow: false,
    isAtBottom: true,
};
const measureScrollElement = (el) => ({
    hasOverflow: hasScrollOverflow(el),
    isAtBottom: isScrolledToBottom(el),
});
// ─── ChatConversationRoot ─────────────────────────────────────────────────────
const ChatConversationRoot = ({ children, className, initial = 'smooth', onScroll, ref, resize = 'smooth', ...props }) => {
    const slots = useMemo(() => chatConversationVariants(), []);
    const scrollRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(INITIAL_SCROLL_STATE);
    const mergedRef = useMemo(() => mergeRefs(ref ?? null, scrollRef), [ref]);
    const [scrollState, setScrollState] = useState(INITIAL_SCROLL_STATE);
    const updateState = useCallback((next) => {
        stateRef.current = next;
        setScrollState((prev) => {
            const isSame = prev.hasOverflow === next.hasOverflow &&
                prev.isAtBottom === next.isAtBottom;
            return isSame ? prev : next;
        });
    }, []);
    const measureScrollState = useCallback(({ preserveAtBottom = false } = {}) => {
        const el = scrollRef.current;
        if (!el)
            return;
        const measured = measureScrollElement(el);
        updateState({
            hasOverflow: measured.hasOverflow,
            isAtBottom: (!preserveAtBottom || !stateRef.current.isAtBottom) &&
                measured.isAtBottom
                ? measured.isAtBottom
                : preserveAtBottom && stateRef.current.isAtBottom
                    ? true
                    : measured.isAtBottom,
        });
    }, [updateState]);
    const cancelRaf = useCallback(() => {
        if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);
    const scrollToBottom = useCallback((behavior = resize) => {
        const el = scrollRef.current;
        if (!el)
            return;
        cancelRaf();
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            el.scrollTo({ behavior: toBehavior(behavior), top: el.scrollHeight });
        });
    }, [cancelRaf, resize]);
    useEffect(() => cancelRaf, [cancelRaf]);
    useLayoutEffect(() => {
        measureScrollState({ preserveAtBottom: true });
        scrollToBottom(initial);
    }, [initial]);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => {
            const wasAtBottom = stateRef.current.isAtBottom;
            measureScrollState({ preserveAtBottom: true });
            if (wasAtBottom)
                scrollToBottom(resize);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [measureScrollState, resize, scrollToBottom]);
    const handleScroll = useCallback((event) => {
        onScroll?.(event);
        updateState(measureScrollElement(event.currentTarget));
    }, [onScroll, updateState]);
    const contextValue = useMemo(() => ({
        hasOverflow: scrollState.hasOverflow,
        isAtBottom: scrollState.isAtBottom,
        measureScrollState,
        resize,
        scrollToBottom,
        slots,
    }), [
        measureScrollState,
        resize,
        scrollState.hasOverflow,
        scrollState.isAtBottom,
        scrollToBottom,
        slots,
    ]);
    return (_jsx(ChatConversationContext, { value: contextValue, children: _jsx("div", { ref: mergedRef, className: composeSlotClassName(slots?.base, className), "data-slot": "chat-conversation", role: "log", onScroll: handleScroll, ...props, children: children }) }));
};
// ─── ChatConversationContent ──────────────────────────────────────────────────
const ChatConversationContent = ({ children, className, ref, ...props }) => {
    const ctx = use(ChatConversationContext);
    const innerRef = useRef(null);
    const mergedRef = useMemo(() => mergeRefs(ref ?? null, innerRef), [ref]);
    const isAtBottom = ctx?.isAtBottom ?? true;
    const measureScrollState = ctx?.measureScrollState;
    const resize = ctx?.resize ?? 'smooth';
    const scrollToBottom = ctx?.scrollToBottom;
    const slots = ctx?.slots;
    useLayoutEffect(() => {
        measureScrollState?.({ preserveAtBottom: isAtBottom });
        if (isAtBottom)
            scrollToBottom?.(resize);
    }, [isAtBottom, measureScrollState, resize, scrollToBottom]);
    useEffect(() => {
        const el = innerRef.current;
        if (!el || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => {
            measureScrollState?.({ preserveAtBottom: isAtBottom });
            if (isAtBottom)
                scrollToBottom?.(resize);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isAtBottom, measureScrollState, resize, scrollToBottom]);
    return (_jsx("div", { ref: mergedRef, className: composeSlotClassName(slots?.content, className), "data-slot": "chat-conversation-content", ...props, children: children }));
};
// ─── ChatConversationScrollAnchor ─────────────────────────────────────────────
const ChatConversationScrollAnchor = ({ className, ...props }) => {
    const ctx = use(ChatConversationContext);
    return (_jsx("div", { "aria-hidden": "true", className: composeSlotClassName(ctx?.slots?.scrollAnchor, className), "data-slot": "chat-conversation-scroll-anchor", ...props }));
};
// ─── ChatConversationScrollButton ─────────────────────────────────────────────
const ChatConversationScrollButton = ({ 'aria-label': ariaLabel, className, isDisabled, tooltip, ...props }) => {
    const ctx = use(ChatConversationContext);
    const { hasOverflow = false, isAtBottom = true, scrollToBottom, slots, } = ctx ?? {};
    if (!scrollToBottom)
        return null;
    const isVisible = hasOverflow && !isAtBottom;
    const button = (_jsx(Button, { isIconOnly: true, "aria-label": ariaLabel, className: composeTwRenderProps(className, slots?.scrollButton()), "data-slot": "chat-conversation-scroll-button", isDisabled: !isVisible || isDisabled, size: "sm", variant: "secondary", onPress: () => scrollToBottom('smooth'), ...props, "aria-hidden": !isVisible || undefined, children: _jsx(ChevronDown, { className: "size-4" }) }));
    return (_jsx("div", { "aria-hidden": !isVisible || undefined, className: composeSlotClassName(slots?.scrollButtonContainer, undefined), "data-slot": "chat-conversation-scroll-button-container", "data-state": isVisible ? 'visible' : 'hidden', children: tooltip ? (_jsxs(Tooltip, { delay: 0, children: [_jsx(Tooltip.Trigger, { children: button }), _jsx(Tooltip.Content, { placement: "top", children: tooltip })] })) : (button) }));
};
export { ChatConversationContent, ChatConversationRoot, ChatConversationScrollAnchor, ChatConversationScrollButton, };
//# sourceMappingURL=chat-conversation.js.map