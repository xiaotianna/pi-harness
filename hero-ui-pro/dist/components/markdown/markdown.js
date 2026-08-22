'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { Streamdown } from 'streamdown';
import { composeSlotClassName } from '../../utils/compose';
import { CodeBlock } from '../code-block/index';
import { markdownVariants } from './markdown.styles';
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const DEFAULT_STREAM_ANIMATED = {
    animation: 'blurIn',
};
function getLanguageFromClassName(className) {
    if (!className)
        return 'plaintext';
    const match = className.match(/language-(\w+)/);
    return match?.[1] ?? 'plaintext';
}
function buildMarkdownComponents(slots) {
    return {
        code: (({ children, className, node, ...props }) => {
            const isInline = !node?.position?.start.line ||
                node.position.start.line === node.position.end.line;
            if (isInline) {
                return (_jsx("code", { className: composeSlotClassName(slots?.inlineCode, className), "data-slot": "markdown-inline-code", ...props, children: children }));
            }
            const language = getLanguageFromClassName(className);
            const code = String(children ?? '').replace(/\n$/, '');
            return (_jsxs(CodeBlock, { children: [_jsxs(CodeBlock.Header, { children: [_jsx("span", { className: "text-muted text-xs uppercase", children: language }), _jsx(CodeBlock.CopyButton, { code: code })] }), _jsx(CodeBlock.Code, { code: code, language: language })] }));
        }),
        pre: function PreComponent({ children }) {
            return _jsx(_Fragment, { children: children });
        },
    };
}
const STREAMING_COMPONENTS = {
    code: function StreamingCodeComponent({ children, className, }) {
        const language = getLanguageFromClassName(className);
        const code = String(children ?? '').replace(/\n$/, '');
        return (_jsxs(CodeBlock, { children: [_jsxs(CodeBlock.Header, { children: [_jsx("span", { className: "text-muted text-xs uppercase", children: language }), _jsx(CodeBlock.CopyButton, { code: code })] }), _jsx(CodeBlock.Code, { code: code, language: language })] }));
    },
    inlineCode: function StreamingInlineCode({ children, className, ...props }) {
        const slots = markdownVariants();
        return (_jsx("code", { className: composeSlotClassName(slots?.inlineCode, className), "data-slot": "markdown-inline-code", ...props, children: children }));
    },
    pre: function PreComponent({ children }) {
        return _jsx(_Fragment, { children: children });
    },
};
const MemoizedMarkdownBlock = memo(function MemoizedMarkdownBlock({ components, content, slots, }) {
    return (_jsx("div", { className: composeSlotClassName(slots?.block, undefined), "data-slot": "markdown-block", children: _jsx(ReactMarkdown, { components: components, remarkPlugins: REMARK_PLUGINS, children: content }) }));
});
MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}
function buildTokensWithKeys(tokens, id) {
    const counts = new Map();
    return tokens.map((content) => {
        const hash = hashString(content);
        const count = counts.get(hash) ?? 0;
        counts.set(hash, count + 1);
        return { content, key: `${id}-${hash}-${count}` };
    });
}
const MarkdownRoot = memo(function MarkdownRoot({ children, className, components, id, ...props }) {
    const generatedId = useId();
    const resolvedId = id ?? generatedId;
    const slots = useMemo(() => markdownVariants(), []);
    const rawTokens = useMemo(() => marked.lexer(children).map((token) => token.raw), [children]);
    const tokensWithKeys = useMemo(() => buildTokensWithKeys(rawTokens, resolvedId), [resolvedId, rawTokens]);
    const mergedComponents = useMemo(() => ({ ...buildMarkdownComponents(slots), ...components }), [components, slots]);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "markdown", ...props, children: tokensWithKeys.map((token) => (_jsx(MemoizedMarkdownBlock, { components: mergedComponents, content: token.content, slots: slots }, token.key))) }));
});
const StreamMarkdownRoot = memo(function StreamMarkdownRoot({ animated = DEFAULT_STREAM_ANIMATED, caret = 'block', children, className, components, controls = false, isStreaming = false, ...props }) {
    const slots = useMemo(() => markdownVariants(), []);
    const mergedComponents = useMemo(() => components
        ? { ...STREAMING_COMPONENTS, ...components }
        : STREAMING_COMPONENTS, [components]);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "markdown", ...props, children: _jsx(Streamdown, { normalizeHtmlIndentation: true, parseIncompleteMarkdown: true, animated: animated, caret: isStreaming ? caret : undefined, components: mergedComponents, controls: controls, isAnimating: isStreaming, mode: isStreaming ? 'streaming' : 'static', remarkPlugins: REMARK_PLUGINS, children: children }) }));
});
export { MarkdownRoot, StreamMarkdownRoot };
export { markdownVariants };
//# sourceMappingURL=markdown.js.map