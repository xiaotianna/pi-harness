'use client';
import { useEffect, useLayoutEffect } from 'react';
import { isIOS } from './browser';
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
function chain(...fns) {
    return (...args) => {
        for (const fn of fns) {
            if (typeof fn === 'function')
                fn(...args);
        }
    };
}
const visualViewport = typeof document !== 'undefined' && window.visualViewport;
export function isScrollable(node) {
    const style = window.getComputedStyle(node);
    return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}
export function getScrollParent(node) {
    let current = node;
    if (isScrollable(current)) {
        current = current.parentElement;
    }
    while (current && !isScrollable(current)) {
        current = current.parentElement;
    }
    return current || document.scrollingElement || document.documentElement;
}
const INPUT_TYPES_NOT_TO_REPOSITION = new Set([
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'image',
    'button',
    'submit',
    'reset',
]);
export function isInput(target) {
    return ((target instanceof HTMLInputElement &&
        !INPUT_TYPES_NOT_TO_REPOSITION.has(target.type)) ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable));
}
let removeScrollFn;
let lockCount = 0;
export function usePreventScroll(options = {}) {
    const { isDisabled } = options;
    useIsomorphicLayoutEffect(() => {
        if (isDisabled)
            return;
        lockCount++;
        if (lockCount === 1 && isIOS()) {
            removeScrollFn = lockScrollForIOS();
        }
        return () => {
            lockCount--;
            if (lockCount === 0) {
                removeScrollFn?.();
            }
        };
    }, [isDisabled]);
}
function setStyle(el, prop, value) {
    const style = el.style;
    const original = style[prop] ?? '';
    style[prop] = value;
    return () => {
        style[prop] = original;
    };
}
function addListener(el, type, handler, options) {
    el.addEventListener(type, handler, options);
    return () => {
        el.removeEventListener(type, handler, options);
    };
}
function scrollIntoView(target) {
    const scrollable = document.scrollingElement || document.documentElement;
    for (let el = target; el && el !== scrollable;) {
        const parent = getScrollParent(el);
        if (parent !== document.documentElement &&
            parent !== document.body &&
            parent !== el) {
            const parentTop = parent.getBoundingClientRect().top;
            const elTop = el.getBoundingClientRect().top;
            if (el.getBoundingClientRect().bottom >
                parent.getBoundingClientRect().bottom + 24) {
                parent.scrollTop += elTop - parentTop;
            }
        }
        el = parent.parentElement;
    }
}
function lockScrollForIOS() {
    let scrollParent = null;
    let lastY = 0;
    const pageX = window.pageXOffset;
    const pageY = window.pageYOffset;
    const restoreOverflow = chain(setStyle(document.documentElement, 'paddingRight', `${window.innerWidth - document.documentElement.clientWidth}px`), setStyle(document.documentElement, 'overflow', 'hidden'));
    window.scrollTo(0, 0);
    const removeListeners = chain(addListener(document, 'touchstart', (e) => {
        const te = e;
        scrollParent = getScrollParent(te.target);
        if (scrollParent === document.documentElement ||
            scrollParent === document.body)
            return;
        const touch = te.changedTouches[0];
        if (!touch)
            return;
        lastY = touch.pageY;
    }, { capture: true, passive: false }), addListener(document, 'touchmove', (e) => {
        const te = e;
        if (!scrollParent ||
            scrollParent === document.documentElement ||
            scrollParent === document.body) {
            te.preventDefault();
            return;
        }
        const touch = te.changedTouches[0];
        if (!touch)
            return;
        const y = touch.pageY;
        const scrollTop = scrollParent.scrollTop;
        const maxScroll = scrollParent.scrollHeight -
            scrollParent.clientHeight;
        if (maxScroll !== 0) {
            if ((scrollTop <= 0 && y > lastY) ||
                (scrollTop >= maxScroll && y < lastY)) {
                te.preventDefault();
            }
            lastY = y;
        }
    }, { capture: true, passive: false }), addListener(document, 'touchend', (e) => {
        const te = e;
        const target = te.target;
        if (isInput(target) && target !== document.activeElement) {
            te.preventDefault();
            target.style.transform = 'translateY(-2000px)';
            target.focus();
            requestAnimationFrame(() => {
                target.style.transform = '';
            });
        }
    }, { capture: true, passive: false }), addListener(document, 'focus', (e) => {
        const target = e.target;
        if (isInput(target)) {
            target.style.transform = 'translateY(-2000px)';
            requestAnimationFrame(() => {
                target.style.transform = '';
                if (visualViewport) {
                    if (visualViewport.height < window.innerHeight) {
                        requestAnimationFrame(() => scrollIntoView(target));
                    }
                    else {
                        visualViewport.addEventListener('resize', () => scrollIntoView(target), { once: true });
                    }
                }
            });
        }
    }, true), addListener(window, 'scroll', () => {
        window.scrollTo(0, 0);
    }));
    return () => {
        restoreOverflow();
        removeListeners();
        window.scrollTo(pageX, pageY);
    };
}
export { useIsomorphicLayoutEffect };
//# sourceMappingURL=use-prevent-scroll.js.map