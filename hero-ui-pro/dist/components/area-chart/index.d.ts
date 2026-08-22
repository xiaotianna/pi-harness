import type { ComponentProps } from 'react';
import { CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltipContent as AreaChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import type { AreaChartArea, AreaChartGrid, AreaChartTooltip, AreaChartXAxis, AreaChartYAxis } from './area-chart';
import { AreaChartRoot } from './area-chart';
export { areaChartVariants } from './area-chart.styles';
export { Area as AreaChartArea, CartesianGrid as AreaChartGrid, Tooltip as AreaChartTooltip, XAxis as AreaChartXAxis, YAxis as AreaChartYAxis, } from 'recharts';
export declare const AreaChart: (({ children, className, data, height, margin, width, ...props }: import("./area-chart").AreaChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Area: <DataPointType = any, ValueAxisType = any>(props: import("recharts").AreaProps<DataPointType, ValueAxisType>) => import("react").ReactElement;
    Grid: typeof CartesianGrid;
    Root: ({ children, className, data, height, margin, width, ...props }: import("./area-chart").AreaChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof Tooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
    XAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").XAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
    YAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").YAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
};
export { AreaChartRoot, AreaChartTooltipContent };
export type { AreaChartRootProps as AreaChartProps, AreaChartRootProps, } from './area-chart';
export type { AreaChartVariants } from './area-chart.styles';
export type AreaChart = {
    AreaProps: ComponentProps<typeof AreaChartArea>;
    GridProps: ComponentProps<typeof AreaChartGrid>;
    Props: ComponentProps<typeof AreaChartRoot>;
    RootProps: ComponentProps<typeof AreaChartRoot>;
    TooltipContentProps: ComponentProps<typeof AreaChartTooltipContent>;
    TooltipProps: ComponentProps<typeof AreaChartTooltip>;
    XAxisProps: ComponentProps<typeof AreaChartXAxis>;
    YAxisProps: ComponentProps<typeof AreaChartYAxis>;
};
//# sourceMappingURL=index.d.ts.map