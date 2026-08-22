import { type CSSProperties, type ReactNode } from 'react';
export type ProgressFeedbackSweep = 'down' | 'left' | 'right' | 'up';
export interface ProgressFeedbackProps {
    /** Whether to automatically reset after completing. @default true */
    autoReset?: boolean;
    children?: ReactNode;
    className?: string;
    /** Progress duration in ms. @default 2000 */
    duration?: number;
    isDisabled?: boolean;
    onComplete?: () => void;
    onReset?: () => void;
    /** Duration for snap-back animation on reset. @default 300 */
    releaseDuration?: number;
    /** Delay in ms before resetting after completion. @default 1500 */
    resetDelay?: number;
    style?: CSSProperties;
    /** @default "right" */
    sweep?: ProgressFeedbackSweep;
}
export declare const ProgressFeedback: ({ autoReset, children, className, duration, isDisabled, onComplete, onReset, releaseDuration, resetDelay, style, sweep, }: ProgressFeedbackProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=progress-feedback.d.ts.map