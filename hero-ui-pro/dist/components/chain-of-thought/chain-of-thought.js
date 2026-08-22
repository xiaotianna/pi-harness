'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Button, Disclosure } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { TextShimmer } from '../text-shimmer/text-shimmer';
import { chainOfThoughtVariants } from './chain-of-thought.styles';
const ChainOfThoughtContext = createContext({});
function useSlots() {
    const { isStreaming, slots } = useContext(ChainOfThoughtContext);
    const computed = useMemo(() => chainOfThoughtVariants({
        status: isStreaming ? 'streaming' : 'complete',
    }), [isStreaming]);
    return slots ?? computed;
}
// ── Components ───────────────────────────────────────────────────────────────
export const ChainOfThoughtRoot = ({ children, className, isStreaming = false, ...props }) => {
    const slots = useMemo(() => chainOfThoughtVariants({
        status: isStreaming ? 'streaming' : 'complete',
    }), [isStreaming]);
    return (_jsx(ChainOfThoughtContext, { value: { isStreaming, slots }, children: _jsx(Disclosure, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "chain-of-thought", ...props, children: children }) }));
};
export const ChainOfThoughtTrigger = ({ children, className, ...props }) => {
    const { isStreaming } = useContext(ChainOfThoughtContext);
    const slots = useSlots();
    const content = isStreaming ? (_jsx(TextShimmer, { children: children })) : (children);
    return (_jsx(Disclosure.Heading, { children: _jsxs(Button, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "chain-of-thought-trigger", slot: "trigger", variant: "ghost", size: "sm", ...props, children: [content, _jsx(Disclosure.Indicator, { className: "text-muted size-3.5" })] }) }));
};
export const ChainOfThoughtContent = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(Disclosure.Content, { className: composeTwRenderProps(className, slots?.content()), "data-slot": "chain-of-thought-content", ...props, children: _jsx(Disclosure.Body, { children: children }) }));
};
export const ChainOfThoughtSteps = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.steps, className), "data-slot": "chain-of-thought-steps", ...props, children: children }));
};
export const ChainOfThoughtStep = ({ children, className, label, ...props }) => {
    const slots = useSlots();
    return (_jsxs("div", { className: composeSlotClassName(slots?.step, className), "data-slot": "chain-of-thought-step", ...props, children: [label ? (_jsxs("div", { className: composeSlotClassName(slots?.stepHeader, undefined), children: [_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.stepIndicator, undefined) }), _jsx("span", { className: composeSlotClassName(slots?.stepLabel, undefined), children: label })] })) : null, _jsx("div", { className: composeSlotClassName(slots?.stepContent, undefined), children: children })] }));
};
//# sourceMappingURL=chain-of-thought.js.map