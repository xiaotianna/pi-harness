import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import { Button as HeroUIButton } from '@heroui/react';
import type { CarouselVariants } from './carousel.styles';
export interface CarouselRootProps extends ComponentPropsWithRef<'div'> {
    /** Embla Carousel options. */
    opts?: EmblaOptionsType;
    /** Embla Carousel plugins. */
    plugins?: EmblaPluginType[];
    /** Callback to receive the Embla API instance. */
    setApi?: (api: EmblaCarouselType) => void;
    /** Carousel type. @default "in-place" */
    type?: CarouselVariants['type'];
}
export interface CarouselContentProps extends ComponentPropsWithRef<'div'> {
}
export interface CarouselItemProps extends ComponentPropsWithRef<'div'> {
}
export interface CarouselPreviousProps extends ComponentPropsWithRef<typeof HeroUIButton> {
    /** Custom icon to replace the default chevron. */
    icon?: ReactNode;
}
export interface CarouselNextProps extends ComponentPropsWithRef<typeof HeroUIButton> {
    /** Custom icon to replace the default chevron. */
    icon?: ReactNode;
}
export interface CarouselDotsProps extends ComponentPropsWithRef<'div'> {
    /** Render function to customize each dot. */
    renderDot?: (props: {
        index: number;
        isSelected: boolean;
    }) => ReactNode;
}
export interface CarouselThumbnailsProps extends ComponentPropsWithRef<'div'> {
    /** Hide the native scrollbar. @default true */
    hideScrollBar?: boolean;
    /** Size of the scroll shadow gradient in pixels. @default 40 */
    scrollShadowSize?: number;
}
export interface CarouselThumbnailProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
    /** The slide index this thumbnail navigates to (0-based). */
    index: number;
    /** Alt text for the thumbnail image. */
    alt?: string;
    /** Image source URL. */
    src?: string;
}
export declare const CarouselRoot: ({ children, className, opts, plugins, setApi, type, ...props }: CarouselRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const CarouselContent: ({ children, className, ...props }: CarouselContentProps) => import("react/jsx-runtime").JSX.Element;
export declare const CarouselItem: ({ children, className, ...props }: CarouselItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const CarouselPrevious: ({ children, className, icon, ...props }: CarouselPreviousProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const CarouselNext: ({ children, className, icon, ...props }: CarouselNextProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const CarouselDots: ({ className, renderDot, ...props }: CarouselDotsProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const CarouselThumbnails: ({ children, className, hideScrollBar, scrollShadowSize, ...props }: CarouselThumbnailsProps) => import("react/jsx-runtime").JSX.Element;
export declare const CarouselThumbnail: ({ alt, children, className, index, src, ...props }: CarouselThumbnailProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=carousel.d.ts.map