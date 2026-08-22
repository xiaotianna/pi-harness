import type { ComponentProps } from 'react';
import { ChainOfThoughtContent, ChainOfThoughtRoot, ChainOfThoughtStep, ChainOfThoughtSteps, ChainOfThoughtTrigger } from './chain-of-thought';
export declare const ChainOfThought: (({ children, className, isStreaming, ...props }: import("./chain-of-thought").ChainOfThoughtRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./chain-of-thought").ChainOfThoughtContentProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, isStreaming, ...props }: import("./chain-of-thought").ChainOfThoughtRootProps) => import("react/jsx-runtime").JSX.Element;
    Step: ({ children, className, label, ...props }: import("./chain-of-thought").ChainOfThoughtStepProps) => import("react/jsx-runtime").JSX.Element;
    Steps: ({ children, className, ...props }: import("./chain-of-thought").ChainOfThoughtStepsProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./chain-of-thought").ChainOfThoughtTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export type ChainOfThought = {
    ContentProps: ComponentProps<typeof ChainOfThoughtContent>;
    Props: ComponentProps<typeof ChainOfThoughtRoot>;
    RootProps: ComponentProps<typeof ChainOfThoughtRoot>;
    StepProps: ComponentProps<typeof ChainOfThoughtStep>;
    StepsProps: ComponentProps<typeof ChainOfThoughtSteps>;
    TriggerProps: ComponentProps<typeof ChainOfThoughtTrigger>;
};
export { ChainOfThoughtContent, ChainOfThoughtRoot, ChainOfThoughtStep, ChainOfThoughtSteps, ChainOfThoughtTrigger, };
export type { ChainOfThoughtContentProps, ChainOfThoughtProps, ChainOfThoughtRootProps, ChainOfThoughtStepProps, ChainOfThoughtStepsProps, ChainOfThoughtTriggerProps, } from './chain-of-thought';
export type { ChainOfThoughtVariants } from './chain-of-thought.styles';
export { chainOfThoughtVariants } from './chain-of-thought.styles';
//# sourceMappingURL=index.d.ts.map