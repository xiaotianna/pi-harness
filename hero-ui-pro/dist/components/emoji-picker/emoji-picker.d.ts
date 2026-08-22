import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { ListBox as ListBoxPrimitive, ListBoxItem as ListBoxItemPrimitive } from 'react-aria-components/ListBox';
import { Popover as PopoverPrimitive } from 'react-aria-components/Popover';
import { Select as SelectPrimitive, SelectValue as SelectValuePrimitive } from 'react-aria-components/Select';
import { Size } from 'react-aria-components/Virtualizer';
import type { PopoverContentProps } from '@heroui/react';
import { EMOJI_SKIN_TONES } from './emoji-picker-constants';
export { EMOJI_CATEGORIES } from './emoji-picker-constants';
import type { EmojiPickerVariants } from './emoji-picker.styles';
import type { EmojiSkinToneItem } from './emoji-picker-constants';
export interface EmojiPickerRootProps extends ComponentPropsWithRef<typeof SelectPrimitive> {
    /** Size variant controlling trigger, popover, and emoji dimensions. @default "md" */
    size?: EmojiPickerVariants['size'];
}
export interface EmojiPickerTriggerProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export interface EmojiPickerValueProps<T extends object> extends ComponentPropsWithRef<typeof SelectValuePrimitive<T>> {
}
export interface EmojiPickerPopoverProps extends ComponentPropsWithRef<typeof PopoverPrimitive> {
}
export interface EmojiPickerContentProps extends ComponentPropsWithRef<'div'> {
    /** Custom filter function. Defaults to case-insensitive contains. */
    filter?: (textValue: string, inputValue: string) => boolean;
}
export interface EmojiPickerGridProps<T extends object> extends Omit<ComponentPropsWithRef<typeof ListBoxPrimitive<T>>, 'layout'> {
    /** Virtualizer grid layout options for item sizing and spacing. */
    layoutOptions?: {
        minItemSize?: InstanceType<typeof Size>;
        maxItemSize?: InstanceType<typeof Size>;
        minSpace?: InstanceType<typeof Size>;
        preserveAspectRatio?: boolean;
    };
}
export interface EmojiPickerItemProps<T extends object> extends ComponentPropsWithRef<typeof ListBoxItemPrimitive<T>> {
}
export interface EmojiPickerSkinTonePickerProps {
    children: ReactNode;
    /** The default skin tone (uncontrolled). @default "default" */
    defaultValue?: string;
    /** Callback when the skin tone changes. */
    onChange?: (value: string) => void;
    /** The selected skin tone (controlled). */
    value?: string;
}
export interface EmojiPickerSkinToneTriggerProps {
    'aria-label'?: string;
    children?: ReactNode;
    className?: string;
    /** Skin tone data for resolving the current value's emoji. @default EMOJI_SKIN_TONES */
    tones?: EmojiSkinToneItem[];
}
export interface EmojiPickerSkinToneContentProps {
    'aria-label'?: string;
    children: ReactNode;
    className?: string;
    /** @default 4 */
    offset?: number;
    /** @default "bottom end" */
    placement?: PopoverContentProps['placement'];
}
export interface EmojiPickerSkinToneOptionProps extends ComponentPropsWithRef<'button'> {
    id: string;
}
export interface EmojiPickerFooterProps extends ComponentPropsWithRef<'div'> {
}
export declare const EmojiPickerRoot: ({ children, size, ...props }: EmojiPickerRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerTrigger: ({ children, className, ...props }: EmojiPickerTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerValue: <T extends object>({ className, ...props }: EmojiPickerValueProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerPopover: ({ children, className, offset, placement, ...props }: EmojiPickerPopoverProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerContent: ({ children, className, filter, ...props }: EmojiPickerContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerGrid: <T extends object>({ children, className, layoutOptions, renderEmptyState, ...props }: EmojiPickerGridProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerItem: <T extends object>({ children, className, ...props }: EmojiPickerItemProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerSkinTonePicker: ({ children, defaultValue, onChange, value: valueProp, }: EmojiPickerSkinTonePickerProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerSkinToneTrigger: ({ "aria-label": ariaLabel, children, className, tones, }: EmojiPickerSkinToneTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerSkinToneContent: ({ "aria-label": ariaLabel, children, className, offset, placement, }: EmojiPickerSkinToneContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerSkinToneOption: ({ children, className, id, ...props }: EmojiPickerSkinToneOptionProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmojiPickerFooter: ({ children, className, ...props }: EmojiPickerFooterProps) => import("react/jsx-runtime").JSX.Element;
export { EMOJI_SKIN_TONES };
//# sourceMappingURL=emoji-picker.d.ts.map