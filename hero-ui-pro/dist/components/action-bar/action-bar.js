'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { AnimatePresence, domAnimation, LazyMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Toolbar } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { actionBarVariants } from './action-bar.styles';
const ActionBarContext = createContext({});
const ActionBarRoot = ({ 'aria-label': ariaLabel = 'Actions', children, className, isAttached = true, isOpen, orientation, ...props }) => {
    const slots = useMemo(() => actionBarVariants({}), []);
    return (_jsx(ActionBarContext.Provider, { value: { slots }, children: _jsx(LazyMotion, { features: domAnimation, children: _jsx(AnimatePresence, { children: !!isOpen && (_jsx(m.div, { animate: { filter: 'blur(0px)', opacity: 1, y: 0 }, className: composeSlotClassName(slots?.base), "data-slot": "action-bar", exit: { filter: 'blur(4px)', opacity: 0, y: 8 }, initial: { filter: 'blur(4px)', opacity: 0, y: 8 }, transition: { bounce: 0, duration: 0.3, type: 'spring' }, children: _jsx(Toolbar, { "aria-label": ariaLabel, className: composeSlotClassName(slots?.wrapper, className), isAttached: isAttached, orientation: orientation, ...props, children: children }) })) }) }) }));
};
const ActionBarPrefix = ({ children, className, ...props }) => {
    const { slots } = useContext(ActionBarContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.prefix, className), "data-slot": "action-bar-prefix", ...props, children: children }));
};
const ActionBarContent = ({ children, className, ...props }) => {
    const { slots } = useContext(ActionBarContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "action-bar-content", ...props, children: children }));
};
const ActionBarSuffix = ({ children, className, ...props }) => {
    const { slots } = useContext(ActionBarContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.suffix, className), "data-slot": "action-bar-suffix", ...props, children: children }));
};
export { ActionBarContent, ActionBarPrefix, ActionBarRoot, ActionBarSuffix };
//# sourceMappingURL=action-bar.js.map