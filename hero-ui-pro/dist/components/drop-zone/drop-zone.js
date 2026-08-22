'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useContext, useMemo, useRef } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { DropZone as DropZonePrimitive, Text as TextPrimitive, } from 'react-aria-components/DropZone';
import { AnimatePresence, domMax, LazyMotion } from 'motion/react';
import * as MotionComponents from 'motion/react-m';
import { dom, ProgressBar } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { CloudArrowUpIn, TrashBin } from '../icons';
import { DropZoneContext, DropZoneFileItemContext } from './drop-zone.context';
import { dropZoneVariants } from './drop-zone.styles';
// ---- GripVertical icon (inline) ----
function GripVerticalIcon(props) {
    return (_jsxs("svg", { "aria-hidden": "true", fill: "none", height: "16", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", width: "16", xmlns: "http://www.w3.org/2000/svg", ...props, children: [_jsx("circle", { cx: "9", cy: "5", r: "1" }), _jsx("circle", { cx: "9", cy: "12", r: "1" }), _jsx("circle", { cx: "9", cy: "19", r: "1" }), _jsx("circle", { cx: "15", cy: "5", r: "1" }), _jsx("circle", { cx: "15", cy: "12", r: "1" }), _jsx("circle", { cx: "15", cy: "19", r: "1" })] }));
}
// ---- Components ----
export const DropZoneRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => dropZoneVariants(), []);
    const inputRef = useRef(null);
    const openFilePicker = useCallback(() => inputRef.current?.click(), []);
    return (_jsx(DropZoneContext.Provider, { value: { inputRef, openFilePicker, slots }, children: _jsx(dom.div, { className: composeSlotClassName(slots?.base, className), "data-slot": "drop-zone", ...props, children: children }) }));
};
export const DropZoneArea = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(DropZonePrimitive, { className: composeTwRenderProps(className, slots?.area()), "data-slot": "drop-zone-area", ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const DropZoneIcon = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.icon, className), "data-slot": "drop-zone-icon", ...props, children: children ?? _jsx(CloudArrowUpIn, {}) }));
};
export const DropZoneLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(TextPrimitive, { className: composeSlotClassName(slots?.label, className), "data-slot": "drop-zone-label", slot: "label", ...props, children: children }));
};
export const DropZoneDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.description, className), "data-slot": "drop-zone-description", ...props, children: children }));
};
export const DropZoneInput = ({ accept, className, multiple, onSelect, ...props }) => {
    const { inputRef, slots } = useContext(DropZoneContext);
    const handleChange = useCallback((e) => {
        const files = e.target.files;
        if (files && files.length > 0)
            onSelect?.(files);
        e.target.value = '';
    }, [onSelect]);
    return (_jsx("input", { ref: inputRef, accept: accept, className: composeSlotClassName(slots?.input, className), "data-slot": "drop-zone-input", multiple: multiple, tabIndex: -1, type: "file", onChange: handleChange, ...props }));
};
export const DropZoneTrigger = ({ children, className, ...props }) => {
    const { openFilePicker, slots } = useContext(DropZoneContext);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "drop-zone-trigger", onPress: openFilePicker, ...props, children: (renderProps) => (_jsx(_Fragment, { children: typeof children === 'function' ? children(renderProps) : children })) }));
};
export const DropZoneFileList = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(LazyMotion, { features: domMax, children: _jsx("div", { className: composeSlotClassName(slots?.fileList, className), "data-slot": "drop-zone-file-list", ...props, children: _jsx(AnimatePresence, { initial: false, children: children }) }) }));
};
export const DropZoneFileItem = ({ children, className, status, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    const contextValue = useMemo(() => ({ status }), [status]);
    return (_jsx(DropZoneFileItemContext.Provider, { value: contextValue, children: _jsx(MotionComponents.div, { layout: true, animate: { opacity: 1, y: 0 }, className: composeSlotClassName(slots?.fileItem, className), "data-slot": "drop-zone-file-item", "data-status": status, exit: { opacity: 0, transition: { duration: 0.2 } }, initial: { opacity: 0, y: -8 }, transition: { layout: { bounce: 0.15, duration: 0.4, type: 'spring' } }, ...props, children: children }) }));
};
export const DropZoneFileFormatIcon = ({ className, color = 'gray', format, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsxs("svg", { "aria-hidden": "true", className: composeSlotClassName(slots?.fileFormatIcon, className), "data-slot": "drop-zone-file-format-icon", fill: "none", height: "40", viewBox: "0 0 32 40", width: "32", xmlns: "http://www.w3.org/2000/svg", ...props, children: [_jsx("path", { d: "M24 39.25H8C5.10051 39.25 2.75 36.8995 2.75 34V6C2.75 3.10051 5.10051 0.75 8 0.75H17.5147C18.9071 0.75 20.2425 1.30312 21.227 2.28769L29.7123 10.773C30.6969 11.7575 31.25 13.0929 31.25 14.4853V34C31.25 36.8995 28.8995 39.25 24 39.25Z", fill: "var(--color-surface)", stroke: "var(--color-border)", strokeWidth: "1.5" }), _jsx("path", { d: "M19 1V8C19 10.2091 20.7909 12 23 12H31", fill: "none", stroke: "var(--color-border)", strokeWidth: "1.5" }), !!format && (_jsx("foreignObject", { height: "40", width: "32", x: "0", y: "0", children: _jsx("div", { className: slots?.fileFormatIconBadge(), "data-color": color, "data-slot": "drop-zone-file-format-icon-badge", children: format }) }))] }));
};
export const DropZoneFileInfo = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.fileInfo, className), "data-slot": "drop-zone-file-info", ...props, children: children }));
};
export const DropZoneFileName = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.fileName, className), "data-slot": "drop-zone-file-name", ...props, children: children }));
};
export const DropZoneFileMeta = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.fileMeta, className), "data-slot": "drop-zone-file-meta", ...props, children: children }));
};
export const DropZoneFileProgress = ({ children, className, size = 'sm', ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(ProgressBar, { "aria-label": props['aria-label'] ?? 'Upload progress', className: composeTwRenderProps(className, slots?.fileProgress()), "data-slot": "drop-zone-file-progress", size: size, ...props, children: children }));
};
export const DropZoneFileProgressTrack = ({ children, className, ...props }) => (_jsx(ProgressBar.Track, { className: className, "data-slot": "drop-zone-file-progress-track", ...props, children: children }));
export const DropZoneFileProgressFill = ({ className, ...props }) => (_jsx(ProgressBar.Fill, { className: className, "data-slot": "drop-zone-file-progress-fill", ...props }));
export const DropZoneFileRetryTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.fileRetryTrigger()), "data-slot": "drop-zone-file-retry-trigger", ...props, children: (renderProps) => (_jsx(_Fragment, { children: typeof children === 'function'
                ? children(renderProps)
                : (children ?? 'Try again') })) }));
};
export const DropZoneFileRemoveTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(DropZoneContext);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.fileRemoveTrigger()), "data-slot": "drop-zone-file-remove-trigger", ...props, children: (renderProps) => (_jsx(_Fragment, { children: typeof children === 'function'
                ? children(renderProps)
                : (children ?? _jsx(TrashBin, {})) })) }));
};
//# sourceMappingURL=drop-zone.js.map