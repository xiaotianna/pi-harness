import type { ReactNode } from 'react';
import React from 'react';
import type { TextShimmerRenderProps } from './text-shimmer.styles';
interface TextShimmerProps<E extends keyof React.JSX.IntrinsicElements = 'span'> extends TextShimmerRenderProps<E> {
    children: ReactNode;
    className?: string;
}
declare const TextShimmer: <E extends keyof React.JSX.IntrinsicElements = "span">({ children, className, ...props }: TextShimmerProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof TextShimmerProps<E>>) => import("react/jsx-runtime").JSX.Element;
export { TextShimmer };
export type { TextShimmerProps };
//# sourceMappingURL=text-shimmer.d.ts.map