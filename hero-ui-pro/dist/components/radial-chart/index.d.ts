import type { ComponentProps } from 'react';
import { PolarAngleAxis, RadialBar, Tooltip } from 'recharts';
import { ChartTooltipContent as RadialChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import type { RadialChartAngleAxis, RadialChartBar, RadialChartCell, RadialChartTooltip } from './radial-chart';
import { RadialChartRoot } from './radial-chart';
export { radialChartVariants } from './radial-chart.styles';
export { PolarAngleAxis as RadialChartAngleAxis, RadialBar as RadialChartBar, Cell as RadialChartCell, Tooltip as RadialChartTooltip, } from 'recharts';
declare const RadialChart: (({ barSize, children, className, data, endAngle, height, innerRadius, outerRadius, startAngle, width, ...props }: import("./radial-chart").RadialChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    AngleAxis: typeof PolarAngleAxis;
    Bar: typeof RadialBar;
    Cell: import("react").FunctionComponent<import("recharts").CellProps>;
    Root: ({ barSize, children, className, data, endAngle, height, innerRadius, outerRadius, startAngle, width, ...props }: import("./radial-chart").RadialChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof Tooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
};
export { RadialChart, RadialChartRoot, RadialChartTooltipContent };
export type { RadialChartRootProps as RadialChartProps, RadialChartRootProps, } from './radial-chart';
export type { RadialChartVariants } from './radial-chart.styles';
export type RadialChart = {
    AngleAxisProps: ComponentProps<typeof RadialChartAngleAxis>;
    BarProps: ComponentProps<typeof RadialChartBar>;
    CellProps: ComponentProps<typeof RadialChartCell>;
    Props: ComponentProps<typeof RadialChartRoot>;
    RootProps: ComponentProps<typeof RadialChartRoot>;
    TooltipContentProps: ComponentProps<typeof RadialChartTooltipContent>;
    TooltipProps: ComponentProps<typeof RadialChartTooltip>;
};
//# sourceMappingURL=index.d.ts.map