import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ChartTooltipVariants } from './chart-tooltip.styles';
export interface ChartTooltipRootProps extends ComponentPropsWithRef<'div'>, ChartTooltipVariants {
    /** Controls visibility. When false, the tooltip is not rendered. */
    active?: boolean;
    children: ReactNode;
}
export interface ChartTooltipHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChartTooltipItemProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChartTooltipIndicatorProps extends ComponentPropsWithRef<'span'> {
    /** Color for the indicator. Accepts any CSS color value. */
    color?: string;
}
export interface ChartTooltipLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export interface ChartTooltipValueProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export declare const ChartTooltipRoot: ({ active, children, className, indicator, ...props }: ChartTooltipRootProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChartTooltipHeader: ({ children, className, ...props }: ChartTooltipHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChartTooltipItem: ({ children, className, ...props }: ChartTooltipItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChartTooltipIndicator: ({ className, color, style, ...props }: ChartTooltipIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChartTooltipLabel: ({ children, className, ...props }: ChartTooltipLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChartTooltipValue: ({ children, className, ...props }: ChartTooltipValueProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chart-tooltip.d.ts.map