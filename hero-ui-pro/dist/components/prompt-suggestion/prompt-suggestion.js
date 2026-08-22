'use client';
import { createContext, useContext, useMemo, } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { Card } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ChevronRight } from '../icons';
import { promptSuggestionVariants } from './prompt-suggestion.styles';
const PromptSuggestionContext = createContext({});
/** Returns context slots, falling back to a fresh calculation if not in context. */
const useSlots = () => {
    const { slots, variant } = useContext(PromptSuggestionContext);
    const fresh = useMemo(() => promptSuggestionVariants({ variant: variant ?? 'pill' }), [variant]);
    return slots ?? fresh;
};
export const PromptSuggestionRoot = ({ children, className, variant = 'pill', ...props }) => {
    const slots = useMemo(() => promptSuggestionVariants({ variant }), [variant]);
    return jsx(PromptSuggestionContext, {
        value: { slots, variant },
        children: jsx('div', {
            className: composeSlotClassName(slots?.base, className),
            'data-slot': 'prompt-suggestion',
            ...props,
            children,
        }),
    });
};
export const PromptSuggestionHeader = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('div', {
        className: composeSlotClassName(slots?.header, className),
        'data-slot': 'prompt-suggestion-header',
        ...props,
        children,
    });
};
export const PromptSuggestionTitle = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('h2', {
        className: composeSlotClassName(slots?.title, className),
        'data-slot': 'prompt-suggestion-title',
        ...props,
        children,
    });
};
export const PromptSuggestionDescription = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('p', {
        className: composeSlotClassName(slots?.description, className),
        'data-slot': 'prompt-suggestion-description',
        ...props,
        children,
    });
};
export const PromptSuggestionGroup = ({ children, className, description, label, ...props }) => {
    const slots = useSlots();
    return jsxs('section', {
        className: composeSlotClassName(slots?.group, className),
        'data-slot': 'prompt-suggestion-group',
        ...props,
        children: [
            (label || description) &&
                jsxs('div', {
                    className: 'flex flex-col gap-1',
                    children: [
                        label
                            ? jsx('h3', {
                                className: composeSlotClassName(slots?.groupLabel, undefined),
                                children: label,
                            })
                            : null,
                        description
                            ? jsx('p', {
                                className: composeSlotClassName(slots?.groupDescription, undefined),
                                children: description,
                            })
                            : null,
                    ],
                }),
            children,
        ],
    });
};
export const PromptSuggestionItems = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('div', {
        className: composeSlotClassName(slots?.items, className),
        'data-slot': 'prompt-suggestion-items',
        ...props,
        children,
    });
};
export const PromptSuggestionItem = ({ children, className, showEndIcon = true, ...props }) => {
    const { variant } = useContext(PromptSuggestionContext);
    const slots = useSlots();
    if (variant === 'card') {
        return jsx(Card, {
            className: composeSlotClassName(slots?.item, className),
            'data-slot': 'prompt-suggestion-item',
            ...props,
            children,
        });
    }
    return jsxs(ButtonPrimitive, {
        className: composeTwRenderProps(className, slots?.item()),
        'data-slot': 'prompt-suggestion-item',
        ...props,
        children: [
            jsx('span', {
                className: composeSlotClassName(slots?.itemLabel, undefined),
                children,
            }),
            showEndIcon
                ? jsx(ChevronRight, {
                    className: composeSlotClassName(slots?.itemEndIcon, undefined),
                })
                : null,
        ],
    });
};
export const PromptSuggestionItemTitle = ({ children, className, ...props }) => {
    return jsx(Card.Title, {
        className,
        'data-slot': 'prompt-suggestion-item-title',
        ...props,
        children,
    });
};
export const PromptSuggestionItemDescription = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx(Card.Description, {
        className: composeSlotClassName(slots?.itemDescription, className),
        ...props,
        children,
    });
};
export const PromptSuggestionItemFooter = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx(Card.Footer, {
        className: composeSlotClassName(slots?.itemFooter, className),
        'data-slot': 'prompt-suggestion-item-footer',
        ...props,
        children,
    });
};
export const PromptSuggestionItemTags = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('div', {
        className: composeSlotClassName(slots?.itemTags, className),
        'data-slot': 'prompt-suggestion-item-tags',
        ...props,
        children,
    });
};
export const PromptSuggestionItemMeta = ({ children, className, ...props }) => {
    const slots = useSlots();
    return jsx('span', {
        className: composeSlotClassName(slots?.itemMeta, className),
        'data-slot': 'prompt-suggestion-item-meta',
        ...props,
        children,
    });
};
//# sourceMappingURL=prompt-suggestion.js.map