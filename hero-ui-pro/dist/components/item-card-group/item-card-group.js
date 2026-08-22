'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { itemCardGroupVariants } from './item-card-group.styles';
const ItemCardGroupContext = createContext({});
const ItemCardGroupRoot = ({ children, className, columns, layout, style, variant, ...props }) => {
    const slots = useMemo(() => itemCardGroupVariants({ layout, variant }), [layout, variant]);
    const resolvedStyle = layout === 'grid' && columns
        ? { ...style, '--item-card-group-columns': columns }
        : style;
    return (_jsx(ItemCardGroupContext.Provider, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "item-card-group", role: "group", style: resolvedStyle, ...props, children: children }) }));
};
const ItemCardGroupHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardGroupContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "item-card-group-header", ...props, children: children }));
};
const ItemCardGroupTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardGroupContext);
    return (_jsx("h3", { className: composeSlotClassName(slots?.title, className), "data-slot": "item-card-group-title", ...props, children: children }));
};
const ItemCardGroupDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(ItemCardGroupContext);
    return (_jsx("p", { className: composeSlotClassName(slots?.description, className), "data-slot": "item-card-group-description", ...props, children: children }));
};
export { ItemCardGroupDescription, ItemCardGroupHeader, ItemCardGroupRoot, ItemCardGroupTitle, };
//# sourceMappingURL=item-card-group.js.map