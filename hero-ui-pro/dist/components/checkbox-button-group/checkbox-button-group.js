'use client';
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Checkbox, CheckboxGroup } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { checkboxButtonGroupVariants } from './checkbox-button-group.styles';
const CheckboxButtonGroupContext = createContext({});
// ── Components ───────────────────────────────────────────────────────────────
export const CheckboxButtonGroupRoot = ({ children, className, layout = 'flex', ...props }) => {
    const slots = useMemo(() => checkboxButtonGroupVariants({ layout }), [layout]);
    return (_jsx(CheckboxButtonGroupContext, { value: { slots }, children: _jsx(CheckboxGroup, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "checkbox-button-group", ...props, children: (state) => (_jsx(_Fragment, { children: 'function' === typeof children ? children(state) : children })) }) }));
};
export const CheckboxButtonGroupItem = ({ children, className, ...props }) => {
    const { slots } = useContext(CheckboxButtonGroupContext);
    return (_jsx(Checkbox, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "checkbox-button-group-item", ...props, children: (state) => (_jsx(_Fragment, { children: 'function' === typeof children ? children(state) : children })) }));
};
export const CheckboxButtonGroupIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(CheckboxButtonGroupContext);
    if (children == null) {
        return (_jsx(Checkbox.Control, { className: composeSlotClassName(slots?.indicator, className), "data-slot": "checkbox-button-group-indicator", ...props, children: _jsx(Checkbox.Indicator, {}) }));
    }
    return (_jsx("span", { className: composeSlotClassName(slots?.indicator, className), "data-custom": "true", "data-slot": "checkbox-button-group-indicator", ...props, children: children }));
};
export const CheckboxButtonGroupItemContent = ({ children, className, ...props }) => {
    const { slots } = useContext(CheckboxButtonGroupContext);
    return (_jsx(Checkbox.Content, { className: composeTwRenderProps(className, slots?.itemContent()), "data-slot": "checkbox-button-group-item-content", ...props, children: children }));
};
export const CheckboxButtonGroupItemIcon = ({ children, className, ...props }) => {
    const { slots } = useContext(CheckboxButtonGroupContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.itemIcon, className), "data-slot": "checkbox-button-group-item-icon", ...props, children: children }));
};
//# sourceMappingURL=checkbox-button-group.js.map