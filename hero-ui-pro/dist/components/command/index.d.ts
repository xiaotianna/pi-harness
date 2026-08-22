import type { ComponentProps } from 'react';
import { CommandBackdrop, CommandContainer, CommandDialog, CommandFooter, CommandGroup, CommandHeader, CommandInputGroup, CommandInputGroupClearButton, CommandInputGroupInput, CommandInputGroupPrefix, CommandInputGroupSuffix, CommandItem, CommandList, CommandRoot, CommandSeparator } from './command';
export declare const Command: (({ children }: import("./command").CommandRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Root: ({ children }: import("./command").CommandRootProps) => import("react/jsx-runtime").JSX.Element;
    Backdrop: ({ children, className, isDismissable, variant, ...props }: import("./command").CommandBackdropProps) => import("react/jsx-runtime").JSX.Element;
    Container: ({ children, className, size, ...props }: import("./command").CommandContainerProps) => import("react/jsx-runtime").JSX.Element;
    Dialog: ({ children, className, defaultInputValue, filter, inputValue, onInputChange, ...props }: import("./command").CommandDialogProps) => import("react/jsx-runtime").JSX.Element;
    Header: ({ children, className, ...props }: import("./command").CommandHeaderProps) => import("react/jsx-runtime").JSX.Element;
    InputGroup: (({ autoFocus, children, className, ...props }: import("./command").CommandInputGroupProps) => import("react/jsx-runtime").JSX.Element) & {
        Prefix: ({ children, className, ...props }: import("./command").CommandInputGroupPrefixProps) => import("react/jsx-runtime").JSX.Element;
        Input: ({ className, onKeyDownCapture: onKeyDownCaptureProp, placeholder, ...props }: import("./command").CommandInputGroupInputProps) => import("react/jsx-runtime").JSX.Element;
        ClearButton: ({ className, ...props }: import("./command").CommandInputGroupClearButtonProps) => import("react/jsx-runtime").JSX.Element;
        Suffix: ({ children, className, ...props }: import("./command").CommandInputGroupSuffixProps) => import("react/jsx-runtime").JSX.Element;
    };
    List: <T extends object>({ children, className, renderEmptyState, ...props }: import("./command").CommandListProps<T>) => import("react/jsx-runtime").JSX.Element;
    Item: <T extends object>({ children, className, ...props }: import("./command").CommandItemProps<T>) => import("react/jsx-runtime").JSX.Element;
    Group: <T extends object>({ children, className, heading, ...props }: import("./command").CommandGroupProps<T>) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, ...props }: import("./command").CommandSeparatorProps) => import("react/jsx-runtime").JSX.Element;
    Footer: ({ children, className, ...props }: import("./command").CommandFooterProps) => import("react/jsx-runtime").JSX.Element;
};
export type Command<T extends object = object> = {
    Props: ComponentProps<typeof CommandRoot>;
    RootProps: ComponentProps<typeof CommandRoot>;
    BackdropProps: ComponentProps<typeof CommandBackdrop>;
    ContainerProps: ComponentProps<typeof CommandContainer>;
    DialogProps: ComponentProps<typeof CommandDialog>;
    HeaderProps: ComponentProps<typeof CommandHeader>;
    InputGroupProps: ComponentProps<typeof CommandInputGroup>;
    InputGroupPrefixProps: ComponentProps<typeof CommandInputGroupPrefix>;
    InputGroupInputProps: ComponentProps<typeof CommandInputGroupInput>;
    InputGroupClearButtonProps: ComponentProps<typeof CommandInputGroupClearButton>;
    InputGroupSuffixProps: ComponentProps<typeof CommandInputGroupSuffix>;
    ListProps: ComponentProps<typeof CommandList<T>>;
    ItemProps: ComponentProps<typeof CommandItem<T>>;
    GroupProps: ComponentProps<typeof CommandGroup<T>>;
    SeparatorProps: ComponentProps<typeof CommandSeparator>;
    FooterProps: ComponentProps<typeof CommandFooter>;
};
export { CommandBackdrop, CommandContainer, CommandDialog, CommandFooter, CommandGroup, CommandHeader, CommandInputGroup, CommandInputGroupClearButton, CommandInputGroupInput, CommandInputGroupPrefix, CommandInputGroupSuffix, CommandItem, CommandList, CommandRoot, CommandSeparator, };
export type { CommandBackdropProps, CommandContainerProps, CommandDialogProps, CommandFooterProps, CommandGroupProps, CommandHeaderProps, CommandInputGroupClearButtonProps, CommandInputGroupInputProps, CommandInputGroupPrefixProps, CommandInputGroupProps, CommandInputGroupSuffixProps, CommandItemProps, CommandListProps, CommandRootProps as CommandProps, CommandRootProps, CommandSeparatorProps, } from './command';
export type { CommandVariants } from './command.styles';
export { commandVariants } from './command.styles';
//# sourceMappingURL=index.d.ts.map