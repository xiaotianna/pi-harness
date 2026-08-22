'use client';
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Button as AriaButton } from 'react-aria-components/Button';
import { Radio, RadioGroup } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { radioButtonGroupVariants } from './radio-button-group.styles';
const RadioButtonGroupContext = createContext({});
const RadioButtonGroupRoot = ({ children, className, layout = 'flex', ...props }) => {
    const slots = useMemo(() => radioButtonGroupVariants({ layout }), [layout]);
    return (_jsx(RadioButtonGroupContext.Provider, { value: { slots }, children: _jsx(RadioGroup, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "radio-button-group", ...props, children: (renderProps) => (_jsx(_Fragment, { children: 'function' === typeof children ? children(renderProps) : children })) }) }));
};
const RadioButtonGroupItem = ({ children, className, ...props }) => {
    const { slots } = useContext(RadioButtonGroupContext);
    return (_jsx(Radio, { className: composeTwRenderProps(className, slots?.item()), "data-slot": "radio-button-group-item", ...props, children: (renderProps) => (_jsx(_Fragment, { children: 'function' === typeof children ? children(renderProps) : children })) }));
};
const RadioButtonGroupIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(RadioButtonGroupContext);
    if (children == null) {
        return (_jsx(Radio.Control, { className: composeSlotClassName(slots?.indicator, className), "data-slot": "radio-button-group-indicator", ...props, children: _jsx(Radio.Indicator, {}) }));
    }
    return (_jsx("span", { className: composeSlotClassName(slots?.indicator, className), "data-custom": "true", "data-slot": "radio-button-group-indicator", ...props, children: children }));
};
const RadioButtonGroupItemContent = ({ children, className, ...props }) => {
    const { slots } = useContext(RadioButtonGroupContext);
    return (_jsx(Radio.Content, { className: composeTwRenderProps(className, slots?.itemContent()), "data-slot": "radio-button-group-item-content", ...props, children: children }));
};
const RadioButtonGroupItemIcon = ({ children, className, ...props }) => {
    const { slots } = useContext(RadioButtonGroupContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.itemIcon, className), "data-slot": "radio-button-group-item-icon", ...props, children: children }));
};
export { RadioButtonGroupIndicator, RadioButtonGroupItem, RadioButtonGroupItemContent, RadioButtonGroupItemIcon, RadioButtonGroupRoot, };
//# sourceMappingURL=radio-button-group.js.map