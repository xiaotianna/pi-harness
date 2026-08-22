import { tv } from 'tailwind-variants';
export const timelineVariants = tv({
    defaultVariants: {
        axis: 'start',
        density: 'comfortable',
        itemAlign: 'start',
        size: 'md',
    },
    slots: {
        base: 'timeline',
        connector: 'timeline__connector',
        content: 'timeline__content',
        item: 'timeline__item',
        marker: 'timeline__marker',
        rail: 'timeline__rail',
    },
    variants: {
        axis: {
            center: { base: 'timeline--axis-center' },
            start: { base: 'timeline--axis-start' },
        },
        density: {
            comfortable: { base: 'timeline--comfortable' },
            compact: { base: 'timeline--compact' },
        },
        itemAlign: {
            center: { item: 'timeline__item--align-center' },
            start: { item: 'timeline__item--align-start' },
        },
        size: {
            lg: { base: 'timeline--lg', marker: 'timeline__marker--lg' },
            md: { base: 'timeline--md', marker: 'timeline__marker--md' },
            sm: { base: 'timeline--sm', marker: 'timeline__marker--sm' },
        },
    },
});
//# sourceMappingURL=timeline.styles.js.map