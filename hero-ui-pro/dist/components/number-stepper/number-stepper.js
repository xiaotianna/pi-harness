'use client';
import React, { createContext, useContext, useMemo, useState, } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { Group as GroupPrimitive } from 'react-aria-components/Group';
import { Input } from 'react-aria-components/Input';
import { NumberField as NumberFieldPrimitive } from 'react-aria-components/NumberField';
import NumberFlow from '@number-flow/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { Minus, Plus } from '../icons';
import { numberStepperVariants } from './number-stepper.styles';
const NumberStepperContext = createContext({
    value: 0,
});
export const NumberStepperRoot = ({ children, className, formatOptions, size = 'md', ...props }) => {
    const slots = useMemo(() => numberStepperVariants({ size }), [size]);
    const [internalValue, setInternalValue] = useState(() => (props.value ?? props.defaultValue ?? 0));
    const controlledValue = props.value != null ? props.value : internalValue;
    return jsx(NumberStepperContext, {
        value: { formatOptions, slots, value: controlledValue },
        children: jsx(NumberFieldPrimitive, {
            className: composeTwRenderProps(className, slots?.base()),
            'data-slot': 'number-stepper',
            ...props,
            value: controlledValue,
            onChange: (val) => {
                setInternalValue(val);
                props.onChange?.(val);
            },
            children: (renderProps) => jsx(Fragment, {
                children: typeof children === 'function'
                    ? children(renderProps)
                    : children,
            }),
        }),
    });
};
export const NumberStepperGroup = ({ children, className, ...props }) => {
    const { slots } = useContext(NumberStepperContext);
    return jsx(GroupPrimitive, {
        className: composeTwRenderProps(className, slots?.group()),
        'data-slot': 'number-stepper-group',
        ...props,
        children: (renderProps) => jsxs(Fragment, {
            children: [
                typeof children === 'function'
                    ? children(renderProps)
                    : children,
                jsx(Input, {
                    className: slots?.input(),
                    'data-slot': 'number-stepper-input',
                    tabIndex: -1,
                }),
            ],
        }),
    });
};
export const NumberStepperValue = ({ children, className, format, value: valueProp, ...props }) => {
    const ctx = useContext(NumberStepperContext);
    const resolvedValue = valueProp ?? ctx.value;
    const resolvedFormat = format ?? ctx.formatOptions;
    const composedClassName = composeSlotClassName(ctx.slots?.value, className);
    if (typeof children === 'function') {
        return jsx('span', {
            className: composedClassName,
            'data-slot': 'number-stepper-value',
            children: children({
                formatOptions: resolvedFormat,
                value: resolvedValue,
            }),
        });
    }
    if (children) {
        return jsx('span', {
            className: composedClassName,
            'data-slot': 'number-stepper-value',
            children,
        });
    }
    return jsx(NumberFlow, {
        className: composedClassName,
        'data-slot': 'number-stepper-value',
        format: resolvedFormat,
        value: resolvedValue,
        ...props,
    });
};
export const NumberStepperDecrementButton = ({ children, className, ...props }) => {
    const { slots } = useContext(NumberStepperContext);
    return jsx(ButtonPrimitive, {
        className: composeTwRenderProps(className, slots?.decrementButton()),
        'data-slot': 'number-stepper-decrement-button',
        slot: 'decrement',
        ...props,
        children: children && React.isValidElement(children) ? children : jsx(Minus, {}),
    });
};
export const NumberStepperIncrementButton = ({ children, className, ...props }) => {
    const { slots } = useContext(NumberStepperContext);
    return jsx(ButtonPrimitive, {
        className: composeTwRenderProps(className, slots?.incrementButton()),
        'data-slot': 'number-stepper-increment-button',
        slot: 'increment',
        ...props,
        children: children && React.isValidElement(children) ? children : jsx(Plus, {}),
    });
};
//# sourceMappingURL=number-stepper.js.map