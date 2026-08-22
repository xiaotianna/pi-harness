import type { ComponentProps } from 'react';
import { PressableFeedbackHighlight, PressableFeedbackHoldConfirm, PressableFeedbackProgressFeedback, PressableFeedbackRipple, PressableFeedbackRoot } from './pressable-feedback';
export { pressableFeedbackVariants } from './pressable-feedback.styles';
declare const PressableFeedback: (<E extends keyof React.JSX.IntrinsicElements = "button">({ children, className, isDisabled, ...props }: import("./pressable-feedback").PressableFeedbackRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./pressable-feedback").PressableFeedbackRootProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Highlight: ({ className, ...props }: import("./pressable-feedback").PressableFeedbackHighlightProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    HoldConfirm: ({ className, ...props }: import("./pressable-feedback").PressableFeedbackHoldConfirmProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ProgressFeedback: ({ className, ...props }: import("./pressable-feedback").PressableFeedbackProgressFeedbackProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Ripple: ({ className, ...props }: import("./pressable-feedback").PressableFeedbackRippleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: <E extends keyof React.JSX.IntrinsicElements = "button">({ children, className, isDisabled, ...props }: import("./pressable-feedback").PressableFeedbackRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./pressable-feedback").PressableFeedbackRootProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export { PressableFeedback, PressableFeedbackHighlight, PressableFeedbackHoldConfirm, PressableFeedbackProgressFeedback, PressableFeedbackRipple, PressableFeedbackRoot, };
export type { PressableFeedbackHighlightProps, PressableFeedbackHoldConfirmProps, PressableFeedbackProgressFeedbackProps, PressableFeedbackRootProps as PressableFeedbackProps, PressableFeedbackRippleProps, PressableFeedbackRootProps, } from './pressable-feedback';
export type PressableFeedback = {
    HighlightProps: ComponentProps<typeof PressableFeedbackHighlight>;
    HoldConfirmProps: ComponentProps<typeof PressableFeedbackHoldConfirm>;
    ProgressFeedbackProps: ComponentProps<typeof PressableFeedbackProgressFeedback>;
    Props: ComponentProps<typeof PressableFeedbackRoot>;
    RippleProps: ComponentProps<typeof PressableFeedbackRipple>;
    RootProps: ComponentProps<typeof PressableFeedbackRoot>;
};
//# sourceMappingURL=index.d.ts.map