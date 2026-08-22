import type { ComponentProps } from 'react';
import { SegmentItem, SegmentRoot, SegmentSeparator } from './segment';
export { segmentVariants } from './segment.styles';
declare const Segment: (({ children, className, defaultSelectedKey, isDisabled, onSelectionChange, selectedKey, size, variant, ...props }: import("./segment").SegmentRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Item: ({ children, className, ...props }: import("./segment").SegmentItemProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, defaultSelectedKey, isDisabled, onSelectionChange, selectedKey, size, variant, ...props }: import("./segment").SegmentRootProps) => import("react/jsx-runtime").JSX.Element;
    Separator: ({ className, ...props }: import("./segment").SegmentSeparatorProps) => import("react/jsx-runtime").JSX.Element;
};
export { Segment, SegmentItem, SegmentRoot, SegmentSeparator };
export type { SegmentItemProps, SegmentRootProps as SegmentProps, SegmentRootProps, SegmentSeparatorProps, } from './segment';
export type { SegmentVariants } from './segment.styles';
export type Segment = {
    Props: ComponentProps<typeof SegmentRoot>;
    RootProps: ComponentProps<typeof SegmentRoot>;
    ItemProps: ComponentProps<typeof SegmentItem>;
    SeparatorProps: ComponentProps<typeof SegmentSeparator>;
};
//# sourceMappingURL=index.d.ts.map