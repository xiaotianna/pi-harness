import type { ComponentProps } from 'react';
import { CellColorPickerLabel, CellColorPickerPopover, CellColorPickerRoot, CellColorPickerSwatch, CellColorPickerTrigger, CellColorPickerValueDisplay } from './cell-color-picker';
export { cellColorPickerVariants } from './cell-color-picker.styles';
export declare const CellColorPicker: (({ children, className, variant, ...props }: import("./cell-color-picker").CellColorPickerRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Label: ({ children, className, ...props }: import("./cell-color-picker").CellColorPickerLabelProps) => import("react/jsx-runtime").JSX.Element;
    Popover: ({ children, className, placement, ...props }: import("./cell-color-picker").CellColorPickerPopoverProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, variant, ...props }: import("./cell-color-picker").CellColorPickerRootProps) => import("react/jsx-runtime").JSX.Element;
    Swatch: ({ className, ...props }: import("./cell-color-picker").CellColorPickerSwatchProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./cell-color-picker").CellColorPickerTriggerProps) => import("react/jsx-runtime").JSX.Element;
    ValueDisplay: ({ children, className, ...props }: import("./cell-color-picker").CellColorPickerValueDisplayProps) => import("react/jsx-runtime").JSX.Element;
};
export { CellColorPickerLabel, CellColorPickerPopover, CellColorPickerRoot, CellColorPickerSwatch, CellColorPickerTrigger, CellColorPickerValueDisplay, };
export type { CellColorPickerLabelProps, CellColorPickerPopoverProps, CellColorPickerRootProps as CellColorPickerProps, CellColorPickerRootProps, CellColorPickerSwatchProps, CellColorPickerTriggerProps, CellColorPickerValueDisplayProps, } from './cell-color-picker';
export type { CellColorPickerVariants } from './cell-color-picker.styles';
export type CellColorPicker = {
    LabelProps: ComponentProps<typeof CellColorPickerLabel>;
    PopoverProps: ComponentProps<typeof CellColorPickerPopover>;
    Props: ComponentProps<typeof CellColorPickerRoot>;
    RootProps: ComponentProps<typeof CellColorPickerRoot>;
    SwatchProps: ComponentProps<typeof CellColorPickerSwatch>;
    TriggerProps: ComponentProps<typeof CellColorPickerTrigger>;
    ValueDisplayProps: ComponentProps<typeof CellColorPickerValueDisplay>;
};
//# sourceMappingURL=index.d.ts.map