import { type ComponentPropsWithRef, type ReactNode } from 'react';
import type { DOMRenderProps } from '@heroui/react';
import type { HoldConfirmProps } from './hold-confirm';
import type { ProgressFeedbackProps } from './progress-feedback';
import type { RippleProps } from './ripple';
export interface PressableFeedbackRootProps<E extends keyof React.JSX.IntrinsicElements = 'button'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
    isDisabled?: boolean;
}
export declare const PressableFeedbackRoot: <E extends keyof React.JSX.IntrinsicElements = "button">({ children, className, isDisabled, ...props }: PressableFeedbackRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof PressableFeedbackRootProps<E>>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PressableFeedbackHighlightProps extends ComponentPropsWithRef<'div'> {
}
export declare const PressableFeedbackHighlight: ({ className, ...props }: PressableFeedbackHighlightProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PressableFeedbackRippleProps extends RippleProps {
}
export declare const PressableFeedbackRipple: ({ className, ...props }: PressableFeedbackRippleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PressableFeedbackHoldConfirmProps extends HoldConfirmProps {
}
export declare const PressableFeedbackHoldConfirm: ({ className, ...props }: PressableFeedbackHoldConfirmProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PressableFeedbackProgressFeedbackProps extends ProgressFeedbackProps {
}
export declare const PressableFeedbackProgressFeedback: ({ className, ...props }: PressableFeedbackProgressFeedbackProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=pressable-feedback.d.ts.map