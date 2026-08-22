'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AreaChart, ResponsiveContainer } from 'recharts';
export { Area as AreaChartArea, CartesianGrid as AreaChartGrid, Tooltip as AreaChartTooltip, XAxis as AreaChartXAxis, YAxis as AreaChartYAxis, } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { areaChartVariants } from './area-chart.styles';
export const AreaChartRoot = ({ children, className, data, height = 300, margin = { bottom: 0, left: 0, right: 8, top: 8 }, width = '100%', ...props }) => {
    const slots = useMemo(() => areaChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "area-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(AreaChart, { data: data, margin: margin, children: children }) }) }));
};
//# sourceMappingURL=area-chart.js.map