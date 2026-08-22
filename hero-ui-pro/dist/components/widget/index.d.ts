import type { ComponentProps } from 'react';
import { WidgetContent, WidgetDescription, WidgetFooter, WidgetHeader, WidgetLegend, WidgetLegendItem, WidgetRoot, WidgetTitle } from './widget';
export { widgetVariants } from './widget.styles';
declare const Widget: (<E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: import("./widget").WidgetRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./widget").WidgetRootProps<E>>) => import("react/jsx-runtime").JSX.Element) & {
    Content: ({ children, className, ...props }: import("./widget").WidgetContentProps) => import("react/jsx-runtime").JSX.Element;
    Description: ({ children, className, ...props }: import("./widget").WidgetDescriptionProps) => import("react/jsx-runtime").JSX.Element;
    Footer: ({ children, className, ...props }: import("./widget").WidgetFooterProps) => import("react/jsx-runtime").JSX.Element;
    Header: ({ children, className, ...props }: import("./widget").WidgetHeaderProps) => import("react/jsx-runtime").JSX.Element;
    Legend: ({ children, className, ...props }: import("./widget").WidgetLegendProps) => import("react/jsx-runtime").JSX.Element;
    LegendItem: ({ children, className, color, ...props }: import("./widget").WidgetLegendItemProps) => import("react/jsx-runtime").JSX.Element;
    Root: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: import("./widget").WidgetRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof import("./widget").WidgetRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, className, ...props }: import("./widget").WidgetTitleProps) => import("react/jsx-runtime").JSX.Element;
};
export { Widget, WidgetContent, WidgetDescription, WidgetFooter, WidgetHeader, WidgetLegend, WidgetLegendItem, WidgetRoot, WidgetTitle, };
export type { WidgetContentProps, WidgetDescriptionProps, WidgetFooterProps, WidgetHeaderProps, WidgetLegendItemProps, WidgetLegendProps, WidgetRootProps as WidgetProps, WidgetRootProps, WidgetTitleProps, } from './widget';
export type Widget = {
    ContentProps: ComponentProps<typeof WidgetContent>;
    DescriptionProps: ComponentProps<typeof WidgetDescription>;
    FooterProps: ComponentProps<typeof WidgetFooter>;
    HeaderProps: ComponentProps<typeof WidgetHeader>;
    LegendItemProps: ComponentProps<typeof WidgetLegendItem>;
    LegendProps: ComponentProps<typeof WidgetLegend>;
    Props: ComponentProps<typeof WidgetRoot>;
    RootProps: ComponentProps<typeof WidgetRoot>;
    TitleProps: ComponentProps<typeof WidgetTitle>;
};
//# sourceMappingURL=index.d.ts.map