export { Bar as BarChartBar, CartesianGrid as BarChartGrid, Tooltip as BarChartTooltip, XAxis as BarChartXAxis, YAxis as BarChartYAxis, } from 'recharts';
import type { ComponentPropsWithRef, ReactNode } from 'react';
export interface BarChartRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Chart data — array of objects with numeric/string fields for each series. */
    data: Record<string, number | string>[];
    /** Chart height in pixels. @default 300 */
    height?: number;
    /** Bar layout direction. Use "vertical" for horizontal bar charts. @default "horizontal" */
    layout?: 'horizontal' | 'vertical';
    /** Recharts margin. @default { top: 8, right: 8, bottom: 0, left: 0 } */
    margin?: {
        bottom?: number;
        left?: number;
        right?: number;
        top?: number;
    };
    /** Chart width in pixels or percentage string like "100%". @default "100%" */
    width?: number | `${number}%`;
}
export declare const BarChartRoot: ({ children, className, data, height, layout, margin, width, ...props }: BarChartRootProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=bar-chart.d.ts.map