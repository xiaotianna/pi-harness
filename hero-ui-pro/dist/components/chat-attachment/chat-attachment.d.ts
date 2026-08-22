import type { ComponentPropsWithRef } from 'react';
import React from 'react';
import { CloseButton } from '@heroui/react';
export type ChatAttachmentMediaType = 'audio' | 'document' | 'image' | 'unknown' | 'video';
export type ChatAttachmentFileKind = 'archive' | 'audio' | 'code' | 'document' | 'image' | 'pdf' | 'presentation' | 'spreadsheet' | 'unknown' | 'video';
export type ChatAttachmentVariant = 'file' | 'media';
export declare function inferChatAttachmentMediaType(mimeType?: string): ChatAttachmentMediaType;
export declare function inferChatAttachmentFileKind(mimeType?: string, name?: string): ChatAttachmentFileKind;
export declare function formatChatAttachmentSize(bytes?: number): string | undefined;
export interface ChatAttachmentRootProps extends ComponentPropsWithRef<'div'> {
    children?: React.ReactNode;
    mediaType?: ChatAttachmentMediaType;
    mimeType?: string;
    name?: string;
    size?: number;
    src?: string;
}
export type ChatAttachmentPreviewProps = {
    children?: React.ReactNode;
    className?: string;
};
export interface ChatAttachmentIconProps extends ComponentPropsWithRef<'span'> {
    children?: React.ReactNode;
}
export interface ChatAttachmentInfoProps extends ComponentPropsWithRef<'div'> {
    children?: React.ReactNode;
}
export interface ChatAttachmentNameProps extends ComponentPropsWithRef<'span'> {
    children?: React.ReactNode;
}
export interface ChatAttachmentSizeProps extends ComponentPropsWithRef<'span'> {
    children?: React.ReactNode;
}
export type ChatAttachmentRemoveProps = ComponentPropsWithRef<typeof CloseButton>;
export declare const ChatAttachmentRoot: ({ children, className, mediaType, mimeType, name, size, src, ...props }: ChatAttachmentRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentPreview: ({ children, className, }: ChatAttachmentPreviewProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentIcon: ({ children, className, ...props }: ChatAttachmentIconProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentInfo: ({ children, className, ...props }: ChatAttachmentInfoProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentName: ({ children, className, ...props }: ChatAttachmentNameProps) => import("react/jsx-runtime").JSX.Element;
export declare const ChatAttachmentSize: ({ children, className, ...props }: ChatAttachmentSizeProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const ChatAttachmentRemove: ({ children, className, ...props }: ChatAttachmentRemoveProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=chat-attachment.d.ts.map