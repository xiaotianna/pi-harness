import React, { type ComponentPropsWithRef, type ReactNode } from 'react';
import type { NumberFormatOptions } from '@internationalized/number';
export interface NumberValuePrefixProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export declare const NumberValuePrefix: ({ children, className, ...props }: NumberValuePrefixProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NumberValueSuffixProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export declare const NumberValueSuffix: ({ children, className, ...props }: NumberValueSuffixProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NumberValueRootProps extends Omit<ComponentPropsWithRef<'span'>, 'children' | 'style'> {
    /** Render prop receiving the formatted string, or ReactNode children (Prefix/Suffix). */
    children?: ((formatted: string) => ReactNode) | ReactNode;
    /** Currency code (e.g. "USD"). Required when style is "currency". */
    currency?: string;
    /** Format options. Overrides individual props. */
    formatOptions?: NumberFormatOptions;
    /** Override locale from I18nProvider. */
    locale?: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    /** @default "standard" */
    notation?: 'compact' | 'engineering' | 'scientific' | 'standard';
    signDisplay?: 'always' | 'auto' | 'exceptZero' | 'never';
    /** @default "decimal" */
    style?: 'currency' | 'decimal' | 'percent' | 'unit';
    unit?: string;
    value: number;
}
export declare const NumberValueRoot: ({ children, className, currency, formatOptions, locale: localeProp, maximumFractionDigits, minimumFractionDigits, notation, signDisplay, style, unit, value, ...props }: NumberValueRootProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
//# sourceMappingURL=number-value.d.ts.map