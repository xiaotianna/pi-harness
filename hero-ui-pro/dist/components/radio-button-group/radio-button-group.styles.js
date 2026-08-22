import { tv } from 'tailwind-variants';
const radioButtonGroupVariants = tv({
    defaultVariants: {
        layout: 'flex',
    },
    slots: {
        base: 'radio-button-group',
        indicator: 'radio-button-group__indicator',
        item: 'radio-button-group__item',
        itemContent: 'radio-button-group__item-content',
        itemIcon: 'radio-button-group__item-icon',
    },
    variants: {
        layout: {
            flex: {},
            grid: {
                base: 'radio-button-group--grid',
            },
        },
    },
});
export { radioButtonGroupVariants };
//# sourceMappingURL=radio-button-group.styles.js.map