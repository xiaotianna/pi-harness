import type { ComponentProps } from 'react';
import { Label, Tooltip } from 'recharts';
import { ChartTooltipContent as PieChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import type { PieChartCell, PieChartLabel, PieChartPie, PieChartTooltip } from './pie-chart';
import { PieChartRoot } from './pie-chart';
export { pieChartVariants } from './pie-chart.styles';
export { Cell as PieChartCell, Label as PieChartLabel, Pie as PieChartPie, Tooltip as PieChartTooltip, } from 'recharts';
declare const PieChart: (({ children, className, height, width, ...props }: import("./pie-chart").PieChartRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Cell: import("react").FunctionComponent<import("recharts").CellProps>;
    Label: typeof Label;
    Pie: {
        <DataPointType = any, DataValueType = any>(outsideProps: import("recharts").PieProps<DataPointType, DataValueType>): import("react").ReactElement;
        (outsideProps: import("recharts").PieProps<any, any>): import("react").ReactElement;
    };
    Root: ({ children, className, height, width, ...props }: import("./pie-chart").PieChartRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Tooltip: typeof Tooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
};
export { PieChart, PieChartRoot, PieChartTooltipContent };
export type { PieChartRootProps as PieChartProps, PieChartRootProps, } from './pie-chart';
export type { PieChartVariants } from './pie-chart.styles';
export type PieChart = {
    CellProps: ComponentProps<typeof PieChartCell>;
    LabelProps: ComponentProps<typeof PieChartLabel>;
    PieProps: ComponentProps<typeof PieChartPie>;
    Props: ComponentProps<typeof PieChartRoot>;
    RootProps: ComponentProps<typeof PieChartRoot>;
    TooltipContentProps: ComponentProps<typeof PieChartTooltipContent>;
    TooltipProps: ComponentProps<typeof PieChartTooltip>;
};
//# sourceMappingURL=index.d.ts.map