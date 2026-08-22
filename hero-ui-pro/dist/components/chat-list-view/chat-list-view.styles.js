import { tv } from 'tailwind-variants';
const chatListViewVariants = tv({
    defaultVariants: {
        density: 'comfortable',
    },
    slots: {
        base: 'chat-list-view',
        icon: 'chat-list-view__icon',
        meta: 'chat-list-view__meta',
        preview: 'chat-list-view__preview',
        text: 'chat-list-view__text',
        title: 'chat-list-view__title',
    },
    variants: {
        density: {
            comfortable: 'chat-list-view--comfortable',
            compact: 'chat-list-view--compact',
        },
    },
});
export { chatListViewVariants };
//# sourceMappingURL=chat-list-view.styles.js.map