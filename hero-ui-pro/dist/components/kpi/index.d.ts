import type { ComponentProps } from 'react';
import { KPIActions, KPIChart, KPIContent, KPIFooter, KPIHeader, KPIIcon, KPIProgress, KPIRoot, KPISeparator, KPITitle, KPITrend, KPIValue } from './kpi';
export { kpiVariants } from './kpi.styles';
declare const KPI: (({ children, className, ...props }: import("./kpi").KPIRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Actions: ({ children, className, ...props }: import("./kpi").KPIActionsProps) => import("react/jsx-runtime").JSX.Element;
    Chart: ({ className, color, data, dataKey, fillColor, height, strokeWidth, tooltip, ...props }: import("./kpi").KPIChartProps) => import("react/jsx-runtime").JSX.Element;
    Content: ({ children, className, ...props }: import("./kpi").KPIContentProps) => import("react/jsx-runtime").JSX.Element;
    Footer: ({ children, className, ...props }: import("./kpi").KPIFooterProps) => import("react/jsx-runtime").JSX.Element;
    Header: ({ children, className, ...props }: import("./kpi").KPIHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Icon: ({ children, className, status, ...props }: import("./kpi").KPIIconProps) => import("react/jsx-runtime").JSX.Element;
    Progress: ({ className, status, value, ...props }: import("./kpi").KPIProgressProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, ...props }: import("./kpi").KPIRootProps) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, ...props }: import("./kpi").KPISeparatorProps) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./kpi").KPITitleProps) => import("react/jsx-runtime").JSX.Element;
    Trend: ({ className, ...props }: import("./kpi").KPITrendProps) => import("react/jsx-runtime").JSX.Element;
    Value: ({ children, className, ...props }: import("./kpi").KPIValueProps) => import("react/jsx-runtime").JSX.Element;
};
export { KPI, KPIActions, KPIChart, KPIContent, KPIFooter, KPIHeader, KPIIcon, KPIProgress, KPIRoot, KPISeparator, KPITitle, KPITrend, KPIValue, };
export type { KPIActionsProps, KPIChartProps, KPIContentProps, KPIFooterProps, KPIHeaderProps, KPIIconProps, KPIProgressProps, KPIRootProps as KPIProps, KPIRootProps, KPISeparatorProps, KPITitleProps, KPITrendProps, KPIValueProps, } from './kpi';
export type { KPIVariants } from './kpi.styles';
export type KPI = {
    ActionsProps: ComponentProps<typeof KPIActions>;
    ChartProps: ComponentProps<typeof KPIChart>;
    ContentProps: ComponentProps<typeof KPIContent>;
    FooterProps: ComponentProps<typeof KPIFooter>;
    HeaderProps: ComponentProps<typeof KPIHeader>;
    IconProps: ComponentProps<typeof KPIIcon>;
    ProgressProps: ComponentProps<typeof KPIProgress>;
    Props: ComponentProps<typeof KPIRoot>;
    RootProps: ComponentProps<typeof KPIRoot>;
    SeparatorProps: ComponentProps<typeof KPISeparator>;
    TitleProps: ComponentProps<typeof KPITitle>;
    TrendProps: ComponentProps<typeof KPITrend>;
    ValueProps: ComponentProps<typeof KPIValue>;
};
//# sourceMappingURL=index.d.ts.map