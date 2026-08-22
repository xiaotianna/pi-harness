import type { ComponentProps } from 'react';
import { InlineSelectIndicator, InlineSelectPopover, InlineSelectRoot, InlineSelectTrigger, InlineSelectValue } from './inline-select';
export { inlineSelectVariants } from './inline-select.styles';
export declare const InlineSelect: (<T extends object = object, M extends "single" | "multiple" = "single">({ children, className, ...props }: import("./inline-select").InlineSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./inline-select").InlineSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    Popover: ({ children, className, placement, ...props }: import("./inline-select").InlineSelectPopoverProps) => import("react/jsx-runtime").JSX.Element;
    Root: <T extends object = object, M extends "single" | "multiple" = "single">({ children, className, ...props }: import("./inline-select").InlineSelectRootProps<T, M>) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./inline-select").InlineSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
    Value: ({ children, className, ...props }: import("./inline-select").InlineSelectValueProps) => import("react/jsx-runtime").JSX.Element;
};
export { InlineSelectIndicator, InlineSelectPopover, InlineSelectRoot, InlineSelectTrigger, InlineSelectValue, };
export type { InlineSelectIndicatorProps, InlineSelectPopoverProps, InlineSelectRootProps as InlineSelectProps, InlineSelectRootProps, InlineSelectTriggerProps, InlineSelectValueProps, } from './inline-select';
export type { InlineSelectVariants } from './inline-select.styles';
export { inlineSelectVariants as default } from './inline-select.styles';
export type InlineSelect = {
    IndicatorProps: ComponentProps<typeof InlineSelectIndicator>;
    PopoverProps: ComponentProps<typeof InlineSelectPopover>;
    Props: ComponentProps<typeof InlineSelectRoot>;
    RootProps: ComponentProps<typeof InlineSelectRoot>;
    TriggerProps: ComponentProps<typeof InlineSelectTrigger>;
    ValueProps: ComponentProps<typeof InlineSelectValue>;
};
//# sourceMappingURL=index.d.ts.map