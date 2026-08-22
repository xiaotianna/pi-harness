'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Switch } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { cellSwitchVariants } from './cell-switch.styles';
const CellSwitchCtx = createContext({});
// ─── Components ───────────────────────────────────────────────────────────────
export const CellSwitchRoot = ({ children, className, variant = 'default', ...props }) => {
    const slots = useMemo(() => cellSwitchVariants({ variant }), [variant]);
    return (_jsx(CellSwitchCtx.Provider, { value: { slots }, children: _jsx(Switch, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "cell-switch", ...props, children: children }) }));
};
export const CellSwitchTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSwitchCtx);
    return (_jsx("div", { className: composeSlotClassName(slots?.trigger, className), "data-slot": "cell-switch-trigger", ...props, children: children }));
};
export const CellSwitchLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSwitchCtx);
    return (_jsx("span", { className: composeSlotClassName(slots?.label, className), "data-slot": "cell-switch-label", ...props, children: children }));
};
export const CellSwitchControl = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSwitchCtx);
    return (_jsx(Switch.Control, { className: composeSlotClassName(slots?.control, className), "data-slot": "cell-switch-control", ...props, children: children === undefined ? _jsx(Switch.Thumb, {}) : children }));
};
//# sourceMappingURL=cell-switch.js.map