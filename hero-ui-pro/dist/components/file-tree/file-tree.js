'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { Tree as TreePrimitive, TreeHeader as TreeHeaderPrimitive, TreeItem as TreeItemPrimitive, TreeItemContent, TreeSection as TreeSectionPrimitive, } from 'react-aria-components/Tree';
import { Checkbox } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { TreeMotionProvider } from '../../utils/tree-motion';
import { ChevronRight } from '../icons';
import { fileTreeVariants } from './file-tree.styles';
const FileTreeContext = createContext({});
// ---- Grip icon ----
function GripDotsIcon(props) {
    return (_jsxs("svg", { "aria-hidden": "true", fill: "none", height: "16", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", width: "16", xmlns: "http://www.w3.org/2000/svg", ...props, children: [_jsx("circle", { cx: "9", cy: "5", r: "1" }), _jsx("circle", { cx: "9", cy: "12", r: "1" }), _jsx("circle", { cx: "9", cy: "19", r: "1" }), _jsx("circle", { cx: "15", cy: "5", r: "1" }), _jsx("circle", { cx: "15", cy: "12", r: "1" }), _jsx("circle", { cx: "15", cy: "19", r: "1" })] }));
}
// ---- Guide-line level map ----
const GUIDE_LINE_MAP = {
    false: 'none',
    hover: 'hover',
    true: 'always',
};
// ---- Components ----
export const FileTreeRoot = ({ children, className, reduceMotion = false, showGuideLines = true, size, ...props }) => {
    const guideLinesKey = GUIDE_LINE_MAP[String(showGuideLines)];
    const slots = useMemo(() => fileTreeVariants({ guideLines: guideLinesKey, size }), [guideLinesKey, size]);
    return (_jsx(FileTreeContext.Provider, { value: { slots }, children: _jsx(TreeMotionProvider, { reduceMotion: reduceMotion, children: _jsx(TreePrimitive, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "file-tree", ...props, children: children }) }) }));
};
export const FileTreeIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(FileTreeContext);
    if (children && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            className: composeSlotClassName(slots?.indicator, className),
            'data-slot': 'file-tree-indicator',
        });
    }
    return (_jsx(ChevronRight, { className: composeSlotClassName(slots?.indicator, className), "data-slot": "file-tree-indicator", ...props }));
};
export const FileTreeItem = ({ children, className, dragIcon, icon, render: renderProp, title, ...props }) => {
    const { slots } = useContext(FileTreeContext);
    const textValue = typeof title === 'string' ? title : (props.textValue ?? '');
    let customIndicator = null;
    const otherChildren = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === FileTreeIndicator) {
            customIndicator = child;
        }
        else {
            otherChildren.push(child);
        }
    });
    return (_jsxs(TreeItemPrimitive, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "file-tree-item", render: renderProp, textValue: textValue, ...props, children: [_jsx(TreeItemContent, { children: ({ allowsDragging, hasChildItems, isExpanded, level, selectionBehavior, selectionMode, }) => {
                    const resolvedIcon = typeof icon === 'function'
                        ? icon({
                            allowsDragging: !!allowsDragging,
                            hasChildItems,
                            isExpanded,
                        })
                        : icon;
                    const showCheckbox = selectionBehavior === 'toggle' && selectionMode !== 'none';
                    return (_jsxs("div", { className: slots?.itemContent(), "data-slot": "file-tree-item-content", children: [Array.from({ length: level - 1 }, (_, i) => (_jsx("div", { "aria-hidden": "true", className: slots?.guideLine(), "data-slot": "file-tree-guide-line", style: {
                                    left: `calc(var(--file-tree-item-px) + ${i} * var(--file-tree-indent) + var(--file-tree-indent) / 2)`,
                                } }, i))), !!allowsDragging && dragIcon !== false && (_jsx(ButtonPrimitive, { className: slots?.dragHandle(), "data-slot": "file-tree-drag-handle", slot: "drag", children: dragIcon ?? _jsx(GripDotsIcon, {}) })), showCheckbox && (_jsx("span", { className: slots?.checkbox(), "data-slot": "file-tree-checkbox", children: _jsx(Checkbox, { "aria-label": "Select", slot: "selection", children: _jsx(Checkbox.Control, { children: _jsx(Checkbox.Indicator, {}) }) }) })), _jsx(ButtonPrimitive, { className: slots?.chevron(), slot: "chevron", children: customIndicator ?? _jsx(FileTreeIndicator, {}) }), hasChildItems || resolvedIcon ? (_jsx("span", { className: slots?.icon(), "data-slot": "file-tree-icon", children: resolvedIcon })) : null, _jsx("span", { className: slots?.label(), "data-slot": "file-tree-label", children: title })] }));
                } }), otherChildren] }));
};
export const FileTreeSection = ({ children, className, ...props }) => {
    const { slots } = useContext(FileTreeContext);
    return (_jsx(TreeSectionPrimitive, { className: composeSlotClassName(slots?.section, className), "data-slot": "file-tree-section", ...props, children: children }));
};
export const FileTreeHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(FileTreeContext);
    return (_jsx(TreeHeaderPrimitive, { className: composeSlotClassName(slots?.sectionHeader, className), "data-slot": "file-tree-section-header", ...props, children: children }));
};
//# sourceMappingURL=file-tree.js.map