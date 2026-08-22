'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Select } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ChevronsExpandVertical } from '../icons';
import { inlineSelectVariants } from './inline-select.styles';
const InlineSelectContext = createContext({});
// ---- Components ----
export const InlineSelectRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => inlineSelectVariants(), []);
    return (_jsx(InlineSelectContext.Provider, { value: { slots }, children: _jsx(Select, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "inline-select", ...props, children: children }) }));
};
export const InlineSelectTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(InlineSelectContext);
    return (_jsx(Select.Trigger, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "inline-select-trigger", ...props, children: children }));
};
export const InlineSelectValue = ({ children, className, ...props }) => {
    const { slots } = useContext(InlineSelectContext);
    return (_jsx(Select.Value, { className: composeTwRenderProps(className, slots?.value()), "data-slot": "inline-select-value", ...props, children: children }));
};
export const InlineSelectIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(InlineSelectContext);
    return (_jsx(Select.Indicator, { className: composeSlotClassName(slots?.indicator, className), "data-slot": "inline-select-indicator", ...props, children: children === undefined ? _jsx(ChevronsExpandVertical, {}) : children }));
};
export const InlineSelectPopover = ({ children, className, placement = 'bottom end', ...props }) => {
    const { slots } = useContext(InlineSelectContext);
    return (_jsx(Select.Popover, { className: composeTwRenderProps(className, slots?.popover()), "data-slot": "inline-select-popover", placement: placement, ...props, children: children }));
};
//# sourceMappingURL=inline-select.js.map