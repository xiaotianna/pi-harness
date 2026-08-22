import { type VariantProps } from 'tailwind-variants';
import type { DOMRenderProps } from '@heroui/react';
declare const textShimmerVariants: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    base: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    base: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    base: string;
}>>;
export type TextShimmerVariants = VariantProps<typeof textShimmerVariants>;
export type TextShimmerRenderProps<E extends keyof React.JSX.IntrinsicElements = 'span'> = DOMRenderProps<E, undefined>;
export { textShimmerVariants };
//# sourceMappingURL=text-shimmer.styles.d.ts.map