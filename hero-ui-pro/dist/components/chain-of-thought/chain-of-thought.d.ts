import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button, Disclosure } from '@heroui/react';
export interface ChainOfThoughtRootProps extends ComponentPropsWithRef<typeof Disclosure> {
    children: ReactNode;
    /** Show shimmer styling on the trigger while reasoning is in progress. */
    isStreaming?: boolean;
}
export interface ChainOfThoughtTriggerProps extends ComponentPropsWithRef<typeof Button> {
    children: ReactNode;
}
export interface ChainOfThoughtContentProps extends ComponentPropsWithRef<typeof Disclosure.Content> {
    children: ReactNode;
}
export interface ChainOfThoughtStepsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChainOfThoughtStepProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    label?: ReactNode;
}
export type ChainOfThoughtProps = ChainOfThoughtRootProps;
export declare const ChainOfThoughtRoot: ({ children, className, isStreaming, ...props }: ChainOfThoughtRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChainOfThoughtTrigger: ({ children, className, ...props }: ChainOfThoughtTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChainOfThoughtContent: ({ children, className, ...props }: ChainOfThoughtContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChainOfThoughtSteps: ({ children, className, ...props }: ChainOfThoughtStepsProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChainOfThoughtStep: ({ children, className, label, ...props }: ChainOfThoughtStepProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chain-of-thought.d.ts.map