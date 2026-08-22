'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { Autocomplete, useFilter } from 'react-aria-components/Autocomplete';
import { Dialog } from 'react-aria-components/Dialog';
import { Header } from 'react-aria-components/Header';
import { Input } from 'react-aria-components/Input';
import { Menu, MenuItem, MenuSection, Separator, } from 'react-aria-components/Menu';
import { Modal, ModalOverlay } from 'react-aria-components/Modal';
import { SearchField } from 'react-aria-components/SearchField';
import { CloseButton } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { commandVariants } from './command.styles';
const CommandContext = createContext({});
// ── Components ───────────────────────────────────────────────────────────────
export const CommandRoot = ({ children }) => {
    const slots = useMemo(() => commandVariants(), []);
    return _jsx(CommandContext, { value: { slots }, children: children });
};
export const CommandBackdrop = ({ children, className, isDismissable = true, variant, ...props }) => {
    const slots = useMemo(() => commandVariants({ variant }), [variant]);
    return (_jsx(ModalOverlay, { className: composeTwRenderProps(className, slots?.backdrop()), "data-slot": "command-backdrop", isDismissable: isDismissable, ...props, children: (state) => ('function' === typeof children ? children(state) : children) }));
};
export const CommandContainer = ({ children, className, size, ...props }) => {
    const { slots: contextSlots } = useContext(CommandContext);
    const sizeSlots = useMemo(() => commandVariants({ size }), [size]);
    const mergedContext = useMemo(() => ({ slots: { ...contextSlots, ...sizeSlots } }), [contextSlots, sizeSlots]);
    return (_jsx(Modal, { className: composeTwRenderProps(className, sizeSlots?.container()), "data-slot": "command-container", ...props, children: (state) => (_jsx(CommandContext, { value: mergedContext, children: 'function' === typeof children ? children(state) : children })) }));
};
export const CommandDialog = ({ children, className, defaultInputValue, filter, inputValue, onInputChange, ...props }) => {
    const { contains } = useFilter({ sensitivity: 'base' });
    const { slots } = useContext(CommandContext);
    return (_jsx(Dialog, { "aria-label": "Command palette", className: composeSlotClassName(slots?.dialog, className), "data-slot": "command-dialog", ...props, children: _jsx(Autocomplete, { defaultInputValue: defaultInputValue, filter: filter ?? contains, inputValue: inputValue, onInputChange: onInputChange, children: children }) }));
};
export const CommandInputGroup = ({ autoFocus = true, children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx(SearchField, { "aria-label": props['aria-label'] ?? 'Search commands', autoFocus: autoFocus, className: composeTwRenderProps(className, slots?.inputGroup()), "data-slot": "command-input-group", ...props, children: children }));
};
export const CommandInputGroupPrefix = ({ children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.inputGroupPrefix, className), "data-slot": "command-input-group-prefix", ...props, children: children }));
};
export const CommandInputGroupInput = ({ className, onKeyDownCapture: onKeyDownCaptureProp, placeholder = 'Search commands...', ...props }) => (_jsx(Input, { className: className, "data-slot": "command-input-group-input", placeholder: placeholder, ...props, onKeyDownCapture: (e) => {
        onKeyDownCaptureProp?.(e);
        if (!e.defaultPrevented &&
            e.key.length === 1 &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.altKey) {
            e.stopPropagation();
        }
    } }));
export const CommandInputGroupSuffix = ({ children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.inputGroupSuffix, className), "data-slot": "command-input-group-suffix", ...props, children: children }));
};
export const CommandInputGroupClearButton = ({ className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx(CloseButton, { className: composeTwRenderProps(className, slots?.inputGroupClearButton()), "data-slot": "command-input-group-clear-button", slot: "clear", ...props }));
};
export const CommandHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "command-header", ...props, children: children }));
};
export const CommandList = ({ children, className, renderEmptyState, ...props }) => {
    const { slots } = useContext(CommandContext);
    const emptyState = renderEmptyState
        ? () => (_jsx("div", { className: slots?.empty(), "data-slot": "command-empty", children: renderEmptyState() }))
        : undefined;
    return (_jsx(Menu, { className: composeTwRenderProps(className, slots?.list()), "data-slot": "command-list", renderEmptyState: emptyState, ...props, children: children }));
};
export const CommandItem = ({ children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx(MenuItem, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "command-item", ...props, children: children }));
};
export const CommandGroup = ({ children, className, heading, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsxs(MenuSection, { className: composeSlotClassName(slots?.group, className), "data-slot": "command-group", ...props, children: [!!heading && (_jsx(Header, { className: slots?.groupHeading(), "data-slot": "command-group-heading", children: heading })), children] }));
};
export const CommandSeparator = ({ className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx(Separator, { className: composeSlotClassName(slots?.separator, className), "data-slot": "command-separator", ...props }));
};
export const CommandFooter = ({ children, className, ...props }) => {
    const { slots } = useContext(CommandContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.footer, className), "data-slot": "command-footer", ...props, children: children }));
};
//# sourceMappingURL=command.js.map