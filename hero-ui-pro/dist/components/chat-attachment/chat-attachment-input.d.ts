import type { ComponentPropsWithoutRef, ReactNode } from 'react';
export type ChatAttachmentInputProps = {
    accept?: string;
    children: ReactNode;
    disabled?: boolean;
    multiple?: boolean;
    onFilesSelected: (files: File[]) => void;
};
export type ChatAttachmentInputTriggerRenderProps = {
    'aria-label'?: string;
    className?: string;
    disabled?: boolean;
    isDisabled?: boolean;
    onPress: () => void;
    type: 'button' | 'reset' | 'submit';
};
export type ChatAttachmentInputTriggerProps = ComponentPropsWithoutRef<'button'> & {
    render?: (props: ChatAttachmentInputTriggerRenderProps) => ReactNode;
};
export type ChatAttachmentInputDropzoneRenderProps = ComponentPropsWithoutRef<'div'> & {
    'data-dragging'?: true;
};
export type ChatAttachmentInputDropzoneProps = ComponentPropsWithoutRef<'div'> & {
    render?: (props: ChatAttachmentInputDropzoneRenderProps) => ReactNode;
};
export declare const ChatAttachmentInputRoot: ({ accept, children, disabled, multiple, onFilesSelected, }: ChatAttachmentInputProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentInputTrigger: ({ children, className, onClick, render, ...props }: ChatAttachmentInputTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentInputDropzone: ({ children, className, onDragEnterCapture, onDragLeaveCapture, onDragOverCapture, onDropCapture, onPasteCapture, render, ...props }: ChatAttachmentInputDropzoneProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chat-attachment-input.d.ts.map