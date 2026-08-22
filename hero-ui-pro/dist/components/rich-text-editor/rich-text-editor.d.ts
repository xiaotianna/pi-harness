import { type ComponentPropsWithRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { SeparatorProps, ToolbarProps } from '@heroui/react';
import { Button, Input, Popover, ToggleButton as HeroToggleButton } from '@heroui/react';
import type { Editor, EditorOptions, Extensions, JSONContent, Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { EditorContent, type EditorStateSnapshot } from '@tiptap/react';
import { type BubbleMenuProps as TiptapBubbleMenuProps, type FloatingMenuProps as TiptapFloatingMenuProps } from '@tiptap/react/menus';
import { type SuggestionOptions as TiptapSuggestionOptions } from '@tiptap/suggestion';
export type RichTextEditorFormatCommand = 'blockquote' | 'bold' | 'bulletList' | 'code' | 'codeBlock' | 'heading-1' | 'heading-2' | 'heading-3' | 'italic' | 'orderedList' | 'strike' | 'underline';
export type RichTextEditorActionCommand = 'clearContent' | 'clearFormatting' | 'redo' | 'undo';
export interface RichTextEditorValueChangeDetails {
    characterCount: number;
    editor: Editor;
    html: string;
    isEmpty: boolean;
    text: string;
    wordCount: number;
}
export type RichTextEditorCommandState = boolean | ((editor: Editor) => boolean);
export interface RichTextEditorSuggestionItemsProps {
    editor: Editor;
    query: string;
}
export interface RichTextEditorSuggestionCommandProps<TItem> {
    editor: Editor;
    item: TItem;
    query: string;
    range: Range;
    text: string;
}
export interface RichTextEditorSuggestionItem<TContext = unknown> {
    command: (props: RichTextEditorSuggestionCommandProps<RichTextEditorSuggestionItem<TContext>>) => void;
    context?: TContext;
    description?: ReactNode;
    group?: string;
    icon?: ReactNode;
    id?: string;
    keywords?: string[];
    title: string;
}
export interface RichTextEditorSuggestionMenuRenderProps<TItem> {
    editor: Editor;
    isOpen: boolean;
    items: TItem[];
    query: string;
    range: Range;
    selectedIndex: number;
    selectItem: (item: TItem) => void;
    setSelectedIndex: Dispatch<SetStateAction<number>>;
    text: string;
}
export interface RichTextEditorInstance {
    editor: Editor | null;
    isDisabled: boolean;
    isReadOnly: boolean;
    maxLength?: number;
}
export declare function useRichTextEditor(): RichTextEditorInstance;
export declare function useRichTextEditorState<TSelectorResult>(selector: (context: EditorStateSnapshot<Editor>) => TSelectorResult, equalityFn?: (a: TSelectorResult | null, b: TSelectorResult | null) => boolean): TSelectorResult | null;
export declare function filterRichTextEditorSuggestionItems<TItem extends {
    keywords?: string[];
    title: string;
}>(items: TItem[], query: string): TItem[];
export interface RichTextEditorRootProps extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange'> {
    defaultValue?: JSONContent;
    editorOptions?: Partial<EditorOptions>;
    extensions?: Extensions;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    maxLength?: number;
    onValueChange?: (value: JSONContent, details: RichTextEditorValueChangeDetails) => void;
    placeholder?: string;
    value?: JSONContent;
}
export declare const RichTextEditorRoot: ({ children, className, defaultValue, editorOptions, extensions, isDisabled, isReadOnly, maxLength, onValueChange, placeholder, value, ...props }: RichTextEditorRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorShellProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const RichTextEditorShell: ({ children, className, ...props }: RichTextEditorShellProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorToolbarProps extends Omit<ToolbarProps, 'children'> {
    children: ReactNode;
}
export declare const RichTextEditorToolbar: ({ "aria-label": ariaLabel, children, className, orientation, ...props }: RichTextEditorToolbarProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorToolbarGroupProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const RichTextEditorToolbarGroup: ({ children, className, ...props }: RichTextEditorToolbarGroupProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorToolbarSeparatorProps extends Omit<SeparatorProps, 'children'> {
}
export declare const RichTextEditorToolbarSeparator: ({ className, ...props }: RichTextEditorToolbarSeparatorProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorToggleButtonProps extends Omit<ComponentPropsWithRef<typeof HeroToggleButton>, 'children' | 'isSelected'> {
    children?: ReactNode;
    command: RichTextEditorFormatCommand;
    tooltip?: ReactNode;
}
export declare const RichTextEditorToggleButton: ({ "aria-label": ariaLabel, children, className, command, isDisabled: isDisabledProp, isIconOnly, onPress, size: sizeProp, tooltip, variant, ...props }: RichTextEditorToggleButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorActionButtonProps extends Omit<ComponentPropsWithRef<typeof Button>, 'children'> {
    action: RichTextEditorActionCommand;
    children?: ReactNode;
    tooltip?: ReactNode;
}
export declare const RichTextEditorActionButton: ({ action, "aria-label": ariaLabel, children, className, isDisabled: isDisabledProp, isIconOnly, onPress, size: sizeProp, tooltip, variant, ...props }: RichTextEditorActionButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorCommandButtonProps extends Omit<ComponentPropsWithRef<typeof Button>, 'children' | 'isDisabled'> {
    children?: ReactNode;
    isActive?: RichTextEditorCommandState;
    isDisabled?: RichTextEditorCommandState;
    onCommand: (editor: Editor) => boolean | void;
    tooltip?: ReactNode;
}
export declare const RichTextEditorCommandButton: ({ "aria-label": ariaLabel, children, className, isActive: isActiveProp, isDisabled: isDisabledProp, isIconOnly, onCommand, onPress, size: sizeProp, tooltip, variant, ...props }: RichTextEditorCommandButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorLinkPopoverRootProps extends Omit<ComponentPropsWithRef<typeof Popover>, 'children'> {
    children: ReactNode;
}
export interface RichTextEditorLinkPopoverTriggerProps extends Omit<ComponentPropsWithRef<typeof Button>, 'children'> {
    children?: ReactNode;
}
export interface RichTextEditorLinkPopoverContentProps extends Omit<ComponentPropsWithRef<typeof Popover.Content>, 'children'> {
    children: ReactNode;
}
export interface RichTextEditorLinkPopoverInputProps extends ComponentPropsWithRef<typeof Input> {
}
export interface RichTextEditorLinkPopoverActionsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface RichTextEditorLinkPopoverApplyButtonProps extends Omit<ComponentPropsWithRef<typeof Button>, 'children'> {
    children?: ReactNode;
}
export interface RichTextEditorLinkPopoverUnsetButtonProps extends Omit<ComponentPropsWithRef<typeof Button>, 'children'> {
    children?: ReactNode;
}
export declare const RichTextEditorLinkPopover: (({ children, isOpen: isOpenProp, onOpenChange, ...props }: RichTextEditorLinkPopoverRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Actions: ({ children, className, ...props }: RichTextEditorLinkPopoverActionsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ApplyButton: ({ children, isDisabled: isDisabledProp, onPress, size, variant, ...props }: RichTextEditorLinkPopoverApplyButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Content: ({ children, className, ...props }: RichTextEditorLinkPopoverContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Input: ({ "aria-label": ariaLabel, className, onChange, placeholder, variant, ...props }: RichTextEditorLinkPopoverInputProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ children, isOpen: isOpenProp, onOpenChange, ...props }: RichTextEditorLinkPopoverRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Trigger: ({ "aria-label": ariaLabel, children, className, isDisabled: isDisabledProp, isIconOnly, size: sizeProp, variant, ...props }: RichTextEditorLinkPopoverTriggerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    UnsetButton: ({ children, isDisabled: isDisabledProp, onPress, size, variant, ...props }: RichTextEditorLinkPopoverUnsetButtonProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export interface RichTextEditorContentProps extends Omit<ComponentPropsWithRef<typeof EditorContent>, 'editor'> {
}
export declare const RichTextEditorContent: ({ className, ...props }: RichTextEditorContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorBubbleMenuProps extends Omit<TiptapBubbleMenuProps, 'children' | 'className' | 'editor'> {
    'aria-label'?: string;
    children: ReactNode;
    className?: string;
    toolbarProps?: Omit<ToolbarProps, 'children'>;
}
export declare const RichTextEditorBubbleMenu: ({ "aria-label": ariaLabel, children, className, pluginKey, shouldShow, toolbarProps, ...props }: RichTextEditorBubbleMenuProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
export interface RichTextEditorFloatingMenuProps extends Omit<TiptapFloatingMenuProps, 'children' | 'className' | 'editor'> {
    'aria-label'?: string;
    children: ReactNode;
    className?: string;
    toolbarProps?: Omit<ToolbarProps, 'children'>;
}
export declare const RichTextEditorFloatingMenu: ({ "aria-label": ariaLabel, children, className, pluginKey, shouldShow, toolbarProps, ...props }: RichTextEditorFloatingMenuProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
export interface RichTextEditorSuggestionMenuProps<TItem = RichTextEditorSuggestionItem> extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onSelect'> {
    allow?: TiptapSuggestionOptions<TItem, TItem>['allow'];
    allowSpaces?: boolean;
    allowToIncludeChar?: boolean;
    allowedPrefixes?: string[] | null;
    char?: string;
    children?: (props: RichTextEditorSuggestionMenuRenderProps<TItem>) => ReactNode;
    decorationClass?: string;
    decorationContent?: string;
    decorationEmptyClass?: string;
    decorationTag?: string;
    findSuggestionMatch?: TiptapSuggestionOptions<TItem, TItem>['findSuggestionMatch'];
    items: (props: RichTextEditorSuggestionItemsProps) => Promise<TItem[]> | TItem[];
    maxHeight?: number;
    onSelect?: (props: RichTextEditorSuggestionCommandProps<TItem>) => void;
    pluginKey?: PluginKey | string;
    shouldResetDismissed?: TiptapSuggestionOptions<TItem, TItem>['shouldResetDismissed'];
    shouldShow?: TiptapSuggestionOptions<TItem, TItem>['shouldShow'];
    startOfLine?: boolean;
}
export declare const RichTextEditorSuggestionMenu: <TItem = RichTextEditorSuggestionItem>({ allow, allowSpaces, allowToIncludeChar, allowedPrefixes, char, children, className, decorationClass, decorationContent, decorationEmptyClass, decorationTag, findSuggestionMatch, items, maxHeight, onSelect, pluginKey, shouldResetDismissed, shouldShow, startOfLine, style, ...props }: RichTextEditorSuggestionMenuProps<TItem>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
export interface RichTextEditorFooterProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const RichTextEditorFooter: ({ children, className, ...props }: RichTextEditorFooterProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface RichTextEditorCharacterCountProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
    children?: ((stats: {
        characters: number;
        isEmpty: boolean;
        words: number;
    }) => ReactNode) | ReactNode;
    showWords?: boolean;
}
export declare const RichTextEditorCharacterCount: ({ children, className, showWords, ...props }: RichTextEditorCharacterCountProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=rich-text-editor.d.ts.map