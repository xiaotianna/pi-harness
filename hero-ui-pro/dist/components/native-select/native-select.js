'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { nativeSelectVariants } from './native-select.styles';
const NativeSelectContext = createContext({});
const NativeSelectRoot = ({ children, className, fullWidth, variant, ...props }) => {
    const slots = useMemo(() => nativeSelectVariants({ fullWidth, variant }), [fullWidth, variant]);
    return (_jsx(NativeSelectContext.Provider, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "native-select", ...props, children: children }) }));
};
const NativeSelectTrigger = ({ children, className, wrapperClassName, ...selectProps }) => {
    const { slots } = useContext(NativeSelectContext);
    let indicator = null;
    const options = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === NativeSelectIndicator) {
            indicator = child;
        }
        else {
            options.push(child);
        }
    });
    return (_jsxs("div", { className: composeSlotClassName(slots?.trigger, wrapperClassName), "data-slot": "native-select-trigger", children: [_jsx("select", { className: composeSlotClassName(slots?.select, className), "data-slot": "native-select-select", ...selectProps, children: options }), indicator ?? _jsx(NativeSelectIndicator, {})] }));
};
const NativeSelectIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(NativeSelectContext);
    return (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.indicator, className), "data-slot": "native-select-indicator", ...props, children: children ?? _jsx(ChevronDownIcon, {}) }));
};
const ChevronDownIcon = (props) => (_jsx("svg", { "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", ...props, children: _jsx("path", { d: "m6 9 6 6 6-6" }) }));
const NativeSelectOption = ({ children, ...props }) => _jsx("option", { ...props, children: children });
const NativeSelectOptGroup = ({ children, ...props }) => _jsx("optgroup", { ...props, children: children });
export { NativeSelectIndicator, NativeSelectOptGroup, NativeSelectOption, NativeSelectRoot, NativeSelectTrigger, };
//# sourceMappingURL=native-select.js.map