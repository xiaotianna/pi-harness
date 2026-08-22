'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Select } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ChevronsExpandVertical } from '../icons';
import { cellSelectVariants } from './cell-select.styles';
const CellSelectCtx = createContext({});
// ─── Components ───────────────────────────────────────────────────────────────
export const CellSelectRoot = ({ children, className, variant = 'default', ...props }) => {
    const slots = useMemo(() => cellSelectVariants({ variant }), [variant]);
    return (_jsx(CellSelectCtx.Provider, { value: { slots }, children: _jsx(Select, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "cell-select", ...props, children: children }) }));
};
export const CellSelectTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSelectCtx);
    return (_jsx(Select.Trigger, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "cell-select-trigger", ...props, children: children }));
};
export const CellSelectLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSelectCtx);
    return (_jsx("span", { className: composeSlotClassName(slots?.label, className), "data-slot": "cell-select-label", ...props, children: children }));
};
export const CellSelectValue = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSelectCtx);
    return (_jsx(Select.Value, { className: composeTwRenderProps(className, slots?.value()), "data-slot": "cell-select-value", ...props, children: children }));
};
export const CellSelectIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSelectCtx);
    return (_jsx(Select.Indicator, { className: composeSlotClassName(slots?.indicator, className), "data-slot": "cell-select-indicator", ...props, children: children === undefined ? _jsx(ChevronsExpandVertical, {}) : children }));
};
export const CellSelectPopover = ({ children, className, placement = 'bottom end', ...props }) => {
    const { slots } = useContext(CellSelectCtx);
    return (_jsx(Select.Popover, { className: composeTwRenderProps(className, slots?.popover()), "data-slot": "cell-select-popover", placement: placement, ...props, children: children }));
};
//# sourceMappingURL=cell-select.js.map