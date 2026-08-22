import type { ComponentPropsWithRef } from 'react';
import { type ReactNode } from 'react';
import type { StepperVariants } from './stepper.styles';
type StepStatus = 'inactive' | 'active' | 'complete';
type StepperStepContextValue = {
    index: number;
    isLast: boolean;
    status: StepStatus;
};
/**
 * Hook to access per-step context (index, status, isLast) from any descendant
 * of `<Stepper.Step>`.
 */
declare const useStepperStep: () => StepperStepContextValue;
interface StepperRootProps extends Omit<ComponentPropsWithRef<'ol'>, 'children'> {
    children: ReactNode;
    currentStep?: number;
    defaultStep?: number;
    onStepChange?: (step: number) => void;
    orientation?: StepperVariants['orientation'];
    size?: StepperVariants['size'];
}
type StepperStepInternalProps = {
    _index: number;
    _isLast: boolean;
};
declare const StepperRoot: ({ children, className, currentStep: currentStepProp, defaultStep, onStepChange, orientation, size, ...props }: StepperRootProps) => import("react/jsx-runtime").JSX.Element;
interface StepperIndicatorProps {
    children?: ReactNode;
    className?: string;
}
declare const StepperIndicator: ({ children, className, ...props }: StepperIndicatorProps & ComponentPropsWithRef<"span">) => import("react/jsx-runtime").JSX.Element;
interface StepperContentProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const StepperContent: ({ children, className, ...props }: StepperContentProps) => import("react/jsx-runtime").JSX.Element;
interface StepperTitleProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const StepperTitle: ({ children, className, ...props }: StepperTitleProps) => import("react/jsx-runtime").JSX.Element;
interface StepperDescriptionProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const StepperDescription: ({ children, className, ...props }: StepperDescriptionProps) => import("react/jsx-runtime").JSX.Element;
interface StepperIconProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const StepperIcon: ({ children, className, ...props }: StepperIconProps) => import("react/jsx-runtime").JSX.Element;
interface StepperSeparatorProps extends ComponentPropsWithRef<'div'> {
    force?: boolean;
    progress?: number;
}
declare const StepperSeparator: ({ className, force, progress: progressProp, ...props }: StepperSeparatorProps) => import("react/jsx-runtime").JSX.Element | null;
interface StepperStepProps extends Omit<ComponentPropsWithRef<'li'>, 'children'> {
    children?: ReactNode;
}
declare const StepperStep: ({ _index: injectedIndex, _isLast: injectedIsLast, children, className, ...restProps }: StepperStepProps & Partial<StepperStepInternalProps>) => import("react/jsx-runtime").JSX.Element;
export { StepperContent, StepperDescription, StepperIcon, StepperIndicator, StepperRoot, StepperSeparator, StepperStep, StepperTitle, useStepperStep, };
export type { StepperContentProps, StepperDescriptionProps, StepperIconProps, StepperIndicatorProps, StepperRootProps, StepperSeparatorProps, StepperStepProps, StepperTitleProps, StepStatus, };
//# sourceMappingURL=stepper.d.ts.map