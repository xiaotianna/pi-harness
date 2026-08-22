'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { RadarChart as RechartsRadarChart, ResponsiveContainer, } from 'recharts';
export { PolarAngleAxis as RadarChartAngleAxis, PolarGrid as RadarChartGrid, Radar as RadarChartRadar, PolarRadiusAxis as RadarChartRadiusAxis, Tooltip as RadarChartTooltip, } from 'recharts';
import { composeSlotClassName } from '../../utils/compose';
import { radarChartVariants } from './radar-chart.styles';
const RadarChartRoot = ({ children, className, data, height = 300, width = '100%', ...props }) => {
    const slots = useMemo(() => radarChartVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "radar-chart", ...props, children: _jsx(ResponsiveContainer, { height: height, width: width, children: _jsx(RechartsRadarChart, { cx: "50%", cy: "50%", data: data, children: children }) }) }));
};
export { RadarChartRoot };
//# sourceMappingURL=radar-chart.js.map