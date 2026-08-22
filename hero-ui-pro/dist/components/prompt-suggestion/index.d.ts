import type { ComponentProps } from 'react';
import { PromptSuggestionDescription, PromptSuggestionGroup, PromptSuggestionHeader, PromptSuggestionItem, PromptSuggestionItemDescription, PromptSuggestionItemFooter, PromptSuggestionItemMeta, PromptSuggestionItems, PromptSuggestionItemTags, PromptSuggestionItemTitle, PromptSuggestionRoot, PromptSuggestionTitle } from './prompt-suggestion';
export { promptSuggestionVariants } from './prompt-suggestion.styles';
declare const PromptSuggestion: (({ children, className, variant, ...props }: import("./prompt-suggestion").PromptSuggestionRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Description: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Group: ({ children, className, description, label, ...props }: import("./prompt-suggestion").PromptSuggestionGroupProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Header: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionHeaderProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Item: ({ children, className, showEndIcon, ...props }: import("./prompt-suggestion").PromptSuggestionItemProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ItemDescription: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ItemFooter: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemFooterProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ItemMeta: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemMetaProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ItemTags: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemTagsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    ItemTitle: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemTitleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Items: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionItemsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ children, className, variant, ...props }: import("./prompt-suggestion").PromptSuggestionRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Title: ({ children, className, ...props }: import("./prompt-suggestion").PromptSuggestionTitleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export { PromptSuggestion, PromptSuggestionDescription, PromptSuggestionGroup, PromptSuggestionHeader, PromptSuggestionItem, PromptSuggestionItemDescription, PromptSuggestionItemFooter, PromptSuggestionItemMeta, PromptSuggestionItems, PromptSuggestionItemTags, PromptSuggestionItemTitle, PromptSuggestionRoot, PromptSuggestionTitle, };
export type { PromptSuggestionDescriptionProps, PromptSuggestionGroupProps, PromptSuggestionHeaderProps, PromptSuggestionItemDescriptionProps, PromptSuggestionItemFooterProps, PromptSuggestionItemMetaProps, PromptSuggestionItemProps, PromptSuggestionItemsProps, PromptSuggestionItemTagsProps, PromptSuggestionItemTitleProps, PromptSuggestionRootProps as PromptSuggestionProps, PromptSuggestionRootProps, PromptSuggestionTitleProps, } from './prompt-suggestion';
export type { PromptSuggestionVariants } from './prompt-suggestion.styles';
export type PromptSuggestion = {
    DescriptionProps: ComponentProps<typeof PromptSuggestionDescription>;
    GroupProps: ComponentProps<typeof PromptSuggestionGroup>;
    HeaderProps: ComponentProps<typeof PromptSuggestionHeader>;
    ItemDescriptionProps: ComponentProps<typeof PromptSuggestionItemDescription>;
    ItemFooterProps: ComponentProps<typeof PromptSuggestionItemFooter>;
    ItemMetaProps: ComponentProps<typeof PromptSuggestionItemMeta>;
    ItemProps: ComponentProps<typeof PromptSuggestionItem>;
    ItemsProps: ComponentProps<typeof PromptSuggestionItems>;
    ItemTagsProps: ComponentProps<typeof PromptSuggestionItemTags>;
    ItemTitleProps: ComponentProps<typeof PromptSuggestionItemTitle>;
    Props: ComponentProps<typeof PromptSuggestionRoot>;
    RootProps: ComponentProps<typeof PromptSuggestionRoot>;
    TitleProps: ComponentProps<typeof PromptSuggestionTitle>;
};
//# sourceMappingURL=index.d.ts.map