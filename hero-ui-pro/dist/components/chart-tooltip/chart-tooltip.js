'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { chartTooltipVariants } from './chart-tooltip.styles';
const ChartTooltipContext = createContext({});
// ── Components ───────────────────────────────────────────────────────────────
export const ChartTooltipRoot = ({ active = true, children, className, indicator, ...props }) => {
    const slots = useMemo(() => chartTooltipVariants({ indicator }), [indicator]);
    if (!active)
        return null;
    return (_jsx(ChartTooltipContext, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "chart-tooltip", ...props, children: children }) }));
};
export const ChartTooltipHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(ChartTooltipContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "chart-tooltip-header", ...props, children: children }));
};
export const ChartTooltipItem = ({ children, className, ...props }) => {
    const { slots } = useContext(ChartTooltipContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.item, className), "data-slot": "chart-tooltip-item", ...props, children: children }));
};
export const ChartTooltipIndicator = ({ className, color, style, ...props }) => {
    const { slots } = useContext(ChartTooltipContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.indicator, className), "data-slot": "chart-tooltip-indicator", style: { backgroundColor: color, ...style }, ...props }));
};
export const ChartTooltipLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(ChartTooltipContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.label, className), "data-slot": "chart-tooltip-label", ...props, children: children }));
};
export const ChartTooltipValue = ({ children, className, ...props }) => {
    const { slots } = useContext(ChartTooltipContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.value, className), "data-slot": "chart-tooltip-value", ...props, children: children }));
};
//# sourceMappingURL=chart-tooltip.js.map