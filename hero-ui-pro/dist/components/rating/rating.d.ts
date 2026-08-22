import type { ComponentPropsWithRef, ReactNode } from 'react';
import React from 'react';
import { Radio as RadioPrimitive, RadioGroup as RadioGroupPrimitive } from 'react-aria-components/RadioGroup';
import type { RatingVariants } from './rating.styles';
declare const RatingStarIcon: (props: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element;
interface RatingRootProps extends Omit<ComponentPropsWithRef<typeof RadioGroupPrimitive>, 'defaultValue' | 'onChange' | 'orientation' | 'value'>, RatingVariants {
    /** Default rating value (uncontrolled). */
    defaultValue?: number;
    /** Custom icon rendered for all items unless overridden per-item. */
    icon?: ReactNode;
    /** Callback fired when the selected rating changes. */
    onValueChange?: (value: number) => void;
    /** Controlled rating value. Supports fractional values in read-only mode (e.g. 3.5). */
    value?: number;
}
declare const RatingRoot: ({ children, className, defaultValue, icon, isReadOnly, onValueChange, size, value: valueProp, ...props }: RatingRootProps) => import("react/jsx-runtime").JSX.Element;
interface RatingItemRenderProps {
    isActive: boolean;
    isPartial: boolean;
    partialPercent: number;
}
interface RatingItemProps extends Omit<ComponentPropsWithRef<typeof RadioPrimitive>, 'children' | 'value'> {
    /** Custom icon or render function. When a function, receives `{ isActive, isPartial, partialPercent }`. */
    children?: ReactNode | ((props: RatingItemRenderProps) => ReactNode);
    /** Numeric value for this rating item. */
    value: number;
}
declare const RatingItem: ({ children, className, value: itemValue, ...props }: RatingItemProps) => import("react/jsx-runtime").JSX.Element;
export { RatingItem, RatingRoot, RatingStarIcon };
export type { RatingItemProps, RatingItemRenderProps, RatingRootProps };
//# sourceMappingURL=rating.d.ts.map