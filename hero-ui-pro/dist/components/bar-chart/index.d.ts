import type { ComponentProps } from 'react';
import { CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltipContent as BarChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import type { BarChartBar, BarChartGrid, BarChartTooltip, BarChartXAxis, BarChartYAxis } from './bar-chart';
import { BarChartRoot } from './bar-chart';
export { barChartVariants } from './bar-chart.styles';
export { Bar as BarChartBar, CartesianGrid as BarChartGrid, Tooltip as BarChartTooltip, XAxis as BarChartXAxis, YAxis as BarChartYAxis, } from 'recharts';
export declare const BarChart: (({ children, className, data, height, layout, margin, width, ...props }: import("./bar-chart").BarChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Bar: <DataPointType = any, ValueAxisType = any>(props: import("recharts").BarProps<DataPointType, ValueAxisType>) => import("react").ReactElement;
    Grid: typeof CartesianGrid;
    Root: ({ children, className, data, height, layout, margin, width, ...props }: import("./bar-chart").BarChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof Tooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
    XAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").XAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
    YAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").YAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
};
export { BarChartRoot, BarChartTooltipContent };
export type { BarChartRootProps as BarChartProps, BarChartRootProps, } from './bar-chart';
export type { BarChartVariants } from './bar-chart.styles';
export type BarChart = {
    BarProps: ComponentProps<typeof BarChartBar>;
    GridProps: ComponentProps<typeof BarChartGrid>;
    Props: ComponentProps<typeof BarChartRoot>;
    RootProps: ComponentProps<typeof BarChartRoot>;
    TooltipContentProps: ComponentProps<typeof BarChartTooltipContent>;
    TooltipProps: ComponentProps<typeof BarChartTooltip>;
    XAxisProps: ComponentProps<typeof BarChartXAxis>;
    YAxisProps: ComponentProps<typeof BarChartYAxis>;
};
//# sourceMappingURL=index.d.ts.map