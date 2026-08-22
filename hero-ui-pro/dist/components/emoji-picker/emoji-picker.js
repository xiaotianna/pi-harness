'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useState } from 'react';
import { Autocomplete, useFilter } from 'react-aria-components/Autocomplete';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { ListBox as ListBoxPrimitive, ListBoxItem as ListBoxItemPrimitive, } from 'react-aria-components/ListBox';
import { Popover as PopoverPrimitive } from 'react-aria-components/Popover';
import { Select as SelectPrimitive, SelectValue as SelectValuePrimitive, } from 'react-aria-components/Select';
import { GridLayout, Size, Virtualizer, } from 'react-aria-components/Virtualizer';
import { Popover } from '@heroui/react';
import { useControlledState } from '@react-stately/utils';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { EMOJI_SKIN_TONES } from './emoji-picker-constants';
export { EMOJI_CATEGORIES } from './emoji-picker-constants';
import { emojiPickerVariants } from './emoji-picker.styles';
const EmojiPickerContext = createContext({});
const SkinToneContext = createContext({
    close: () => { },
    setValue: () => { },
    value: 'default',
});
// ---- Components ----
const DEFAULT_LAYOUT_OPTIONS = {
    maxItemSize: new Size(36, 36),
    minItemSize: new Size(36, 36),
    minSpace: new Size(2, 2),
    preserveAspectRatio: true,
};
export const EmojiPickerRoot = ({ children, size, ...props }) => {
    const slots = useMemo(() => emojiPickerVariants({ size }), [size]);
    return (_jsx(EmojiPickerContext.Provider, { value: { slots }, children: _jsx(SelectPrimitive, { "data-slot": "emoji-picker", ...props, children: children }) }));
};
export const EmojiPickerTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "emoji-picker-trigger", ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const EmojiPickerValue = ({ className, ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx(SelectValuePrimitive, { className: composeTwRenderProps(className, slots?.value()), "data-slot": "emoji-picker-value", ...props }));
};
export const EmojiPickerPopover = ({ children, className, offset = 4, placement = 'bottom', ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx(PopoverPrimitive, { className: composeTwRenderProps(className, slots?.popover()), "data-slot": "emoji-picker-popover", offset: offset, placement: placement, ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const EmojiPickerContent = ({ children, className, filter, ...props }) => {
    const { contains } = useFilter({ sensitivity: 'base' });
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "emoji-picker-content", ...props, children: _jsx(Autocomplete, { filter: filter ?? contains, children: children }) }));
};
export const EmojiPickerGrid = ({ children, className, layoutOptions, renderEmptyState, ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    const mergedLayout = useMemo(() => ({ ...DEFAULT_LAYOUT_OPTIONS, ...layoutOptions }), [layoutOptions]);
    const emptyState = renderEmptyState
        ? (renderProps) => (_jsx("div", { className: slots?.empty(), "data-slot": "emoji-picker-empty", children: renderEmptyState(renderProps) }))
        : undefined;
    return (_jsx(Virtualizer, { layout: GridLayout, layoutOptions: mergedLayout, children: _jsx(ListBoxPrimitive, { "aria-label": props['aria-label'] ?? 'Emoji grid', className: composeTwRenderProps(className, slots?.grid()), "data-slot": "emoji-picker-grid", layout: "grid", renderEmptyState: emptyState, ...props, children: children }) }));
};
export const EmojiPickerItem = ({ children, className, ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx(ListBoxItemPrimitive, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "emoji-picker-item", ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const EmojiPickerSkinTonePicker = ({ children, defaultValue = 'default', onChange, value: valueProp, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useControlledState(valueProp, defaultValue, onChange);
    const contextValue = useMemo(() => ({ close: () => setIsOpen(false), setValue, value }), [setValue, value]);
    return (_jsx(SkinToneContext.Provider, { value: contextValue, children: _jsx(Popover, { isOpen: isOpen, onOpenChange: setIsOpen, children: children }) }));
};
export const EmojiPickerSkinToneTrigger = ({ 'aria-label': ariaLabel = 'Select skin tone', children, className, tones = EMOJI_SKIN_TONES, }) => {
    const { value } = useContext(SkinToneContext);
    const { slots } = useContext(EmojiPickerContext);
    const current = tones.find((t) => t.id === value) ?? tones[0];
    return (_jsx(Popover.Trigger, { children: _jsx(ButtonPrimitive, { "aria-label": ariaLabel, className: composeTwRenderProps(className, slots?.skinTonePicker()), "data-slot": "emoji-picker-skin-tone-picker", children: children ?? current?.emoji }) }));
};
export const EmojiPickerSkinToneContent = ({ 'aria-label': ariaLabel = 'Skin tone', children, className, offset = 4, placement = 'bottom end', }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx(Popover.Content, { offset: offset, placement: placement, children: _jsx(Popover.Dialog, { "aria-label": ariaLabel, className: composeSlotClassName(slots?.skinToneOptions, className), "data-slot": "emoji-picker-skin-tone-options", children: children }) }));
};
export const EmojiPickerSkinToneOption = ({ children, className, id, ...props }) => {
    const { close, setValue, value } = useContext(SkinToneContext);
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx("button", { type: "button", ...props, className: composeSlotClassName(slots?.skinToneOption, className), "data-selected": id === value ? 'true' : undefined, "data-slot": "emoji-picker-skin-tone-option", onClick: () => {
            setValue(id);
            close();
        }, children: children }));
};
export const EmojiPickerFooter = ({ children, className, ...props }) => {
    const { slots } = useContext(EmojiPickerContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.footer, className), "data-slot": "emoji-picker-footer", ...props, children: children }));
};
export { EMOJI_SKIN_TONES };
//# sourceMappingURL=emoji-picker.js.map