'use client';
import { useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { domMax, LazyMotion, Reorder, useDragControls } from 'motion/react';
import { Button, ScrollShadow } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { Ellipsis, FileText, Grip, TrashBin } from '../icons';
import { usePromptInputContext } from './prompt-input.context';
import { PromptInputQueueItemContext, PromptInputQueueListContext, usePromptInputQueueItemContext, usePromptInputQueueListContext, } from './prompt-input.queue.context';
const LAYOUT_TRANSITION = { bounce: 0.15, duration: 0.35, type: 'spring' };
export const PromptInputQueueList = ({ axis = 'y', children, className, onReorder, values, ...props }) => {
    const { slots } = usePromptInputContext();
    const reorderEnabled = values !== undefined && onReorder !== undefined;
    const listContextValue = useMemo(() => ({ reorderEnabled }), [reorderEnabled]);
    const listClassName = composeSlotClassName(slots?.queueList, className);
    const itemsClassName = 'prompt-input__queue-list-items';
    const listEl = reorderEnabled
        ? jsx(Reorder.Group, {
            as: 'ul',
            axis,
            className: itemsClassName,
            values: values,
            onReorder: onReorder,
            children,
        })
        : jsx('ul', { className: itemsClassName, ...props, children });
    return jsx(PromptInputQueueListContext, {
        value: listContextValue,
        children: jsx(ScrollShadow, {
            className: listClassName,
            'data-slot': 'prompt-input-queue-list',
            children: listEl,
        }),
    });
};
export const PromptInputQueueItemHandle = ({ children, className, onPointerDown, ...props }) => {
    const { disabled, slots } = usePromptInputContext();
    const { reorderEnabled } = usePromptInputQueueListContext();
    const { dragControls } = usePromptInputQueueItemContext();
    return jsx(Button, {
        ...props,
        className: composeTwRenderProps(className, slots?.queueItemHandle()),
        'data-reorder-enabled': reorderEnabled || undefined,
        'data-slot': 'prompt-input-queue-item-handle',
        isDisabled: disabled || props.isDisabled,
        size: 'sm',
        variant: 'ghost',
        onPointerDown: (e) => {
            if (!disabled && reorderEnabled && dragControls)
                dragControls.start(e);
            onPointerDown?.(e);
        },
        children: children ?? jsx(Grip, { 'aria-hidden': true, className: 'size-3.5' }),
    });
};
export const PromptInputQueueItemIcon = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('span', {
        className: composeSlotClassName(slots?.queueItemIcon, className),
        'data-slot': 'prompt-input-queue-item-icon',
        ...props,
        children: children ?? jsx(FileText, { 'aria-hidden': true, className: 'size-3.5' }),
    });
};
export const PromptInputQueueItemBody = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.queueItemBody, className),
        'data-slot': 'prompt-input-queue-item-body',
        ...props,
        children,
    });
};
export const PromptInputQueueItemContent = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('p', {
        className: composeSlotClassName(slots?.queueItemContent, className),
        'data-slot': 'prompt-input-queue-item-content',
        ...props,
        children,
    });
};
export const PromptInputQueueItemDescription = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('p', {
        className: composeSlotClassName(slots?.queueItemDescription, className),
        'data-slot': 'prompt-input-queue-item-description',
        ...props,
        children,
    });
};
export const PromptInputQueueItemActions = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.queueItemActions, className),
        'data-slot': 'prompt-input-queue-item-actions',
        ...props,
        children,
    });
};
export const PromptInputQueueItemAction = ({ children, className, isIconOnly = !children, ...props }) => {
    const { disabled } = usePromptInputContext();
    return jsx(Button, {
        ...props,
        isIconOnly,
        className,
        'data-slot': 'prompt-input-queue-item-action',
        isDisabled: disabled || props.isDisabled,
        size: 'sm',
        variant: 'ghost',
        children,
    });
};
export const PromptInputQueueItemSteer = ({ children, className, ...props }) => {
    const { disabled } = usePromptInputContext();
    return jsx(Button, {
        ...props,
        className,
        'data-slot': 'prompt-input-queue-item-steer',
        isDisabled: disabled || props.isDisabled,
        size: 'sm',
        variant: 'ghost',
        children: children ??
            jsxs(Fragment, {
                children: [
                    jsx('span', {
                        'aria-hidden': true,
                        className: 'text-muted text-xs',
                        children: '↳',
                    }),
                    'Steer',
                ],
            }),
    });
};
export const PromptInputQueueItemRemove = ({ children, className, ...props }) => {
    const { disabled } = usePromptInputContext();
    return jsx(Button, {
        ...props,
        isIconOnly: true,
        'aria-label': props['aria-label'] ?? 'Remove from queue',
        className,
        'data-slot': 'prompt-input-queue-item-remove',
        isDisabled: disabled || props.isDisabled,
        size: 'sm',
        variant: 'ghost',
        children: children ?? jsx(TrashBin, { className: 'size-3.5' }),
    });
};
export const PromptInputQueueItemMore = ({ children, className, ...props }) => {
    const { disabled } = usePromptInputContext();
    return jsx(Button, {
        ...props,
        isIconOnly: true,
        'aria-label': props['aria-label'] ?? 'More queue actions',
        className,
        'data-slot': 'prompt-input-queue-item-more',
        isDisabled: disabled || props.isDisabled,
        size: 'sm',
        variant: 'ghost',
        children: children ?? jsx(Ellipsis, { className: 'size-3.5' }),
    });
};
export const PromptInputQueueItemAttachments = ({ children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx('div', {
        className: composeSlotClassName(slots?.queueItemAttachments, className),
        'data-slot': 'prompt-input-queue-item-attachments',
        ...props,
        children,
    });
};
export const PromptInputQueueItemAttachmentsOverflow = ({ className, hiddenCount, noun = 'files', ...props }) => {
    const { slots } = usePromptInputContext();
    if (hiddenCount <= 0)
        return null;
    return jsxs('span', {
        className: composeSlotClassName(slots?.queueItemAttachmentsOverflow, className),
        'data-slot': 'prompt-input-queue-item-attachments-overflow',
        ...props,
        children: ['+', hiddenCount, ' ', noun],
    });
};
const PromptInputQueueItemBase = ({ children, className, value, ...props }) => {
    const { disabled, slots } = usePromptInputContext();
    const { reorderEnabled } = usePromptInputQueueListContext();
    const dragControls = useDragControls();
    const itemContextValue = useMemo(() => ({ dragControls }), [dragControls]);
    const itemClassName = composeSlotClassName(slots?.queueItem, className);
    return jsx(PromptInputQueueItemContext, {
        value: itemContextValue,
        children: reorderEnabled && value !== undefined
            ? jsx(Reorder.Item, {
                as: 'li',
                className: itemClassName,
                'data-slot': 'prompt-input-queue-item',
                drag: !disabled && 'y',
                dragControls,
                dragElastic: 0,
                dragListener: false,
                dragMomentum: false,
                layout: true,
                style: { x: 0 },
                transition: { layout: LAYOUT_TRANSITION },
                value,
                whileDrag: { zIndex: 10 },
                children,
            })
            : jsx('li', {
                className: itemClassName,
                'data-slot': 'prompt-input-queue-item',
                ...props,
                children,
            }),
    });
};
export const PromptInputQueueItem = Object.assign(PromptInputQueueItemBase, {
    Action: PromptInputQueueItemAction,
    Actions: PromptInputQueueItemActions,
    Attachments: PromptInputQueueItemAttachments,
    AttachmentsOverflow: PromptInputQueueItemAttachmentsOverflow,
    Body: PromptInputQueueItemBody,
    Content: PromptInputQueueItemContent,
    Description: PromptInputQueueItemDescription,
    Handle: PromptInputQueueItemHandle,
    Icon: PromptInputQueueItemIcon,
    More: PromptInputQueueItemMore,
    Remove: PromptInputQueueItemRemove,
    Steer: PromptInputQueueItemSteer,
});
const PromptInputQueueBase = ({ actionsVisibility = 'hover', children, className, ...props }) => {
    const { slots } = usePromptInputContext();
    return jsx(LazyMotion, {
        features: domMax,
        children: jsx('div', {
            className: composeSlotClassName(slots?.queue, className),
            'data-actions-visibility': actionsVisibility,
            'data-slot': 'prompt-input-queue',
            ...props,
            children,
        }),
    });
};
export const PromptInputQueue = Object.assign(PromptInputQueueBase, {
    Item: PromptInputQueueItem,
    List: PromptInputQueueList,
});
//# sourceMappingURL=prompt-input.queue.js.map