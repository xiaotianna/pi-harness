import type { ComponentProps } from 'react';
import { ComposedChartArea, ComposedChartBar, ComposedChartGrid, ComposedChartLine, ComposedChartRoot, ComposedChartTooltip, ComposedChartTooltipContent, ComposedChartXAxis, ComposedChartYAxis } from './composed-chart';
export declare const ComposedChart: (({ children, className, data, height, margin, width, ...props }: import("./composed-chart").ComposedChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Area: <DataPointType = any, ValueAxisType = any>(props: import("recharts").AreaProps<DataPointType, ValueAxisType>) => import("react").ReactElement;
    Bar: <DataPointType = any, ValueAxisType = any>(props: import("recharts").BarProps<DataPointType, ValueAxisType>) => import("react").ReactElement;
    Grid: typeof ComposedChartGrid;
    Line: {
        <DataPointType = any, ValueAxisType = any>(props: import("recharts").LineProps<DataPointType, ValueAxisType>): import("react").ReactElement;
        (props: import("recharts").LineProps<any, any>): import("react").ReactElement;
    };
    Root: ({ children, className, data, height, margin, width, ...props }: import("./composed-chart").ComposedChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof ComposedChartTooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
    XAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").XAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
    YAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").YAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
};
export type ComposedChart = {
    AreaProps: ComponentProps<typeof ComposedChartArea>;
    BarProps: ComponentProps<typeof ComposedChartBar>;
    GridProps: ComponentProps<typeof ComposedChartGrid>;
    LineProps: ComponentProps<typeof ComposedChartLine>;
    Props: ComponentProps<typeof ComposedChartRoot>;
    RootProps: ComponentProps<typeof ComposedChartRoot>;
    TooltipContentProps: ComponentProps<typeof ComposedChartTooltipContent>;
    TooltipProps: ComponentProps<typeof ComposedChartTooltip>;
    XAxisProps: ComponentProps<typeof ComposedChartXAxis>;
    YAxisProps: ComponentProps<typeof ComposedChartYAxis>;
};
export { ComposedChartArea, ComposedChartBar, ComposedChartGrid, ComposedChartLine, ComposedChartRoot, ComposedChartTooltip, ComposedChartTooltipContent, ComposedChartXAxis, ComposedChartYAxis, };
export type { ComposedChartRootProps } from './composed-chart';
export type { ComposedChartVariants } from './composed-chart.styles';
export { composedChartVariants } from './composed-chart.styles';
//# sourceMappingURL=index.d.ts.map