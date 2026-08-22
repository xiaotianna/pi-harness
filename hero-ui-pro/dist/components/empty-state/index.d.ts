import type { ComponentProps } from 'react';
import { EmptyStateContent, EmptyStateDescription, EmptyStateHeader, EmptyStateMedia, EmptyStateRoot, EmptyStateTitle } from './empty-state';
export { emptyStateVariants } from './empty-state.styles';
export declare const EmptyState: (<E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, size, ...props }: import("./empty-state").EmptyStateRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./empty-state").EmptyStateRootProps<E>>) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./empty-state").EmptyStateContentProps) => import("react/jsx-runtime").JSX.Element;
    Description: ({ children, className, ...props }: import("./empty-state").EmptyStateDescriptionProps) => import("react/jsx-runtime").JSX.Element;
    Header: ({ children, className, ...props }: import("./empty-state").EmptyStateHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Media: ({ children, className, variant, ...props }: import("./empty-state").EmptyStateMediaProps) => import("react/jsx-runtime").JSX.Element;
    Root: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, size, ...props }: import("./empty-state").EmptyStateRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./empty-state").EmptyStateRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./empty-state").EmptyStateTitleProps) => import("react/jsx-runtime").JSX.Element;
};
export { EmptyStateContent, EmptyStateDescription, EmptyStateHeader, EmptyStateMedia, EmptyStateRoot, EmptyStateTitle, };
export type { EmptyStateContentProps, EmptyStateDescriptionProps, EmptyStateHeaderProps, EmptyStateMediaProps, EmptyStateRootProps as EmptyStateProps, EmptyStateRootProps, EmptyStateTitleProps, } from './empty-state';
export type { EmptyStateVariants } from './empty-state.styles';
export { emptyStateVariants as default } from './empty-state.styles';
export type EmptyState = {
    ContentProps: ComponentProps<typeof EmptyStateContent>;
    DescriptionProps: ComponentProps<typeof EmptyStateDescription>;
    HeaderProps: ComponentProps<typeof EmptyStateHeader>;
    MediaProps: ComponentProps<typeof EmptyStateMedia>;
    Props: ComponentProps<typeof EmptyStateRoot>;
    RootProps: ComponentProps<typeof EmptyStateRoot>;
    TitleProps: ComponentProps<typeof EmptyStateTitle>;
};
//# sourceMappingURL=index.d.ts.map