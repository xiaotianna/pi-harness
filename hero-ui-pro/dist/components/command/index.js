import { CommandBackdrop, CommandContainer, CommandDialog, CommandFooter, CommandGroup, CommandHeader, CommandInputGroup, CommandInputGroupClearButton, CommandInputGroupInput, CommandInputGroupPrefix, CommandInputGroupSuffix, CommandItem, CommandList, CommandRoot, CommandSeparator, } from './command';
export const Command = Object.assign(CommandRoot, {
    Root: CommandRoot,
    Backdrop: CommandBackdrop,
    Container: CommandContainer,
    Dialog: CommandDialog,
    Header: CommandHeader,
    InputGroup: Object.assign(CommandInputGroup, {
        Prefix: CommandInputGroupPrefix,
        Input: CommandInputGroupInput,
        ClearButton: CommandInputGroupClearButton,
        Suffix: CommandInputGroupSuffix,
    }),
    List: CommandList,
    Item: CommandItem,
    Group: CommandGroup,
    Separator: CommandSeparator,
    Footer: CommandFooter,
});
export { CommandBackdrop, CommandContainer, CommandDialog, CommandFooter, CommandGroup, CommandHeader, CommandInputGroup, CommandInputGroupClearButton, CommandInputGroupInput, CommandInputGroupPrefix, CommandInputGroupSuffix, CommandItem, CommandList, CommandRoot, CommandSeparator, };
export { commandVariants } from './command.styles';
//# sourceMappingURL=index.js.map