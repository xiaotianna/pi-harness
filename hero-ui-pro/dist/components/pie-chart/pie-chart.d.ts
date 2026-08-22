import { type ComponentPropsWithRef, type ReactNode } from 'react';
export { Cell as PieChartCell, Label as PieChartLabel, Pie as PieChartPie, Tooltip as PieChartTooltip, } from 'recharts';
export interface PieChartRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Chart height in pixels. @default 300 */
    height?: number;
    /** Chart width in pixels or percentage string. @default "100%" */
    width?: number | `${number}%`;
}
export declare const PieChartRoot: ({ children, className, height, width, ...props }: PieChartRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=pie-chart.d.ts.map