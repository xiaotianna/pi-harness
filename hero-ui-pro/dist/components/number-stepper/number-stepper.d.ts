import type { ComponentPropsWithRef } from 'react';
import React from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { Group as GroupPrimitive } from 'react-aria-components/Group';
import { NumberField as NumberFieldPrimitive } from 'react-aria-components/NumberField';
import type { Format } from '@number-flow/react';
import NumberFlow from '@number-flow/react';
import type { NumberStepperVariants } from './number-stepper.styles';
export interface NumberStepperRootProps extends ComponentPropsWithRef<typeof NumberFieldPrimitive>, NumberStepperVariants {
    formatOptions?: Format;
}
export declare const NumberStepperRoot: ({ children, className, formatOptions, size, ...props }: NumberStepperRootProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NumberStepperGroupProps extends ComponentPropsWithRef<typeof GroupPrimitive> {
}
export declare const NumberStepperGroup: ({ children, className, ...props }: NumberStepperGroupProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export type NumberStepperValueRenderProps = {
    formatOptions?: Format;
    value: number;
};
export interface NumberStepperValueProps extends Omit<ComponentPropsWithRef<typeof NumberFlow>, 'value' | 'children'> {
    children?: ((props: NumberStepperValueRenderProps) => React.ReactNode) | React.ReactNode;
    value?: number;
}
export declare const NumberStepperValue: ({ children, className, format, value: valueProp, ...props }: NumberStepperValueProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NumberStepperDecrementButtonProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export declare const NumberStepperDecrementButton: ({ children, className, ...props }: NumberStepperDecrementButtonProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface NumberStepperIncrementButtonProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export declare const NumberStepperIncrementButton: ({ children, className, ...props }: NumberStepperIncrementButtonProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
//# sourceMappingURL=number-stepper.d.ts.map