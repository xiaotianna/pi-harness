import type { ComponentProps } from 'react';
import { KPIGroupRoot, KPIGroupSeparator } from './kpi-group';
export { kpiGroupVariants } from './kpi-group.styles';
declare const KPIGroup: (({ children, className, orientation, ...props }: import("./kpi-group").KPIGroupRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Root: ({ children, className, orientation, ...props }: import("./kpi-group").KPIGroupRootProps) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, ...props }: import("./kpi-group").KPIGroupSeparatorProps) => import("react/jsx-runtime").JSX.Element;
};
export { KPIGroup, KPIGroupRoot, KPIGroupSeparator };
export type { KPIGroupRootProps as KPIGroupProps, KPIGroupRootProps, KPIGroupSeparatorProps, } from './kpi-group';
export type { KPIGroupVariants } from './kpi-group.styles';
export type KPIGroup = {
    Props: ComponentProps<typeof KPIGroupRoot>;
    RootProps: ComponentProps<typeof KPIGroupRoot>;
    SeparatorProps: ComponentProps<typeof KPIGroupSeparator>;
};
//# sourceMappingURL=index.d.ts.map