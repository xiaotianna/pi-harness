import type { ComponentProps } from 'react';
import { NumberStepperDecrementButton, NumberStepperGroup, NumberStepperIncrementButton, NumberStepperRoot, NumberStepperValue } from './number-stepper';
export { numberStepperVariants } from './number-stepper.styles';
declare const NumberStepper: (({ children, className, formatOptions, size, ...props }: import("./number-stepper").NumberStepperRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    DecrementButton: ({ children, className, ...props }: import("./number-stepper").NumberStepperDecrementButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Group: ({ children, className, ...props }: import("./number-stepper").NumberStepperGroupProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    IncrementButton: ({ children, className, ...props }: import("./number-stepper").NumberStepperIncrementButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ children, className, formatOptions, size, ...props }: import("./number-stepper").NumberStepperRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Value: ({ children, className, format, value: valueProp, ...props }: import("./number-stepper").NumberStepperValueProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export { NumberStepper, NumberStepperDecrementButton, NumberStepperGroup, NumberStepperIncrementButton, NumberStepperRoot, NumberStepperValue, };
export type { NumberStepperDecrementButtonProps, NumberStepperGroupProps, NumberStepperIncrementButtonProps, NumberStepperRootProps as NumberStepperProps, NumberStepperRootProps, NumberStepperValueProps, NumberStepperValueRenderProps, } from './number-stepper';
export type { NumberStepperVariants } from './number-stepper.styles';
export { numberStepperVariants as numberStepperVariantsFromStyles } from './number-stepper.styles';
export type NumberStepper = {
    Props: ComponentProps<typeof NumberStepperRoot>;
    RootProps: ComponentProps<typeof NumberStepperRoot>;
    GroupProps: ComponentProps<typeof NumberStepperGroup>;
    ValueProps: ComponentProps<typeof NumberStepperValue>;
    DecrementButtonProps: ComponentProps<typeof NumberStepperDecrementButton>;
    IncrementButtonProps: ComponentProps<typeof NumberStepperIncrementButton>;
};
//# sourceMappingURL=index.d.ts.map