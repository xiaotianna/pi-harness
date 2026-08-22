'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { dom } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { textShimmerVariants } from './text-shimmer.styles';
const TextShimmer = ({ children, className, ...props }) => {
    const slots = useMemo(() => textShimmerVariants(), []);
    return (_jsx(dom.span, { className: composeSlotClassName(slots?.base, className), "data-slot": "text-shimmer", ...props, children: children }));
};
export { TextShimmer };
//# sourceMappingURL=text-shimmer.js.map