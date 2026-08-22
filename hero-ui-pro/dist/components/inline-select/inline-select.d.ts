import type { ComponentProps } from 'react';
import type { SelectRootProps } from '@heroui/react';
import { Select } from '@heroui/react';
export interface InlineSelectRootProps<T extends object = object, M extends 'single' | 'multiple' = 'single'> extends SelectRootProps<T, M> {
}
export interface InlineSelectTriggerProps extends ComponentProps<typeof Select.Trigger> {
}
export interface InlineSelectValueProps extends ComponentProps<typeof Select.Value> {
}
export interface InlineSelectIndicatorProps extends ComponentProps<typeof Select.Indicator> {
}
export interface InlineSelectPopoverProps extends ComponentProps<typeof Select.Popover> {
}
export declare const InlineSelectRoot: <T extends object = object, M extends "single" | "multiple" = "single">({ children, className, ...props }: InlineSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element;
export declare const InlineSelectTrigger: ({ children, className, ...props }: InlineSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const InlineSelectValue: ({ children, className, ...props }: InlineSelectValueProps) => import("react/jsx-runtime").JSX.Element;
export declare const InlineSelectIndicator: ({ children, className, ...props }: InlineSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const InlineSelectPopover: ({ children, className, placement, ...props }: InlineSelectPopoverProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=inline-select.d.ts.map