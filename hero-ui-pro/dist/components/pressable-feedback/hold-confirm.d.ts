import { type CSSProperties, type ReactNode } from 'react';
export type HoldConfirmSweep = 'down' | 'left' | 'right' | 'up';
export interface HoldConfirmProps {
    children?: ReactNode;
    className?: string;
    /** Hold duration in ms. @default 2000 */
    duration?: number;
    isDisabled?: boolean;
    onComplete?: () => void;
    /** Duration for snap-back animation on release. @default 200 */
    releaseDuration?: number;
    /** Whether to reset after completion. @default true */
    resetOnComplete?: boolean;
    sweep?: HoldConfirmSweep;
    style?: CSSProperties;
}
export declare const HoldConfirm: ({ children, className, duration, isDisabled, onComplete, releaseDuration, resetOnComplete, style, sweep, }: HoldConfirmProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=hold-confirm.d.ts.map