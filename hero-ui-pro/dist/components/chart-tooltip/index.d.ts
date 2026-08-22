import type { ComponentProps } from 'react';
import { ChartTooltipHeader, ChartTooltipIndicator, ChartTooltipItem, ChartTooltipLabel, ChartTooltipRoot, ChartTooltipValue } from './chart-tooltip';
import { ChartTooltipContent } from './chart-tooltip-content';
export declare const ChartTooltip: (({ active, children, className, indicator, ...props }: import("./chart-tooltip").ChartTooltipRootProps) => import("react/jsx-runtime").JSX.Element | null) & {
    Content: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: import("./chart-tooltip-content").ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
    Header: ({ children, className, ...props }: import("./chart-tooltip").ChartTooltipHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Indicator: ({ className, color, style, ...props }: import("./chart-tooltip").ChartTooltipIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Item: ({ children, className, ...props }: import("./chart-tooltip").ChartTooltipItemProps) => import("react/jsx-runtime").JSX.Element;
    Label: ({ children, className, ...props }: import("./chart-tooltip").ChartTooltipLabelProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ active, children, className, indicator, ...props }: import("./chart-tooltip").ChartTooltipRootProps) => import("react/jsx-runtime").JSX.Element | null;
    Value: ({ children, className, ...props }: import("./chart-tooltip").ChartTooltipValueProps) => import("react/jsx-runtime").JSX.Element;
};
export type ChartTooltip = {
    ContentProps: ComponentProps<typeof ChartTooltipContent>;
    HeaderProps: ComponentProps<typeof ChartTooltipHeader>;
    IndicatorProps: ComponentProps<typeof ChartTooltipIndicator>;
    ItemProps: ComponentProps<typeof ChartTooltipItem>;
    LabelProps: ComponentProps<typeof ChartTooltipLabel>;
    Props: ComponentProps<typeof ChartTooltipRoot>;
    RootProps: ComponentProps<typeof ChartTooltipRoot>;
    ValueProps: ComponentProps<typeof ChartTooltipValue>;
};
export { ChartTooltipContent, ChartTooltipHeader, ChartTooltipIndicator, ChartTooltipItem, ChartTooltipLabel, ChartTooltipRoot, ChartTooltipValue, };
export type { ChartTooltipHeaderProps, ChartTooltipIndicatorProps, ChartTooltipItemProps, ChartTooltipLabelProps, ChartTooltipRootProps as ChartTooltipProps, ChartTooltipRootProps, ChartTooltipValueProps, } from './chart-tooltip';
export type { ChartTooltipVariants } from './chart-tooltip.styles';
export { chartTooltipVariants } from './chart-tooltip.styles';
export type { ChartTooltipContentProps } from './chart-tooltip-content';
//# sourceMappingURL=index.d.ts.map