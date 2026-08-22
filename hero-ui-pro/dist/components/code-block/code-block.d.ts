import type { ComponentPropsWithRef, ReactNode } from 'react';
export interface CodeBlockRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface CodeBlockHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface CodeBlockCodeProps extends ComponentPropsWithRef<'div'> {
    code: string;
    darkTheme?: string;
    language?: string;
    theme?: string;
}
export interface CodeBlockCopyButtonProps {
    code: string;
    'aria-label'?: string;
    className?: string;
}
export type CodeBlockProps = CodeBlockRootProps;
export declare const CodeBlockRoot: ({ children, className, ...props }: CodeBlockRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockHeader: ({ children, className, ...props }: CodeBlockHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockCode: ({ className, code, darkTheme, language, theme, ...props }: CodeBlockCodeProps) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockCopyButton: ({ "aria-label": ariaLabel, className, code, }: CodeBlockCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=code-block.d.ts.map