import type { ComponentProps } from 'react';
import { PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { ChartTooltipContent as RadarChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import type { RadarChartAngleAxis, RadarChartGrid, RadarChartRadar, RadarChartRadiusAxis, RadarChartTooltip } from './radar-chart';
import { RadarChartRoot } from './radar-chart';
export { radarChartVariants } from './radar-chart.styles';
export { PolarAngleAxis as RadarChartAngleAxis, PolarGrid as RadarChartGrid, Radar as RadarChartRadar, PolarRadiusAxis as RadarChartRadiusAxis, Tooltip as RadarChartTooltip, } from 'recharts';
declare const RadarChart: (({ children, className, data, height, width, ...props }: import("./radar-chart").RadarChartRootProps) => import("react/jsx-runtime").JSX.Element) & {
    AngleAxis: typeof PolarAngleAxis;
    Grid: {
        (outsideProps: import("recharts").PolarGridProps): React.JSX.Element | null;
        displayName: string;
    };
    Radar: typeof Radar;
    RadiusAxis: typeof PolarRadiusAxis;
    Root: ({ children, className, data, height, width, ...props }: import("./radar-chart").RadarChartRootProps) => import("react/jsx-runtime").JSX.Element;
    Tooltip: typeof Tooltip;
    TooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("..").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
};
export { RadarChart, RadarChartRoot, RadarChartTooltipContent };
export type { RadarChartRootProps as RadarChartProps, RadarChartRootProps, } from './radar-chart';
export type { RadarChartVariants } from './radar-chart.styles';
export type RadarChart = {
    AngleAxisProps: ComponentProps<typeof RadarChartAngleAxis>;
    GridProps: ComponentProps<typeof RadarChartGrid>;
    Props: ComponentProps<typeof RadarChartRoot>;
    RadarProps: ComponentProps<typeof RadarChartRadar>;
    RadiusAxisProps: ComponentProps<typeof RadarChartRadiusAxis>;
    RootProps: ComponentProps<typeof RadarChartRoot>;
    TooltipContentProps: ComponentProps<typeof RadarChartTooltipContent>;
    TooltipProps: ComponentProps<typeof RadarChartTooltip>;
};
//# sourceMappingURL=index.d.ts.map