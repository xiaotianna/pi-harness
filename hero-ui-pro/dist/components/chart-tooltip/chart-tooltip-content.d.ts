import type { ReactNode } from 'react';
import type { ChartTooltipVariants } from './chart-tooltip.styles';
export interface RechartsPayloadEntry {
    color?: string;
    dataKey?: string | number;
    fill?: string;
    name?: string;
    payload?: Record<string, unknown>;
    stroke?: string;
    value?: number | string;
}
export interface ChartTooltipContentProps extends ChartTooltipVariants {
    /** Provided by Recharts — whether the tooltip is active. */
    active?: boolean;
    className?: string;
    /** Hide the header row. @default false */
    hideHeader?: boolean;
    /** Custom formatter for the header label. */
    labelFormatter?: (label: number | string) => ReactNode;
    /** Provided by Recharts — the X-axis label for the hovered data point. */
    label?: number | string;
    /** Provided by Recharts — array of series data for the hovered point. */
    payload?: RechartsPayloadEntry[];
    /** Custom formatter for series values. */
    valueFormatter?: (value: number | string) => ReactNode;
}
export declare const ChartTooltipContent: ({ active, className, hideHeader, indicator, label, labelFormatter, payload, valueFormatter, }: ChartTooltipContentProps) => import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=chart-tooltip-content.d.ts.map