import type { ComponentProps } from 'react';
import { ChatToolApproval, ChatToolApprovalActions, ChatToolApprove, ChatToolArgs, ChatToolContent, ChatToolError, ChatToolMeta, ChatToolReject, ChatToolResult, ChatToolRoot, ChatToolStatusIcon, ChatToolTrigger } from './chat-tool';
export { mapToolStateToVisual } from './chat-tool';
import { ChatToolGroupContent, ChatToolGroupRoot, ChatToolGroupTrigger } from './chat-tool-group';
export type { ChatToolGroupVariants, ChatToolVariants, } from './chat-tool.styles';
export { chatToolGroupVariants, chatToolVariants } from './chat-tool.styles';
export type { ToolPartState } from './chat-tool.types';
declare const ChatTool: (({ active, approveLabel, argsText, children, className, errorText, input, isExpandable, onApprove, onReject, output, rejectLabel, state, toolCallId, toolName, triggerPrefix, ...props }: import("./chat-tool").ChatToolRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Approval: ({ children, className, ...props }: import("./chat-tool").ChatToolApprovalProps) => import("react/jsx-runtime").JSX.Element | null;
    ApprovalActions: ({ children, className, ...props }: import("./chat-tool").ChatToolApprovalActionsProps) => import("react/jsx-runtime").JSX.Element;
    Approve: ({ children, ...props }: import("./chat-tool").ChatToolActionPresetProps) => import("react/jsx-runtime").JSX.Element;
    Args: ({ argsText, children, className, input, label, ...props }: import("./chat-tool").ChatToolArgsProps) => import("react/jsx-runtime").JSX.Element | null;
    Content: ({ children, className, ...props }: import("./chat-tool").ChatToolContentProps) => import("react/jsx-runtime").JSX.Element | null;
    Error: ({ children, className, errorText, label, ...props }: import("./chat-tool").ChatToolErrorProps) => import("react/jsx-runtime").JSX.Element | null;
    Meta: ({ className, toolCallId, ...props }: import("./chat-tool").ChatToolMetaProps) => import("react/jsx-runtime").JSX.Element;
    Reject: ({ children, variant, ...props }: import("./chat-tool").ChatToolActionPresetProps) => import("react/jsx-runtime").JSX.Element;
    Result: ({ children, className, label, value, ...props }: import("./chat-tool").ChatToolResultProps) => import("react/jsx-runtime").JSX.Element | null;
    Root: ({ active, approveLabel, argsText, children, className, errorText, input, isExpandable, onApprove, onReject, output, rejectLabel, state, toolCallId, toolName, triggerPrefix, ...props }: import("./chat-tool").ChatToolRootProps) => import("react/jsx-runtime").JSX.Element;
    StatusIcon: ({ children, className, }: import("./chat-tool").ChatToolStatusIconProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, isDisabled, ...props }: import("./chat-tool").ChatToolTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
declare const ChatToolGroup: (({ active, children, className, ...props }: import("./chat-tool-group").ChatToolGroupRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./chat-tool-group").ChatToolGroupContentProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ active, children, className, ...props }: import("./chat-tool-group").ChatToolGroupRootProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./chat-tool-group").ChatToolGroupTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export { ChatTool, ChatToolApproval, ChatToolApprovalActions, ChatToolApprove, ChatToolArgs, ChatToolContent, ChatToolError, ChatToolGroup, ChatToolGroupContent, ChatToolGroupRoot, ChatToolGroupTrigger, ChatToolMeta, ChatToolReject, ChatToolResult, ChatToolRoot, ChatToolStatusIcon, ChatToolTrigger, };
export type { ChatToolActionPresetProps, ChatToolApprovalActionsProps, ChatToolApprovalProps, ChatToolArgsProps, ChatToolContentProps, ChatToolErrorProps, ChatToolMetaProps, ChatToolRootProps as ChatToolProps, ChatToolResultProps, ChatToolRootProps, ChatToolStatusIconProps, ChatToolTriggerProps, } from './chat-tool';
export type { ChatToolGroupContentProps, ChatToolGroupRootProps as ChatToolGroupProps, ChatToolGroupRootProps, ChatToolGroupTriggerProps, } from './chat-tool-group';
export type ChatTool = {
    ApprovalActionsProps: ComponentProps<typeof ChatToolApprovalActions>;
    ApprovalProps: ComponentProps<typeof ChatToolApproval>;
    ApproveProps: ComponentProps<typeof ChatToolApprove>;
    ArgsProps: ComponentProps<typeof ChatToolArgs>;
    ContentProps: ComponentProps<typeof ChatToolContent>;
    ErrorProps: ComponentProps<typeof ChatToolError>;
    MetaProps: ComponentProps<typeof ChatToolMeta>;
    Props: ComponentProps<typeof ChatToolRoot>;
    RejectProps: ComponentProps<typeof ChatToolReject>;
    ResultProps: ComponentProps<typeof ChatToolResult>;
    RootProps: ComponentProps<typeof ChatToolRoot>;
    StatusIconProps: ComponentProps<typeof ChatToolStatusIcon>;
    TriggerProps: ComponentProps<typeof ChatToolTrigger>;
};
export type ChatToolGroup = {
    ContentProps: ComponentProps<typeof ChatToolGroupContent>;
    Props: ComponentProps<typeof ChatToolGroupRoot>;
    RootProps: ComponentProps<typeof ChatToolGroupRoot>;
    TriggerProps: ComponentProps<typeof ChatToolGroupTrigger>;
};
//# sourceMappingURL=index.d.ts.map