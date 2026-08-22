import type { ComponentProps } from 'react';
import { CarouselContent, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious, CarouselRoot, CarouselThumbnail, CarouselThumbnails } from './carousel';
export { carouselVariants } from './carousel.styles';
export { useCarousel } from './carousel-context';
export declare const Carousel: (({ children, className, opts, plugins, setApi, type, ...props }: import("./carousel").CarouselRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./carousel").CarouselContentProps) => import("react/jsx-runtime").JSX.Element;
    Dots: ({ className, renderDot, ...props }: import("./carousel").CarouselDotsProps) => import("react/jsx-runtime").JSX.Element | null;
    Item: ({ children, className, ...props }: import("./carousel").CarouselItemProps) => import("react/jsx-runtime").JSX.Element;
    Next: ({ children, className, icon, ...props }: import("./carousel").CarouselNextProps) => import("react/jsx-runtime").JSX.Element | null;
    Previous: ({ children, className, icon, ...props }: import("./carousel").CarouselPreviousProps) => import("react/jsx-runtime").JSX.Element | null;
    Root: ({ children, className, opts, plugins, setApi, type, ...props }: import("./carousel").CarouselRootProps) => import("react/jsx-runtime").JSX.Element;
    Thumbnail: ({ alt, children, className, index, src, ...props }: import("./carousel").CarouselThumbnailProps) => import("react/jsx-runtime").JSX.Element;
    Thumbnails: ({ children, className, hideScrollBar, scrollShadowSize, ...props }: import("./carousel").CarouselThumbnailsProps) => import("react/jsx-runtime").JSX.Element;
};
export { CarouselContent, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious, CarouselRoot, CarouselThumbnail, CarouselThumbnails, };
export type { CarouselContentProps, CarouselDotsProps, CarouselItemProps, CarouselNextProps, CarouselPreviousProps, CarouselRootProps as CarouselProps, CarouselRootProps, CarouselThumbnailProps, CarouselThumbnailsProps, } from './carousel';
export type { CarouselVariants } from './carousel.styles';
export type Carousel = {
    ContentProps: ComponentProps<typeof CarouselContent>;
    DotsProps: ComponentProps<typeof CarouselDots>;
    ItemProps: ComponentProps<typeof CarouselItem>;
    NextProps: ComponentProps<typeof CarouselNext>;
    PreviousProps: ComponentProps<typeof CarouselPrevious>;
    Props: ComponentProps<typeof CarouselRoot>;
    RootProps: ComponentProps<typeof CarouselRoot>;
    ThumbnailProps: ComponentProps<typeof CarouselThumbnail>;
    ThumbnailsProps: ComponentProps<typeof CarouselThumbnails>;
};
//# sourceMappingURL=index.d.ts.map