import type { ComponentProps } from 'react';
import { StepperContent, StepperDescription, StepperIcon, StepperIndicator, StepperRoot, StepperSeparator, StepperStep, StepperTitle, useStepperStep } from './stepper';
export { stepperVariants } from './stepper.styles';
declare const Stepper: (({ children, className, currentStep: currentStepProp, defaultStep, onStepChange, orientation, size, ...props }: import("./stepper").StepperRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./stepper").StepperContentProps) => import("react/jsx-runtime").JSX.Element;
    Description: ({ children, className, ...props }: import("./stepper").StepperDescriptionProps) => import("react/jsx-runtime").JSX.Element;
    Icon: ({ children, className, ...props }: import("./stepper").StepperIconProps) => import("react/jsx-runtime").JSX.Element;
    Indicator: ({ children, className, ...props }: import("./stepper").StepperIndicatorProps & import("react").ComponentPropsWithRef<"span">) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, currentStep: currentStepProp, defaultStep, onStepChange, orientation, size, ...props }: import("./stepper").StepperRootProps) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, force, progress: progressProp, ...props }: import("./stepper").StepperSeparatorProps) => import("react/jsx-runtime").JSX.Element | null;
    Step: ({ _index: injectedIndex, _isLast: injectedIsLast, children, className, ...restProps }: import("./stepper").StepperStepProps & Partial<{
        _index: number;
        _isLast: boolean;
    }>) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./stepper").StepperTitleProps) => import("react/jsx-runtime").JSX.Element;
    useStep: () => {
        index: number;
        isLast: boolean;
        status: import("./stepper").StepStatus;
    };
};
export { Stepper, StepperContent, StepperDescription, StepperIcon, StepperIndicator, StepperRoot, StepperSeparator, StepperStep, StepperTitle, useStepperStep, };
export type { StepperContentProps, StepperDescriptionProps, StepperIconProps, StepperIndicatorProps, StepperRootProps as StepperProps, StepperRootProps, StepperSeparatorProps, StepperStepProps, StepperTitleProps, StepStatus, } from './stepper';
export type { StepperVariants } from './stepper.styles';
export type Stepper = {
    ContentProps: ComponentProps<typeof StepperContent>;
    DescriptionProps: ComponentProps<typeof StepperDescription>;
    IconProps: ComponentProps<typeof StepperIcon>;
    IndicatorProps: ComponentProps<typeof StepperIndicator>;
    Props: ComponentProps<typeof StepperRoot>;
    RootProps: ComponentProps<typeof StepperRoot>;
    SeparatorProps: ComponentProps<typeof StepperSeparator>;
    StepProps: ComponentProps<typeof StepperStep>;
    TitleProps: ComponentProps<typeof StepperTitle>;
    useStep: typeof useStepperStep;
};
//# sourceMappingURL=index.d.ts.map