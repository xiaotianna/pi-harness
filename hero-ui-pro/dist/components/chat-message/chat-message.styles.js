import { tv } from 'tailwind-variants';
const chatMessageVariants = tv({
    slots: {
        action: 'chat-message__action',
        actions: 'chat-message__actions',
        assistant: 'chat-message--assistant',
        avatar: 'chat-message__avatar',
        avatarSpacer: 'chat-message__avatar-spacer',
        body: 'chat-message__body',
        bubble: 'chat-message__bubble',
        content: 'chat-message__content',
        media: 'chat-message__media',
        user: 'chat-message--user',
    },
});
export { chatMessageVariants };
//# sourceMappingURL=chat-message.styles.js.map