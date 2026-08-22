'use client';
import { useCallback, useEffect, useRef, useState, } from 'react';
import { jsx } from 'react/jsx-runtime';
export const ProgressFeedback = ({ autoReset = true, children, className = '', duration = 2000, isDisabled = false, onComplete, onReset, releaseDuration = 300, resetDelay = 1500, style, sweep = 'right', }) => {
    const ref = useRef(null);
    const [isProgressing, setIsProgressing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef(undefined);
    const resetTimerRef = useRef(undefined);
    const stateRef = useRef('idle');
    const onCompleteRef = useRef(onComplete);
    const onResetRef = useRef(onReset);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    useEffect(() => {
        onResetRef.current = onReset;
    }, [onReset]);
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
    const startProgress = useCallback((e) => {
        if (isDisabled || isParentDisabled() || isFromChildInteractive(e))
            return;
        if (stateRef.current !== 'idle')
            return;
        stateRef.current = 'progressing';
        setIsProgressing(true);
        setIsComplete(false);
        timerRef.current = setTimeout(() => {
            stateRef.current = 'complete';
            setIsProgressing(false);
            setIsComplete(true);
            onCompleteRef.current?.();
            if (autoReset) {
                resetTimerRef.current = setTimeout(() => {
                    stateRef.current = 'idle';
                    setIsComplete(false);
                    onResetRef.current?.();
                }, resetDelay);
            }
        }, duration);
    }, [
        isDisabled,
        isParentDisabled,
        isFromChildInteractive,
        duration,
        autoReset,
        resetDelay,
    ]);
    const handleClick = useCallback((e) => {
        startProgress(e);
    }, [startProgress]);
    const handleKeyDown = useCallback((e) => {
        if (e instanceof KeyboardEvent &&
            (e.key === ' ' || e.key === 'Enter') &&
            !e.repeat) {
            startProgress(e);
            e.preventDefault();
        }
    }, [startProgress]);
    useEffect(() => {
        const parent = ref.current?.parentElement;
        if (!parent)
            return;
        parent.addEventListener('click', handleClick, true);
        parent.addEventListener('keydown', handleKeyDown, true);
        return () => {
            parent.removeEventListener('click', handleClick, true);
            parent.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [handleClick, handleKeyDown]);
    useEffect(() => () => {
        clearTimeout(timerRef.current);
        clearTimeout(resetTimerRef.current);
    }, []);
    return jsx('div', {
        ref,
        'aria-hidden': 'true',
        className: 'pressable-feedback__progress-feedback' +
            (className ? ` ${className}` : ''),
        'data-complete': isComplete || undefined,
        'data-progressing': isProgressing || undefined,
        'data-slot': 'pressable-feedback-progress-feedback',
        'data-sweep': sweep,
        style: {
            '--pressable-feedback-progress-feedback-duration': `${duration}ms`,
            '--pressable-feedback-progress-feedback-release-duration': `${releaseDuration}ms`,
            ...style,
        },
        children,
    });
};
//# sourceMappingURL=progress-feedback.js.map