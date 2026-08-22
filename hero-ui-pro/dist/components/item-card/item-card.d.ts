import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DOMRenderProps } from '@heroui/react';
import type { ItemCardVariants } from './item-card.styles';
interface ItemCardRootProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
    /** Visual variant. @default "default" */
    variant?: ItemCardVariants['variant'];
}
declare const ItemCardRoot: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, variant, ...props }: ItemCardRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof ItemCardRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
interface ItemCardIconProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ItemCardIcon: ({ children, className, ...props }: ItemCardIconProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ItemCardContent: ({ children, className, ...props }: ItemCardContentProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardTitleProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const ItemCardTitle: ({ children, className, ...props }: ItemCardTitleProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardDescriptionProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const ItemCardDescription: ({ children, className, ...props }: ItemCardDescriptionProps) => import("react/jsx-runtime").JSX.Element;
interface ItemCardActionProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const ItemCardAction: ({ children, className, ...props }: ItemCardActionProps) => import("react/jsx-runtime").JSX.Element;
export { ItemCardAction, ItemCardContent, ItemCardDescription, ItemCardIcon, ItemCardRoot, ItemCardTitle, };
export type { ItemCardActionProps, ItemCardContentProps, ItemCardDescriptionProps, ItemCardIconProps, ItemCardRootProps, ItemCardTitleProps, };
//# sourceMappingURL=item-card.d.ts.map