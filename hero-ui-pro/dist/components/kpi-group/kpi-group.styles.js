import { tv } from 'tailwind-variants';
export const kpiGroupVariants = tv({
    defaultVariants: {
        orientation: 'horizontal',
    },
    slots: {
        base: 'kpi-group',
        separator: 'kpi-group__separator',
    },
    variants: {
        orientation: {
            horizontal: { base: 'kpi-group--horizontal' },
            vertical: { base: 'kpi-group--vertical' },
        },
    },
});
//# sourceMappingURL=kpi-group.styles.js.map