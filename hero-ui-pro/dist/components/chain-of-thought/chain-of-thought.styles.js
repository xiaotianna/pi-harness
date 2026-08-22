import { tv } from 'tailwind-variants';
export const chainOfThoughtVariants = tv({
    defaultVariants: { status: 'complete' },
    slots: {
        base: 'chain-of-thought',
        content: 'chain-of-thought__content',
        step: 'chain-of-thought__step',
        stepContent: 'chain-of-thought__step-content',
        stepHeader: 'chain-of-thought__step-header',
        stepIndicator: 'chain-of-thought__step-indicator',
        stepLabel: 'chain-of-thought__step-label',
        steps: 'chain-of-thought__steps',
        trigger: 'chain-of-thought__trigger',
    },
    variants: {
        status: {
            complete: 'chain-of-thought--complete',
            streaming: 'chain-of-thought--streaming',
        },
    },
});
//# sourceMappingURL=chain-of-thought.styles.js.map