import type { ComponentPropsWithRef } from 'react';
import { type ReactNode } from 'react';
import { Radio, RadioGroup } from '@heroui/react';
import type { RadioButtonGroupVariants } from './radio-button-group.styles';
interface RadioButtonGroupRootProps extends ComponentPropsWithRef<typeof RadioGroup> {
    /** Layout mode for items. @default "flex" */
    layout?: RadioButtonGroupVariants['layout'];
}
interface RadioButtonGroupItemProps extends ComponentPropsWithRef<typeof Radio> {
}
interface RadioButtonGroupIndicatorProps extends ComponentPropsWithRef<'span'> {
}
interface RadioButtonGroupItemContentProps extends ComponentPropsWithRef<typeof Radio.Content> {
    children: ReactNode;
}
interface RadioButtonGroupItemIconProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const RadioButtonGroupRoot: ({ children, className, layout, ...props }: RadioButtonGroupRootProps) => import("react/jsx-runtime").JSX.Element;
declare const RadioButtonGroupItem: ({ children, className, ...props }: RadioButtonGroupItemProps) => import("react/jsx-runtime").JSX.Element;
declare const RadioButtonGroupIndicator: ({ children, className, ...props }: RadioButtonGroupIndicatorProps) => import("react/jsx-runtime").JSX.Element;
declare const RadioButtonGroupItemContent: ({ children, className, ...props }: RadioButtonGroupItemContentProps) => import("react/jsx-runtime").JSX.Element;
declare const RadioButtonGroupItemIcon: ({ children, className, ...props }: RadioButtonGroupItemIconProps) => import("react/jsx-runtime").JSX.Element;
export { RadioButtonGroupIndicator, RadioButtonGroupItem, RadioButtonGroupItemContent, RadioButtonGroupItemIcon, RadioButtonGroupRoot, };
export type { RadioButtonGroupIndicatorProps, RadioButtonGroupItemContentProps, RadioButtonGroupItemIconProps, RadioButtonGroupItemProps, RadioButtonGroupRootProps, };
//# sourceMappingURL=radio-button-group.d.ts.map