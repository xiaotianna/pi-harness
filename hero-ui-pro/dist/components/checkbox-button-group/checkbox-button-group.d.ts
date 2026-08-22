import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Checkbox, CheckboxGroup } from '@heroui/react';
import type { CheckboxButtonGroupVariants } from './checkbox-button-group.styles';
export interface CheckboxButtonGroupRootProps extends ComponentPropsWithRef<typeof CheckboxGroup> {
    /** Layout mode for items. @default "flex" */
    layout?: CheckboxButtonGroupVariants['layout'];
}
export interface CheckboxButtonGroupItemProps extends ComponentPropsWithRef<typeof Checkbox> {
}
export interface CheckboxButtonGroupIndicatorProps extends ComponentPropsWithRef<'span'> {
}
export interface CheckboxButtonGroupItemContentProps extends ComponentPropsWithRef<typeof Checkbox.Content> {
    children: ReactNode;
}
export interface CheckboxButtonGroupItemIconProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const CheckboxButtonGroupRoot: ({ children, className, layout, ...props }: CheckboxButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CheckboxButtonGroupItem: ({ children, className, ...props }: CheckboxButtonGroupItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const CheckboxButtonGroupIndicator: ({ children, className, ...props }: CheckboxButtonGroupIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const CheckboxButtonGroupItemContent: ({ children, className, ...props }: CheckboxButtonGroupItemContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const CheckboxButtonGroupItemIcon: ({ children, className, ...props }: CheckboxButtonGroupItemIconProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=checkbox-button-group.d.ts.map