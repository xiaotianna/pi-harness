'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo } from 'react';
import { cx } from 'tailwind-variants';
import { Button, Disclosure } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { CodeBlock } from '../code-block/index';
import { CircleCheck, CircleExclamation, CircleXmark, Wrench } from '../icons';
import { TextShimmer } from '../text-shimmer/text-shimmer';
import { chatToolVariants } from './chat-tool.styles';
export function mapToolStateToVisual(state) {
    switch (state) {
        case 'input-streaming':
            return 'streaming';
        case 'input-available':
            return 'running';
        case 'output-error':
            return 'error';
        case 'requires-action':
            return 'requiresAction';
        default:
            return 'complete';
    }
}
function serializeValue(value) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function isActiveState(state) {
    return state === 'input-streaming' || state === 'input-available';
}
const ChatToolContext = createContext({
    active: false,
    isExpandable: true,
    slots: chatToolVariants(),
    state: 'output-available',
});
const useChatToolContext = () => useContext(ChatToolContext);
const useSlots = () => {
    const { slots, state } = useChatToolContext();
    const fallback = useMemo(() => chatToolVariants({ state: mapToolStateToVisual(state) }), [state]);
    return slots ?? fallback;
};
// ─── Status icon map ──────────────────────────────────────────────────────────
const STATE_ICONS = {
    'input-available': Wrench,
    'input-streaming': Wrench,
    'output-available': CircleCheck,
    'output-error': CircleXmark,
    'requires-action': CircleExclamation,
};
// ─── Components ───────────────────────────────────────────────────────────────
export const ChatToolRoot = ({ active, approveLabel, argsText, children, className, errorText, input, isExpandable, onApprove, onReject, output, rejectLabel, state, toolCallId, toolName, triggerPrefix, ...props }) => {
    const slots = useMemo(() => chatToolVariants({ state: mapToolStateToVisual(state) }), [state]);
    const resolvedActive = active ?? isActiveState(state);
    const hasArgsText = argsText !== undefined
        ? argsText.trim() !== ''
        : input !== undefined && serializeValue(input) !== '';
    const hasOutput = output !== undefined && serializeValue(output) !== '';
    const hasError = Boolean(errorText);
    const hasApproval = state === 'requires-action' && Boolean(onApprove || onReject);
    const hasMeta = Boolean(toolCallId);
    const hasBodyContent = Boolean(hasArgsText || hasOutput || hasError || hasApproval || hasMeta);
    const hasTriggerContent = Boolean(hasBodyContent || toolName || triggerPrefix);
    const resolvedExpandable = isExpandable ?? (!!children || hasBodyContent);
    return (_jsx(ChatToolContext.Provider, { value: {
            active: resolvedActive,
            isExpandable: resolvedExpandable,
            slots,
            state,
            toolName,
        }, children: _jsx(Disclosure, { className: composeTwRenderProps(className, slots?.base()), "data-active": resolvedActive || undefined, "data-expandable": resolvedExpandable || undefined, "data-slot": "chat-tool", "data-state": state, ...props, children: children ??
                (hasTriggerContent ? (_jsxs(_Fragment, { children: [_jsxs(ChatToolTrigger, { children: [_jsx(ChatToolStatusIcon, {}), triggerPrefix || toolName ? (_jsxs("span", { className: composeSlotClassName(slots?.triggerLabel, undefined), children: [triggerPrefix, toolName ? (_jsx("span", { className: "font-medium", children: toolName })) : null] })) : null] }), resolvedExpandable ? (_jsxs(ChatToolContent, { children: [_jsx(ChatToolArgs, { argsText: argsText, input: input }), _jsx(ChatToolResult, { value: output }), _jsx(ChatToolError, { errorText: errorText }), state === 'requires-action' && (onApprove || onReject) ? (_jsx(ChatToolApproval, { children: _jsxs(ChatToolApprovalActions, { children: [onReject ? (_jsx(ChatToolReject, { onPress: onReject, children: rejectLabel })) : null, onApprove ? (_jsx(ChatToolApprove, { onPress: onApprove, children: approveLabel })) : null] }) })) : null, toolCallId ? _jsx(ChatToolMeta, { toolCallId: toolCallId }) : null] })) : null] })) : null) }) }));
};
export const ChatToolTrigger = ({ children, className, isDisabled, ...props }) => {
    const { active, isExpandable } = useChatToolContext();
    const slots = useSlots();
    const content = active ? _jsx(TextShimmer, { children: children }) : children;
    return (_jsx(Disclosure.Heading, { children: _jsxs(Disclosure.Trigger, { className: composeTwRenderProps(className, slots?.trigger({
                className: isExpandable ? undefined : 'cursor-default',
            })), "data-expandable": isExpandable ? undefined : 'false', "data-slot": "chat-tool-trigger", isDisabled: isDisabled || !isExpandable, ...props, children: [_jsx("span", { className: composeSlotClassName(slots?.triggerLabel, undefined), children: content }), isExpandable ? (_jsx(Disclosure.Indicator, { className: "text-muted size-3.5 shrink-0" })) : null] }) }));
};
export const ChatToolStatusIcon = ({ children, className, }) => {
    const { state } = useChatToolContext();
    const slots = useSlots();
    const IconComponent = STATE_ICONS[state];
    if (children && React.isValidElement(children)) {
        return React.cloneElement(children, {
            className: cx('size-3.5 shrink-0', className, children.props
                .className, state === 'output-available' && 'text-success', state === 'output-error' && 'text-danger', state === 'requires-action' && 'text-warning'),
            'data-slot': 'chat-tool-status-icon',
        });
    }
    return (_jsx("span", { className: composeSlotClassName(slots?.status, className), "data-slot": "chat-tool-status", children: _jsx(IconComponent, { className: cx('size-3.5 shrink-0', state === 'output-available' && 'text-success', state === 'output-error' && 'text-danger', state === 'requires-action' && 'text-warning'), "data-slot": "chat-tool-status-icon" }) }));
};
export const ChatToolContent = ({ children, className, ...props }) => {
    const { isExpandable } = useChatToolContext();
    const slots = useSlots();
    if (!isExpandable)
        return null;
    return (_jsx(Disclosure.Content, { className: composeTwRenderProps(className, slots?.content()), "data-slot": "chat-tool-content", ...props, children: _jsx(Disclosure.Body, { children: _jsx("div", { className: composeSlotClassName(slots?.contentBody, undefined), children: children }) }) }));
};
export const ChatToolArgs = ({ argsText, children, className, input, label, ...props }) => {
    const slots = useSlots();
    const text = argsText ?? (input !== undefined ? serializeValue(input) : '');
    if (children) {
        return (_jsxs("div", { className: composeSlotClassName(slots?.args, className), "data-slot": "chat-tool-args", ...props, children: [label ? (_jsx("div", { className: composeSlotClassName(slots?.argsLabel, undefined), children: label })) : null, children] }));
    }
    if (!text)
        return null;
    return (_jsxs("div", { className: composeSlotClassName(slots?.args, className), "data-slot": "chat-tool-args", ...props, children: [label ? (_jsx("div", { className: composeSlotClassName(slots?.argsLabel, undefined), children: label })) : null, _jsx(CodeBlock, { children: _jsx(CodeBlock.Code, { code: text, language: "json" }) })] }));
};
export const ChatToolResult = ({ children, className, label, value, ...props }) => {
    const slots = useSlots();
    const { state } = useChatToolContext();
    if (state === 'output-error')
        return null;
    if (children) {
        return (_jsxs("div", { className: composeSlotClassName(slots?.result, className), "data-slot": "chat-tool-result", ...props, children: [label ? (_jsx("div", { className: composeSlotClassName(slots?.resultLabel, undefined), children: label })) : null, children] }));
    }
    if (value === undefined)
        return null;
    const text = serializeValue(value);
    if (!text)
        return null;
    return (_jsxs("div", { className: composeSlotClassName(slots?.result, className), "data-slot": "chat-tool-result", ...props, children: [label ? (_jsx("div", { className: composeSlotClassName(slots?.resultLabel, undefined), children: label })) : null, _jsx(CodeBlock, { children: _jsx(CodeBlock.Code, { code: text, language: "json" }) })] }));
};
export const ChatToolError = ({ children, className, errorText, label, ...props }) => {
    const slots = useSlots();
    const { state } = useChatToolContext();
    if (state !== 'output-error' && !errorText && !children)
        return null;
    return (_jsxs("div", { className: composeSlotClassName(slots?.error, className), "data-slot": "chat-tool-error", ...props, children: [label ? (_jsx("div", { className: composeSlotClassName(slots?.errorLabel, undefined), children: label })) : null, children ?? errorText] }));
};
export const ChatToolApproval = ({ children, className, ...props }) => {
    const slots = useSlots();
    const { state } = useChatToolContext();
    if (state !== 'requires-action')
        return null;
    return (_jsx("div", { className: composeSlotClassName(slots?.approval, className), "data-slot": "chat-tool-approval", ...props, children: children }));
};
export const ChatToolApprovalActions = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.approvalActions, className), "data-slot": "chat-tool-approval-actions", ...props, children: children }));
};
export const ChatToolApprove = ({ children, ...props }) => (_jsx(Button, { "data-slot": "chat-tool-approve", size: "sm", variant: "primary", ...props, children: children }));
export const ChatToolReject = ({ children, variant = 'secondary', ...props }) => (_jsx(Button, { "data-slot": "chat-tool-reject", size: "sm", variant: variant, ...props, children: children }));
export const ChatToolMeta = ({ className, toolCallId, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.meta, className), "data-slot": "chat-tool-meta", ...props, children: toolCallId }));
};
//# sourceMappingURL=chat-tool.js.map