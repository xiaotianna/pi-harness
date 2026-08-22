'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { LineChart, ResponsiveContainer } from 'recharts';
import { CartesianGrid, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { ChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { lineChartVariants } from './line-chart.styles';
const LineChartRoot = ({ children, className, data, height = 300, margin = { bottom: 0, left: 0, right: 8, top: 8 }, width = '100%', ...props }) => {
    const slots = useMemo(() => lineChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "line-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(LineChart, { data: data, margin: margin, children: children }) }) }));
};
export { LineChartRoot };
export { CartesianGrid as LineChartGrid, Line as LineChartLine, Tooltip as LineChartTooltip, ChartTooltipContent as LineChartTooltipContent, XAxis as LineChartXAxis, YAxis as LineChartYAxis, };
//# sourceMappingURL=line-chart.js.map