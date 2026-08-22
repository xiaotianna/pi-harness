export { Area as AreaChartArea, CartesianGrid as AreaChartGrid, Tooltip as AreaChartTooltip, XAxis as AreaChartXAxis, YAxis as AreaChartYAxis, } from 'recharts';
import type { ComponentPropsWithRef, ReactNode } from 'react';
export interface AreaChartRootProps extends ComponentPropsWithRef<'div'> {
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
export declare const AreaChartRoot: ({ children, className, data, height, margin, width, ...props }: AreaChartRootProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=area-chart.d.ts.map