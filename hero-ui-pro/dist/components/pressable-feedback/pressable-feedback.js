'use client';
import { createContext, useContext, useMemo, } from 'react';
import { jsx } from 'react/jsx-runtime';
import { dom } from '@heroui/react';
import { dataAttr } from '../../utils/assertion';
import { composeSlotClassName } from '../../utils/compose';
import { HoldConfirm } from './hold-confirm';
import { pressableFeedbackVariants } from './pressable-feedback.styles';
import { ProgressFeedback } from './progress-feedback';
import { Ripple } from './ripple';
const PressableFeedbackContext = createContext({});
const defaultSlots = pressableFeedbackVariants();
export const PressableFeedbackRoot = ({ children, className, isDisabled, ...props }) => {
    const slots = useMemo(() => pressableFeedbackVariants(), []);
    return jsx(PressableFeedbackContext, {
        value: { slots },
        children: jsx(dom.button, {
            'aria-disabled': isDisabled || undefined,
            className: composeSlotClassName(slots?.base, className),
            'data-slot': 'pressable-feedback',
            disabled: dataAttr(isDisabled || undefined),
            type: 'button',
            ...props,
            children,
        }),
    });
};
export const PressableFeedbackHighlight = ({ className, ...props }) => {
    const { slots = defaultSlots } = useContext(PressableFeedbackContext);
    return jsx('div', {
        'aria-hidden': 'true',
        className: composeSlotClassName(slots?.highlight, className),
        'data-slot': 'pressable-feedback-highlight',
        ...props,
    });
};
export const PressableFeedbackRipple = ({ className, ...props }) => {
    return jsx(Ripple, {
        className,
        'data-slot': 'pressable-feedback-ripple',
        ...props,
    });
};
export const PressableFeedbackHoldConfirm = ({ className, ...props }) => {
    return jsx(HoldConfirm, { className, ...props });
};
export const PressableFeedbackProgressFeedback = ({ className, ...props }) => {
    return jsx(ProgressFeedback, { className, ...props });
};
//# sourceMappingURL=pressable-feedback.js.map