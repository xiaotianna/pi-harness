import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button, TextArea } from '@heroui/react';
import type { PromptInputVariants } from './prompt-input.styles';
import type { ChatStatus } from './prompt-input.types';
type PromptInputLayout = NonNullable<PromptInputVariants['layout']>;
type PromptInputSurfaceVariant = NonNullable<PromptInputVariants['variant']>;
export interface PromptInputRootProps extends ComponentPropsWithRef<'div'> {
    allowSubmitWhileRunning?: boolean;
    children: ReactNode;
    isDisabled?: boolean;
    /** @deprecated Prefer `status`. When true, treated as `status="streaming"`. */
    isPending?: boolean;
    /** Layout behavior for toolbar placement and inline resizing. @default "stacked" */
    layout?: PromptInputLayout;
    lockInputOnRun?: boolean;
    maxHeight?: number | string;
    onStop?: () => void;
    onSubmit?: () => void;
    onValueChange?: (value: string) => void;
    size?: PromptInputVariants['size'];
    status?: ChatStatus;
    /** Shell surface variant aligned with HeroUI OSS field inputs. @default "primary" */
    variant?: PromptInputSurfaceVariant;
    value?: string;
}
export declare const PromptInputRoot: ({ allowSubmitWhileRunning, children, className, isDisabled: disabled, isPending, layout, lockInputOnRun, maxHeight, onStop, onSubmit, onValueChange, size, status: statusProp, value: valueProp, variant, ...props }: PromptInputRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputShellProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputShell: ({ children, className, ...props }: PromptInputShellProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputContent: ({ children, className, ...props }: PromptInputContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputAttachmentsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputAttachments: ({ children, className, ...props }: PromptInputAttachmentsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputTextAreaProps extends ComponentPropsWithRef<typeof TextArea> {
    disableAutosize?: boolean;
}
export declare const PromptInputTextArea: ({ className, disableAutosize, onKeyDown, ...props }: PromptInputTextAreaProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputToolbarProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputToolbar: ({ children, className, ...props }: PromptInputToolbarProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputToolbarStartProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputToolbarStart: ({ children, className, ...props }: PromptInputToolbarStartProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputToolbarEndProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputToolbarEnd: ({ children, className, ...props }: PromptInputToolbarEndProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputFooterProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
export declare const PromptInputFooter: ({ children, className, ...props }: PromptInputFooterProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputSendProps extends ComponentPropsWithRef<typeof Button> {
    children?: ReactNode;
    onStop?: () => void;
    status?: ChatStatus;
}
export declare const PromptInputSend: ({ children, className, isDisabled: isDisabledProp, onPress, onStop: onStopProp, status: statusProp, ...props }: PromptInputSendProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputActionProps extends ComponentPropsWithRef<typeof Button> {
    children: ReactNode;
    tooltip?: ReactNode;
}
export declare const PromptInputAction: ({ children, className, tooltip, variant: variantProp, ...props }: PromptInputActionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type { PromptInputRootProps as PromptInputProps };
//# sourceMappingURL=prompt-input.d.ts.map