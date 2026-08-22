import type { ComponentProps } from 'react';
import { CellSelectIndicator, CellSelectLabel, CellSelectPopover, CellSelectRoot, CellSelectTrigger, CellSelectValue } from './cell-select';
export { cellSelectVariants } from './cell-select.styles';
export declare const CellSelect: (<T extends object = object, M extends "single" | "multiple" = "single">({ children, className, variant, ...props }: import("./cell-select").CellSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./cell-select").CellSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Label: ({ children, className, ...props }: import("./cell-select").CellSelectLabelProps) => import("react/jsx-runtime").JSX.Element;
    Popover: ({ children, className, placement, ...props }: import("./cell-select").CellSelectPopoverProps) => import("react/jsx-runtime").JSX.Element;
    Root: <T extends object = object, M extends "single" | "multiple" = "single">({ children, className, variant, ...props }: import("./cell-select").CellSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./cell-select").CellSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
    Value: ({ children, className, ...props }: import("./cell-select").CellSelectValueProps) => import("react/jsx-runtime").JSX.Element;
};
export { CellSelectIndicator, CellSelectLabel, CellSelectPopover, CellSelectRoot, CellSelectTrigger, CellSelectValue, };
export type { CellSelectIndicatorProps, CellSelectLabelProps, CellSelectPopoverProps, CellSelectRootProps as CellSelectProps, CellSelectRootProps, CellSelectTriggerProps, CellSelectValueProps, } from './cell-select';
export type { CellSelectVariants } from './cell-select.styles';
export type CellSelect = {
    IndicatorProps: ComponentProps<typeof CellSelectIndicator>;
    LabelProps: ComponentProps<typeof CellSelectLabel>;
    PopoverProps: ComponentProps<typeof CellSelectPopover>;
    Props: ComponentProps<typeof CellSelectRoot>;
    RootProps: ComponentProps<typeof CellSelectRoot>;
    TriggerProps: ComponentProps<typeof CellSelectTrigger>;
    ValueProps: ComponentProps<typeof CellSelectValue>;
};
//# sourceMappingURL=index.d.ts.map