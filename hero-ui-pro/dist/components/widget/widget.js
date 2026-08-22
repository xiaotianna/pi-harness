'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { dom } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { widgetVariants } from './widget.styles';
const WidgetContext = createContext({});
const WidgetRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => widgetVariants(), []);
    return (_jsx(WidgetContext.Provider, { value: { slots }, children: _jsx(dom.div, { className: composeSlotClassName(slots?.base, className), "data-slot": "widget", ...props, children: children }) }));
};
const WidgetHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "widget-header", ...props, children: children }));
};
const WidgetTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.title, className), "data-slot": "widget-title", ...props, children: children }));
};
const WidgetDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.description, className), "data-slot": "widget-description", ...props, children: children }));
};
const WidgetContent = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "widget-content", ...props, children: children }));
};
const WidgetFooter = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.footer, className), "data-slot": "widget-footer", ...props, children: children }));
};
const WidgetLegend = ({ children, className, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.legend, className), "data-slot": "widget-legend", ...props, children: children }));
};
const WidgetLegendItem = ({ children, className, color, ...props }) => {
    const { slots } = useContext(WidgetContext);
    return (_jsxs("div", { className: composeSlotClassName(slots?.legendItem, className), "data-slot": "widget-legend-item", ...props, children: [_jsx("span", { className: composeSlotClassName(slots?.legendItemDot), "data-slot": "widget-legend-item-dot", style: { backgroundColor: color } }), _jsx("span", { className: composeSlotClassName(slots?.legendItemLabel), "data-slot": "widget-legend-item-label", children: children })] }));
};
export { WidgetContent, WidgetDescription, WidgetFooter, WidgetHeader, WidgetLegend, WidgetLegendItem, WidgetRoot, WidgetTitle, };
//# sourceMappingURL=widget.js.map