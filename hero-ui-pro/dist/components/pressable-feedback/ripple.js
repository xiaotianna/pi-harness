'use client';
import { useCallback, useEffect, useRef, useState, } from 'react';
import { jsx } from 'react/jsx-runtime';
export const Ripple = ({ className = '', duration = 150, easing, hoverOpacity, isDisabled = false, minimumPressDuration = 225, pressedOpacity, style, touchDelay = 150, }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const containerRef = useRef(null);
    const surfaceRef = useRef(null);
    const rippleSize = useRef('');
    const rippleScale = useRef('');
    const rippleOffset = useRef(0);
    const animationRef = useRef(undefined);
    const activePointerRef = useRef(0);
    const activePointerEventRef = useRef(undefined);
    const touchStartedRef = useRef(false);
    // Apply CSS custom properties for opacity/duration overrides
    useEffect(() => {
        if (!surfaceRef.current)
            return;
        const el = surfaceRef.current.style;
        if (hoverOpacity !== undefined)
            el.setProperty('--pressable-feedback-ripple-hover-opacity', String(hoverOpacity));
        if (pressedOpacity !== undefined)
            el.setProperty('--pressable-feedback-ripple-pressed-opacity', String(pressedOpacity));
        if (duration !== undefined && duration !== 150)
            el.setProperty('--pressable-feedback-ripple-duration', `${duration}ms`);
    }, [hoverOpacity, pressedOpacity, duration]);
    const isTouch = useCallback(({ pointerType }) => pointerType === 'touch', []);
    const isFromChildInteractive = useCallback((e) => {
        const parent = containerRef.current?.parentElement;
        const target = e.target;
        if (!parent || !target || target === parent)
            return false;
        const closest = target.closest("a,button,input,select,textarea,[role='button']");
        return !!closest && closest !== parent && parent.contains(closest);
    }, []);
    const shouldHandle = useCallback((e) => {
        if (isDisabled ||
            containerRef.current?.parentElement?.disabled)
            return false;
        if (!e.isPrimary)
            return false;
        if (activePointerEventRef.current &&
            activePointerEventRef.current.pointerId !== e.pointerId)
            return false;
        if (e.type === 'pointerenter' || e.type === 'pointerleave')
            return !isTouch(e);
        return !isFromChildInteractive(e) && (isTouch(e) || e.buttons === 1);
    }, [isDisabled, isTouch, isFromChildInteractive]);
    const isInsideBounds = useCallback(({ x, y }) => {
        const el = containerRef.current;
        if (!el)
            return false;
        const rect = el.getBoundingClientRect();
        return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    }, []);
    const computeRippleDimensions = useCallback(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const { height, width } = el.getBoundingClientRect();
        const maxDim = Math.max(height, width);
        const size = Math.max(0.35 * maxDim, 75);
        const offset = Math.floor(0.2 * maxDim);
        const scale = (Math.sqrt(width ** 2 + height ** 2) + 12 + size) / offset;
        rippleOffset.current = offset;
        rippleScale.current = String(scale);
        rippleSize.current = `${offset}px`;
    }, []);
    const getPointerPosition = useCallback((e) => {
        const el = containerRef.current;
        if (!el)
            return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return {
            x: e.pageX - (window.scrollX + rect.left),
            y: e.pageY - (window.scrollY + rect.top),
        };
    }, []);
    const getRipplePoints = useCallback((e) => {
        const parent = containerRef.current?.parentElement;
        if (!parent)
            return { endPoint: { x: 0, y: 0 }, startPoint: { x: 0, y: 0 } };
        const { width, height } = parent.getBoundingClientRect();
        const endPoint = {
            x: (width - rippleOffset.current) / 2,
            y: (height - rippleOffset.current) / 2,
        };
        return { endPoint, startPoint: e ? getPointerPosition(e) : endPoint };
    }, [getPointerPosition]);
    const animateRipple = useCallback((e) => {
        const surface = surfaceRef.current;
        if (!surface)
            return;
        setIsPressed(true);
        animationRef.current?.cancel();
        computeRippleDimensions();
        const { endPoint, startPoint } = getRipplePoints(e);
        animationRef.current = surface.animate({
            height: [rippleSize.current, rippleSize.current],
            transform: [
                `translate(${startPoint.x}px,${startPoint.y}px) scale(1)`,
                `translate(${endPoint.x}px,${endPoint.y}px) scale(${rippleScale.current})`,
            ],
            width: [rippleSize.current, rippleSize.current],
        }, { duration, easing, fill: 'forwards', pseudoElement: '::after' });
    }, [computeRippleDimensions, getRipplePoints, duration, easing]);
    const finishPress = useCallback(() => {
        activePointerEventRef.current = undefined;
        activePointerRef.current = 0;
        const anim = animationRef.current;
        let elapsed = Infinity;
        if (typeof anim?.currentTime === 'number') {
            elapsed = anim.currentTime;
        }
        else if (anim?.currentTime) {
            elapsed = anim.currentTime.to('ms').value;
        }
        if (elapsed >= minimumPressDuration) {
            setIsPressed(false);
        }
        else {
            setTimeout(() => {
                if (animationRef.current === anim)
                    setIsPressed(false);
            }, minimumPressDuration - elapsed);
        }
    }, [minimumPressDuration]);
    const handlePointerEnter = useCallback((e) => {
        if (shouldHandle(e))
            setIsHovered(true);
    }, [shouldHandle]);
    const handlePointerLeave = useCallback((e) => {
        if (shouldHandle(e)) {
            setIsHovered(false);
            if (activePointerRef.current !== 0)
                finishPress();
        }
    }, [shouldHandle, finishPress]);
    const handlePointerUp = useCallback((e) => {
        if (shouldHandle(e)) {
            if (activePointerRef.current === 3) {
                finishPress();
            }
            else if (activePointerRef.current === 1) {
                activePointerRef.current = 3;
                animateRipple(activePointerEventRef.current);
            }
        }
    }, [shouldHandle, finishPress, animateRipple]);
    const handlePointerDown = useCallback((e) => {
        if (!shouldHandle(e))
            return;
        activePointerEventRef.current = e;
        if (!isTouch(e)) {
            activePointerRef.current = 3;
            animateRipple(e);
        }
        else {
            if (touchStartedRef.current && !isInsideBounds(e))
                return;
            touchStartedRef.current = false;
            activePointerRef.current = 1;
            setTimeout(() => {
                if (activePointerRef.current === 1) {
                    activePointerRef.current = 2;
                    animateRipple(e);
                }
            }, touchDelay);
        }
    }, [shouldHandle, isTouch, isInsideBounds, animateRipple, touchDelay]);
    const handleClick = useCallback((e) => {
        if (isDisabled || isFromChildInteractive(e))
            return;
        if (activePointerRef.current !== 3) {
            if (activePointerRef.current === 0) {
                animateRipple();
                finishPress();
            }
        }
        else {
            finishPress();
        }
    }, [isDisabled, isFromChildInteractive, animateRipple, finishPress]);
    const handleContextMenu = useCallback(() => {
        if (!isDisabled) {
            touchStartedRef.current = true;
            finishPress();
        }
    }, [isDisabled, finishPress]);
    const handlePointerCancel = useCallback((e) => {
        if (shouldHandle(e))
            finishPress();
    }, [shouldHandle, finishPress]);
    useEffect(() => {
        const parent = containerRef.current?.parentElement;
        if (!parent)
            return;
        const add = (type, handler) => parent.addEventListener(type, handler, true);
        add('click', handleClick);
        add('contextmenu', handleContextMenu);
        add('pointercancel', handlePointerCancel);
        add('pointerdown', handlePointerDown);
        add('pointerenter', handlePointerEnter);
        add('pointerleave', handlePointerLeave);
        add('pointerup', handlePointerUp);
        return () => {
            const remove = (type, handler) => parent.removeEventListener(type, handler, true);
            remove('click', handleClick);
            remove('contextmenu', handleContextMenu);
            remove('pointercancel', handlePointerCancel);
            remove('pointerdown', handlePointerDown);
            remove('pointerenter', handlePointerEnter);
            remove('pointerleave', handlePointerLeave);
            remove('pointerup', handlePointerUp);
        };
    }, [
        isDisabled,
        easing,
        duration,
        minimumPressDuration,
        touchDelay,
        handleClick,
        handleContextMenu,
        handlePointerCancel,
        handlePointerDown,
        handlePointerEnter,
        handlePointerLeave,
        handlePointerUp,
    ]);
    return jsx('div', {
        ref: containerRef,
        'aria-disabled': isDisabled || undefined,
        'aria-hidden': 'true',
        className: 'pressable-feedback__ripple' + (className ? ` ${className}` : ''),
        style,
        children: jsx('div', {
            ref: surfaceRef,
            className: `pressable-feedback__ripple-surface${isHovered ? ' --hover' : ''}${isPressed ? ' --press' : ''}`,
        }),
    });
};
//# sourceMappingURL=ripple.js.map