import type { ComponentProps } from 'react';
import { CodeBlockCode, CodeBlockCopyButton, CodeBlockHeader, CodeBlockRoot } from './code-block';
export declare const CodeBlock: (({ children, className, ...props }: import("./code-block").CodeBlockRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Code: ({ className, code, darkTheme, language, theme, ...props }: import("./code-block").CodeBlockCodeProps) => import("react/jsx-runtime").JSX.Element;
    CopyButton: ({ "aria-label": ariaLabel, className, code, }: import("./code-block").CodeBlockCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
    Header: ({ children, className, ...props }: import("./code-block").CodeBlockHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, ...props }: import("./code-block").CodeBlockRootProps) => import("react/jsx-runtime").JSX.Element;
};
export type CodeBlock = {
    CodeProps: ComponentProps<typeof CodeBlockCode>;
    CopyButtonProps: ComponentProps<typeof CodeBlockCopyButton>;
    HeaderProps: ComponentProps<typeof CodeBlockHeader>;
    Props: ComponentProps<typeof CodeBlockRoot>;
    RootProps: ComponentProps<typeof CodeBlockRoot>;
};
export { CodeBlockCode, CodeBlockCopyButton, CodeBlockHeader, CodeBlockRoot };
export type { CodeBlockCodeProps, CodeBlockCopyButtonProps, CodeBlockHeaderProps, CodeBlockProps, CodeBlockRootProps, } from './code-block';
export type { CodeBlockVariants } from './code-block.styles';
export { codeBlockVariants } from './code-block.styles';
//# sourceMappingURL=index.d.ts.map