import type { ComponentPropsWithRef } from 'react';
import type { Key } from 'react-aria-components/Breadcrumbs';
import { ToggleButton as ToggleButtonPrimitive, ToggleButtonGroup as ToggleButtonGroupPrimitive } from 'react-aria-components/ToggleButtonGroup';
import type { SegmentVariants } from './segment.styles';
interface SegmentRootProps extends Omit<ComponentPropsWithRef<typeof ToggleButtonGroupPrimitive>, 'selectionMode' | 'selectedKeys' | 'defaultSelectedKeys' | 'onSelectionChange'> {
    className?: string;
    selectedKey?: Key | null;
    defaultSelectedKey?: Key;
    onSelectionChange?: (key: Key) => void;
    isDisabled?: boolean;
    size?: SegmentVariants['size'];
    variant?: SegmentVariants['variant'];
}
declare const SegmentRoot: ({ children, className, defaultSelectedKey, isDisabled, onSelectionChange, selectedKey, size, variant, ...props }: SegmentRootProps) => import("react/jsx-runtime").JSX.Element;
interface SegmentItemProps extends ComponentPropsWithRef<typeof ToggleButtonPrimitive> {
    className?: string;
}
declare const SegmentItem: ({ children, className, ...props }: SegmentItemProps) => import("react/jsx-runtime").JSX.Element;
interface SegmentSeparatorProps extends ComponentPropsWithRef<'span'> {
    className?: string;
}
declare const SegmentSeparator: ({ className, ...props }: SegmentSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export { SegmentItem, SegmentRoot, SegmentSeparator };
export type { SegmentItemProps, SegmentRootProps, SegmentSeparatorProps };
//# sourceMappingURL=segment.d.ts.map