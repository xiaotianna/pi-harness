import { tv } from 'tailwind-variants';
export const checkboxButtonGroupVariants = tv({
    defaultVariants: { layout: 'flex' },
    slots: {
        base: 'checkbox-button-group',
        indicator: 'checkbox-button-group__indicator',
        item: 'checkbox-button-group__item',
        itemContent: 'checkbox-button-group__item-content',
        itemIcon: 'checkbox-button-group__item-icon',
    },
    variants: {
        layout: {
            flex: {},
            grid: { base: 'checkbox-button-group--grid' },
        },
    },
});
//# sourceMappingURL=checkbox-button-group.styles.js.map