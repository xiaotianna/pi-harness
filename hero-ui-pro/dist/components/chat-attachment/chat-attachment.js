'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo } from 'react';
import { cx } from 'tailwind-variants';
import { CloseButton } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { FileAudio, FileCode, FileDoc, FileImage, FilePdf, FileSpreadsheet, FileText, FileVideo, FileZip, } from '../icons';
import { chatAttachmentVariants } from './chat-attachment.styles';
export function inferChatAttachmentMediaType(mimeType) {
    if (!mimeType)
        return 'unknown';
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.startsWith('video/'))
        return 'video';
    if (mimeType.startsWith('audio/'))
        return 'audio';
    if (mimeType.startsWith('text/') || mimeType.startsWith('application/'))
        return 'document';
    return 'unknown';
}
const IMAGE_EXTENSIONS = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'svg',
    'bmp',
    'avif',
    'heic',
    'ico',
    'tiff',
];
const VIDEO_EXTENSIONS = [
    'mp4',
    'mov',
    'webm',
    'mkv',
    'avi',
    'm4v',
    'mpg',
    'mpeg',
];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus'];
const ARCHIVE_EXTENSIONS = [
    'zip',
    'rar',
    '7z',
    'tar',
    'gz',
    'tgz',
    'bz2',
    'xz',
];
const SPREADSHEET_EXTENSIONS = ['csv', 'tsv', 'xls', 'xlsx', 'ods', 'numbers'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'odt', 'rtf', 'pages'];
const PRESENTATION_EXTENSIONS = ['ppt', 'pptx', 'odp', 'key'];
const CODE_EXTENSIONS = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'html',
    'css',
    'scss',
    'sass',
    'less',
    'py',
    'rb',
    'go',
    'rs',
    'java',
    'kt',
    'swift',
    'c',
    'cc',
    'cpp',
    'h',
    'hpp',
    'cs',
    'php',
    'sh',
    'bash',
    'zsh',
    'yml',
    'yaml',
    'toml',
    'xml',
    'sql',
    'vue',
    'svelte',
];
function getFileExtension(name) {
    return name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}
