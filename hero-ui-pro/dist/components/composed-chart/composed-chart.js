'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ComposedChart, ResponsiveContainer } from 'recharts';
export { Area as ComposedChartArea, Bar as ComposedChartBar, CartesianGrid as ComposedChartGrid, Line as ComposedChartLine, Tooltip as ComposedChartTooltip, XAxis as ComposedChartXAxis, YAxis as ComposedChartYAxis, } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { ChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { composedChartVariants } from './composed-chart.styles';
export { ChartTooltipContent as ComposedChartTooltipContent };
// ── Component ────────────────────────────────────────────────────────────────
export const ComposedChartRoot = ({ children, className, data, height = 300, margin = { bottom: 0, left: 0, right: 8, top: 8 }, width = '100%', ...props }) => {
    const slots = useMemo(() => composedChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "composed-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(ComposedChart, { data: data, margin: margin, children: children }) }) }));
};
//# sourceMappingURL=composed-chart.js.map