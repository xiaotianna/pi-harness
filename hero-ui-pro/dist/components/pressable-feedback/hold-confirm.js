'use client';
import { useCallback, useEffect, useRef, useState, } from 'react';
import { jsx } from 'react/jsx-runtime';
export const HoldConfirm = ({ children, className = '', duration = 2000, isDisabled = false, onComplete, releaseDuration = 200, resetOnComplete = true, style, sweep = 'right', }) => {
    const ref = useRef(null);
    const [isHolding, setIsHolding] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef(undefined);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    const isParentDisabled = useCallback(() => {
        const parent = ref.current?.parentElement;
        return parent?.disabled || parent?.getAttribute('aria-disabled') === 'true';
    }, []);
    const isFromChildInteractive = useCallback((e) => {
        const parent = ref.current?.parentElement;
        const target = e.target;
        if (!parent || !target || target === parent)
            return false;
        const closest = target.closest("a,button,input,select,textarea,[role='button']");
        return !!closest && closest !== parent && parent.contains(closest);
    }, []);
    const startHold = useCallback((e) => {
        if (isDisabled || isParentDisabled())
            return;
        if (e instanceof PointerEvent) {
            if (!e.isPrimary || isFromChildInteractive(e))
                return;
        }
        else if (e instanceof KeyboardEvent) {
            if (e.key !== ' ' && e.key !== 'Enter')
                return;
            if (e.repeat)
                return;
        }
        setIsHolding(true);
        setIsComplete(false);
        timerRef.current = setTimeout(() => {
            setIsComplete(true);
            onCompleteRef.current?.();
            if (resetOnComplete) {
                setIsComplete(false);
                setIsHolding(false);
            }
        }, duration);
    }, [
        duration,
        resetOnComplete,
        isDisabled,
        isParentDisabled,
        isFromChildInteractive,
    ]);
    const cancelHold = useCallback(() => {
        clearTimeout(timerRef.current);
        setIsHolding(false);
    }, []);
    const handleKeyUp = useCallback((e) => {
        if (e instanceof KeyboardEvent && (e.key === ' ' || e.key === 'Enter')) {
            cancelHold();
        }
    }, [cancelHold]);
    useEffect(() => {
        const parent = ref.current?.parentElement;
        if (!parent)
            return;
        const add = (type, handler) => parent.addEventListener(type, handler, true);
        add('pointerdown', startHold);
        add('pointerup', cancelHold);
        add('pointerleave', cancelHold);
        add('pointercancel', cancelHold);
        add('keydown', startHold);
        add('keyup', handleKeyUp);
        add('blur', cancelHold);
        return () => {
            const remove = (type, handler) => parent.removeEventListener(type, handler, true);
            remove('pointerdown', startHold);
            remove('pointerup', cancelHold);
            remove('pointerleave', cancelHold);
            remove('pointercancel', cancelHold);
            remove('keydown', startHold);
            remove('keyup', handleKeyUp);
            remove('blur', cancelHold);
        };
    }, [startHold, handleKeyUp, cancelHold]);
    useEffect(() => () => clearTimeout(timerRef.current), []);
    return jsx('div', {
        ref,
        'aria-hidden': 'true',
        className: 'pressable-feedback__hold-confirm' + (className ? ` ${className}` : ''),
        'data-complete': isComplete || undefined,
        'data-holding': isHolding || undefined,
        'data-slot': 'pressable-feedback-hold-confirm',
        'data-sweep': sweep,
        style: {
            '--pressable-feedback-hold-confirm-duration': `${duration}ms`,
            '--pressable-feedback-hold-confirm-release-duration': `${releaseDuration}ms`,
            ...style,
        },
        children,
    });
};
//# sourceMappingURL=hold-confirm.js.map