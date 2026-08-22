import type { ComponentProps } from 'react';
import { MarkdownRoot, StreamMarkdownRoot } from './markdown';
export { markdownVariants } from './markdown.styles';
declare const Markdown: import("react").MemoExoticComponent<({ children, className, components, id, ...props }: import("./markdown").MarkdownProps) => import("react/jsx-runtime").JSX.Element>;
declare const StreamMarkdown: import("react").MemoExoticComponent<({ animated, caret, children, className, components, controls, isStreaming, ...props }: import("./markdown").StreamMarkdownProps) => import("react/jsx-runtime").JSX.Element>;
export { Markdown, MarkdownRoot, StreamMarkdown, StreamMarkdownRoot };
export type { MarkdownProps, MarkdownRootProps, StreamMarkdownProps, StreamMarkdownRootProps, } from './markdown';
export type { MarkdownVariants } from './markdown.styles';
export type Markdown = {
    Props: ComponentProps<typeof MarkdownRoot>;
};
export type StreamMarkdown = {
    Props: ComponentProps<typeof StreamMarkdownRoot>;
};
//# sourceMappingURL=index.d.ts.map