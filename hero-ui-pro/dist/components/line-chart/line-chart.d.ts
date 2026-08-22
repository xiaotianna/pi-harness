import type { ComponentPropsWithRef, ReactNode } from 'react';
import { CartesianGrid, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
interface LineChartRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Chart data — array of objects with numeric/string fields for each series. */
    data: Record<string, number | string>[];
    /** Chart height in pixels. @default 300 */
    height?: number;
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
declare const LineChartRoot: ({ children, className, data, height, margin, width, ...props }: LineChartRootProps) => import("react/jsx-runtime").JSX.Element;
export { LineChartRoot };
export type { LineChartRootProps };
export { CartesianGrid as LineChartGrid, Line as LineChartLine, Tooltip as LineChartTooltip, ChartTooltipContent as LineChartTooltipContent, XAxis as LineChartXAxis, YAxis as LineChartYAxis, };
//# sourceMappingURL=line-chart.d.ts.map