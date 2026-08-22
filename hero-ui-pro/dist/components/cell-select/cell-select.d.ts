import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import type { SelectRootProps } from '@heroui/react';
import { Select } from '@heroui/react';
import type { CellSelectVariants } from './cell-select.styles';
export interface CellSelectRootProps<T extends object = object, M extends 'single' | 'multiple' = 'single'> extends Omit<SelectRootProps<T, M>, 'variant'> {
    /** Visual variant. @default "default" */
    variant?: CellSelectVariants['variant'];
}
export interface CellSelectTriggerProps extends ComponentProps<typeof Select.Trigger> {
}
export interface CellSelectLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export interface CellSelectValueProps extends ComponentProps<typeof Select.Value> {
}
export interface CellSelectIndicatorProps extends ComponentProps<typeof Select.Indicator> {
}
export interface CellSelectPopoverProps extends ComponentProps<typeof Select.Popover> {
}
export declare const CellSelectRoot: <T extends object = object, M extends "single" | "multiple" = "single">({ children, className, variant, ...props }: CellSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element;
export declare const CellSelectTrigger: ({ children, className, ...props }: CellSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSelectLabel: ({ children, className, ...props }: CellSelectLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSelectValue: ({ children, className, ...props }: CellSelectValueProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSelectIndicator: ({ children, className, ...props }: CellSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSelectPopover: ({ children, className, placement, ...props }: CellSelectPopoverProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=cell-select.d.ts.map