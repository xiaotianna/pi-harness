'use client';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { Button, Spinner, TextArea, Tooltip } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ArrowUp, StopFill, Xmark } from '../icons';
import { PromptInputContext, usePromptInputContext, } from './prompt-input.context';
import { promptInputVariants } from './prompt-input.styles';
import { getPromptInputSingleLineHeight, isPromptInputGenerating, isPromptInputTextAreaExpanded, PROMPT_INPUT_INLINE_COMPACT_HEIGHT, resolvePromptInputStatus, resolvePromptInputTextAreaElement, } from './prompt-input.utils';
export const PromptInputRoot = ({ allowSubmitWhileRunning = false, children, className, isDisabled: disabled = false, isPending = false, layout = 'stacked', lockInputOnRun = true, maxHeight = 240, onStop, onSubmit, onValueChange, size = 'md', status: statusProp, value: valueProp, variant = 'primary', ...props }) => {
    const [internalValue, setInternalValue] = useState(valueProp ?? '');
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef(null);
    const slots = useMemo(() => promptInputVariants({ layout, size, variant }), [layout, size, variant]);
    const setExpanded = useCallback((val) => {
        setIsExpanded((prev) => (prev === val ? prev : val));
    }, []);
    useLayoutEffect(() => {
        if (layout !== 'inline')
            setIsExpanded(false);
    }, [layout]);
    const value = valueProp ?? internalValue;
    const status = resolvePromptInputStatus(statusProp, isPending);
    const isPendingOrStreaming = isPromptInputGenerating(status);
    const setValue = useCallback((val) => {
        if (valueProp === undefined)
            setInternalValue(val);
        onValueChange?.(val);
    }, [onValueChange, valueProp]);
    const contextValue = useMemo(() => ({
        allowSubmitWhileRunning,
        disabled,
        isExpanded,
        isPending,
        layout,
        lockInputOnRun,
        maxHeight,
        onStop,
        onSubmit,
        setExpanded,
        setValue,
        slots,
        status,
        textareaRef,
        variant,
        value,
    }), [
        allowSubmitWhileRunning,
        disabled,
        isExpanded,
        isPending,
        layout,
        lockInputOnRun,
        maxHeight,
        onStop,
        onSubmit,
        status,
        setExpanded,
        setValue,
        slots,
        variant,
        value,
    ]);
    return jsx(PromptInputContext, {
        value: contextValue,
        children: jsx('div', {
            className: composeSlotClassName(slots?.base, className),
            'data-disabled': disabled || undefined,
            'data-expanded': layout === 'inline' && isExpanded ? true : undefined,
            'data-layout': layout,
            'data-pending': isPendingOrStreaming || undefined,
            'data-slot': 'prompt-input',
            'data-status': status,
            'data-variant': variant,
            ...props,
            children,
        }),
    });
};
export const PromptInputShell = ({ children, className, ...props }) => {
    const { disabled, slots, textareaRef } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.shell, className),
        'data-slot': 'prompt-input-shell',
        onClick: (e) => {
            if (disabled)
                return;
            const target = e.target;
            if (target.closest('button, a, input, select, textarea, [role="button"], [data-slot="prompt-input-toolbar"], [data-slot="prompt-input-queue"], [data-slot="chat-attachment-remove"]'))
                return;
            textareaRef.current?.focus();
        },
        ...props,
        children,
    });
};
export const PromptInputContent = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.content, className),
        'data-slot': 'prompt-input-content',
        ...props,
        children,
    });
};
export const PromptInputAttachments = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.attachments, className),
        'data-slot': 'prompt-input-attachments',
        ...props,
        children,
    });
};
export const PromptInputTextArea = ({ className, disableAutosize = false, onKeyDown, ...props }) => {
    const { allowSubmitWhileRunning, disabled, isExpanded, layout, lockInputOnRun, maxHeight, onSubmit, setExpanded, setValue, slots, status, textareaRef, value, } = usePromptInputContext();
    const isGenerating = isPromptInputGenerating(status);
    const autosize = useCallback((el) => {
        const area = resolvePromptInputTextAreaElement(el);
        if (!area || disableAutosize)
            return;
        const text = area.value;
        if (layout === 'inline') {
            const hasAttachments = Boolean(area
                .closest('[data-slot="prompt-input-shell"]')
                ?.querySelector('[data-slot="prompt-input-attachments"] > *'));
            const wantsExpand = hasAttachments ||
                (text.trim().length > 0 && isPromptInputTextAreaExpanded(area));
            if (wantsExpand && !isExpanded) {
                setExpanded(true);
                return;
            }
            if (!text.trim() && !hasAttachments && isExpanded) {
                setExpanded(false);
                return;
            }
            if (!isExpanded && !hasAttachments) {
                const height = Math.max(PROMPT_INPUT_INLINE_COMPACT_HEIGHT, getPromptInputSingleLineHeight(area));
                area.style.height = `${height}px`;
                return;
            }
        }
        area.style.height = 'auto';
        area.style.height =
            typeof maxHeight === 'number'
                ? `${Math.min(area.scrollHeight, maxHeight)}px`
                : `min(${area.scrollHeight}px, ${maxHeight})`;
    }, [disableAutosize, isExpanded, layout, maxHeight, setExpanded]);
    useLayoutEffect(() => {
        autosize(textareaRef.current);
    }, [autosize, textareaRef, value]);
    return jsx(TextArea, {
        ref: textareaRef,
        fullWidth: true,
        'aria-label': props['aria-label'] ?? 'Message input',
        className: composeTwRenderProps(className, slots?.textarea()),
        'data-slot': 'prompt-input-textarea',
        disabled: disabled || (lockInputOnRun && isGenerating),
        placeholder: props.placeholder ??
            'What do you want to know?',
        rows: 1,
        value,
        onKeyDown: (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isGenerating && !allowSubmitWhileRunning)
                    return;
                onSubmit?.();
            }
            onKeyDown?.(e);
        },
        onChange: (e) => {
            setValue(e.target.value);
            autosize(e.target);
        },
        ...props,
    });
};
export const PromptInputToolbar = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.toolbar, className),
        'data-slot': 'prompt-input-toolbar',
        ...props,
        children,
    });
};
export const PromptInputToolbarStart = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.toolbarStart, className),
        'data-slot': 'prompt-input-toolbar-start',
        ...props,
        children,
    });
};
export const PromptInputToolbarEnd = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.toolbarEnd, className),
        'data-slot': 'prompt-input-toolbar-end',
        ...props,
        children,
    });
};
export const PromptInputFooter = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('p', {
        className: composeSlotClassName(slots?.footer, className),
        'data-slot': 'prompt-input-footer',
        ...props,
        children,
    });
};
function SendIcon({ status }) {
    if (status === 'submitted')
        return jsx(Spinner, { color: 'current', size: 'sm' });
    return jsx(status === 'streaming' ? StopFill : status === 'error' ? Xmark : ArrowUp, {
        className: 'size-4',
    });
}
export const PromptInputSend = ({ children, className, isDisabled: isDisabledProp, onPress, onStop: onStopProp, status: statusProp, ...props }) => {
    const { allowSubmitWhileRunning, disabled, onStop: ctxOnStop, onSubmit, slots, status: ctxStatus, value, layout, } = usePromptInputContext();
    const status = statusProp ?? ctxStatus;
    const onStop = onStopProp ?? ctxOnStop;
    const isGenerating = isPromptInputGenerating(status);
    const canSubmitWhileRunning = allowSubmitWhileRunning &&
        isGenerating &&
        (isDisabledProp === false ||
            (isDisabledProp === undefined && Boolean(value.trim())));
    const canStop = isGenerating && Boolean(onStop) && !canSubmitWhileRunning;
    const isDisabled = isDisabledProp ??
        (disabled ||
            (isGenerating &&
                !canStop &&
                !(allowSubmitWhileRunning && value.trim())) ||
            (!isGenerating && !value.trim()));
    const displayStatus = canSubmitWhileRunning ? 'ready' : status;
    return jsx(Button, {
        ...props,
        isIconOnly: true,
        'aria-label': props['aria-label'] ?? (canStop ? 'Stop' : 'Send message'),
        className: composeTwRenderProps(className, slots?.send()),
        'data-slot': 'prompt-input-send',
        'data-status': status,
        isDisabled,
        size: layout === 'inline' ? 'sm' : 'md',
        onPress: (e) => {
            if (canStop) {
                onStop?.();
                onPress?.(e);
                return;
            }
            onPress?.(e);
            onSubmit?.();
        },
        children: children ?? jsx(SendIcon, { status: displayStatus }),
    });
};
export const PromptInputAction = ({ children, className, tooltip, variant: variantProp, ...props }) => {
    const { disabled, layout, lockInputOnRun, status } = usePromptInputContext();
    const isGenerating = isPromptInputGenerating(status);
    const resolvedVariant = variantProp ?? 'tertiary';
    const button = jsx(Button, {
        ...props,
        isIconOnly: true,
        className,
        'data-slot': 'prompt-input-action',
        isDisabled: disabled ||
            props.isDisabled ||
            (lockInputOnRun && isGenerating),
        size: layout === 'inline' ? 'sm' : 'md',
        variant: resolvedVariant,
        children,
    });
    if (tooltip) {
        return jsxs(Tooltip, {
            delay: 0,
            children: [
                jsx(Tooltip.Trigger, { children: button }),
                jsx(Tooltip.Content, { children: tooltip }),
            ],
        });
    }
    return button;
};
//# sourceMappingURL=prompt-input.js.map