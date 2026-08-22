'use client';
import React, { useMemo } from 'react';
import { BORDER_RADIUS, TRANSITIONS, WINDOW_TOP_OFFSET } from './constants';
import { useSheetContext } from './context';
import { assignStyle, chain, isVertical } from './helpers';
const noop = () => () => { };
const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : undefined;
export function useScaleBackground() {
    const { isOpen, noBodyStyles, placement, setBackgroundColorOnScale, shouldScaleBackground, } = useSheetContext();
    const timeoutRef = React.useRef(null);
    const originalBg = useMemo(() => document.body.style.backgroundColor, []);
    function getWindowScale() {
        return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
    }
    React.useEffect(() => {
        if (isOpen && shouldScaleBackground) {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
            const wrapper = document.querySelector('[data-sheet-wrapper]') ||
                document.querySelector('[sheet-wrapper]');
            if (!wrapper)
                return undefined;
            const reduced = prefersReducedMotion?.matches;
            const duration = reduced ? '0.01ms' : `${TRANSITIONS.DURATION}s`;
            chain(setBackgroundColorOnScale && !noBodyStyles
                ? assignStyle(document.body, { background: 'black' })
                : noop, assignStyle(wrapper, {
                transformOrigin: isVertical(placement) ? 'top' : 'left',
                transitionDuration: duration,
                transitionProperty: 'transform, border-radius',
                transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
            }))();
            const restore = assignStyle(wrapper, {
                borderRadius: `${BORDER_RADIUS}px`,
                overflow: 'hidden',
                ...(isVertical(placement)
                    ? {
                        transform: `scale(${getWindowScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
                    }
                    : {
                        transform: `scale(${getWindowScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
                    }),
            });
            return () => {
                restore();
                timeoutRef.current = setTimeout(() => {
                    if (originalBg) {
                        document.body.style.background = originalBg;
                    }
                    else {
                        document.body.style.removeProperty('background');
                    }
                }, 1000 * TRANSITIONS.DURATION);
            };
        }
        return undefined;
    }, [
        isOpen,
        shouldScaleBackground,
        originalBg,
        setBackgroundColorOnScale,
        noBodyStyles,
        placement,
    ]);
}
//# sourceMappingURL=use-scale-background.js.map