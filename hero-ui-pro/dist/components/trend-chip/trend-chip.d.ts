import type { ComponentPropsWithRef } from 'react';
import React, { type ReactNode } from 'react';
import { Chip } from '@heroui/react';
import type { TrendChipVariants } from './trend-chip.styles';
type TrendType = 'down' | 'neutral' | 'up';
interface TrendChipIndicatorProps extends ComponentPropsWithRef<'svg'> {
    children?: ReactNode;
    className?: string;
}
declare const TrendChipIndicator: ({ children, className, ...props }: TrendChipIndicatorProps) => React.ReactElement<{
    className?: string;
    "data-slot"?: string;
}> | null;
interface TrendChipPrefixProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const TrendChipPrefix: ({ children, className, ...props }: TrendChipPrefixProps) => import("react/jsx-runtime").JSX.Element;
interface TrendChipSuffixProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const TrendChipSuffix: ({ children, className, ...props }: TrendChipSuffixProps) => import("react/jsx-runtime").JSX.Element;
interface TrendChipRootProps extends Omit<ComponentPropsWithRef<typeof Chip>, 'children' | 'color' | 'size' | 'variant'> {
    children: ReactNode;
    size?: TrendChipVariants['size'];
    trend?: TrendType;
    variant?: 'primary' | 'secondary' | 'soft' | 'tertiary';
}
declare const TrendChipRoot: ({ children, className, size, trend, variant, ...props }: TrendChipRootProps) => import("react/jsx-runtime").JSX.Element;
export { TrendChipIndicator, TrendChipPrefix, TrendChipRoot, TrendChipSuffix };
export type { TrendChipIndicatorProps, TrendChipPrefixProps, TrendChipRootProps, TrendChipSuffixProps, };
//# sourceMappingURL=trend-chip.d.ts.map