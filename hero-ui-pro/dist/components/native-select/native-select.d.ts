import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { NativeSelectVariants } from './native-select.styles';
interface NativeSelectRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Whether the select should take up the full width of its container. */
    fullWidth?: NativeSelectVariants['fullWidth'];
    /** The visual variant. @default "primary" */
    variant?: NativeSelectVariants['variant'];
}
declare const NativeSelectRoot: ({ children, className, fullWidth, variant, ...props }: NativeSelectRootProps) => import("react/jsx-runtime").JSX.Element;
interface NativeSelectTriggerProps extends Omit<ComponentPropsWithRef<'select'>, 'className'> {
    children: ReactNode;
    className?: string;
    /** Additional className applied to the wrapper div (trigger slot). */
    wrapperClassName?: string;
}
declare const NativeSelectTrigger: ({ children, className, wrapperClassName, ...selectProps }: NativeSelectTriggerProps) => import("react/jsx-runtime").JSX.Element;
interface NativeSelectIndicatorProps extends ComponentPropsWithRef<'span'> {
}
declare const NativeSelectIndicator: ({ children, className, ...props }: NativeSelectIndicatorProps) => import("react/jsx-runtime").JSX.Element;
interface NativeSelectOptionProps extends ComponentPropsWithRef<'option'> {
}
declare const NativeSelectOption: ({ children, ...props }: NativeSelectOptionProps) => import("react/jsx-runtime").JSX.Element;
interface NativeSelectOptGroupProps extends ComponentPropsWithRef<'optgroup'> {
}
declare const NativeSelectOptGroup: ({ children, ...props }: NativeSelectOptGroupProps) => import("react/jsx-runtime").JSX.Element;
export { NativeSelectIndicator, NativeSelectOptGroup, NativeSelectOption, NativeSelectRoot, NativeSelectTrigger, };
export type { NativeSelectIndicatorProps, NativeSelectOptGroupProps, NativeSelectOptionProps, NativeSelectRootProps, NativeSelectTriggerProps, };
//# sourceMappingURL=native-select.d.ts.map