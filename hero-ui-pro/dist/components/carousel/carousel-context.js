'use client';
import { createContext, useContext } from 'react';
export const CarouselContext = createContext({
    api: undefined,
    canScrollNext: false,
    canScrollPrev: false,
    emblaRef: null,
    scrollNext: () => { },
    scrollPrev: () => { },
    scrollSnapCount: 0,
    scrollTo: () => { },
    selectedIndex: 0,
    setViewportWrapper: () => { },
    type: 'in-place',
    viewportWrapper: null,
});
export const useCarousel = () => useContext(CarouselContext);
//# sourceMappingURL=carousel-context.js.map