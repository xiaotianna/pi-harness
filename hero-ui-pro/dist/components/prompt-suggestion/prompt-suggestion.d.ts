import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { Card } from '@heroui/react';
import type { PromptSuggestionVariants } from './prompt-suggestion.styles';
export interface PromptSuggestionRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** @default "pill" */
    variant?: PromptSuggestionVariants['variant'];
}
export declare const PromptSuggestionRoot: ({ children, className, variant, ...props }: PromptSuggestionRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptSuggestionHeader: ({ children, className, ...props }: PromptSuggestionHeaderProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionTitleProps extends ComponentPropsWithRef<'h2'> {
    children: ReactNode;
}
export declare const PromptSuggestionTitle: ({ children, className, ...props }: PromptSuggestionTitleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionDescriptionProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
export declare const PromptSuggestionDescription: ({ children, className, ...props }: PromptSuggestionDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionGroupProps extends ComponentPropsWithRef<'section'> {
    children: ReactNode;
    description?: ReactNode;
    label?: ReactNode;
}
export declare const PromptSuggestionGroup: ({ children, className, description, label, ...props }: PromptSuggestionGroupProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptSuggestionItems: ({ children, className, ...props }: PromptSuggestionItemsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemProps extends Omit<ComponentPropsWithRef<typeof ButtonPrimitive>, 'className'> {
    children: ReactNode;
    className?: string;
    /** Show the hover arrow on pill items. @default true */
    showEndIcon?: boolean;
}
export declare const PromptSuggestionItem: ({ children, className, showEndIcon, ...props }: PromptSuggestionItemProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemTitleProps extends ComponentPropsWithRef<typeof Card.Title> {
    children: ReactNode;
}
export declare const PromptSuggestionItemTitle: ({ children, className, ...props }: PromptSuggestionItemTitleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemDescriptionProps extends ComponentPropsWithRef<typeof Card.Description> {
    children: ReactNode;
}
export declare const PromptSuggestionItemDescription: ({ children, className, ...props }: PromptSuggestionItemDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemFooterProps extends ComponentPropsWithRef<typeof Card.Footer> {
    children: ReactNode;
}
export declare const PromptSuggestionItemFooter: ({ children, className, ...props }: PromptSuggestionItemFooterProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemTagsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptSuggestionItemTags: ({ children, className, ...props }: PromptSuggestionItemTagsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptSuggestionItemMetaProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
export declare const PromptSuggestionItemMeta: ({ children, className, ...props }: PromptSuggestionItemMetaProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=prompt-suggestion.d.ts.map