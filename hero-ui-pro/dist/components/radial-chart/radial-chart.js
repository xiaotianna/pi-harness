'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { RadialBarChart, ResponsiveContainer } from 'recharts';
export { PolarAngleAxis as RadialChartAngleAxis, RadialBar as RadialChartBar, Cell as RadialChartCell, Tooltip as RadialChartTooltip, } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { radialChartVariants } from './radial-chart.styles';
const RadialChartRoot = ({ barSize = 10, children, className, data, endAngle = -270, height = 300, innerRadius = '30%', outerRadius = '80%', startAngle = 90, width = '100%', ...props }) => {
    const slots = useMemo(() => radialChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "radial-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(RadialBarChart, { barSize: barSize, cx: "50%", cy: "50%", data: data, endAngle: endAngle, innerRadius: innerRadius, outerRadius: outerRadius, startAngle: startAngle, children: children }) }) }));
};
export { RadialChartRoot };
//# sourceMappingURL=radial-chart.js.map