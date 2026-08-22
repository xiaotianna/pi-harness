'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion, } from 'motion/react';
import * as m from 'motion/react-m';
import { codeToHtml } from 'shiki';
import { Button } from '@heroui/react';
import { composeSlotClassName } from '../../utils/compose';
import { Check, Copy } from '../icons';
import { codeBlockVariants } from './code-block.styles';
const CodeBlockContext = createContext({});
// ── Components ───────────────────────────────────────────────────────────────
export const CodeBlockRoot = ({ children, className, ...props }) => {
    const slots = useMemo(() => codeBlockVariants(), []);
    return (_jsx(CodeBlockContext, { value: { slots }, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "code-block", ...props, children: children }) }));
};
export const CodeBlockHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(CodeBlockContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.header, className), "data-slot": "code-block-header", ...props, children: children }));
};
export const CodeBlockCode = ({ className, code, darkTheme, language = 'plaintext', theme, ...props }) => {
    const { slots } = useContext(CodeBlockContext);
    const lightTheme = theme ?? 'github-light';
    const resolvedDarkTheme = darkTheme ?? (theme ? undefined : 'github-dark');
    const cacheKey = `${language}:${lightTheme}:${resolvedDarkTheme ?? 'none'}:${code}`;
    const [highlighted, setHighlighted] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function highlight() {
            if (!code) {
                if (!cancelled)
                    setHighlighted({ html: '<pre><code></code></pre>', key: cacheKey });
                return;
            }
            try {
                const html = resolvedDarkTheme
                    ? await codeToHtml(code, {
                        defaultColor: false,
                        lang: language,
                        themes: { dark: resolvedDarkTheme, light: lightTheme },
                    })
                    : await codeToHtml(code, { lang: language, theme: lightTheme });
                if (!cancelled)
                    setHighlighted({ html, key: cacheKey });
            }
            catch {
                if (!cancelled)
                    setHighlighted(null);
            }
        }
        void highlight();
        return () => {
            cancelled = true;
        };
    }, [resolvedDarkTheme, code, cacheKey, language, lightTheme]);
    const composedClassName = composeSlotClassName(slots?.code, className);
    if (highlighted?.key === cacheKey) {
        return (_jsx("div", { className: composedClassName, dangerouslySetInnerHTML: { __html: highlighted.html }, "data-slot": "code-block-code", ...props }));
    }
    return (_jsx("div", { className: composedClassName, "data-slot": "code-block-code", ...props, children: _jsx("pre", { children: _jsx("code", { children: code }) }) }));
};
export const CodeBlockCopyButton = ({ 'aria-label': ariaLabel = 'Copy code', className, code, }) => {
    const { slots } = useContext(CodeBlockContext);
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();
    useEffect(() => () => {
        if (timeoutRef.current !== null)
            clearTimeout(timeoutRef.current);
    }, []);
    const motionProps = prefersReducedMotion
        ? {
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            initial: { opacity: 0 },
            transition: { duration: 0.12 },
        }
        : {
            animate: { filter: 'blur(0px)', opacity: 1, scale: 1 },
            exit: { filter: 'blur(4px)', opacity: 0, scale: 0.25 },
            initial: { filter: 'blur(4px)', opacity: 0, scale: 0.25 },
            transition: { bounce: 0, duration: 0.3, type: 'spring' },
        };
    const IconComponent = copied ? Check : Copy;
    return (_jsx(Button, { isIconOnly: true, "aria-label": ariaLabel, className: composeSlotClassName(slots?.copyButton, className), "data-slot": "code-block-copy-button", size: "sm", variant: "ghost", onPress: async () => {
            try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                if (timeoutRef.current !== null)
                    clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    setCopied(false);
                    timeoutRef.current = null;
                }, 2000);
            }
            catch {
                // clipboard write failed — silently ignore
            }
        }, children: _jsx(LazyMotion, { features: domAnimation, children: _jsx(AnimatePresence, { initial: false, mode: "popLayout", children: _jsx(m.span, { className: "size-3.5 flex items-center justify-center", "data-slot": "code-block-copy-button-icon-motion", ...motionProps, children: _jsx(IconComponent, { className: "size-3.5" }) }, copied ? 'check' : 'copy') }) }) }));
};
//# sourceMappingURL=code-block.js.map