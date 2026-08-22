'use client';
import { useMemo } from 'react';
import { PieChart, ResponsiveContainer } from 'recharts';
export { Cell as PieChartCell, Label as PieChartLabel, Pie as PieChartPie, Tooltip as PieChartTooltip, } from 'recharts';
import { jsx } from 'react/jsx-runtime';
import { composeSlotClassName } from '../../utils/compose';
import { pieChartVariants } from './pie-chart.styles';
export const PieChartRoot = ({ children, className, height = 300, width = '100%', ...props }) => {
    const slots = useMemo(() => pieChartVariants(), []);
    return jsx('div', {
        className: composeSlotClassName(slots?.base, className),
        'data-slot': 'pie-chart',
        ...props,
        children: jsx(ResponsiveContainer, {
            height,
            width,
            children: jsx(PieChart, { children }),
        }),
    });
};
//# sourceMappingURL=pie-chart.js.map