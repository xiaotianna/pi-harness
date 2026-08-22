import type { ComponentPropsWithRef } from 'react';
import { ToggleButton as ToggleButtonPrimitive } from 'react-aria-components/ToggleButton';
import type { EmojiReactionButtonVariants } from './emoji-reaction-button.styles';
export interface EmojiReactionButtonRootProps extends ComponentPropsWithRef<typeof ToggleButtonPrimitive> {
    /** Whether the button is read-only and should not respond to user interaction. */
    isReadOnly?: boolean;
    /** Size variant. @default "md" */
    size?: EmojiReactionButtonVariants['size'];
}
export interface EmojiReactionButtonEmojiProps extends ComponentPropsWithRef<'span'> {
}
export interface EmojiReactionButtonCountProps extends ComponentPropsWithRef<'span'> {
}
export declare const EmojiReactionButtonRoot: ({ children, className, defaultSelected, excludeFromTabOrder, isReadOnly, isSelected, onChange, onClick, onPress, onPressChange, onPressEnd, onPressStart, onPressUp, size, ...props }: EmojiReactionButtonRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiReactionButtonEmoji: ({ children, className, ...props }: EmojiReactionButtonEmojiProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiReactionButtonCount: ({ children, className, ...props }: EmojiReactionButtonCountProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=emoji-reaction-button.d.ts.map