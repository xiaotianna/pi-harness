'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Disclosure } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { TextShimmer } from '../text-shimmer/text-shimmer';
import { chatToolGroupVariants } from './chat-tool.styles';
const ChatToolGroupContext = createContext({
    active: false,
    slots: chatToolGroupVariants(),
});
const useSlots = () => {
    const { slots } = useContext(ChatToolGroupContext);
    const fallback = useMemo(() => chatToolGroupVariants(), []);
    return slots ?? fallback;
};
export const ChatToolGroupRoot = ({ active = false, children, className, ...props }) => {
    const slots = useMemo(() => chatToolGroupVariants(), []);
    return (_jsx(ChatToolGroupContext.Provider, { value: { active, slots }, children: _jsx(Disclosure, { className: composeTwRenderProps(className, slots?.base()), "data-active": active || undefined, "data-slot": "chat-tool-group", ...props, children: children }) }));
};
export const ChatToolGroupTrigger = ({ children, className, ...props }) => {
    const { active } = useContext(ChatToolGroupContext);
    const slots = useSlots();
    const content = active ? _jsx(TextShimmer, { children: children }) : children;
    return (_jsx(Disclosure.Heading, { children: _jsxs(Disclosure.Trigger, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "chat-tool-group-trigger", ...props, children: [_jsx("span", { className: composeSlotClassName(slots?.triggerLabel, undefined), children: content }), _jsx(Disclosure.Indicator, { className: "text-muted size-3.5 shrink-0" })] }) }));
};
export const ChatToolGroupContent = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(Disclosure.Content, { className: composeTwRenderProps(className, slots?.content()), "data-slot": "chat-tool-group-content", ...props, children: _jsx(Disclosure.Body, { children: _jsx("div", { className: composeSlotClassName(slots?.contentBody, undefined), children: children }) }) }));
};
//# sourceMappingURL=chat-tool-group.js.map