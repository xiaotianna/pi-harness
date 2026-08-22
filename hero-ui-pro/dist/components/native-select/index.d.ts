import type { ComponentProps } from 'react';
import { NativeSelectIndicator, NativeSelectOptGroup, NativeSelectOption, NativeSelectRoot, NativeSelectTrigger } from './native-select';
export { nativeSelectVariants } from './native-select.styles';
declare const NativeSelect: (({ children, className, fullWidth, variant, ...props }: import("./native-select").NativeSelectRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./native-select").NativeSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
    OptGroup: ({ children, ...props }: import("./native-select").NativeSelectOptGroupProps) => import("react/jsx-runtime").JSX.Element;
    Option: ({ children, ...props }: import("./native-select").NativeSelectOptionProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, fullWidth, variant, ...props }: import("./native-select").NativeSelectRootProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, wrapperClassName, ...selectProps }: import("./native-select").NativeSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export { NativeSelect, NativeSelectIndicator, NativeSelectOptGroup, NativeSelectOption, NativeSelectRoot, NativeSelectTrigger, };
export type { NativeSelectIndicatorProps, NativeSelectOptGroupProps, NativeSelectOptionProps, NativeSelectRootProps as NativeSelectProps, NativeSelectRootProps, NativeSelectTriggerProps, } from './native-select';
export type { NativeSelectVariants } from './native-select.styles';
export type NativeSelect = {
    IndicatorProps: ComponentProps<typeof NativeSelectIndicator>;
    OptGroupProps: ComponentProps<typeof NativeSelectOptGroup>;
    OptionProps: ComponentProps<typeof NativeSelectOption>;
    Props: ComponentProps<typeof NativeSelectRoot>;
    RootProps: ComponentProps<typeof NativeSelectRoot>;
    TriggerProps: ComponentProps<typeof NativeSelectTrigger>;
};
//# sourceMappingURL=index.d.ts.map