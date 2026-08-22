'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { chatAttachmentGroupVariants } from './chat-attachment.styles';
export const ChatAttachmentGroupRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => chatAttachmentGroupVariants(), []);
    return (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "chat-attachment-group", ...props, children: children }));
};
//# sourceMappingURL=chat-attachment-group.js.map