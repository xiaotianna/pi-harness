'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { ToggleButton as ToggleButtonPrimitive } from 'react-aria-components/ToggleButton';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { emojiReactionButtonVariants } from './emoji-reaction-button.styles';
const EmojiReactionButtonContext = createContext({});
// ---- Components ----
export const EmojiReactionButtonRoot = ({ children, className, defaultSelected, excludeFromTabOrder, isReadOnly, isSelected, onChange, onClick, onPress, onPressChange, onPressEnd, onPressStart, onPressUp, size, ...props }) => {
    const slots = useMemo(() => emojiReactionButtonVariants({ size }), [size]);
    const selectionProps = isReadOnly
        ? { isSelected: isSelected ?? defaultSelected ?? false }
        : { defaultSelected, isSelected };
    return (_jsx(EmojiReactionButtonContext.Provider, { value: { slots }, children: _jsx(ToggleButtonPrimitive, { className: composeTwRenderProps(className, slots?.base()), "data-readonly": isReadOnly || undefined, "data-slot": "emoji-reaction-button", excludeFromTabOrder: !!isReadOnly || excludeFromTabOrder, onChange: isReadOnly ? undefined : onChange, onClick: isReadOnly ? undefined : onClick, onPress: isReadOnly ? undefined : onPress, onPressChange: isReadOnly ? undefined : onPressChange, onPressEnd: isReadOnly ? undefined : onPressEnd, onPressStart: isReadOnly ? undefined : onPressStart, onPressUp: isReadOnly ? undefined : onPressUp, ...props, ...selectionProps, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }) }));
};
export const EmojiReactionButtonEmoji = ({ children, className, ...props }) => {
    const { slots } = useContext(EmojiReactionButtonContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.emoji, className), "data-slot": "emoji-reaction-button-emoji", ...props, children: children }));
};
export const EmojiReactionButtonCount = ({ children, className, ...props }) => {
    const { slots } = useContext(EmojiReactionButtonContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.count, className), "data-slot": "emoji-reaction-button-count", ...props, children: children }));
};
//# sourceMappingURL=emoji-reaction-button.js.map