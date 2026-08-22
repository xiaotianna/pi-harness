import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import type { ColorPickerProps as ColorPickerPrimitiveProps } from 'react-aria-components/ColorPicker';
import type { ColorPickerPopoverProps } from '@heroui/react';
import { ColorSwatch } from '@heroui/react';
import type { CellColorPickerVariants } from './cell-color-picker.styles';
export interface CellColorPickerRootProps extends Omit<ColorPickerPrimitiveProps, 'children'> {
    children: ReactNode;
    className?: string;
    /** Visual variant. @default "default" */
    variant?: CellColorPickerVariants['variant'];
}
export interface CellColorPickerTriggerProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export interface CellColorPickerLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export interface CellColorPickerValueDisplayProps extends ComponentPropsWithRef<'span'> {
}
export interface CellColorPickerSwatchProps extends ComponentProps<typeof ColorSwatch> {
}
export interface CellColorPickerPopoverProps extends ColorPickerPopoverProps {
}
export declare const CellColorPickerRoot: ({ children, className, variant, ...props }: CellColorPickerRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellColorPickerTrigger: ({ children, className, ...props }: CellColorPickerTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellColorPickerLabel: ({ children, className, ...props }: CellColorPickerLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellColorPickerValueDisplay: ({ children, className, ...props }: CellColorPickerValueDisplayProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellColorPickerSwatch: ({ className, ...props }: CellColorPickerSwatchProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellColorPickerPopover: ({ children, className, placement, ...props }: CellColorPickerPopoverProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=cell-color-picker.d.ts.map