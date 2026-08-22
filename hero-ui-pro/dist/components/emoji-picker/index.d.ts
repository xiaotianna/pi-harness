import { EmojiPickerContent, EmojiPickerFooter, EmojiPickerGrid, EmojiPickerItem, EmojiPickerPopover, EmojiPickerRoot, EmojiPickerSkinToneContent, EmojiPickerSkinToneOption, EmojiPickerSkinTonePicker, EmojiPickerSkinToneTrigger, EmojiPickerTrigger, EmojiPickerValue } from './emoji-picker';
export { emojiPickerVariants } from './emoji-picker.styles';
export { EMOJI_CATEGORIES, EMOJI_SKIN_TONES } from './emoji-picker-constants';
export declare const EmojiPicker: (({ children, size, ...props }: import("./emoji-picker").EmojiPickerRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, filter, ...props }: import("./emoji-picker").EmojiPickerContentProps) => import("react/jsx-runtime").JSX.Element;
    Footer: ({ children, className, ...props }: import("./emoji-picker").EmojiPickerFooterProps) => import("react/jsx-runtime").JSX.Element;
    Grid: <T extends object>({ children, className, layoutOptions, renderEmptyState, ...props }: import("./emoji-picker").EmojiPickerGridProps<T>) => import("react/jsx-runtime").JSX.Element;
    Item: <T extends object>({ children, className, ...props }: import("./emoji-picker").EmojiPickerItemProps<T>) => import("react/jsx-runtime").JSX.Element;
    Popover: ({ children, className, offset, placement, ...props }: import("./emoji-picker").EmojiPickerPopoverProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, size, ...props }: import("./emoji-picker").EmojiPickerRootProps) => import("react/jsx-runtime").JSX.Element;
    SkinToneContent: ({ "aria-label": ariaLabel, children, className, offset, placement, }: import("./emoji-picker").EmojiPickerSkinToneContentProps) => import("react/jsx-runtime").JSX.Element;
    SkinToneOption: ({ children, className, id, ...props }: import("./emoji-picker").EmojiPickerSkinToneOptionProps) => import("react/jsx-runtime").JSX.Element;
    SkinTonePicker: ({ children, defaultValue, onChange, value: valueProp, }: import("./emoji-picker").EmojiPickerSkinTonePickerProps) => import("react/jsx-runtime").JSX.Element;
    SkinToneTrigger: ({ "aria-label": ariaLabel, children, className, tones, }: import("./emoji-picker").EmojiPickerSkinToneTriggerProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./emoji-picker").EmojiPickerTriggerProps) => import("react/jsx-runtime").JSX.Element;
    Value: <T extends object>({ className, ...props }: import("./emoji-picker").EmojiPickerValueProps<T>) => import("react/jsx-runtime").JSX.Element;
};
export { EmojiPickerContent, EmojiPickerFooter, EmojiPickerGrid, EmojiPickerItem, EmojiPickerPopover, EmojiPickerRoot, EmojiPickerSkinToneContent, EmojiPickerSkinToneOption, EmojiPickerSkinTonePicker, EmojiPickerSkinToneTrigger, EmojiPickerTrigger, EmojiPickerValue, };
export type { EmojiPickerContentProps, EmojiPickerFooterProps, EmojiPickerGridProps, EmojiPickerItemProps, EmojiPickerPopoverProps, EmojiPickerRootProps as EmojiPickerProps, EmojiPickerRootProps, EmojiPickerSkinToneContentProps, EmojiPickerSkinToneOptionProps, EmojiPickerSkinTonePickerProps, EmojiPickerSkinToneTriggerProps, EmojiPickerTriggerProps, EmojiPickerValueProps, } from './emoji-picker';
export type { EmojiPickerVariants } from './emoji-picker.styles';
export type { EmojiCategory, EmojiCategoryItem, EmojiSkinTone, EmojiSkinToneItem, } from './emoji-picker-constants';
//# sourceMappingURL=index.d.ts.map