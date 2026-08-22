import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button, Disclosure } from '@heroui/react';
import type { ChatToolVariants } from './chat-tool.styles';
import type { ToolPartState } from './chat-tool.types';
type ChatToolVisualState = NonNullable<ChatToolVariants['state']>;
export declare function mapToolStateToVisual(state: ToolPartState): ChatToolVisualState;
export interface ChatToolRootProps extends ComponentPropsWithRef<typeof Disclosure> {
    /** Controls shimmer styling for running tools. Defaults to running when the state is in progress. */
    active?: boolean;
    approveLabel?: ReactNode;
    argsText?: string;
    children?: ReactNode;
    errorText?: string;
    input?: unknown;
    /** Whether the tool row can expand to reveal body content. Defaults to true for custom children. */
    isExpandable?: boolean;
    /** Preset: called when the user approves a tool that requires action. */
    onApprove?: () => void;
    /** Preset: called when the user rejects a tool that requires action. */
    onReject?: () => void;
    output?: unknown;
    rejectLabel?: ReactNode;
    state: ToolPartState;
    toolCallId?: string;
    toolName?: string;
    /** Preset: optional label before the tool name in the default trigger. */
    triggerPrefix?: ReactNode;
}
export interface ChatToolTriggerProps extends ComponentPropsWithRef<typeof Disclosure.Trigger> {
    children: ReactNode;
}
export type ChatToolStatusIconProps = {
    children?: ReactNode;
    className?: string;
};
export interface ChatToolContentProps extends ComponentPropsWithRef<typeof Disclosure.Content> {
    children: ReactNode;
}
export interface ChatToolArgsProps extends ComponentPropsWithRef<'div'> {
    argsText?: string;
    children?: ReactNode;
    input?: unknown;
    label?: ReactNode;
}
export interface ChatToolResultProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
    label?: ReactNode;
    value?: unknown;
}
export interface ChatToolErrorProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
    errorText?: string;
    label?: ReactNode;
}
export interface ChatToolApprovalProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export interface ChatToolApprovalActionsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export type ChatToolActionPresetProps = ComponentPropsWithRef<typeof Button> & {
    children?: ReactNode;
};
export interface ChatToolMetaProps extends ComponentPropsWithRef<'div'> {
    toolCallId: string;
}
export declare const ChatToolRoot: ({ active, approveLabel, argsText, children, className, errorText, input, isExpandable, onApprove, onReject, output, rejectLabel, state, toolCallId, toolName, triggerPrefix, ...props }: ChatToolRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolTrigger: ({ children, className, isDisabled, ...props }: ChatToolTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolStatusIcon: ({ children, className, }: ChatToolStatusIconProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolContent: ({ children, className, ...props }: ChatToolContentProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatToolArgs: ({ argsText, children, className, input, label, ...props }: ChatToolArgsProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatToolResult: ({ children, className, label, value, ...props }: ChatToolResultProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatToolError: ({ children, className, errorText, label, ...props }: ChatToolErrorProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatToolApproval: ({ children, className, ...props }: ChatToolApprovalProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatToolApprovalActions: ({ children, className, ...props }: ChatToolApprovalActionsProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolApprove: ({ children, ...props }: ChatToolActionPresetProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolReject: ({ children, variant, ...props }: ChatToolActionPresetProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatToolMeta: ({ className, toolCallId, ...props }: ChatToolMetaProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=chat-tool.d.ts.map