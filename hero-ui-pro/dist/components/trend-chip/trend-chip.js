'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo, } from 'react';
import { Chip } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { trendChipVariants } from './trend-chip.styles';
const TrendChipContext = createContext({});
const TrendIcons = {
    down: (props) => (_jsx("svg", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, viewBox: "0 0 24 24", ...props, children: _jsx("path", { d: "M12 5v14m5-5-5 5-5-5" }) })),
    neutral: null,
    up: (props) => (_jsx("svg", { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, viewBox: "0 0 24 24", ...props, children: _jsx("path", { d: "M12 19V5m-5 5 5-5 5 5" }) })),
};
const trendColorMap = {
    down: 'danger',
    neutral: 'default',
    up: 'success',
};
const TrendChipIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(TrendChipContext);
    if (!children)
        return null;
    if (React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            className: composeSlotClassName(slots?.indicator, className),
            'data-slot': 'trend-chip-indicator',
        });
    }
    return null;
};
const TrendChipPrefix = ({ children, className, ...props }) => {
    const { slots } = useContext(TrendChipContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.prefix, className), "data-slot": "trend-chip-prefix", ...props, children: children }));
};
const TrendChipSuffix = ({ children, className, ...props }) => {
    const { slots } = useContext(TrendChipContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.suffix, className), "data-slot": "trend-chip-suffix", ...props, children: children }));
};
const TrendChipRoot = ({ children, className, size, trend = 'up', variant = 'soft', ...props }) => {
    const slots = useMemo(() => trendChipVariants({ size }), [size]);
    const chipColor = trendColorMap[trend];
    const resolvedSize = size ?? 'sm';
    let indicator = null;
    let prefix = null;
    let suffix = null;
    const content = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type === TrendChipIndicator)
                indicator = child;
            else if (child.type === TrendChipPrefix)
                prefix = child;
            else if (child.type === TrendChipSuffix)
                suffix = child;
            else
                content.push(child);
        }
        else {
            content.push(child);
        }
    });
    const IconComponent = TrendIcons[trend];
    const resolvedIndicator = indicator ??
        (IconComponent ? (_jsx(IconComponent, { className: composeSlotClassName(slots?.indicator), "data-slot": "trend-chip-indicator" })) : null);
    return (_jsx(TrendChipContext.Provider, { value: { slots }, children: _jsxs(Chip, { className: composeSlotClassName(slots?.base, className), color: chipColor, "data-slot": "trend-chip", "data-trend": trend, size: resolvedSize, variant: variant, ...props, children: [resolvedIndicator, _jsxs(Chip.Label, { children: [prefix, ' ', _jsx("span", { className: slots?.value(), "data-slot": "trend-chip-value", children: content }), ' ', suffix] })] }) }));
};
export { TrendChipIndicator, TrendChipPrefix, TrendChipRoot, TrendChipSuffix };
//# sourceMappingURL=trend-chip.js.map