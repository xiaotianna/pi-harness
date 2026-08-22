import type { ComponentProps } from 'react';
import { LineChartGrid, LineChartLine, LineChartRoot, LineChartTooltip, LineChartTooltipContent, LineChartXAxis, LineChartYAxis } from './line-chart';
export { lineChartVariants } from './line-chart.styles';
export { CartesianGrid as LineChartGrid, Line as LineChartLine, Tooltip as LineChartTooltip, XAxis as LineChartXAxis, YAxis as LineChartYAxis, } from 'recharts';
declare const LineChart: (({ children, className, data, height, margin, width, ...props }: import("./line-chart").LineChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Grid: typeof LineChartGrid;
    Line: {
        <DataPointType = any, ValueAxisType = any>(props: import("recharts").LineProps<DataPointType, ValueAxisType>): import("react").ReactElement;
        (props: import("recharts").LineProps<any, any>): import("react").ReactElement;
    };
    Root: ({ children, className, data, height, margin, width, ...props }: import("./line-chart").LineChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof LineChartTooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
    XAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").XAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
    YAxis: <DataPointType = any, DataValueType = any>(props: import("recharts").YAxisProps<DataPointType, DataValueType>) => import("react").ReactElement;
};
export { LineChart, LineChartRoot, LineChartTooltipContent };
export type { LineChartRootProps } from './line-chart';
export type { LineChartVariants } from './line-chart.styles';
export type LineChart = {
    GridProps: ComponentProps<typeof LineChartGrid>;
    LineProps: ComponentProps<typeof LineChartLine>;
    Props: ComponentProps<typeof LineChartRoot>;
    RootProps: ComponentProps<typeof LineChartRoot>;
    TooltipContentProps: ComponentProps<typeof LineChartTooltipContent>;
    TooltipProps: ComponentProps<typeof LineChartTooltip>;
    XAxisProps: ComponentProps<typeof LineChartXAxis>;
    YAxisProps: ComponentProps<typeof LineChartYAxis>;
};
//# sourceMappingURL=index.d.ts.map