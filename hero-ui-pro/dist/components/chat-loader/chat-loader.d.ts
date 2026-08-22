import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ChatLoaderVariants } from './chat-loader.styles';
export interface ChatLoaderDotsProps extends ComponentPropsWithRef<'span'> {
    label?: string;
    size?: ChatLoaderVariants['size'];
}
export interface ChatLoaderPulseProps extends ComponentPropsWithRef<'span'> {
    label?: string;
    size?: ChatLoaderVariants['size'];
}
export interface ChatLoaderSpinnerProps extends ComponentPropsWithRef<'span'> {
    label?: string;
    size?: ChatLoaderVariants['size'];
}
export interface ChatLoaderSkeletonProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
    label?: string;
    size?: ChatLoaderVariants['size'];
}
export interface ChatLoaderSkeletonAvatarProps extends ComponentPropsWithRef<'div'> {
}
export interface ChatLoaderSkeletonBlockProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatLoaderSkeletonLineProps extends ComponentPropsWithRef<'div'> {
}
declare const ChatLoaderDots: ({ className, label, size, ...props }: ChatLoaderDotsProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderPulse: ({ className, label, size, ...props }: ChatLoaderPulseProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderSpinner: ({ className, label, size, ...props }: ChatLoaderSpinnerProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderSkeleton: ({ children, className, label, size, ...props }: ChatLoaderSkeletonProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderSkeletonAvatar: ({ className, ...props }: ChatLoaderSkeletonAvatarProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderSkeletonBlock: ({ children, className, ...props }: ChatLoaderSkeletonBlockProps) => import("react/jsx-runtime").JSX.Element;
declare const ChatLoaderSkeletonLine: ({ className, ...props }: ChatLoaderSkeletonLineProps) => import("react/jsx-runtime").JSX.Element;
export { ChatLoaderDots, ChatLoaderPulse, ChatLoaderSkeleton, ChatLoaderSkeletonAvatar, ChatLoaderSkeletonBlock, ChatLoaderSkeletonLine, ChatLoaderSpinner, };
//# sourceMappingURL=chat-loader.d.ts.map