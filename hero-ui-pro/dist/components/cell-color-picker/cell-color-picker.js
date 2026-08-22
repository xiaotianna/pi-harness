'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { ColorPickerStateContext } from 'react-aria-components/ColorPicker';
import { ColorPicker, ColorSwatch } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { cellColorPickerVariants } from './cell-color-picker.styles';
const CellColorPickerCtx = createContext({});
// ─── Components ───────────────────────────────────────────────────────────────
export const CellColorPickerRoot = ({ children, className, variant = 'default', ...props }) => {
    const slots = useMemo(() => cellColorPickerVariants({ variant }), [variant]);
    return (_jsx(CellColorPickerCtx.Provider, { value: { slots }, children: _jsx(ColorPicker, { className: composeSlotClassName(slots?.base, className), ...props, children: children }) }));
};
export const CellColorPickerTrigger = ({ children, className, ...props }) => {
    const { slots } = useContext(CellColorPickerCtx);
    return (_jsx(ButtonPrimitive, { className: composeTwRenderProps(className, slots?.trigger()), "data-slot": "cell-color-picker-trigger", ...props, children: (renderProps) => typeof children === 'function' ? children(renderProps) : children }));
};
export const CellColorPickerLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(CellColorPickerCtx);
    return (_jsx("span", { className: composeSlotClassName(slots?.label, className), "data-slot": "cell-color-picker-label", ...props, children: children }));
};
export const CellColorPickerValueDisplay = ({ children, className, ...props }) => {
    const { slots } = useContext(CellColorPickerCtx);
    const colorState = useContext(ColorPickerStateContext);
    const displayValue = colorState?.color
        ? colorState.color.toString('hex').toUpperCase()
        : '';
    return (_jsx("span", { className: composeSlotClassName(slots?.valueDisplay, className), "data-slot": "cell-color-picker-value-display", ...props, children: children ?? displayValue }));
};
export const CellColorPickerSwatch = ({ className, ...props }) => {
    const { slots } = useContext(CellColorPickerCtx);
    return (_jsx(ColorSwatch, { className: composeTwRenderProps(className, slots?.swatch()), "data-slot": "cell-color-picker-swatch", ...props }));
};
export const CellColorPickerPopover = ({ children, className, placement = 'bottom end', ...props }) => {
    const { slots } = useContext(CellColorPickerCtx);
    const composedClassName = composeSlotClassName(slots?.popover, className);
    return (_jsx(ColorPicker.Popover, { className: composedClassName, "data-slot": "cell-color-picker-popover", placement: placement, ...props, children: children }));
};
//# sourceMappingURL=cell-color-picker.js.map