export function inferChatAttachmentFileKind(mimeType, name) {
    const mime = mimeType?.toLowerCase() ?? '';
    const ext = getFileExtension(name);
    if (mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext))
        return 'image';
    if (mime.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext))
        return 'video';
    if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.includes(ext))
        return 'audio';
    if (mime === 'application/pdf' || ext === 'pdf')
        return 'pdf';
    if (ARCHIVE_EXTENSIONS.includes(ext) ||
        /zip|compressed|x-tar|x-7z|x-rar|gzip/.test(mime))
        return 'archive';
    if (SPREADSHEET_EXTENSIONS.includes(ext) ||
        /spreadsheet|ms-excel|csv/.test(mime))
        return 'spreadsheet';
    if (PRESENTATION_EXTENSIONS.includes(ext) ||
        /presentation|ms-powerpoint/.test(mime))
        return 'presentation';
    if (DOCUMENT_EXTENSIONS.includes(ext) ||
        /msword|wordprocessing|rtf/.test(mime))
        return 'document';
    if (CODE_EXTENSIONS.includes(ext) ||
        /javascript|typescript|json|x-sh|x-python|xml/.test(mime))
        return 'code';
    if (mime.startsWith('text/'))
        return 'document';
    return 'unknown';
}
export function formatChatAttachmentSize(bytes) {
    if (bytes == null || !Number.isFinite(bytes) || bytes < 0)
        return undefined;
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1048576)
        return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1073741824)
        return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
}
const FILE_KIND_ICONS = {
    archive: FileZip,
    audio: FileAudio,
    code: FileCode,
    document: FileDoc,
    image: FileImage,
    pdf: FilePdf,
    presentation: FileDoc,
    spreadsheet: FileSpreadsheet,
    unknown: FileText,
    video: FileVideo,
};
const ChatAttachmentContext = createContext({});
const useChatAttachmentContext = () => useContext(ChatAttachmentContext);
const useSlots = () => {
    const { slots } = useChatAttachmentContext();
    const fallback = useMemo(() => chatAttachmentVariants(), []);
    return slots ?? fallback;
};
export const ChatAttachmentRoot = ({ children, className, mediaType, mimeType, name, size, src, ...props }) => {
    const slots = useMemo(() => chatAttachmentVariants(), []);
    const fileKind = inferChatAttachmentFileKind(mimeType, name);
    const inferredMediaType = mediaType ?? inferChatAttachmentMediaType(mimeType);
    const resolvedMediaType = inferredMediaType !== 'unknown' ||
        (fileKind !== 'image' && fileKind !== 'video')
        ? inferredMediaType
        : fileKind;
    const variant = (resolvedMediaType !== 'image' && resolvedMediaType !== 'video') || !src
        ? 'file'
        : 'media';
    return (_jsx(ChatAttachmentContext.Provider, { value: {
            fileKind,
            mediaType: resolvedMediaType,
            mimeType,
            name,
            size,
            slots,
            src,
            variant,
        }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-media-type": resolvedMediaType, "data-slot": "chat-attachment", "data-variant": variant, title: name, ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(ChatAttachmentPreview, {}), _jsx(ChatAttachmentInfo, {})] })) }) }));
};
export const ChatAttachmentPreview = ({ children, className, }) => {
    const { mediaType, name, src } = useChatAttachmentContext();
    const slots = useSlots();
    if (children && React.isValidElement(children)) {
        return React.cloneElement(children, {
            className: cx(composeSlotClassName(slots?.preview, className), children.props
                .className),
            'data-slot': 'chat-attachment-preview',
        });
    }
    return (_jsx("div", { className: composeSlotClassName(slots?.preview, className), "data-slot": "chat-attachment-preview", children: mediaType === 'image' && src ? (_jsx("img", { alt: name ?? 'Attachment', className: composeSlotClassName(slots?.previewImage, undefined), "data-slot": "chat-attachment-preview-image", src: src })) : mediaType === 'video' && src ? (_jsx("video", { className: composeSlotClassName(slots?.previewVideo, undefined), "data-slot": "chat-attachment-preview-video", muted: true, src: src })) : (_jsx(ChatAttachmentIcon, {})) }));
};
export const ChatAttachmentIcon = ({ children, className, ...props }) => {
    const { fileKind = 'unknown' } = useChatAttachmentContext();
    const slots = useSlots();
    const Icon = FILE_KIND_ICONS[fileKind] ?? FileText;
    return (_jsx("span", { className: composeSlotClassName(slots?.icon, className), "data-slot": "chat-attachment-icon", ...props, children: children ?? _jsx(Icon, {}) }));
};
export const ChatAttachmentInfo = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx("div", { className: composeSlotClassName(slots?.info, className), "data-slot": "chat-attachment-info", ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(ChatAttachmentName, {}), _jsx(ChatAttachmentSize, {})] })) }));
};
export const ChatAttachmentName = ({ children, className, ...props }) => {
    const { name } = useChatAttachmentContext();
    const slots = useSlots();
    return (_jsx("span", { className: composeSlotClassName(slots?.name, className), "data-slot": "chat-attachment-name", ...props, children: children ?? name }));
};
export const ChatAttachmentSize = ({ children, className, ...props }) => {
    const { size } = useChatAttachmentContext();
    const slots = useSlots();
    const content = children ?? formatChatAttachmentSize(size);
    if (content == null || content === '')
        return null;
    return (_jsx("span", { className: composeSlotClassName(slots?.size, className), "data-slot": "chat-attachment-size", ...props, children: content }));
};
export const ChatAttachmentRemove = ({ children, className, ...props }) => {
    const slots = useSlots();
    return (_jsx(CloseButton, { className: composeTwRenderProps(className, slots?.remove()), "data-slot": "chat-attachment-remove", ...props, children: children }));
};
//# sourceMappingURL=chat-attachment.js.map