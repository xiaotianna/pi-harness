'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { dom } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { emptyStateVariants } from './empty-state.styles';
const EmptyStateContext = createContext({});
// ---- Components ----
export const EmptyStateRoot = ({ children, className, size = 'md', ...props }) => {
    const slots = useMemo(() => emptyStateVariants({ size }), [size]);
    return (_jsx(EmptyStateContext.Provider, { value: { slots }, children: _jsx(dom.div, { className: composeSlotClassName(slots?.base, className), "data-slot": "empty-state", ...props, children: children }) }));
};
export const EmptyStateHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(EmptyStateContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "empty-state-header", ...props, children: children }));
};
export const EmptyStateMedia = ({ children, className, variant = 'default', ...props }) => {
    const { slots } = useContext(EmptyStateContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.media, className), "data-slot": "empty-state-media", "data-variant": variant, ...props, children: children }));
};
export const EmptyStateTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(EmptyStateContext);
    return (_jsx("h3", { className: composeSlotClassName(slots?.title, className), "data-slot": "empty-state-title", ...props, children: children }));
};
export const EmptyStateDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(EmptyStateContext);
    return (_jsx("p", { className: composeSlotClassName(slots?.description, className), "data-slot": "empty-state-description", ...props, children: children }));
};
export const EmptyStateContent = ({ children, className, ...props }) => {
    const { slots } = useContext(EmptyStateContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "empty-state-content", ...props, children: children }));
};
//# sourceMappingURL=empty-state.js.map