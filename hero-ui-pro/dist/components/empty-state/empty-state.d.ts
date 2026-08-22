import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DOMRenderProps } from '@heroui/react';
import type { EmptyStateVariants } from './empty-state.styles';
export interface EmptyStateRootProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
    /** Size variant. @default "md" */
    size?: EmptyStateVariants['size'];
}
export interface EmptyStateHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface EmptyStateMediaProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Media display variant. "icon" adds a circular muted background. @default "default" */
    variant?: 'default' | 'icon';
}
export interface EmptyStateTitleProps extends ComponentPropsWithRef<'h3'> {
    children: ReactNode;
}
export interface EmptyStateDescriptionProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
export interface EmptyStateContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const EmptyStateRoot: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, size, ...props }: EmptyStateRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof EmptyStateRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
export declare const EmptyStateHeader: ({ children, className, ...props }: EmptyStateHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmptyStateMedia: ({ children, className, variant, ...props }: EmptyStateMediaProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmptyStateTitle: ({ children, className, ...props }: EmptyStateTitleProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmptyStateDescription: ({ children, className, ...props }: EmptyStateDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export declare const EmptyStateContent: ({ children, className, ...props }: EmptyStateContentProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=empty-state.d.ts.map