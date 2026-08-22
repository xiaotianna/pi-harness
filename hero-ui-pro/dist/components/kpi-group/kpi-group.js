'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { kpiGroupVariants } from './kpi-group.styles';
const KPIGroupContext = createContext({});
const KPIGroupRoot = ({ children, className, orientation, ...props }) => {
    const slots = useMemo(() => kpiGroupVariants({ orientation }), [orientation]);
    return (_jsx(KPIGroupContext.Provider, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "kpi-group", role: "group", ...props, children: children }) }));
};
const KPIGroupSeparator = ({ className, ...props }) => {
    const { slots } = useContext(KPIGroupContext);
    return (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.separator, className), "data-slot": "kpi-group-separator", ...props }));
};
export { KPIGroupRoot, KPIGroupSeparator };
//# sourceMappingURL=kpi-group.js.map