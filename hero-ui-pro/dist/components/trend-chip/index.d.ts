import type { ComponentProps } from 'react';
import { TrendChipIndicator, TrendChipPrefix, TrendChipRoot, TrendChipSuffix } from './trend-chip';
export { trendChipVariants } from './trend-chip.styles';
declare const TrendChip: (({ children, className, size, trend, variant, ...props }: import("./trend-chip").TrendChipRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Indicator: ({ children, className, ...props }: import("./trend-chip").TrendChipIndicatorProps) => React.ReactElement<{
        className?: string;
        "data-slot"?: string;
    }> | null;
    Prefix: ({ children, className, ...props }: import("./trend-chip").TrendChipPrefixProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, size, trend, variant, ...props }: import("./trend-chip").TrendChipRootProps) => import("react/jsx-runtime").JSX.Element;
    Suffix: ({ children, className, ...props }: import("./trend-chip").TrendChipSuffixProps) => import("react/jsx-runtime").JSX.Element;
};
export { TrendChip, TrendChipIndicator, TrendChipPrefix, TrendChipRoot, TrendChipSuffix, };
export type { TrendChipIndicatorProps, TrendChipPrefixProps, TrendChipRootProps as TrendChipProps, TrendChipRootProps, TrendChipSuffixProps, } from './trend-chip';
export type { TrendChipVariants } from './trend-chip.styles';
export type TrendChip = {
    IndicatorProps: ComponentProps<typeof TrendChipIndicator>;
    PrefixProps: ComponentProps<typeof TrendChipPrefix>;
    Props: ComponentProps<typeof TrendChipRoot>;
    RootProps: ComponentProps<typeof TrendChipRoot>;
    SuffixProps: ComponentProps<typeof TrendChipSuffix>;
};
//# sourceMappingURL=index.d.ts.map