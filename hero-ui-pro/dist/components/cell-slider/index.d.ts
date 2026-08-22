import type { ComponentProps } from 'react';
import { CellSliderFill, CellSliderLabel, CellSliderOutput, CellSliderRoot, CellSliderThumb, CellSliderTrack } from './cell-slider';
export { cellSliderVariants } from './cell-slider.styles';
export declare const CellSlider: (({ children, className, variant, ...props }: import("./cell-slider").CellSliderRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Fill: ({ className, ...props }: import("./cell-slider").CellSliderFillProps) => import("react/jsx-runtime").JSX.Element;
    Label: ({ children, className, ...props }: import("./cell-slider").CellSliderLabelProps) => import("react/jsx-runtime").JSX.Element;
    Output: ({ children, className, ...props }: import("./cell-slider").CellSliderOutputProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, variant, ...props }: import("./cell-slider").CellSliderRootProps) => import("react/jsx-runtime").JSX.Element;
    Thumb: ({ children, className, ...props }: import("./cell-slider").CellSliderThumbProps) => import("react/jsx-runtime").JSX.Element;
    Track: ({ children, className, ...props }: import("./cell-slider").CellSliderTrackProps) => import("react/jsx-runtime").JSX.Element;
};
export { CellSliderFill, CellSliderLabel, CellSliderOutput, CellSliderRoot, CellSliderThumb, CellSliderTrack, };
export type { CellSliderFillProps, CellSliderLabelProps, CellSliderOutputProps, CellSliderRootProps as CellSliderProps, CellSliderRootProps, CellSliderThumbProps, CellSliderTrackProps, } from './cell-slider';
export type { CellSliderVariants } from './cell-slider.styles';
export type CellSlider = {
    FillProps: ComponentProps<typeof CellSliderFill>;
    LabelProps: ComponentProps<typeof CellSliderLabel>;
    OutputProps: ComponentProps<typeof CellSliderOutput>;
    Props: ComponentProps<typeof CellSliderRoot>;
    RootProps: ComponentProps<typeof CellSliderRoot>;
    ThumbProps: ComponentProps<typeof CellSliderThumb>;
    TrackProps: ComponentProps<typeof CellSliderTrack>;
};
//# sourceMappingURL=index.d.ts.map