'use client';
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { createPortal } from 'react-dom';
import { cx } from 'tailwind-variants';
import { Button, Input, ListBox, Popover, Separator, ToggleButton as HeroToggleButton, Toolbar, Tooltip, } from '@heroui/react';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { PluginKey } from '@tiptap/pm/state';
import { EditorContent, Tiptap, useEditor, useEditorState, } from '@tiptap/react';
import { BubbleMenu as TiptapBubbleMenu, FloatingMenu as TiptapFloatingMenu, } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { exitSuggestion, Suggestion, } from '@tiptap/suggestion';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { richTextEditorVariants } from './rich-text-editor.styles';
const RichTextEditorContext = createContext(null);
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
function useRichTextEditorContext() {
    const context = useContext(RichTextEditorContext);
    if (!context) {
        throw new Error('RichTextEditor subcomponents must be used within RichTextEditor');
    }
    return context;
}
export function useRichTextEditor() {
    const { editor, isDisabled, isReadOnly, maxLength } = useRichTextEditorContext();
    return useMemo(() => ({ editor, isDisabled, isReadOnly, maxLength }), [editor, isDisabled, isReadOnly, maxLength]);
}
export function useRichTextEditorState(selector, equalityFn) {
    const { editor } = useRichTextEditorContext();
    return useEditorState({
        editor,
        equalityFn,
        selector: (context) => context.editor ? selector(context) : null,
    });
}
const EMPTY_DOC = {
    content: [{ type: 'paragraph' }],
    type: 'doc',
};
const FORMAT_LABELS = {
    blockquote: 'Blockquote',
    bold: 'Bold',
    bulletList: 'Bulleted list',
    code: 'Inline code',
    codeBlock: 'Code block',
    'heading-1': 'Heading 1',
    'heading-2': 'Heading 2',
    'heading-3': 'Heading 3',
    italic: 'Italic',
    orderedList: 'Numbered list',
    strike: 'Strikethrough',
    underline: 'Underline',
};
const ACTION_LABELS = {
    clearContent: 'Clear content',
    clearFormatting: 'Clear formatting',
    redo: 'Redo',
    undo: 'Undo',
};
const DEFAULT_ALLOWED_PREFIXES = [' '];
function countWords(text) {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}
function headingLevel(command) {
    return Number(command.replace('heading-', ''));
}
function isHeadingCommand(command) {
    return (command === 'heading-1' ||
        command === 'heading-2' ||
        command === 'heading-3');
}
function isFormatActive(editor, command) {
    return isHeadingCommand(command)
        ? editor.isActive('heading', { level: headingLevel(command) })
        : editor.isActive(command);
}
function canRunFormat(editor, command) {
    if (isHeadingCommand(command)) {
        return editor
            .can()
            .chain()
            .focus()
            .toggleHeading({ level: headingLevel(command) })
            .run();
    }
    switch (command) {
        case 'blockquote':
            return editor.can().chain().focus().toggleBlockquote().run();
        case 'bold':
            return editor.can().chain().focus().toggleBold().run();
        case 'bulletList':
            return editor.can().chain().focus().toggleBulletList().run();
        case 'code':
            return editor.can().chain().focus().toggleCode().run();
        case 'codeBlock':
            return editor.can().chain().focus().toggleCodeBlock().run();
        case 'italic':
            return editor.can().chain().focus().toggleItalic().run();
        case 'orderedList':
            return editor.can().chain().focus().toggleOrderedList().run();
        case 'strike':
            return editor.can().chain().focus().toggleStrike().run();
        case 'underline':
            return editor.can().chain().focus().toggleUnderline().run();
    }
}
function runFormat(editor, command) {
    if (isHeadingCommand(command)) {
        return editor
            .chain()
            .focus()
            .toggleHeading({ level: headingLevel(command) })
            .run();
    }
    switch (command) {
        case 'blockquote':
            return editor.chain().focus().toggleBlockquote().run();
        case 'bold':
            return editor.chain().focus().toggleBold().run();
        case 'bulletList':
            return editor.chain().focus().toggleBulletList().run();
        case 'code':
            return editor.chain().focus().toggleCode().run();
        case 'codeBlock':
            return editor.chain().focus().toggleCodeBlock().run();
        case 'italic':
            return editor.chain().focus().toggleItalic().run();
        case 'orderedList':
            return editor.chain().focus().toggleOrderedList().run();
        case 'strike':
            return editor.chain().focus().toggleStrike().run();
        case 'underline':
            return editor.chain().focus().toggleUnderline().run();
    }
}
function canRunAction(editor, action) {
    switch (action) {
        case 'clearContent':
        case 'clearFormatting':
            return !editor.isEmpty;
        case 'redo':
            return editor.can().chain().focus().redo().run();
        case 'undo':
            return editor.can().chain().focus().undo().run();
    }
}
function runAction(editor, action) {
    switch (action) {
        case 'clearContent':
            return editor.chain().focus().clearContent().run();
        case 'clearFormatting':
            return editor.chain().focus().unsetAllMarks().clearNodes().run();
        case 'redo':
            return editor.chain().focus().redo().run();
        case 'undo':
            return editor.chain().focus().undo().run();
    }
}
function resolveCommandState(state, editor) {
    return typeof state === 'function' ? state(editor) : (state ?? false);
}
function getDetails(editor) {
    const text = editor.getText();
    return {
        characterCount: editor.storage.characterCount?.characters?.() ?? text.length,
        editor,
        html: editor.getHTML(),
        isEmpty: editor.isEmpty,
        text,
        wordCount: editor.storage.characterCount?.words?.() ?? countWords(text),
    };
}
function normalizeLinkHref(href) {
    const trimmed = href.trim();
    if (!trimmed)
        return '';
    // eslint-disable-next-line regexp/no-unused-capturing-group
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed))
        return trimmed;
    return `https://${trimmed}`;
}
function getLinkHref(editor) {
    return editor ? (editor.getAttributes('link').href ?? '') : '';
}
function getMenuPosition(clientRect) {
    const rect = clientRect?.();
    const viewportWidth = typeof window === 'undefined'
        ? Number.POSITIVE_INFINITY
        : window.innerWidth;
    return {
        left: Math.max(8, Math.min(rect?.left ?? 0, viewportWidth - 320 - 8)),
        top: rect ? rect.bottom + 8 : 0,
    };
}
function isDefaultSuggestionItem(item) {
    return Boolean(item && typeof item === 'object' && 'title' in item && 'command' in item);
}
export function filterRichTextEditorSuggestionItems(items, query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized)
        return items;
    return items.filter((item) => [item.title, ...(item.keywords ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(normalized));
}
export const RichTextEditorRoot = ({ children, className, defaultValue, editorOptions, extensions, isDisabled = false, isReadOnly = false, maxLength, onValueChange, placeholder = 'Start writing...', value, ...props }) => {
    const slots = useMemo(() => richTextEditorVariants(), []);
    const [initialValue] = useState(() => value ?? defaultValue ?? EMPTY_DOC);
    const latestValueRef = useRef(initialValue);
    const onValueChangeRef = useRef(onValueChange);
    const onUpdateRef = useRef(editorOptions?.onUpdate);
    const editable = !isDisabled && !isReadOnly;
    const resolvedExtensions = useMemo(() => [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder }),
        CharacterCount.configure({ limit: maxLength }),
        ...(extensions ?? []),
    ], [extensions, maxLength, placeholder]);
    const attributes = useMemo(() => {
        const attrs = editorOptions?.editorProps?.attributes;
        const proseMirrorClassName = slots.proseMirror();
        const withSlot = (value = {}) => ({
            ...value,
            class: cx(proseMirrorClassName, value.class) ?? '',
            'data-slot': 'rich-text-editor-prosemirror',
        });
        return typeof attrs === 'function'
            ? (...args) => withSlot(attrs(...args))
            : withSlot(attrs);
    }, [editorOptions?.editorProps?.attributes, slots]);
    useIsomorphicLayoutEffect(() => {
        onValueChangeRef.current = onValueChange;
        onUpdateRef.current = editorOptions?.onUpdate;
    }, [editorOptions?.onUpdate, onValueChange]);
    const emitValueChange = useCallback((editor) => {
        const nextValue = editor.getJSON();
        latestValueRef.current = nextValue;
        onValueChangeRef.current?.(nextValue, getDetails(editor));
    }, []);
    const editor = useEditor({
        ...editorOptions,
        content: latestValueRef.current,
        editable,
        editorProps: {
            ...editorOptions?.editorProps,
            attributes,
        },
        extensions: resolvedExtensions,
        immediatelyRender: false,
        onUpdate: (props) => {
            onUpdateRef.current?.(props);
            emitValueChange(props.editor);
        },
        shouldRerenderOnTransaction: false,
    }, [resolvedExtensions]);
    useEffect(() => {
        editor?.setEditable(editable);
    }, [editor, editable]);
    useEffect(() => {
        editor?.setOptions({
            editorProps: {
                ...editorOptions?.editorProps,
                attributes,
            },
        });
    }, [attributes, editor, editorOptions?.editorProps]);
    useIsomorphicLayoutEffect(() => {
        const nextValue = value ?? latestValueRef.current;
        if (value !== undefined)
            latestValueRef.current = value;
        if (!editor)
            return;
        if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextValue)) {
            editor.commands.setContent(nextValue, { emitUpdate: false });
        }
    }, [editor, value]);
    const contextValue = useMemo(() => ({
        editor,
        isDisabled,
        isReadOnly,
        maxLength,
        slots,
    }), [editor, isDisabled, isReadOnly, maxLength, slots]);
    const content = editor ? jsx(Tiptap, { editor, children }) : children;
    return jsx(RichTextEditorContext, {
        value: contextValue,
        children: jsx('div', {
            className: composeSlotClassName(slots.base, className),
            'data-disabled': isDisabled || undefined,
            'data-readonly': isReadOnly || undefined,
            'data-slot': 'rich-text-editor',
            ...props,
            children: content,
        }),
    });
};
export const RichTextEditorShell = ({ children, className, ...props }) => {
    const { slots } = useRichTextEditorContext();
    return jsx('div', {
        className: composeSlotClassName(slots.shell, className),
        'data-slot': 'rich-text-editor-shell',
        ...props,
        children,
    });
};
export const RichTextEditorToolbar = ({ 'aria-label': ariaLabel = 'Editor toolbar', children, className, orientation = 'horizontal', ...props }) => {
    const { slots } = useRichTextEditorContext();
    return jsx(Toolbar, {
        'aria-label': ariaLabel,
        className: composeTwRenderProps(className, slots.toolbar()),
        'data-slot': 'rich-text-editor-toolbar',
        orientation,
        ...props,
        children,
    });
};
export const RichTextEditorToolbarGroup = ({ children, className, ...props }) => {
    const { slots } = useRichTextEditorContext();
    return jsx('div', {
        className: composeSlotClassName(slots.toolbarGroup, className),
        'data-slot': 'rich-text-editor-toolbar-group',
        role: 'group',
        ...props,
        children,
    });
};
export const RichTextEditorToolbarSeparator = ({ className, ...props }) => {
    const { slots } = useRichTextEditorContext();
    return jsx(Separator, {
        className: composeSlotClassName(slots.separator, className),
        'data-slot': 'rich-text-editor-toolbar-separator',
        ...props,
    });
};
export const RichTextEditorToggleButton = ({ 'aria-label': ariaLabel, children, className, command, isDisabled: isDisabledProp, isIconOnly = true, onPress, size: sizeProp, tooltip, variant = 'ghost', ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const state = useEditorState({
        editor,
        selector: ({ editor }) => ({
            canRun: Boolean(editor && canRunFormat(editor, command)),
            isActive: Boolean(editor && isFormatActive(editor, command)),
        }),
    }) ?? { canRun: false, isActive: false };
    const disabled = isDisabled || isReadOnly || isDisabledProp || !state.canRun;
    const button = jsx(HeroToggleButton, {
        ...props,
        'aria-label': ariaLabel ?? FORMAT_LABELS[command],
        className: composeTwRenderProps(className, slots.toolbarButton()),
        'data-active': state.isActive || undefined,
        'data-command': command,
        'data-slot': 'rich-text-editor-toggle-button',
        isDisabled: disabled,
        isIconOnly,
        isSelected: state.isActive,
        size: sizeProp ?? 'sm',
        variant,
        onPress: (event) => {
            if (editor && !disabled)
                runFormat(editor, command);
            onPress?.(event);
        },
        children: children ?? FORMAT_LABELS[command],
    });
    return tooltip
        ? jsxs(Tooltip, {
            delay: 0,
            children: [button, jsx(Tooltip.Content, { children: tooltip })],
        })
        : button;
};
export const RichTextEditorActionButton = ({ action, 'aria-label': ariaLabel, children, className, isDisabled: isDisabledProp, isIconOnly = true, onPress, size: sizeProp, tooltip, variant = 'tertiary', ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const state = useEditorState({
        editor,
        selector: ({ editor }) => ({
            canRun: Boolean(editor && canRunAction(editor, action)),
        }),
    }) ?? { canRun: false };
    const disabled = isDisabled || isReadOnly || isDisabledProp || !state.canRun;
    const button = jsx(Button, {
        ...props,
        'aria-label': ariaLabel ?? ACTION_LABELS[action],
        className: composeTwRenderProps(className, slots.toolbarButton()),
        'data-action': action,
        'data-slot': 'rich-text-editor-action-button',
        isDisabled: disabled,
        isIconOnly,
        size: sizeProp ?? 'sm',
        variant,
        onPress: (event) => {
            if (editor && !disabled)
                runAction(editor, action);
            onPress?.(event);
        },
        children: children ?? ACTION_LABELS[action],
    });
    return tooltip
        ? jsxs(Tooltip, {
            delay: 0,
            children: [button, jsx(Tooltip.Content, { children: tooltip })],
        })
        : button;
};
export const RichTextEditorCommandButton = ({ 'aria-label': ariaLabel, children, className, isActive: isActiveProp, isDisabled: isDisabledProp, isIconOnly = true, onCommand, onPress, size: sizeProp, tooltip, variant = 'tertiary', ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const state = useRichTextEditorState(({ editor }) => ({
        isActive: resolveCommandState(isActiveProp, editor),
        isDisabled: resolveCommandState(isDisabledProp, editor),
    }), (a, b) => a?.isActive === b?.isActive && a?.isDisabled === b?.isDisabled) ?? { isActive: false, isDisabled: true };
    const disabled = isDisabled || isReadOnly || !editor || state.isDisabled;
    const button = jsx(Button, {
        ...props,
        'aria-label': ariaLabel ?? (typeof tooltip === 'string' ? tooltip : undefined),
        'aria-pressed': state.isActive || undefined,
        className: composeTwRenderProps(className, slots.toolbarButton()),
        'data-active': state.isActive || undefined,
        'data-slot': 'rich-text-editor-command-button',
        isDisabled: disabled,
        isIconOnly,
        size: sizeProp ?? 'sm',
        variant,
        onPress: (event) => {
            if (editor && !disabled)
                onCommand(editor);
            onPress?.(event);
        },
        children,
    });
    return tooltip
        ? jsxs(Tooltip, {
            delay: 0,
            children: [button, jsx(Tooltip.Content, { children: tooltip })],
        })
        : button;
};
const LinkPopoverContext = createContext(null);
function useLinkPopoverContext() {
    const context = useContext(LinkPopoverContext);
    if (!context) {
        throw new Error('RichTextEditor.LinkPopover subcomponents must be used within LinkPopover');
    }
    return context;
}
const RichTextEditorLinkPopoverRoot = ({ children, isOpen: isOpenProp, onOpenChange, ...props }) => {
    const { editor, isDisabled, isReadOnly } = useRichTextEditorContext();
    const [href, setHref] = useState('');
    const [isOpenState, setOpenState] = useState(false);
    const isOpen = isOpenProp ?? isOpenState;
    const disabled = isDisabled || isReadOnly || !editor;
    const setOpen = useCallback((open) => {
        if (isOpenProp === undefined)
            setOpenState(open);
        onOpenChange?.(open);
    }, [isOpenProp, onOpenChange]);
    const handleOpenChange = useCallback((open) => {
        if (open)
            setHref(getLinkHref(editor));
        setOpen(open);
    }, [editor, setOpen]);
    const applyLink = useCallback(() => {
        if (!editor || disabled)
            return;
        const normalized = normalizeLinkHref(href);
        if (!normalized) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setOpen(false);
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: normalized })
            .run();
        setOpen(false);
    }, [disabled, editor, href, setOpen]);
    const unsetLink = useCallback(() => {
        if (!editor || disabled)
            return;
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        setHref('');
        setOpen(false);
    }, [disabled, editor, setOpen]);
    const contextValue = useMemo(() => ({
        applyLink,
        href,
        isDisabled: disabled,
        setHref,
        unsetLink,
    }), [applyLink, disabled, href, unsetLink]);
    return jsx(LinkPopoverContext, {
        value: contextValue,
        children: jsx(Popover, {
            isOpen,
            onOpenChange: handleOpenChange,
            ...props,
            children,
        }),
    });
};
export const RichTextEditorLinkPopover = Object.assign(RichTextEditorLinkPopoverRoot, {
    Actions: ({ children, className, ...props }) => {
        const { slots } = useRichTextEditorContext();
        return jsx('div', {
            className: composeSlotClassName(slots.linkPopoverActions, className),
            'data-slot': 'rich-text-editor-link-popover-actions',
            ...props,
            children,
        });
    },
    ApplyButton: ({ children = 'Apply', isDisabled: isDisabledProp, onPress, size = 'sm', variant = 'primary', ...props }) => {
        const { applyLink, href, isDisabled } = useLinkPopoverContext();
        const disabled = isDisabled || isDisabledProp || !href.trim();
        return jsx(Button, {
            ...props,
            'data-slot': 'rich-text-editor-link-apply-button',
            isDisabled: disabled,
            size,
            variant,
            onPress: (event) => {
                if (!disabled)
                    applyLink();
                onPress?.(event);
            },
            children,
        });
    },
    Content: ({ children, className, ...props }) => {
        const { slots } = useRichTextEditorContext();
        return jsxs(Popover.Content, {
            className: composeTwRenderProps(className, slots.linkPopover()),
            'data-slot': 'rich-text-editor-link-popover',
            placement: props.placement ?? 'bottom start',
            ...props,
            children: [
                jsx(Popover.Arrow, {}),
                jsx(Popover.Dialog, {
                    className: composeSlotClassName(slots.linkPopoverContent),
                    'data-slot': 'rich-text-editor-link-popover-content',
                    children,
                }),
            ],
        });
    },
    Input: ({ 'aria-label': ariaLabel, className, onChange, placeholder = 'https://example.com', variant = 'secondary', ...props }) => {
        const { slots } = useRichTextEditorContext();
        const { href, isDisabled, setHref } = useLinkPopoverContext();
        return jsx(Input, {
            ...props,
            fullWidth: true,
            'aria-label': ariaLabel ?? 'Link URL',
            className: composeTwRenderProps(className, slots.linkInput()),
            'data-slot': 'rich-text-editor-link-input',
            disabled: isDisabled || props.disabled,
            placeholder,
            value: props.value ?? href,
            variant,
            onChange: (event) => {
                setHref(event.target.value);
                onChange?.(event);
            },
        });
    },
    Root: RichTextEditorLinkPopoverRoot,
    Trigger: ({ 'aria-label': ariaLabel, children, className, isDisabled: isDisabledProp, isIconOnly = true, size: sizeProp, variant = 'tertiary', ...props }) => {
        const { editor, slots } = useRichTextEditorContext();
        const { isDisabled } = useLinkPopoverContext();
        const state = useEditorState({
            editor,
            selector: ({ editor }) => ({
                isActive: Boolean(editor && editor.isActive('link')),
            }),
        }) ?? { isActive: false };
        return jsx(Popover.Trigger, {
            children: jsx(Button, {
                ...props,
                'aria-label': ariaLabel ?? 'Link',
                className: composeTwRenderProps(className, cx(slots.toolbarButton(), slots.linkPopoverTrigger())),
                'data-active': state.isActive || undefined,
                'data-slot': 'rich-text-editor-link-popover-trigger',
                isDisabled: isDisabled || isDisabledProp,
                isIconOnly,
                size: sizeProp ?? 'sm',
                variant,
                children: children ?? 'Link',
            }),
        });
    },
    UnsetButton: ({ children = 'Remove', isDisabled: isDisabledProp, onPress, size = 'sm', variant = 'tertiary', ...props }) => {
        const { editor } = useRichTextEditorContext();
        const { isDisabled, unsetLink } = useLinkPopoverContext();
        const state = useEditorState({
            editor,
            selector: ({ editor }) => ({
                isActive: Boolean(editor && editor.isActive('link')),
            }),
        }) ?? { isActive: false };
        const disabled = isDisabled || isDisabledProp || !state.isActive;
        return jsx(Button, {
            ...props,
            'data-slot': 'rich-text-editor-link-unset-button',
            isDisabled: disabled,
            size,
            variant,
            onPress: (event) => {
                if (!disabled)
                    unsetLink();
                onPress?.(event);
            },
            children,
        });
    },
});
export const RichTextEditorContent = ({ className, ...props }) => {
    const { editor, slots } = useRichTextEditorContext();
    return editor
        ? jsx(EditorContent, {
            className: composeSlotClassName(slots.content, className),
            'data-slot': 'rich-text-editor-content',
            editor,
            ...props,
        })
        : jsx('div', {
            className: composeSlotClassName(slots.loading, className),
            'data-slot': 'rich-text-editor-loading',
            ...props,
        });
};
export const RichTextEditorBubbleMenu = ({ 'aria-label': ariaLabel = 'Selection formatting toolbar', children, className, pluginKey = 'rich-text-editor-bubble-menu', shouldShow, toolbarProps, ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const { 'aria-label': toolbarAriaLabel = ariaLabel, className: toolbarClassName, orientation = 'horizontal', ...restToolbarProps } = toolbarProps ?? {};
    const resolvedShouldShow = useCallback((props) => !isDisabled &&
        !isReadOnly &&
        (shouldShow
            ? shouldShow(props)
            : props.editor.isFocused && !props.editor.state.selection.empty), [isDisabled, isReadOnly, shouldShow]);
    return editor
        ? jsx(TiptapBubbleMenu, {
            className: composeSlotClassName(slots.bubbleMenu, className),
            editor,
            pluginKey,
            shouldShow: resolvedShouldShow,
            ...props,
            children: jsx(Toolbar, {
                'aria-label': toolbarAriaLabel,
                className: composeTwRenderProps(toolbarClassName, slots.bubbleMenuToolbar()),
                'data-slot': 'rich-text-editor-bubble-menu-toolbar',
                orientation,
                ...restToolbarProps,
                children,
            }),
        })
        : null;
};
export const RichTextEditorFloatingMenu = ({ 'aria-label': ariaLabel = 'Insertion toolbar', children, className, pluginKey = 'rich-text-editor-floating-menu', shouldShow, toolbarProps, ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const { 'aria-label': toolbarAriaLabel = ariaLabel, className: toolbarClassName, orientation = 'horizontal', ...restToolbarProps } = toolbarProps ?? {};
    const resolvedShouldShow = isDisabled || isReadOnly ? () => false : shouldShow;
    return editor
        ? jsx(TiptapFloatingMenu, {
            className: composeSlotClassName(slots.floatingMenu, className),
            editor,
            pluginKey,
            shouldShow: resolvedShouldShow,
            ...props,
            children: jsx(Toolbar, {
                'aria-label': toolbarAriaLabel,
                className: composeTwRenderProps(toolbarClassName, slots.floatingMenuToolbar()),
                'data-slot': 'rich-text-editor-floating-menu-toolbar',
                orientation,
                ...restToolbarProps,
                children,
            }),
        })
        : null;
};
export const RichTextEditorSuggestionMenu = ({ allow, allowSpaces = false, allowToIncludeChar = false, allowedPrefixes = DEFAULT_ALLOWED_PREFIXES, char = '/', children, className, decorationClass = 'rich-text-editor__suggestion-decoration', decorationContent, decorationEmptyClass, decorationTag, findSuggestionMatch, items, maxHeight = 384, onSelect, pluginKey, shouldResetDismissed, shouldShow, startOfLine = false, style, ...props }) => {
    const { editor, isDisabled, isReadOnly, slots } = useRichTextEditorContext();
    const id = useId();
    const [state, setState] = useState(null);
    const stateRef = useRef(null);
    const itemsRef = useRef(items);
    const onSelectRef = useRef(onSelect);
    const key = useMemo(() => pluginKey instanceof PluginKey
        ? pluginKey
        : new PluginKey(pluginKey || `rich-text-editor-suggestion-${id.replace(/:/g, '')}`), [id, pluginKey]);
    const setSuggestionState = useCallback((next) => {
        stateRef.current = next;
        setState(next);
    }, []);
    const setSelectedIndex = useCallback((next) => {
        const current = stateRef.current;
        if (!current)
            return;
        setSuggestionState({
            ...current,
            selectedIndex: typeof next === 'function' ? next(current.selectedIndex) : next,
        });
    }, [setSuggestionState]);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);
    const updateState = useCallback((props) => {
        const position = getMenuPosition(props.clientRect);
        const current = stateRef.current;
        const maxIndex = Math.max(props.items.length - 1, 0);
        const selectedIndex = current?.query === props.query
            ? Math.min(current.selectedIndex, maxIndex)
            : 0;
        setSuggestionState({
            clientRect: props.clientRect,
            editor: props.editor,
            isOpen: true,
            items: props.items,
            left: position.left,
            query: props.query,
            range: props.range,
            selectedIndex,
            text: props.text,
            top: position.top,
        });
    }, [setSuggestionState]);
    const runSelect = useCallback((item, current) => {
        if (stateRef.current !== current)
            return;
        setSuggestionState(null);
        const commandProps = {
            editor: current.editor,
            item,
            query: current.query,
            range: current.range,
            text: current.text,
        };
        if (onSelectRef.current) {
            onSelectRef.current(commandProps);
        }
        else if (isDefaultSuggestionItem(item)) {
            item.command(commandProps);
        }
        exitSuggestion(current.editor.view, key);
    }, [key, setSuggestionState]);
    const selectItem = useCallback((item) => {
        const current = stateRef.current;
        if (current)
            runSelect(item, current);
    }, [runSelect]);
    const handleKeyDown = useCallback(({ event }) => {
        const current = stateRef.current;
        if (!current?.isOpen)
            return false;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSuggestionState({
                ...current,
                selectedIndex: Math.min(current.selectedIndex + 1, Math.max(current.items.length - 1, 0)),
            });
            return true;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSuggestionState({
                ...current,
                selectedIndex: Math.max(current.selectedIndex - 1, 0),
            });
            return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
            const item = current.items[current.selectedIndex];
            if (!item)
                return false;
            event.preventDefault();
            selectItem(item);
            return true;
        }
        return false;
    }, [selectItem, setSuggestionState]);
    useEffect(() => {
        if (!editor || isDisabled || isReadOnly)
            return;
        const plugin = Suggestion({
            allow,
            allowSpaces,
            allowToIncludeChar,
            allowedPrefixes,
            char,
            decorationClass,
            decorationContent,
            decorationEmptyClass,
            decorationTag,
            editor,
            findSuggestionMatch,
            items: (props) => itemsRef.current(props),
            pluginKey: key,
            render: () => ({
                onExit: () => setSuggestionState(null),
                onKeyDown: handleKeyDown,
                onStart: updateState,
                onUpdate: updateState,
            }),
            shouldResetDismissed,
            shouldShow,
            startOfLine,
        });
        editor.registerPlugin(plugin);
        return () => {
            editor.unregisterPlugin(key);
        };
    }, [
        allow,
        allowSpaces,
        allowToIncludeChar,
        allowedPrefixes,
        char,
        decorationClass,
        decorationContent,
        decorationEmptyClass,
        decorationTag,
        editor,
        findSuggestionMatch,
        handleKeyDown,
        isDisabled,
        isReadOnly,
        key,
        setSuggestionState,
        shouldResetDismissed,
        shouldShow,
        startOfLine,
        updateState,
    ]);
    useEffect(() => {
        if (!state?.isOpen)
            return;
        const updatePosition = () => {
            const current = stateRef.current;
            if (!current)
                return;
            setSuggestionState({
                ...current,
                ...getMenuPosition(current.clientRect),
            });
        };
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [setSuggestionState, state?.isOpen]);
    if (!state?.isOpen || isDisabled || isReadOnly)
        return null;
    const renderProps = {
        editor: state.editor,
        isOpen: state.isOpen,
        items: state.items,
        query: state.query,
        range: state.range,
        selectItem,
        selectedIndex: state.selectedIndex,
        setSelectedIndex,
        text: state.text,
    };
    const customChildren = children?.(renderProps);
    const mappedItems = state.items.map((item, index) => {
        const suggestionItem = isDefaultSuggestionItem(item) ? item : null;
        return {
            index,
            item,
            key: suggestionItem?.id ??
                `${suggestionItem?.title ?? 'suggestion'}-${index}`,
            suggestionItem,
            textValue: suggestionItem?.title ?? String(index + 1),
        };
    });
    const selectedKey = mappedItems[state.selectedIndex]?.key;
    const menu = jsx('div', {
        className: composeSlotClassName(slots.suggestionMenu, className),
        'data-slot': 'rich-text-editor-suggestion-menu',
        style: {
            left: state.left,
            maxHeight,
            position: 'fixed',
            top: state.top,
            zIndex: 50,
            ...style,
        },
        ...props,
        children: customChildren ??
            jsx(ListBox, {
                'aria-label': 'Suggestions',
                className: slots.suggestionMenuList(),
                'data-slot': 'rich-text-editor-suggestion-menu-list',
                selectedKeys: selectedKey ? [selectedKey] : [],
                selectionMode: 'single',
                onAction: (key) => {
                    const mapped = mappedItems.find((item) => item.key === key);
                    if (mapped)
                        selectItem(mapped.item);
                },
                children: mappedItems.length
                    ? mappedItems.map(({ index, item, key, suggestionItem, textValue }) => jsxs(ListBox.Item, {
                        className: slots.suggestionMenuItem(),
                        'data-selected': index === state.selectedIndex || undefined,
                        'data-slot': 'rich-text-editor-suggestion-menu-item',
                        id: key,
                        textValue,
                        onMouseDown: (event) => event.preventDefault(),
                        onMouseEnter: () => setSelectedIndex(index),
                        children: [
                            suggestionItem?.icon
                                ? jsx('span', {
                                    className: slots.suggestionMenuIcon(),
                                    'data-slot': 'rich-text-editor-suggestion-menu-icon',
                                    children: suggestionItem.icon,
                                })
                                : null,
                            jsxs('span', {
                                className: slots.suggestionMenuItemContent(),
                                'data-slot': 'rich-text-editor-suggestion-menu-item-content',
                                children: [
                                    jsx('span', {
                                        className: slots.suggestionMenuTitle(),
                                        'data-slot': 'rich-text-editor-suggestion-menu-title',
                                        children: suggestionItem?.title ?? String(index + 1),
                                    }),
                                    suggestionItem?.description
                                        ? jsx('span', {
                                            className: slots.suggestionMenuDescription(),
                                            'data-slot': 'rich-text-editor-suggestion-menu-description',
                                            children: suggestionItem.description,
                                        })
                                        : null,
                                ],
                            }),
                        ],
                    }, key))
                    : jsx('div', {
                        className: slots.suggestionMenuEmpty(),
                        'data-slot': 'rich-text-editor-suggestion-menu-empty',
                        children: 'No results',
                    }),
            }),
    });
    return typeof document === 'undefined'
        ? menu
        : createPortal(menu, document.body);
};
export const RichTextEditorFooter = ({ children, className, ...props }) => {
    const { slots } = useRichTextEditorContext();
    return jsx('div', {
        className: composeSlotClassName(slots.footer, className),
        'data-slot': 'rich-text-editor-footer',
        ...props,
        children,
    });
};
export const RichTextEditorCharacterCount = ({ children, className, showWords = false, ...props }) => {
    const { editor, maxLength, slots } = useRichTextEditorContext();
    const stats = useEditorState({
        editor,
        selector: ({ editor }) => {
            if (!editor)
                return { characters: 0, isEmpty: true, words: 0 };
            const text = editor.getText();
            return {
                characters: editor.storage.characterCount?.characters?.() ?? text.length,
                isEmpty: editor.isEmpty,
                words: editor.storage.characterCount?.words?.() ?? countWords(text),
            };
        },
    }) ?? { characters: 0, isEmpty: true, words: 0 };
    const isOverLimit = maxLength !== undefined && stats.characters > maxLength;
    const content = typeof children === 'function'
        ? children(stats)
        : (children ??
            `${stats.characters}${maxLength ? ` / ${maxLength}` : ''} characters${showWords ? `, ${stats.words} words` : ''}`);
    return jsx('span', {
        className: composeSlotClassName(slots.characterCount, className),
        'data-over-limit': isOverLimit || undefined,
        'data-slot': 'rich-text-editor-character-count',
        ...props,
        children: content,
    });
};
//# sourceMappingURL=rich-text-editor.js.map