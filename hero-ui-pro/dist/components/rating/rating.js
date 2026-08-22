'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, } from 'react';
import { Radio as RadioPrimitive, RadioGroup as RadioGroupPrimitive, } from 'react-aria-components/RadioGroup';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ratingVariants } from './rating.styles';
const RatingStarIcon = (props) => (_jsx("svg", { "aria-hidden": "true", fill: "currentColor", viewBox: "0 0 16 16", xmlns: "http://www.w3.org/2000/svg", ...props, children: _jsx("path", { d: "M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667l3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z" }) }));
const RatingContext = createContext({
    hoveredValue: null,
    onItemHoverEnd: () => { },
    onItemHoverStart: () => { },
    value: 0,
    isReadOnly: false,
    slots: {},
});
const RatingRoot = ({ children, className, defaultValue, icon, isReadOnly, onValueChange, size = 'md', value: valueProp, ...props }) => {
    const slots = useMemo(() => ratingVariants({ size }), [size]);
    const [hoveredValue, setHoveredValue] = useState(null);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const hoverTimeoutRef = useRef(undefined);
    const value = valueProp ?? internalValue ?? 0;
    const onItemHoverStart = useCallback((v) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = undefined;
        }
        setHoveredValue(v);
    }, []);
    const onItemHoverEnd = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredValue(null);
        }, 50);
    }, []);
    const contextValue = useMemo(() => ({
        hoveredValue,
        icon,
        isReadOnly: isReadOnly || false,
        onItemHoverEnd,
        onItemHoverStart,
        slots,
        value,
    }), [
        hoveredValue,
        icon,
        isReadOnly,
        onItemHoverEnd,
        onItemHoverStart,
        slots,
        value,
    ]);
    return (_jsx(RatingContext.Provider, { value: contextValue, children: _jsx(RadioGroupPrimitive, { isReadOnly: isReadOnly, orientation: "horizontal", ...props, className: composeTwRenderProps(className, slots?.base()), "data-readonly": isReadOnly || undefined, "data-slot": "rating", defaultValue: defaultValue != null ? String(defaultValue) : undefined, value: valueProp != null ? String(Math.floor(valueProp)) : undefined, onChange: (v) => {
                const num = Number(v);
                setInternalValue(num);
                onValueChange?.(num);
            }, children: (renderProps) => (_jsx(_Fragment, { children: typeof children === 'function' ? children(renderProps) : children })) }) }));
};
const RatingItem = ({ children, className, value: itemValue, ...props }) => {
    const ctx = useContext(RatingContext);
    const numericValue = itemValue;
    const isActive = ctx.hoveredValue !== null
        ? numericValue <= ctx.hoveredValue
        : numericValue <= Math.floor(ctx.value);
    const partialPercent = !isActive &&
        ctx.isReadOnly &&
        ctx.hoveredValue === null &&
        numericValue - 1 < ctx.value &&
        ctx.value < numericValue
        ? Math.round(100 * (ctx.value - (numericValue - 1)))
        : null;
    const isPartial = partialPercent !== null;
    if (typeof children === 'function') {
        return (_jsx(RadioPrimitive, { "aria-label": `${itemValue} star${itemValue !== 1 ? 's' : ''}`, ...props, className: composeTwRenderProps(className, ctx.slots?.item()), "data-active": isActive || undefined, "data-readonly": ctx.isReadOnly || undefined, "data-slot": "rating-item", value: String(itemValue), onHoverEnd: (e) => {
                ctx.onItemHoverEnd();
                props.onHoverEnd?.(e);
            }, onHoverStart: (e) => {
                ctx.onItemHoverStart(numericValue);
                props.onHoverStart?.(e);
            }, children: children({
                isActive: isActive || isPartial,
                isPartial,
                partialPercent: partialPercent || 0,
            }) }));
    }
    const icon = children ?? ctx.icon ?? _jsx(RatingStarIcon, {});
    return (_jsxs(RadioPrimitive, { "aria-label": `${itemValue} star${itemValue !== 1 ? 's' : ''}`, ...props, className: composeTwRenderProps(className, ctx.slots?.item()), "data-active": isActive || undefined, "data-readonly": ctx.isReadOnly || undefined, "data-slot": "rating-item", value: String(itemValue), onHoverEnd: (e) => {
            ctx.onItemHoverEnd();
            props.onHoverEnd?.(e);
        }, onHoverStart: (e) => {
            ctx.onItemHoverStart(numericValue);
            props.onHoverStart?.(e);
        }, children: [_jsx("span", { className: composeSlotClassName(ctx.slots?.icon), "data-slot": "rating-icon", children: icon }), isPartial && (_jsx("span", { className: composeSlotClassName(ctx.slots?.iconPartial), "data-slot": "rating-icon-partial", style: { '--rating-partial': `${partialPercent}%` }, children: icon }))] }));
};
export { RatingItem, RatingRoot, RatingStarIcon };
//# sourceMappingURL=rating.js.map