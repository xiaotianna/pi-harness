'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ListViewDescription, ListViewItem, ListViewItemAction, ListViewItemContent, ListViewRoot, ListViewTitle, } from '../list-view/list-view';
import { chatListViewVariants } from './chat-list-view.styles';
const ChatListViewContext = createContext({});
const useSlots = () => {
    const { density, slots } = useContext(ChatListViewContext);
    const computed = useMemo(() => chatListViewVariants({ density: density ?? 'comfortable' }), [density]);
    return slots ?? computed;
};
// ─── ChatListViewRoot ─────────────────────────────────────────────────────────
const ChatListViewRoot = ({ children, className, density = 'comfortable', ...props }) => {
    const slots = useMemo(() => chatListViewVariants({ density }), [density]);
    return (_jsx(ChatListViewContext, { value: { density, slots }, children: _jsx(ListViewRoot, { className: composeTwRenderProps(className, slots.base()), "data-slot": "chat-list-view", variant: "secondary", ...props, children: children }) }));
};
// ─── ChatListViewItem ─────────────────────────────────────────────────────────
const ChatListViewItem = ({ children, className, ...props }) => (_jsx(ListViewItem, { className: className, "data-slot": "chat-list-view-item", ...props, children: children }));
// ─── ChatListViewItemContent ──────────────────────────────────────────────────
const ChatListViewItemContent = ({ children, className, ...props }) => (_jsx(ListViewItemContent, { className: className, "data-slot": "chat-list-view-item-content", ...props, children: children }));
// ─── ChatListViewIcon ─────────────────────────────────────────────────────────
const ChatListViewIcon = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.icon, className), "data-slot": "chat-list-view-icon", ...props, children: children }));
};
// ─── ChatListViewText ─────────────────────────────────────────────────────────
const ChatListViewText = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.text, className), "data-slot": "chat-list-view-text", ...props, children: children }));
};
// ─── ChatListViewTitle ────────────────────────────────────────────────────────
const ChatListViewTitle = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(ListViewTitle, { className: composeSlotClassName(slots?.title, className), "data-slot": "chat-list-view-title", ...props, children: children }));
};
// ─── ChatListViewPreview ──────────────────────────────────────────────────────
const ChatListViewPreview = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(ListViewDescription, { className: composeSlotClassName(slots?.preview, className), "data-slot": "chat-list-view-preview", ...props, children: children }));
};
// ─── ChatListViewMeta ─────────────────────────────────────────────────────────
const ChatListViewMeta = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(ListViewItemAction, { className: composeSlotClassName(slots?.meta, className), "data-slot": "chat-list-view-meta", ...props, children: children }));
};
export { ChatListViewIcon, ChatListViewItem, ChatListViewItemContent, ChatListViewMeta, ChatListViewPreview, ChatListViewRoot, ChatListViewText, ChatListViewTitle, };
//# sourceMappingURL=chat-list-view.js.map