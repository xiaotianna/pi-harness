import type { ComponentProps } from 'react';
import { RadioButtonGroupIndicator, RadioButtonGroupItem, RadioButtonGroupItemContent, RadioButtonGroupItemIcon, RadioButtonGroupRoot } from './radio-button-group';
export { radioButtonGroupVariants } from './radio-button-group.styles';
declare const RadioButtonGroup: (({ children, className, layout, ...props }: import("./radio-button-group").RadioButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./radio-button-group").RadioButtonGroupIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Item: ({ children, className, ...props }: import("./radio-button-group").RadioButtonGroupItemProps) => import("react/jsx-runtime").JSX.Element;
    ItemContent: ({ children, className, ...props }: import("./radio-button-group").RadioButtonGroupItemContentProps) => import("react/jsx-runtime").JSX.Element;
    ItemIcon: ({ children, className, ...props }: import("./radio-button-group").RadioButtonGroupItemIconProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, layout, ...props }: import("./radio-button-group").RadioButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element;
};
export { RadioButtonGroup, RadioButtonGroupIndicator, RadioButtonGroupItem, RadioButtonGroupItemContent, RadioButtonGroupItemIcon, RadioButtonGroupRoot, };
export type { RadioButtonGroupIndicatorProps, RadioButtonGroupItemContentProps, RadioButtonGroupItemIconProps, RadioButtonGroupItemProps, RadioButtonGroupRootProps as RadioButtonGroupProps, RadioButtonGroupRootProps, } from './radio-button-group';
export type { RadioButtonGroupVariants } from './radio-button-group.styles';
export type RadioButtonGroup = {
    IndicatorProps: ComponentProps<typeof RadioButtonGroupIndicator>;
    ItemContentProps: ComponentProps<typeof RadioButtonGroupItemContent>;
    ItemIconProps: ComponentProps<typeof RadioButtonGroupItemIcon>;
    ItemProps: ComponentProps<typeof RadioButtonGroupItem>;
    Props: ComponentProps<typeof RadioButtonGroupRoot>;
    RootProps: ComponentProps<typeof RadioButtonGroupRoot>;
};
//# sourceMappingURL=index.d.ts.map