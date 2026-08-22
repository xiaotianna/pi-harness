import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import { Switch } from '@heroui/react';
import type { CellSwitchVariants } from './cell-switch.styles';
export interface CellSwitchRootProps extends Omit<ComponentProps<typeof Switch>, 'variant'> {
    /** Visual variant. @default "default" */
    variant?: CellSwitchVariants['variant'];
}
export interface CellSwitchTriggerProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface CellSwitchLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export interface CellSwitchControlProps extends ComponentProps<typeof Switch.Control> {
}
export declare const CellSwitchRoot: ({ children, className, variant, ...props }: CellSwitchRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSwitchTrigger: ({ children, className, ...props }: CellSwitchTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSwitchLabel: ({ children, className, ...props }: CellSwitchLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSwitchControl: ({ children, className, ...props }: CellSwitchControlProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=cell-switch.d.ts.map