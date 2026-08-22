import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import { Slider } from '@heroui/react';
import type { CellSliderVariants } from './cell-slider.styles';
export interface CellSliderRootProps extends Omit<ComponentProps<typeof Slider>, 'variant' | 'orientation'> {
    /** Visual variant. @default "default" */
    variant?: CellSliderVariants['variant'];
}
export interface CellSliderTrackProps extends ComponentProps<typeof Slider.Track> {
}
export interface CellSliderFillProps extends ComponentProps<typeof Slider.Fill> {
}
export interface CellSliderThumbProps extends ComponentProps<typeof Slider.Thumb> {
}
export interface CellSliderLabelProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export interface CellSliderOutputProps extends ComponentProps<typeof Slider.Output> {
}
export declare const CellSliderRoot: ({ children, className, variant, ...props }: CellSliderRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSliderTrack: ({ children, className, ...props }: CellSliderTrackProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSliderFill: ({ className, ...props }: CellSliderFillProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSliderThumb: ({ children, className, ...props }: CellSliderThumbProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSliderLabel: ({ children, className, ...props }: CellSliderLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const CellSliderOutput: ({ children, className, ...props }: CellSliderOutputProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=cell-slider.d.ts.map