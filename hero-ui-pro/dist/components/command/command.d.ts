import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Dialog } from 'react-aria-components/Dialog';
import { Input } from 'react-aria-components/Input';
import { Menu, MenuItem, MenuSection, Separator } from 'react-aria-components/Menu';
import { Modal, ModalOverlay } from 'react-aria-components/Modal';
import { SearchField } from 'react-aria-components/SearchField';
import { CloseButton } from '@heroui/react';
import type { CommandVariants } from './command.styles';
export interface CommandRootProps {
    children: ReactNode;
}
export interface CommandBackdropProps extends ComponentPropsWithRef<typeof ModalOverlay> {
    /** Whether clicking the backdrop closes the palette. @default true */
    isDismissable?: boolean;
    /** Backdrop style variant. @default "opaque" */
    variant?: CommandVariants['variant'];
}
export interface CommandContainerProps extends Omit<ComponentPropsWithRef<typeof Modal>, Exclude<keyof CommandBackdropProps, 'children' | 'className'>> {
    size?: CommandVariants['size'];
}
export interface CommandDialogProps extends Omit<ComponentPropsWithRef<typeof Dialog>, 'children'> {
    children: ReactNode;
    /** Default input value for the search field (uncontrolled). */
    defaultInputValue?: string;
    /** Custom filter function. Defaults to case-insensitive contains. */
    filter?: (textValue: string, inputValue: string) => boolean;
    /** Controlled input value for the search field. */
    inputValue?: string;
    /** Callback when input value changes. */
    onInputChange?: (value: string) => void;
}
export interface CommandInputGroupProps extends Omit<ComponentPropsWithRef<typeof SearchField>, 'children'> {
    children: ReactNode;
}
export interface CommandInputGroupPrefixProps extends ComponentPropsWithRef<'div'> {
}
export interface CommandInputGroupInputProps extends ComponentPropsWithRef<typeof Input> {
}
export interface CommandInputGroupSuffixProps extends ComponentPropsWithRef<'div'> {
}
export interface CommandInputGroupClearButtonProps extends ComponentPropsWithRef<typeof CloseButton> {
}
export interface CommandHeaderProps extends ComponentPropsWithRef<'div'> {
}
export interface CommandListProps<T extends object> extends ComponentPropsWithRef<typeof Menu<T>> {
}
export interface CommandItemProps<T extends object> extends ComponentPropsWithRef<typeof MenuItem<T>> {
}
export interface CommandGroupProps<T extends object> extends ComponentPropsWithRef<typeof MenuSection<T>> {
    /** Heading label for the group. */
    heading?: ReactNode;
}
export interface CommandSeparatorProps extends ComponentPropsWithRef<typeof Separator> {
}
export interface CommandFooterProps extends ComponentPropsWithRef<'div'> {
}
export declare const CommandRoot: ({ children }: CommandRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandBackdrop: ({ children, className, isDismissable, variant, ...props }: CommandBackdropProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandContainer: ({ children, className, size, ...props }: CommandContainerProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandDialog: ({ children, className, defaultInputValue, filter, inputValue, onInputChange, ...props }: CommandDialogProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandInputGroup: ({ autoFocus, children, className, ...props }: CommandInputGroupProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandInputGroupPrefix: ({ children, className, ...props }: CommandInputGroupPrefixProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandInputGroupInput: ({ className, onKeyDownCapture: onKeyDownCaptureProp, placeholder, ...props }: CommandInputGroupInputProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandInputGroupSuffix: ({ children, className, ...props }: CommandInputGroupSuffixProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandInputGroupClearButton: ({ className, ...props }: CommandInputGroupClearButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandHeader: ({ children, className, ...props }: CommandHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandList: <T extends object>({ children, className, renderEmptyState, ...props }: CommandListProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const CommandItem: <T extends object>({ children, className, ...props }: CommandItemProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const CommandGroup: <T extends object>({ children, className, heading, ...props }: CommandGroupProps<T>) => import("react/jsx-runtime").JSX.Element;
export declare const CommandSeparator: ({ className, ...props }: CommandSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const CommandFooter: ({ children, className, ...props }: CommandFooterProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=command.d.ts.map