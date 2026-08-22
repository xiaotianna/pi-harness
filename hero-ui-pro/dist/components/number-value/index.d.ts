import type { ComponentProps } from 'react';
import { NumberValuePrefix, NumberValueRoot, NumberValueSuffix } from './number-value';
export { numberValueVariants } from './number-value.styles';
declare const NumberValue: (({ children, className, currency, formatOptions, locale: localeProp, maximumFractionDigits, minimumFractionDigits, notation, signDisplay, style, unit, value, ...props }: import("./number-value").NumberValueRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Prefix: ({ children, className, ...props }: import("./number-value").NumberValuePrefixProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ children, className, currency, formatOptions, locale: localeProp, maximumFractionDigits, minimumFractionDigits, notation, signDisplay, style, unit, value, ...props }: import("./number-value").NumberValueRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Suffix: ({ children, className, ...props }: import("./number-value").NumberValueSuffixProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export { NumberValue, NumberValuePrefix, NumberValueRoot, NumberValueSuffix };
export type { NumberValuePrefixProps, NumberValueRootProps as NumberValueProps, NumberValueRootProps, NumberValueSuffixProps, } from './number-value';
export type { NumberValueVariants } from './number-value.styles';
export type NumberValue = {
    PrefixProps: ComponentProps<typeof NumberValuePrefix>;
    Props: ComponentProps<typeof NumberValueRoot>;
    RootProps: ComponentProps<typeof NumberValueRoot>;
    SuffixProps: ComponentProps<typeof NumberValueSuffix>;
};
//# sourceMappingURL=index.d.ts.map