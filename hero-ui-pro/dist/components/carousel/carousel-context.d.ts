import type { EmblaCarouselType } from 'embla-carousel';
import type { carouselVariants } from './carousel.styles';
export type CarouselContextValue = {
    api: EmblaCarouselType | undefined;
    canScrollNext: boolean;
    canScrollPrev: boolean;
    emblaRef: ((node: HTMLDivElement | null) => void) | null;
    scrollNext: () => void;
    scrollPrev: () => void;
    scrollSnapCount: number;
    scrollTo: (index: number) => void;
    selectedIndex: number;
    setViewportWrapper: (node: HTMLDivElement | null) => void;
    slots?: ReturnType<typeof carouselVariants>;
    type: 'in-place' | 'modal' | 'miniatures';
    viewportWrapper: HTMLDivElement | null;
};
export declare const CarouselContext: import("react").Context<CarouselContextValue>;
export declare const useCarousel: () => CarouselContextValue;
//# sourceMappingURL=carousel-context.d.ts.map