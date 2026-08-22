'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Disclosure } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { chatSourcesVariants } from './chat-source.styles';
const ChatSourcesContext = createContext({
    slots: chatSourcesVariants(),
});
const useSlots = () => {
    const { slots } = useContext(ChatSourcesContext);
    const fallback = useMemo(() => chatSourcesVariants(), []);
    return slots ?? fallback;
};
export const ChatSourcesRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => chatSourcesVariants(), []);
    return (_jsx(ChatSourcesContext.Provider, { value: { slots }, children: _jsx(Disclosure, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "chat-sources", ...props, children: children }) }));
};
export const ChatSourcesTrigger = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(Disclosure.Heading, { children: _jsxs(Disclosure.Trigger, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "chat-sources-trigger", ...props, children: [_jsx("span", { className: composeSlotClassName(slots?.triggerLabel, undefined), children: children }), _jsx(Disclosure.Indicator, { className: "text-muted size-3.5 shrink-0" })] }) }));
};
export const ChatSourcesContent = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(Disclosure.Content, { className: composeTwRenderProps(className, slots?.content()), "data-slot": "chat-sources-content", ...props, children: _jsx(Disclosure.Body, { children: _jsx("div", { className: composeSlotClassName(slots?.contentBody, undefined), children: children }) }) }));
};
export const ChatSourcesList = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.list, className), "data-slot": "chat-sources-list", ...props, children: children }));
};
//# sourceMappingURL=chat-sources.js.map