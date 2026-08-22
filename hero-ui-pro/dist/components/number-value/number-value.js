'use client';
import React, { createContext, useContext, useMemo, } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useLocale } from 'react-aria-components/I18nProvider';
import { NumberFormatter } from '@internationalized/number';
import { composeSlotClassName } from '../../utils/compose';
import { numberValueVariants } from './number-value.styles';
const NumberValueContext = createContext({});
export const NumberValuePrefix = ({ children, className, ...props }) => {
    const { slots } = useContext(NumberValueContext);
    return jsx('span', {
        className: composeSlotClassName(slots?.prefix, className),
        'data-slot': 'number-value-prefix',
        ...props,
        children,
    });
};
export const NumberValueSuffix = ({ children, className, ...props }) => {
    const { slots } = useContext(NumberValueContext);
    return jsx('span', {
        className: composeSlotClassName(slots?.suffix, className),
        'data-slot': 'number-value-suffix',
        ...props,
        children,
    });
};
export const NumberValueRoot = ({ children, className, currency, formatOptions, locale: localeProp, maximumFractionDigits, minimumFractionDigits, notation, signDisplay, style, unit, value, ...props }) => {
    const { locale: i18nLocale } = useLocale();
    const resolvedLocale = localeProp ?? i18nLocale;
    const slots = useMemo(() => numberValueVariants(), []);
    const resolvedFormatOptions = useMemo(() => formatOptions ?? {
        ...(currency != null && { currency }),
        ...(maximumFractionDigits != null && { maximumFractionDigits }),
        ...(minimumFractionDigits != null && { minimumFractionDigits }),
        ...(notation != null && { notation }),
        ...(signDisplay != null && { signDisplay }),
        ...(style != null && { style }),
        ...(unit != null && { unit }),
    }, [
        formatOptions,
        currency,
        maximumFractionDigits,
        minimumFractionDigits,
        notation,
        signDisplay,
        style,
        unit,
    ]);
    const formatted = useMemo(() => new NumberFormatter(resolvedLocale, resolvedFormatOptions).format(value), [resolvedLocale, resolvedFormatOptions, value]);
    if (typeof children === 'function') {
        return jsx(NumberValueContext, {
            value: { slots },
            children: children(formatted),
        });
    }
    let prefix = null;
    let suffix = null;
    const rest = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type === NumberValuePrefix) {
                prefix = child;
            }
            else if (child.type === NumberValueSuffix) {
                suffix = child;
            }
            else {
                rest.push(child);
            }
        }
        else {
            rest.push(child);
        }
    });
    return jsx(NumberValueContext, {
        value: { slots },
        children: jsxs('span', {
            className: composeSlotClassName(slots?.base, className),
            'data-slot': 'number-value',
            ...props,
            children: [
                prefix,
                jsx('span', {
                    className: slots?.value(),
                    'data-slot': 'number-value-value',
                    children: formatted,
                }),
                suffix,
                ...rest,
            ],
        }),
    });
};
//# sourceMappingURL=number-value.js.map