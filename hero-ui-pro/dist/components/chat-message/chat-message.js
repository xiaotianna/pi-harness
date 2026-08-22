'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Avatar, Button, Tooltip } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { chatMessageVariants } from './chat-message.styles';
const ChatMessageContext = createContext({});
const useSlots = () => {
    const { slots } = useContext(ChatMessageContext);
    const computed = useMemo(() => chatMessageVariants(), []);
    return slots ?? computed;
};
// ─── ChatMessageUser ──────────────────────────────────────────────────────────
const ChatMessageUser = ({ children, className, ...props }) => {
    const slots = useMemo(() => chatMessageVariants(), []);
    return (_jsx(ChatMessageContext, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.user, className), "data-slot": "chat-message-user", ...props, children: children }) }));
};
// ─── ChatMessageAssistant ─────────────────────────────────────────────────────
const ChatMessageAssistant = ({ children, className, ...props }) => {
    const slots = useMemo(() => chatMessageVariants(), []);
    return (_jsx(ChatMessageContext, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.assistant, className), "data-slot": "chat-message-assistant", ...props, children: children }) }));
};
// ─── ChatMessageBubble ────────────────────────────────────────────────────────
const ChatMessageBubble = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.bubble, className), "data-slot": "chat-message-bubble", ...props, children: children }));
};
// ─── ChatMessageContent ───────────────────────────────────────────────────────
const ChatMessageContent = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "chat-message-content", ...props, children: children }));
};
// ─── ChatMessageMedia ─────────────────────────────────────────────────────────
const ChatMessageMedia = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.media, className), "data-slot": "chat-message-media", ...props, children: children }));
};
// ─── ChatMessageActions ───────────────────────────────────────────────────────
const ChatMessageActions = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.actions, className), "data-slot": "chat-message-actions", ...props, children: children }));
};
// ─── ChatMessageAction ────────────────────────────────────────────────────────
const ChatMessageAction = ({ 'aria-label': ariaLabel, children, className, tooltip, ...props }) => {
    const slots = useSlots();
    const button = (_jsx(Button, { "aria-label": ariaLabel, className: composeTwRenderProps(className, slots?.action()), "data-slot": "chat-message-action", isIconOnly: true, size: "sm", variant: "ghost", ...props, children: children }));
    return tooltip ? (_jsxs(Tooltip, { delay: 0, children: [_jsx(Tooltip.Trigger, { children: button }), _jsx(Tooltip.Content, { children: tooltip })] })) : (button);
};
// ─── ChatMessageBody ──────────────────────────────────────────────────────────
const ChatMessageBody = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.body, className), "data-slot": "chat-message-body", ...props, children: children }));
};
// ─── ChatMessageAvatar ────────────────────────────────────────────────────────
const ChatMessageAvatar = ({ alt, className, fallback, show = true, src, ...props }) => {
    const slots = useSlots();
    if (show) {
        return (_jsx("div", { className: composeSlotClassName(slots?.avatar, className), "data-slot": "chat-message-avatar", ...props, children: _jsxs(Avatar, { className: "size-8", children: [src ? _jsx(Avatar.Image, { alt: alt, src: src }) : null, fallback ? _jsx(Avatar.Fallback, { children: fallback }) : null] }) }));
    }
    return (_jsx("div", { "aria-hidden": true, className: composeSlotClassName(slots?.avatarSpacer, className), "data-slot": "chat-message-avatar-spacer", ...props }));
};
export { ChatMessageAction, ChatMessageActions, ChatMessageAssistant, ChatMessageAvatar, ChatMessageBody, ChatMessageBubble, ChatMessageContent, ChatMessageMedia, ChatMessageUser, };
//# sourceMappingURL=chat-message.js.map