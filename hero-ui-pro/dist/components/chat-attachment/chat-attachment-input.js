'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createContext, useCallback, useContext, useRef, useState, } from 'react';
const ChatAttachmentInputContext = createContext(null);
function mergeHandlers(a, b) {
    if (a && b)
        return (e) => {
            a(e);
            b(e);
        };
    return b ?? a;
}
function hasDragFiles(e) {
    return e.dataTransfer?.types?.includes('Files') ?? false;
}
function matchesAccept(file, accept) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return accept
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
        .some((part) => {
        if (part.endsWith('/*'))
            return type.startsWith(part.slice(0, -1));
        if (part.startsWith('.'))
            return name.endsWith(part);
        return type === part;
    });
}
function extensionFromImageType(type) {
    switch (type) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/gif':
            return 'gif';
        case 'image/webp':
            return 'webp';
        case 'image/png':
        default:
            return 'png';
    }
}
function ensurePastedImageName(file, index) {
    if (file.name || typeof File === 'undefined')
        return file;
    const type = file.type || 'image/png';
    return new File([file], `pasted-image-${index + 1}.${extensionFromImageType(type)}`, {
        lastModified: file.lastModified || Date.now(),
        type,
    });
}
function getClipboardImageFiles(e) {
    const data = e.clipboardData;
    if (!data)
        return [];
    const files = [];
    for (const item of Array.from(data.items ?? [])) {
        if (item.kind !== 'file' || !item.type.startsWith('image/'))
            continue;
        const file = item.getAsFile();
        if (file)
            files.push(file);
    }
    if (!files.length) {
        for (const file of Array.from(data.files ?? [])) {
            if (file.type.startsWith('image/'))
                files.push(file);
        }
    }
    return files.map(ensurePastedImageName);
}
// ─── Components ───────────────────────────────────────────────────────────────
export const ChatAttachmentInputRoot = ({ accept, children, disabled = false, multiple = true, onFilesSelected, }) => {
    const inputRef = useRef(null);
    const openFilePicker = useCallback(() => {
        if (!disabled)
            inputRef.current?.click();
    }, [disabled]);
    const addFiles = useCallback((files) => {
        if (disabled)
            return;
        const arr = Array.from(files);
        if (arr.length)
            onFilesSelected(multiple ? arr : arr.slice(0, 1));
    }, [disabled, multiple, onFilesSelected]);
    return (_jsxs(ChatAttachmentInputContext.Provider, { value: { accept, addFiles, disabled, inputRef, multiple, openFilePicker }, children: [_jsx("input", { ref: inputRef, "aria-hidden": true, accept: accept, className: "hidden", disabled: disabled, multiple: multiple, type: "file", onChange: (e) => {
                    if (e.target.files?.length) {
                        addFiles(e.target.files);
                        e.target.value = '';
                    }
                } }), children] }));
};
export const ChatAttachmentInputTrigger = ({ children, className, onClick, render, ...props }) => {
    const ctx = useContext(ChatAttachmentInputContext);
    const handlePress = () => {
        if (!ctx?.disabled)
            ctx?.openFilePicker();
    };
    if (render) {
        return render({
            'aria-label': props['aria-label'],
            className,
            disabled: ctx?.disabled || props.disabled,
            isDisabled: ctx?.disabled || props.disabled,
            onPress: handlePress,
            type: props.type ?? 'button',
        });
    }
    return (_jsx("button", { className: className, type: "button", onClick: (e) => {
            e.stopPropagation();
            handlePress();
            onClick?.(e);
        }, ...props, children: children }));
};
export const ChatAttachmentInputDropzone = ({ children, className, onDragEnterCapture, onDragLeaveCapture, onDragOverCapture, onDropCapture, onPasteCapture, render, ...props }) => {
    const ctx = useContext(ChatAttachmentInputContext);
    const [isDragging, setIsDragging] = useState(false);
    const handleDragEnter = useCallback((e) => {
        if (!ctx?.disabled && hasDragFiles(e)) {
            e.preventDefault();
            setIsDragging(true);
        }
    }, [ctx?.disabled]);
    const handleDragOver = useCallback((e) => {
        if (!ctx?.disabled && hasDragFiles(e)) {
            e.preventDefault();
            setIsDragging(true);
        }
    }, [ctx?.disabled]);
    const handleDragLeave = useCallback((e) => {
        if (ctx?.disabled)
            return;
        e.preventDefault();
        const related = e.relatedTarget;
        if (related && e.currentTarget.contains(related))
            return;
        setIsDragging(false);
    }, [ctx?.disabled]);
    const handleDrop = useCallback((e) => {
        if (!ctx || ctx.disabled)
            return;
        e.preventDefault();
        setIsDragging(false);
        if (!e.dataTransfer?.files?.length)
            return;
        let files = Array.from(e.dataTransfer.files);
        if (ctx.accept) {
            files = files.filter((file) => matchesAccept(file, ctx.accept));
        }
        if (files.length)
            ctx.addFiles(files);
    }, [ctx]);
    const handlePaste = useCallback((e) => {
        if (!ctx || ctx.disabled)
            return;
        let files = getClipboardImageFiles(e);
        if (!files.length)
            return;
        if (ctx.accept) {
            files = files.filter((file) => matchesAccept(file, ctx.accept));
        }
        if (!files.length)
            return;
        e.preventDefault();
        ctx.addFiles(files);
    }, [ctx]);
    const draggingProp = isDragging ? { 'data-dragging': true } : null;
    if (render) {
        return render({
            ...props,
            ...draggingProp,
            className,
            onDragEnterCapture: mergeHandlers(onDragEnterCapture, handleDragEnter),
            onDragLeaveCapture: mergeHandlers(onDragLeaveCapture, handleDragLeave),
            onDragOverCapture: mergeHandlers(onDragOverCapture, handleDragOver),
            onDropCapture: mergeHandlers(onDropCapture, handleDrop),
            onPasteCapture: mergeHandlers(onPasteCapture, handlePaste),
        });
    }
    return (_jsx("div", { className: className, ...draggingProp, ...props, onDragEnterCapture: mergeHandlers(onDragEnterCapture, handleDragEnter), onDragLeaveCapture: mergeHandlers(onDragLeaveCapture, handleDragLeave), onDragOverCapture: mergeHandlers(onDragOverCapture, handleDragOver), onDropCapture: mergeHandlers(onDropCapture, handleDrop), onPasteCapture: mergeHandlers(onPasteCapture, handlePaste), children: children }));
};
//# sourceMappingURL=chat-attachment-input.js.map