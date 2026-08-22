'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { BarChart, ResponsiveContainer } from 'recharts';
export { Bar as BarChartBar, CartesianGrid as BarChartGrid, Tooltip as BarChartTooltip, XAxis as BarChartXAxis, YAxis as BarChartYAxis, } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { barChartVariants } from './bar-chart.styles';
export const BarChartRoot = ({ children, className, data, height = 300, layout, margin = { bottom: 0, left: 0, right: 8, top: 8 }, width = '100%', ...props }) => {
    const slots = useMemo(() => barChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "bar-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(BarChart, { data: data, layout: layout, margin: margin, children: children }) }) }));
};
//# sourceMappingURL=bar-chart.js.map