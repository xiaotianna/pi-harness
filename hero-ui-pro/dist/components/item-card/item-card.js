'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { dom } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { itemCardVariants } from './item-card.styles';
const ItemCardContext = createContext({});
const ItemCardRoot = ({ children, className, variant = 'default', ...props }) => {
    const slots = useMemo(() => itemCardVariants({ variant }), [variant]);
    return (_jsx(ItemCardContext.Provider, { value: { slots }, children: _jsx(dom.div, { className: composeSlotClassName(slots?.base, className), "data-slot": "item-card", ...props, children: children }) }));
};
const ItemCardIcon = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.icon, className), "data-slot": "item-card-icon", ...props, children: children }));
};
const ItemCardContent = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "item-card-content", ...props, children: children }));
};
const ItemCardTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.title, className), "data-slot": "item-card-title", ...props, children: children }));
};
const ItemCardDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.description, className), "data-slot": "item-card-description", ...props, children: children }));
};
const ItemCardAction = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.action, className), "data-slot": "item-card-action", ...props, children: children }));
};
export { ItemCardAction, ItemCardContent, ItemCardDescription, ItemCardIcon, ItemCardRoot, ItemCardTitle, };
//# sourceMappingURL=item-card.js.map