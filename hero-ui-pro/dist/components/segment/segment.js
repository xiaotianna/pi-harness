'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, } from 'react';
import { SelectionIndicator } from 'react-aria-components/SelectionIndicator';
import { ToggleButton as ToggleButtonPrimitive, ToggleButtonGroup as ToggleButtonGroupPrimitive, } from 'react-aria-components/ToggleButtonGroup';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { segmentVariants } from './segment.styles';
const SegmentContext = createContext({});
const SegmentRoot = ({ children, className, defaultSelectedKey, isDisabled, onSelectionChange, selectedKey, size = 'md', variant = 'default', ...props }) => {
    const slots = useMemo(() => segmentVariants({ size, variant }), [size, variant]);
    const handleSelectionChange = useCallback((selection) => {
        const key = selection.values().next().value;
        if (key != null)
            onSelectionChange?.(key);
    }, [onSelectionChange]);
    return (_jsx(SegmentContext.Provider, { value: { slots }, children: _jsx(ToggleButtonGroupPrimitive, { disallowEmptySelection: true, className: composeTwRenderProps(className, slots?.base()), "data-slot": "segment", defaultSelectedKeys: defaultSelectedKey != null ? [defaultSelectedKey] : undefined, isDisabled: isDisabled, orientation: "horizontal", selectedKeys: selectedKey != null ? [selectedKey] : undefined, selectionMode: "single", onSelectionChange: handleSelectionChange, ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }) }));
};
const SegmentItem = ({ children, className, ...props }) => {
    const { slots } = useContext(SegmentContext);
    return (_jsx(ToggleButtonPrimitive, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "segment-item", ...props, children: (renderProps) => (_jsxs(_Fragment, { children: [_jsx(SelectionIndicator, { className: composeSlotClassName(slots?.indicator), "data-slot": "segment-indicator" }), typeof children === 'function' ? children(renderProps) : children] })) }));
};
const SegmentSeparator = ({ className, ...props }) => {
    const { slots } = useContext(SegmentContext);
    return (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.separator, className), "data-slot": "segment-separator", ...props }));
};
export { SegmentItem, SegmentRoot, SegmentSeparator };
//# sourceMappingURL=segment.js.map