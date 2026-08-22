import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button, Card, Separator } from '@heroui/react';
import { NumberValue } from '../number-value/index';
import { TrendChip } from '../trend-chip/index';
interface KPIRootProps extends ComponentPropsWithRef<typeof Card> {
    children: ReactNode;
}
declare const KPIRoot: ({ children, className, ...props }: KPIRootProps) => import("react/jsx-runtime").JSX.Element;
interface KPIHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const KPIHeader: ({ children, className, ...props }: KPIHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface KPIContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const KPIContent: ({ children, className, ...props }: KPIContentProps) => import("react/jsx-runtime").JSX.Element;
interface KPIIconProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Status color for icon background tinting. */
    status?: 'danger' | 'success' | 'warning';
}
declare const KPIIcon: ({ children, className, status, ...props }: KPIIconProps) => import("react/jsx-runtime").JSX.Element;
interface KPITitleProps extends ComponentPropsWithRef<'dt'> {
    children: ReactNode;
}
declare const KPITitle: ({ children, className, ...props }: KPITitleProps) => import("react/jsx-runtime").JSX.Element;
interface KPIValueProps extends Omit<ComponentPropsWithRef<typeof NumberValue>, 'children'> {
    children?: ComponentPropsWithRef<typeof NumberValue>['children'];
}
declare const KPIValue: ({ children, className, ...props }: KPIValueProps) => import("react/jsx-runtime").JSX.Element;
interface KPITrendProps extends ComponentPropsWithRef<typeof TrendChip> {
}
declare const KPITrend: ({ className, ...props }: KPITrendProps) => import("react/jsx-runtime").JSX.Element;
interface KPIProgressProps extends ComponentPropsWithRef<'div'> {
    /** Status color for the progress bar. */
    status?: 'danger' | 'success' | 'warning';
    /** Progress value from 0 to 100. */
    value: number;
}
declare const KPIProgress: ({ className, status, value, ...props }: KPIProgressProps) => import("react/jsx-runtime").JSX.Element;
interface KPIActionsProps extends ComponentPropsWithRef<typeof Button> {
    /** Custom icon to replace the default three-dot icon. */
    children?: ReactNode;
}
declare const KPIActions: ({ children, className, ...props }: KPIActionsProps) => import("react/jsx-runtime").JSX.Element;
interface KPIChartProps extends ComponentPropsWithRef<'div'> {
    /** Stroke/line color. Defaults to currentColor. */
    color?: string;
    /** Chart data — array of objects with a numeric field matching `dataKey`. */
    data: Record<string, number | string>[];
    /** Key in each data object to use as the Y value. @default "value" */
    dataKey?: string;
    /** Fill color for the area gradient. Defaults to `color` at 20% opacity when not set. */
    fillColor?: string;
    /** Chart height in pixels. @default 80 */
    height?: number;
    /** Stroke width. @default 2 */
    strokeWidth?: number;
    /** A tooltip element rendered inside the chart, e.g. `<AreaChart.Tooltip content={...} />`. */
    tooltip?: ReactNode;
}
declare const KPIChart: ({ className, color, data, dataKey, fillColor, height, strokeWidth, tooltip, ...props }: KPIChartProps) => import("react/jsx-runtime").JSX.Element;
interface KPISeparatorProps extends ComponentPropsWithRef<typeof Separator> {
}
declare const KPISeparator: ({ className, ...props }: KPISeparatorProps) => import("react/jsx-runtime").JSX.Element;
interface KPIFooterProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const KPIFooter: ({ children, className, ...props }: KPIFooterProps) => import("react/jsx-runtime").JSX.Element;
export { KPIActions, KPIChart, KPIContent, KPIFooter, KPIHeader, KPIIcon, KPIProgress, KPIRoot, KPISeparator, KPITitle, KPITrend, KPIValue, };
export type { KPIActionsProps, KPIChartProps, KPIContentProps, KPIFooterProps, KPIHeaderProps, KPIIconProps, KPIProgressProps, KPIRootProps, KPISeparatorProps, KPITitleProps, KPITrendProps, KPIValueProps, };
//# sourceMappingURL=kpi.d.ts.map