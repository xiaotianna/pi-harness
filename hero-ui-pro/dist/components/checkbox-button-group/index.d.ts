import type { ComponentProps } from 'react';
import { CheckboxButtonGroupIndicator, CheckboxButtonGroupItem, CheckboxButtonGroupItemContent, CheckboxButtonGroupItemIcon, CheckboxButtonGroupRoot } from './checkbox-button-group';
export declare const CheckboxButtonGroup: (({ children, className, layout, ...props }: import("./checkbox-button-group").CheckboxButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./checkbox-button-group").CheckboxButtonGroupIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Item: ({ children, className, ...props }: import("./checkbox-button-group").CheckboxButtonGroupItemProps) => import("react/jsx-runtime").JSX.Element;
    ItemContent: ({ children, className, ...props }: import("./checkbox-button-group").CheckboxButtonGroupItemContentProps) => import("react/jsx-runtime").JSX.Element;
    ItemIcon: ({ children, className, ...props }: import("./checkbox-button-group").CheckboxButtonGroupItemIconProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, layout, ...props }: import("./checkbox-button-group").CheckboxButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element;
};
export type CheckboxButtonGroup = {
    IndicatorProps: ComponentProps<typeof CheckboxButtonGroupIndicator>;
    ItemContentProps: ComponentProps<typeof CheckboxButtonGroupItemContent>;
    ItemIconProps: ComponentProps<typeof CheckboxButtonGroupItemIcon>;
    ItemProps: ComponentProps<typeof CheckboxButtonGroupItem>;
    Props: ComponentProps<typeof CheckboxButtonGroupRoot>;
    RootProps: ComponentProps<typeof CheckboxButtonGroupRoot>;
};
export { CheckboxButtonGroupIndicator, CheckboxButtonGroupItem, CheckboxButtonGroupItemContent, CheckboxButtonGroupItemIcon, CheckboxButtonGroupRoot, };
export type { CheckboxButtonGroupIndicatorProps, CheckboxButtonGroupItemContentProps, CheckboxButtonGroupItemIconProps, CheckboxButtonGroupItemProps, CheckboxButtonGroupRootProps as CheckboxButtonGroupProps, CheckboxButtonGroupRootProps, } from './checkbox-button-group';
export type { CheckboxButtonGroupVariants } from './checkbox-button-group.styles';
export { checkboxButtonGroupVariants } from './checkbox-button-group.styles';
//# sourceMappingURL=index.d.ts.map