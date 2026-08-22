import type { ComponentProps } from 'react';
import { RatingItem, RatingRoot } from './rating';
export { RatingStarIcon } from './rating';
export { ratingVariants } from './rating.styles';
declare const Rating: (({ children, className, defaultValue, icon, isReadOnly, onValueChange, size, value: valueProp, ...props }: import("./rating").RatingRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Item: ({ children, className, value: itemValue, ...props }: import("./rating").RatingItemProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, defaultValue, icon, isReadOnly, onValueChange, size, value: valueProp, ...props }: import("./rating").RatingRootProps) => import("react/jsx-runtime").JSX.Element;
};
export { Rating, RatingItem, RatingRoot };
export type { RatingItemProps, RatingItemRenderProps, RatingRootProps as RatingProps, RatingRootProps, } from './rating';
export type { RatingVariants } from './rating.styles';
export type Rating = {
    Props: ComponentProps<typeof RatingRoot>;
    RootProps: ComponentProps<typeof RatingRoot>;
    ItemProps: ComponentProps<typeof RatingItem>;
};
//# sourceMappingURL=index.d.ts.map