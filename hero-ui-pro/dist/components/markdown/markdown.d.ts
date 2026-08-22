import type { ComponentPropsWithRef } from 'react';
import type { Components as ReactMarkdownComponents } from 'react-markdown';
import type { Components as StreamdownComponents, StreamdownProps } from 'streamdown';
import { markdownVariants } from './markdown.styles';
interface MarkdownRootProps extends ComponentPropsWithRef<'div'> {
    children: string;
    components?: Partial<ReactMarkdownComponents>;
    id?: string;
}
declare const MarkdownRoot: import("react").MemoExoticComponent<({ children, className, components, id, ...props }: MarkdownRootProps) => import("react/jsx-runtime").JSX.Element>;
interface StreamMarkdownRootProps extends ComponentPropsWithRef<'div'> {
    animated?: StreamdownProps['animated'];
    caret?: StreamdownProps['caret'];
    children: string;
    components?: StreamdownComponents;
    controls?: StreamdownProps['controls'];
    isStreaming?: boolean;
}
declare const StreamMarkdownRoot: import("react").MemoExoticComponent<({ animated, caret, children, className, components, controls, isStreaming, ...props }: StreamMarkdownRootProps) => import("react/jsx-runtime").JSX.Element>;
export { MarkdownRoot, StreamMarkdownRoot };
export { markdownVariants };
export type { MarkdownRootProps as MarkdownProps, MarkdownRootProps, StreamMarkdownRootProps as StreamMarkdownProps, StreamMarkdownRootProps, };
export type { MarkdownVariants } from './markdown.styles';
//# sourceMappingURL=markdown.d.ts.map