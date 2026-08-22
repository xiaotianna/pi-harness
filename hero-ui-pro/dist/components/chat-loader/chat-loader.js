'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, Fragment, useContext, useMemo } from 'react';
import { Spinner } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { chatLoaderVariants } from './chat-loader.styles';
const ChatLoaderSkeletonContext = createContext({
    size: 'md',
});
// ─── ChatLoaderDots ───────────────────────────────────────────────────────────
const ChatLoaderDots = ({ className, label, size = 'md', ...props }) => {
    const slots = useMemo(() => chatLoaderVariants({ size }), [size]);
    return (_jsxs("span", { "aria-hidden": !label || undefined, "aria-label": label, className: composeSlotClassName(slots?.dots, className), "data-slot": "chat-loader-dots", role: label ? 'status' : undefined, ...props, children: [_jsx("span", { className: composeSlotClassName(slots?.dot, undefined) }), _jsx("span", { className: composeSlotClassName(slots?.dot, undefined) }), _jsx("span", { className: composeSlotClassName(slots?.dot, undefined) }), label ? _jsx("span", { className: "sr-only", children: label }) : null] }));
};
// ─── ChatLoaderPulse ──────────────────────────────────────────────────────────
const ChatLoaderPulse = ({ className, label, size = 'md', ...props }) => {
    const slots = useMemo(() => chatLoaderVariants({ size }), [size]);
    return (_jsx("span", { "aria-hidden": !label || undefined, "aria-label": label, className: composeSlotClassName(slots?.pulse, className), "data-slot": "chat-loader-pulse", role: label ? 'status' : undefined, ...props, children: label ? _jsx("span", { className: "sr-only", children: label }) : null }));
};
// ─── ChatLoaderSpinner ────────────────────────────────────────────────────────
const ChatLoaderSpinner = ({ className, label, size = 'md', ...props }) => {
    const slots = useMemo(() => chatLoaderVariants({ size }), [size]);
    const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
    return (_jsxs("span", { "aria-hidden": !label || undefined, "aria-label": label, className: composeSlotClassName(slots?.spinner, className), "data-slot": "chat-loader-spinner", role: label ? 'status' : undefined, ...props, children: [_jsx(Spinner, { size: spinnerSize }), label ? _jsx("span", { className: "sr-only", children: label }) : null] }));
};
// ─── ChatLoaderSkeleton ───────────────────────────────────────────────────────
const ChatLoaderSkeleton = ({ children, className, label, size = 'md', ...props }) => {
    const slots = useMemo(() => chatLoaderVariants({ size }), [size]);
    return (_jsx(ChatLoaderSkeletonContext, { value: { size: size ?? 'md', slots }, children: _jsx("div", { "aria-busy": "true", "aria-label": label, className: composeSlotClassName(slots?.skeleton, className), "data-slot": "chat-loader-skeleton", role: label ? 'status' : undefined, ...props, children: children ?? (_jsxs(Fragment, { children: [_jsx(ChatLoaderSkeletonAvatar, {}), _jsxs(ChatLoaderSkeletonBlock, { children: [_jsx(ChatLoaderSkeletonLine, {}), _jsx(ChatLoaderSkeletonLine, {}), _jsx(ChatLoaderSkeletonLine, {})] })] })) }) }));
};
// ─── ChatLoaderSkeletonAvatar ─────────────────────────────────────────────────
const ChatLoaderSkeletonAvatar = ({ className, ...props }) => {
    const { size, slots: ctxSlots } = useContext(ChatLoaderSkeletonContext);
    const slots = ctxSlots ?? chatLoaderVariants({ size });
    return (_jsx("div", { className: composeSlotClassName(slots?.skeletonAvatar, className), "data-slot": "chat-loader-skeleton-avatar", ...props }));
};
// ─── ChatLoaderSkeletonBlock ──────────────────────────────────────────────────
const ChatLoaderSkeletonBlock = ({ children, className, ...props }) => {
    const { slots: ctxSlots } = useContext(ChatLoaderSkeletonContext);
    return (_jsx("div", { className: composeSlotClassName(ctxSlots?.skeletonBlock, className), "data-slot": "chat-loader-skeleton-block", ...props, children: children }));
};
// ─── ChatLoaderSkeletonLine ───────────────────────────────────────────────────
const ChatLoaderSkeletonLine = ({ className, ...props }) => {
    const { size, slots: ctxSlots } = useContext(ChatLoaderSkeletonContext);
    const slots = ctxSlots ?? chatLoaderVariants({ size });
    return (_jsx("div", { className: composeSlotClassName(slots?.skeletonLine, className), "data-slot": "chat-loader-skeleton-line", ...props }));
};
export { ChatLoaderDots, ChatLoaderPulse, ChatLoaderSkeleton, ChatLoaderSkeletonAvatar, ChatLoaderSkeletonBlock, ChatLoaderSkeletonLine, ChatLoaderSpinner, };
//# sourceMappingURL=chat-loader.js.map