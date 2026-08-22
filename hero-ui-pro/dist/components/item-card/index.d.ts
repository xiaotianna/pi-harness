import type { ComponentProps } from 'react';
import { ItemCardAction, ItemCardContent, ItemCardDescription, ItemCardIcon, ItemCardRoot, ItemCardTitle } from './item-card';
export { itemCardVariants } from './item-card.styles';
declare const ItemCard: (<E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, variant, ...props }: import("./item-card").ItemCardRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./item-card").ItemCardRootProps<E>>) => import("react/jsx-runtime").JSX.Element) & {
    Action: ({ children, className, ...props }: import("./item-card").ItemCardActionProps) => import("react/jsx-runtime").JSX.Element;
    Content: ({ children, className, ...props }: import("./item-card").ItemCardContentProps) => import("react/jsx-runtime").JSX.Element;
    Description: ({ children, className, ...props }: import("./item-card").ItemCardDescriptionProps) => import("react/jsx-runtime").JSX.Element;
    Icon: ({ children, className, ...props }: import("./item-card").ItemCardIconProps) => import("react/jsx-runtime").JSX.Element;
    Root: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, variant, ...props }: import("./item-card").ItemCardRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./item-card").ItemCardRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./item-card").ItemCardTitleProps) => import("react/jsx-runtime").JSX.Element;
};
export { ItemCard, ItemCardAction, ItemCardContent, ItemCardDescription, ItemCardIcon, ItemCardRoot, ItemCardTitle, };
export type { ItemCardActionProps, ItemCardContentProps, ItemCardDescriptionProps, ItemCardIconProps, ItemCardRootProps as ItemCardProps, ItemCardRootProps, ItemCardTitleProps, } from './item-card';
export type { ItemCardVariants } from './item-card.styles';
export type ItemCard = {
    ActionProps: ComponentProps<typeof ItemCardAction>;
    ContentProps: ComponentProps<typeof ItemCardContent>;
    DescriptionProps: ComponentProps<typeof ItemCardDescription>;
    IconProps: ComponentProps<typeof ItemCardIcon>;
    Props: ComponentProps<typeof ItemCardRoot>;
    RootProps: ComponentProps<typeof ItemCardRoot>;
    TitleProps: ComponentProps<typeof ItemCardTitle>;
};
//# sourceMappingURL=index.d.ts.map