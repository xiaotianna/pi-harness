'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { Slider } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { cellSliderVariants } from './cell-slider.styles';
const CellSliderCtx = createContext({});
// ─── Components ───────────────────────────────────────────────────────────────
export const CellSliderRoot = ({ children, className, variant = 'default', ...props }) => {
    const slots = useMemo(() => cellSliderVariants({ variant }), [variant]);
    return (_jsx(CellSliderCtx.Provider, { value: { slots }, children: _jsx(Slider, { className: composeTwRenderProps(className, slots?.base()), "data-slot": "cell-slider", orientation: "horizontal", ...props, children: children }) }));
};
export const CellSliderTrack = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSliderCtx);
    return (_jsx(Slider.Track, { className: composeTwRenderProps(className, slots?.track()), "data-slot": "cell-slider-track", ...props, children: children }));
};
export const CellSliderFill = ({ className, ...props }) => {
    const { slots } = useContext(CellSliderCtx);
    return (_jsx(Slider.Fill, { className: composeSlotClassName(slots?.fill, className), "data-slot": "cell-slider-fill", ...props }));
};
export const CellSliderThumb = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSliderCtx);
    return (_jsx(Slider.Thumb, { className: composeTwRenderProps(className, slots?.thumb()), "data-slot": "cell-slider-thumb", ...props, children: children }));
};
export const CellSliderLabel = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSliderCtx);
    return (_jsx("span", { className: composeSlotClassName(slots?.label, className), "data-slot": "cell-slider-label", ...props, children: children }));
};
export const CellSliderOutput = ({ children, className, ...props }) => {
    const { slots } = useContext(CellSliderCtx);
    return (_jsx(Slider.Output, { className: composeTwRenderProps(className, slots?.output()), "data-slot": "cell-slider-output", ...props, children: children }));
};
//# sourceMappingURL=cell-slider.js.map