'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useId, useMemo } from 'react';
import { Button, Card, ProgressBar, Separator } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { AreaChart } from '../area-chart/index';
import { NumberValue } from '../number-value/index';
import { TrendChip } from '../trend-chip/index';
import { kpiVariants } from './kpi.styles';
const KPIContext = createContext({});
const KPIDotsIcon = (props) => (_jsxs("svg", { fill: "currentColor", viewBox: "0 0 16 16", ...props, children: [_jsx("circle", { cx: "8", cy: "3", r: "1.5" }), _jsx("circle", { cx: "8", cy: "8", r: "1.5" }), _jsx("circle", { cx: "8", cy: "13", r: "1.5" })] }));
const KPIRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => kpiVariants(), []);
    return (_jsx(KPIContext.Provider, { value: { slots }, children: _jsx(Card, { className: composeSlotClassName(slots?.base, className), "data-slot": "kpi", ...props, children: children }) }));
};
const KPIHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "kpi-header", ...props, children: children }));
};
const KPIContent = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "kpi-content", ...props, children: children }));
};
const KPIIcon = ({ children, className, status, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.icon, className), "data-slot": "kpi-icon", "data-status": status, ...props, children: children }));
};
const KPITitle = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("dt", { className: composeSlotClassName(slots?.title, className), "data-slot": "kpi-title", ...props, children: children }));
};
const KPIValue = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx(NumberValue, { ...props, children: (formatted) => (_jsx("dd", { className: composeSlotClassName(slots?.value, className), "data-slot": "kpi-value", children: typeof children === 'function' ? children(formatted) : formatted })) }));
};
const KPITrend = ({ className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx(TrendChip, { className: composeSlotClassName(slots?.trend, className), "data-slot": "kpi-trend", ...props }));
};
const KPIProgress = ({ className, status = 'success', value, ...props }) => {
    const { slots } = useContext(KPIContext);
    const clampedValue = Math.max(0, Math.min(100, value));
    return (_jsx("div", { className: composeSlotClassName(slots?.progress, className), "data-slot": "kpi-progress", ...props, children: _jsx(ProgressBar, { "aria-label": "Progress", color: status, size: "sm", value: clampedValue, children: _jsx(ProgressBar.Track, { children: _jsx(ProgressBar.Fill, {}) }) }) }));
};
const KPIActions = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.actions), "data-slot": "kpi-actions", children: _jsx(Button, { isIconOnly: true, className: className, size: "sm", variant: "ghost", ...props, children: children ?? _jsx(KPIDotsIcon, { className: "size-4" }) }) }));
};
const KPIChart = ({ className, color = 'currentColor', data, dataKey = 'value', fillColor, height = 80, strokeWidth = 2, tooltip, ...props }) => {
    const { slots } = useContext(KPIContext);
    const gradientId = `kpi-chart-gradient-${useId()}`;
    const resolvedFill = fillColor ?? color;
    return (_jsx("div", { className: composeSlotClassName(slots?.chart, className), "data-has-tooltip": tooltip ? true : undefined, "data-slot": "kpi-chart", ...props, children: _jsxs(AreaChart, { data: data, height: height, margin: { bottom: 0, left: 0, right: 0, top: 4 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: gradientId, x1: "0", x2: "0", y1: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: resolvedFill, stopOpacity: 0.2 }), _jsx("stop", { offset: "100%", stopColor: resolvedFill, stopOpacity: 0.02 })] }) }), _jsx(AreaChart.Area, { dataKey: dataKey, fill: `url(#${gradientId})`, isAnimationActive: false, stroke: color, strokeWidth: strokeWidth, type: "monotone" }), tooltip] }) }));
};
const KPISeparator = ({ className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx(Separator, { className: composeSlotClassName(slots?.separator, className), "data-slot": "kpi-separator", ...props }));
};
const KPIFooter = ({ children, className, ...props }) => {
    const { slots } = useContext(KPIContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.footer, className), "data-slot": "kpi-footer", ...props, children: children }));
};
export { KPIActions, KPIChart, KPIContent, KPIFooter, KPIHeader, KPIIcon, KPIProgress, KPIRoot, KPISeparator, KPITitle, KPITrend, KPIValue, };
//# sourceMappingURL=kpi.js.map