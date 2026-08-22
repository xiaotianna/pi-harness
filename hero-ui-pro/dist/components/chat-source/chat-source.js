'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo } from 'react';
import { cx } from 'tailwind-variants';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { HoverCard } from '../hover-card/index';
import { FileText } from '../icons';
import { chatSourceVariants } from './chat-source.styles';
export function extractSourceDomain(href) {
    try {
        return new URL(href).hostname.replace(/^www\./, '');
    }
    catch {
        return href.split('/').pop() || href;
    }
}
function getInitial(text) {
    return text.trim().charAt(0).toUpperCase() || '?';
}
const ChatSourceContext = createContext({
    enablePreview: false,
    slots: chatSourceVariants(),
    sourceType: 'url',
});
const useChatSourceContext = () => useContext(ChatSourceContext);
const useSlots = () => {
    const { slots } = useChatSourceContext();
    const fallback = useMemo(() => chatSourceVariants(), []);
    return slots ?? fallback;
};
// ─── Components ───────────────────────────────────────────────────────────────
export const ChatSourceRoot = ({ children, className, description, enablePreview: enablePreviewProp, faviconUrl, href, sourceType = href ? 'url' : 'document', title, ...props }) => {
    const slots = useMemo(() => chatSourceVariants(), []);
    const domain = href ? extractSourceDomain(href) : undefined;
    const enablePreview = sourceType === 'url' &&
        Boolean(href) &&
        (enablePreviewProp ?? Boolean(description || title));
    const contextValue = useMemo(() => ({
        description,
        domain,
        enablePreview,
        faviconUrl,
        href,
        slots,
        sourceType,
        title,
    }), [
        description,
        domain,
        enablePreview,
        faviconUrl,
        href,
        slots,
        sourceType,
        title,
    ]);
    const body = children ?? (_jsxs(_Fragment, { children: [_jsx(ChatSourceTrigger, {}), enablePreview ? (_jsx(ChatSourcePreview, { description: description, title: title })) : null] }));
    const rootEl = (_jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "chat-source", "data-source-type": sourceType, ...props, children: body }));
    return (_jsx(ChatSourceContext.Provider, { value: contextValue, children: enablePreview ? (_jsx(HoverCard, { closeDelay: 0, openDelay: 150, children: rootEl })) : (rootEl) }));
};
export const ChatSourceTrigger = ({ children, className, label, ...props }) => {
    const { domain, enablePreview, href, sourceType, title } = useChatSourceContext();
    const slots = chatSourceVariants();
    const isUrl = sourceType === 'url' && href;
    const inner = children ??
        label ??
        (isUrl ? (_jsxs(_Fragment, { children: [_jsx(ChatSourceIcon, {}), _jsx(ChatSourceTitle, { children: title ?? domain })] })) : (_jsxs(_Fragment, { children: [_jsx(ChatSourceDocumentIcon, {}), _jsx(ChatSourceTitle, { children: title })] })));
    const triggerClass = composeSlotClassName(slots?.trigger, className);
    if (isUrl) {
        const link = (_jsx("a", { className: composeSlotClassName(slots?.triggerLink, undefined), href: href, rel: "noopener noreferrer", target: "_blank", ...props, children: inner }));
        return (_jsx("span", { className: triggerClass, "data-slot": "chat-source-trigger", children: enablePreview ? _jsx(HoverCard.Trigger, { children: link }) : link }));
    }
    return (_jsx("span", { className: triggerClass, "data-slot": "chat-source-trigger", children: _jsx("span", { className: composeSlotClassName(slots?.triggerLink, undefined), ...props, children: inner }) }));
};
export const ChatSourceIcon = ({ children, className, faviconUrl, }) => {
    const { domain, faviconUrl: ctxFavicon, href, title, } = useChatSourceContext();
    const slots = chatSourceVariants();
    const altText = title ?? domain ?? href ?? 'Source';
    const resolvedFavicon = faviconUrl ?? ctxFavicon;
    if (children && React.isValidElement(children)) {
        return React.cloneElement(children, {
            className: cx(composeSlotClassName(slots?.icon, className), children.props
                .className),
            'data-slot': 'chat-source-icon',
        });
    }
    return resolvedFavicon ? (_jsx("img", { alt: "", className: composeSlotClassName(slots?.icon, className), "data-slot": "chat-source-icon", height: 14, src: resolvedFavicon, width: 14 })) : (_jsx("span", { "aria-hidden": "true", className: composeSlotClassName(slots?.iconFallback, className), "data-slot": "chat-source-icon-fallback", children: getInitial(altText) }));
};
export const ChatSourceDocumentIcon = ({ className, }) => {
    const slots = chatSourceVariants();
    return (_jsx(FileText, { className: composeSlotClassName(slots?.documentIcon, className), "data-slot": "chat-source-document-icon" }));
};
export const ChatSourceTitle = ({ children, className, ...props }) => {
    const { domain, title } = useChatSourceContext();
    const slots = chatSourceVariants();
    return (_jsx("span", { className: composeSlotClassName(slots?.title, className), "data-slot": "chat-source-title", ...props, children: children ?? title ?? domain }));
};
export const ChatSourcePreview = ({ children, className, description, title, ...props }) => {
    const { description: ctxDescription, domain, enablePreview, href, title: ctxTitle, } = useChatSourceContext();
    const slots = chatSourceVariants();
    if (!href || !enablePreview)
        return null;
    return (_jsx(HoverCard.Content, { className: composeTwRenderProps(className, slots?.preview()), "data-slot": "chat-source-preview", offset: 8, placement: "top", ...props, children: children ?? (_jsxs("a", { className: composeSlotClassName(slots?.previewLink, undefined), href: href, rel: "noopener noreferrer", target: "_blank", children: [_jsxs("div", { className: composeSlotClassName(slots?.previewHeader, undefined), children: [_jsx(ChatSourceIcon, {}), _jsx("span", { className: "text-foreground text-sm truncate", children: domain })] }), (title ?? ctxTitle) && (_jsx("div", { className: composeSlotClassName(slots?.previewTitle, undefined), children: title ?? ctxTitle })), (description ?? ctxDescription) && (_jsx("div", { className: composeSlotClassName(slots?.previewDescription, undefined), children: description ?? ctxDescription }))] })) }));
};
//# sourceMappingURL=chat-source.js.map