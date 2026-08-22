'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import React, { useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { Button as HeroUIButton, ScrollShadow } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { ChevronLeft, ChevronRight } from '../icons';
import { carouselVariants } from './carousel.styles';
import { CarouselContext } from './carousel-context';
// ─── Components ───────────────────────────────────────────────────────────────
export const CarouselRoot = ({ children, className, opts, plugins, setApi, type = 'in-place', ...props }) => {
    const [viewportWrapper, setViewportWrapperState] = useState(null);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnapCount, setScrollSnapCount] = useState(0);
    const [direction, setDirection] = useState('ltr');
    const syncDirection = useCallback((el) => {
        if (el) {
            setDirection(getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr');
        }
    }, []);
    const setViewportWrapper = useCallback((el) => {
        setViewportWrapperState(el);
        syncDirection(el);
    }, [syncDirection]);
    const emblaOpts = useMemo(() => ({ ...opts, direction: opts?.direction ?? direction }), [opts, direction]);
    const [emblaRef, emblaApi] = useEmblaCarousel(emblaOpts, plugins);
    const slots = useMemo(() => carouselVariants({ type }), [type]);
    const updateScrollState = useCallback((api) => {
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
        setSelectedIndex(api.selectedScrollSnap());
        setScrollSnapCount(api.scrollSnapList().length);
    }, []);
    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((index) => emblaApi?.scrollTo(index), [emblaApi]);
    useEffect(() => {
        if (emblaApi && setApi)
            setApi(emblaApi);
    }, [emblaApi, setApi]);
    useEffect(() => {
        if (!viewportWrapper)
            return;
        const observer = new MutationObserver(() => syncDirection(viewportWrapper));
        observer.observe(document.documentElement, {
            attributeFilter: ['dir'],
            attributes: true,
            subtree: true,
        });
        return () => observer.disconnect();
    }, [viewportWrapper, syncDirection]);
    useEffect(() => {
        if (!emblaApi)
            return;
        updateScrollState(emblaApi);
        emblaApi.on('reInit', updateScrollState);
        emblaApi.on('select', updateScrollState);
        return () => {
            emblaApi.off('select', updateScrollState);
            emblaApi.off('reInit', updateScrollState);
        };
    }, [emblaApi, updateScrollState]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollPrev();
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollNext();
        }
    }, [scrollPrev, scrollNext]);
    const contextValue = useMemo(() => ({
        api: emblaApi,
        canScrollNext,
        canScrollPrev,
        emblaRef,
        scrollNext,
        scrollPrev,
        scrollSnapCount,
        scrollTo,
        selectedIndex,
        setViewportWrapper,
        slots,
        type: (type ?? 'in-place'),
        viewportWrapper,
    }), [
        emblaApi,
        canScrollNext,
        canScrollPrev,
        emblaRef,
        setViewportWrapper,
        scrollNext,
        scrollPrev,
        scrollSnapCount,
        scrollTo,
        selectedIndex,
        slots,
        type,
        viewportWrapper,
    ]);
    return (_jsx(CarouselContext.Provider, { value: contextValue, children: _jsx("div", { "aria-roledescription": "carousel", className: composeSlotClassName(slots?.base, className), "data-slot": "carousel", role: "region", tabIndex: 0, onKeyDownCapture: handleKeyDown, ...props, children: children }) }));
};
export const CarouselContent = ({ children, className, ...props }) => {
    const { emblaRef, setViewportWrapper, slots } = useContext(CarouselContext);
    return (_jsx("div", { ref: setViewportWrapper, className: slots?.viewportWrapper(), "data-slot": "carousel-viewport-wrapper", children: _jsx("div", { ref: emblaRef, className: slots?.viewport(), "data-slot": "carousel-viewport", children: _jsx("div", { className: composeSlotClassName(slots?.content, className), "data-slot": "carousel-content", ...props, children: children }) }) }));
};
export const CarouselItem = ({ children, className, ...props }) => {
    const { slots } = useContext(CarouselContext);
    return (_jsx("div", { "aria-roledescription": "slide", className: composeSlotClassName(slots?.item, className), "data-slot": "carousel-item", role: "group", ...props, children: children }));
};
export const CarouselPrevious = ({ children, className, icon, ...props }) => {
    const { canScrollPrev, scrollPrev, slots, type, viewportWrapper } = useContext(CarouselContext);
    const button = (_jsx(HeroUIButton, { isIconOnly: true, "aria-label": "Previous slide", className: composeTwRenderProps(className, slots?.previous()), "data-slot": "carousel-previous", isDisabled: !canScrollPrev, size: "sm", variant: "tertiary", onPress: scrollPrev, ...props, children: children ?? icon ?? _jsx(ChevronLeft, {}) }));
    if (type === 'miniatures')
        return button;
    return viewportWrapper ? createPortal(button, viewportWrapper) : null;
};
export const CarouselNext = ({ children, className, icon, ...props }) => {
    const { canScrollNext, scrollNext, slots, type, viewportWrapper } = useContext(CarouselContext);
    const button = (_jsx(HeroUIButton, { isIconOnly: true, "aria-label": "Next slide", className: composeTwRenderProps(className, slots?.next()), "data-slot": "carousel-next", isDisabled: !canScrollNext, size: "sm", variant: "tertiary", onPress: scrollNext, ...props, children: children ?? icon ?? _jsx(ChevronRight, {}) }));
    if (type === 'miniatures')
        return button;
    return viewportWrapper ? createPortal(button, viewportWrapper) : null;
};
export const CarouselDots = ({ className, renderDot, ...props }) => {
    const { scrollSnapCount, scrollTo, selectedIndex, slots } = useContext(CarouselContext);
    if (scrollSnapCount <= 1)
        return null;
    return (_jsx("div", { "aria-label": "Slide indicators", className: composeSlotClassName(slots?.dots, className), "data-slot": "carousel-dots", role: "tablist", ...props, children: Array.from({ length: scrollSnapCount }, (_, index) => {
            const isSelected = index === selectedIndex;
            return renderDot ? (_jsx(React.Fragment, { children: renderDot({ index, isSelected }) }, index)) : (_jsx(ButtonPrimitive, { "aria-label": `Go to slide ${index + 1}`, "aria-selected": isSelected, className: composeTwRenderProps(undefined, slots?.dot()), "data-selected": isSelected || undefined, "data-slot": "carousel-dot", onPress: () => scrollTo(index) }, index));
        }) }));
};
export const CarouselThumbnails = ({ children, className, hideScrollBar = true, scrollShadowSize = 40, ...props }) => {
    const { slots } = useContext(CarouselContext);
    return (_jsx(ScrollShadow, { "aria-label": "Slide thumbnails", className: composeSlotClassName(slots?.thumbnails, className), "data-slot": "carousel-thumbnails", hideScrollBar: hideScrollBar, orientation: "horizontal", role: "tablist", size: scrollShadowSize, ...props, children: children }));
};
export const CarouselThumbnail = ({ alt = '', children, className, index, src, ...props }) => {
    const { scrollTo, selectedIndex, slots } = useContext(CarouselContext);
    const isSelected = index === selectedIndex;
    return (_jsx(ButtonPrimitive, { "aria-label": `Go to slide ${index + 1}`, "aria-selected": isSelected, className: composeTwRenderProps(className, slots?.thumbnail()), "data-selected": isSelected || undefined, "data-slot": "carousel-thumbnail", onPress: () => scrollTo(index), ...props, children: children ?? (src ? _jsx("img", { alt: alt, draggable: false, src: src }) : null) }));
};
//# sourceMappingURL=carousel.js.map